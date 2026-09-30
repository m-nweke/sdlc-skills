#!/usr/bin/env python3
"""Generate Codex-side metadata from the Claude Code sources, so one set of files serves both.

Sources of truth (edit these, never the generated output):
  skills/*/SKILL.md   frontmatter `disable-model-invocation: true`
  agents/*.md         Claude Code subagent definitions

Generated:
  skills/*/agents/openai.yaml   `policy.allow_implicit_invocation: false` mirrored from the flag
  codex/agents/*.toml           Codex custom-agent definitions

Usage: scripts/sync-codex.py [--check]   (--check exits 1 if anything is stale; for CI)
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
POLICY_BLOCK = "policy:\n  allow_implicit_invocation: false\n"
# Claude model tiers -> Codex reasoning effort on whatever model the user has configured.
EFFORT = {"haiku": "low", "sonnet": "medium", "opus": "high"}


def frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        return {}, text
    fields, key = {}, None
    for line in m.group(1).splitlines():
        kv = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if kv:
            key, val = kv.group(1), kv.group(2).strip()
            fields[key] = "" if val in (">-", ">", "|", "|-") else val.strip("\"'")
        elif key and line.startswith(" "):
            fields[key] = (fields[key] + " " + line.strip()).strip()
    return fields, m.group(2)


def toml_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def toml_multiline(s):
    return "'''\n" + s.replace("'''", "' ' '").strip() + "\n'''"


def expected_openai_yaml(path, disabled):
    current = path.read_text() if path.exists() else ""
    stripped = re.sub(r"(?m)^policy:\n(?:[ \t]+.*\n?)*", "", current).rstrip()
    if not disabled:
        return (stripped + "\n") if stripped else None
    return (stripped + "\n\n" if stripped else "") + POLICY_BLOCK


def expected_agent_toml(md_path):
    fields, body = frontmatter(md_path.read_text())
    lines = [
        f"# GENERATED from agents/{md_path.name} by scripts/sync-codex.py. Do not edit by hand.",
        f"name = {toml_str(fields['name'])}",
        f"description = {toml_str(fields.get('description', ''))}",
    ]
    effort = EFFORT.get(fields.get("model", ""))
    if effort:
        lines.append(f"model_reasoning_effort = {toml_str(effort)}")
    note = (
        "Host note: this agent was written for Claude Code. Translate tool names per the "
        "sdlc-skills Codex block in AGENTS.md (e.g. `mcp__claude-in-chrome__*` means whichever "
        "browser-automation MCP is configured here). Any `scripts/...` path is relative to the "
        f"`{md_path.stem}-refs/` directory installed next to this file.\n\n"
    )
    lines.append(f"developer_instructions = {toml_multiline(note + body)}")
    return "\n".join(lines) + "\n"


def main():
    check = "--check" in sys.argv
    plan = {}
    for skill_md in sorted(ROOT.glob("skills/*/SKILL.md")):
        fields, _ = frontmatter(skill_md.read_text())
        disabled = fields.get("disable-model-invocation", "").lower() == "true"
        target = skill_md.parent / "agents" / "openai.yaml"
        want = expected_openai_yaml(target, disabled)
        if want is not None:
            plan[target] = want
    for agent_md in sorted(ROOT.glob("agents/*.md")):
        plan[ROOT / "codex" / "agents" / f"{agent_md.stem}.toml"] = expected_agent_toml(agent_md)

    stale = [p for p, want in plan.items() if not p.exists() or p.read_text() != want]
    for p in stale:
        rel = p.relative_to(ROOT)
        if check:
            print(f"stale: {rel}")
        else:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(plan[p])
            print(f"wrote: {rel}")
    if check and stale:
        print("Run scripts/sync-codex.py to regenerate.")
        sys.exit(1)


if __name__ == "__main__":
    main()
