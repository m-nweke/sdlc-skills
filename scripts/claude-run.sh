#!/usr/bin/env bash
# Run one headless Claude worker (or synthesizer) when Codex drives the pipeline. Mirrors
# codex-run.sh, leaving in --out:
#   last.md    the final report (structured_output when --schema is given, else the result text)
#   run.json   claude's full JSON result (never read into an orchestrator's context)
#   meta.json  session_id, token usage, cost, duration — what the scorecard records
#
#   claude-run.sh --out DIR --cwd DIR --prompt-file FILE --model sonnet|opus [--schema FILE]
#   claude-run.sh --out DIR --cwd DIR --resume SESSION_ID --prompt-file FILE --model M
#
# Edits are auto-accepted inside --cwd; Bash runs only inside Claude Code's sandbox (writes
# limited to --cwd), the same boundary codex-run.sh's workspace-write sandbox gives a Codex worker.
# Headless Claude has no claude.ai connectors, so it can't publish Claude Docs.
set -uo pipefail

out="" cwd="" prompt_file="" model="" schema="" resume=""
while [ $# -gt 0 ]; do
  case "$1" in
    --out) out="$2"; shift 2 ;;
    --cwd) cwd="$2"; shift 2 ;;
    --prompt-file) prompt_file="$2"; shift 2 ;;
    --model) model="$2"; shift 2 ;;
    --schema) schema="$2"; shift 2 ;;
    --resume) resume="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
[ -n "$out" ] && [ -n "$cwd" ] && [ -n "$model" ] && [ -f "$prompt_file" ] || {
  echo "usage: claude-run.sh --out DIR --cwd DIR --prompt-file FILE --model M [--schema F] [--resume ID]" >&2
  exit 2
}
mkdir -p "$out"

args=(-p --model "$model" --output-format json --permission-mode acceptEdits
      --settings '{"sandbox":{"enabled":true,"autoAllowBashIfSandboxed":true}}')
[ -n "$schema" ] && args+=(--json-schema "$(cat "$schema")")
[ -n "$resume" ] && args+=(--resume "$resume")

cd "$cwd" || exit 2
claude "${args[@]}" "$(cat "$prompt_file")" < /dev/null > "$out/run.json" 2>> "$out/stderr.log"
code=$?

python3 - "$out" "$code" <<'PY'
import json, os, sys
out, code = sys.argv[1], int(sys.argv[2])
meta_path = os.path.join(out, "meta.json")
meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {
    "duration_s": 0, "turns": 0, "cost_usd": 0.0,
    "usage": {"input_tokens": 0, "cached_input_tokens": 0, "output_tokens": 0}}
try:
    run = json.load(open(os.path.join(out, "run.json")))
except (ValueError, OSError):
    run = {"is_error": True, "result": "no JSON result; see stderr.log"}
u = run.get("usage", {})
# Claude bills cache writes and reads separately; count both as input so totals compare with Codex.
meta["usage"]["input_tokens"] += (u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
                                  + u.get("cache_read_input_tokens", 0))
meta["usage"]["cached_input_tokens"] += u.get("cache_read_input_tokens", 0)
meta["usage"]["output_tokens"] += u.get("output_tokens", 0)
meta.update(session_id=run.get("session_id", meta.get("session_id")), exit_code=code,
            is_error=bool(run.get("is_error")),
            duration_s=meta["duration_s"] + round(run.get("duration_ms", 0) / 1000),
            cost_usd=round(meta["cost_usd"] + (run.get("total_cost_usd") or 0), 4),
            turns=meta["turns"] + 1,
            permission_denials=[d.get("tool_name") for d in run.get("permission_denials", [])])
json.dump(meta, open(meta_path, "w"), indent=2)
report = run.get("structured_output")
with open(os.path.join(out, "last.md"), "w") as f:
    f.write(json.dumps(report) if report is not None else str(run.get("result", "")))
usage = meta["usage"]
print(json.dumps({"session_id": meta["session_id"], "exit_code": code, "is_error": meta["is_error"],
                  "duration_s": meta["duration_s"],
                  "tokens": usage["input_tokens"] + usage["output_tokens"]}))
PY
exit "$code"
