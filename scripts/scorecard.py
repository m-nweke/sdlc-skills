#!/usr/bin/env python3
"""Append-only scorecard of which model did better at which phase/sub-task in dual runs.

Records live outside this (public) repo — they name real projects — at $SDLC_SCORECARD,
default ~/.sdlc/scorecard.jsonl. The sdlc-scorecard mod reads the same file.

  scorecard.py add FILE|-          append one phase or gate record (JSON), validated
  scorecard.py compose ...         build + append a phase record from a blind synthesis (A/B) and its key
  scorecard.py summary [--by phase|task_type] [--project NAME]
  scorecard.py path                print the log path

Schema: skills/dual-run/references/scorecard.md
"""
import argparse, json, os, sys, time
from collections import defaultdict

PATH = os.path.expanduser(os.environ.get("SDLC_SCORECARD", "~/.sdlc/scorecard.jsonl"))
PHASES = {"discovery", "research", "design", "plan", "implement", "review", "ship", "chart"}
WINNERS = {"sonnet", "codex", "tie"}
DECISIONS = {"approve", "revise", "regenerate", "skip"}
PREFERRED = {"merged", "sonnet", "codex", "unsure"}


def fail(msg):
    sys.exit(f"scorecard: {msg}")


def validate(rec):
    t = rec.get("type")
    for k in ("run", "phase", "subtask"):
        if not rec.get(k):
            fail(f"missing {k}")
    if rec["phase"] not in PHASES:
        fail(f"phase must be one of {sorted(PHASES)}")
    if t == "phase":
        for k in ("project", "task_type", "branches", "synthesis"):
            if k not in rec:
                fail(f"phase record missing {k}")
        for b in ("sonnet", "codex"):
            if b not in rec["branches"]:
                fail(f"branches.{b} missing (record status 'failed' rather than omitting it)")
        syn = rec["synthesis"]
        if syn.get("winner") not in WINNERS:
            fail(f"synthesis.winner must be one of {sorted(WINNERS)}")
        items = syn.get("items", {})
        for k in ("total", "both", "sonnet_only", "codex_only", "synth_added"):
            if not isinstance(items.get(k), int):
                fail(f"synthesis.items.{k} must be an int")
    elif t == "gate":
        if rec.get("decision") not in DECISIONS:
            fail(f"decision must be one of {sorted(DECISIONS)}")
        if rec.get("preferred") not in PREFERRED:
            fail(f"preferred must be one of {sorted(PREFERRED)}")
    else:
        fail("type must be 'phase' or 'gate'")


def load():
    if not os.path.exists(PATH):
        return []
    with open(PATH) as f:
        return [json.loads(l) for l in f if l.strip()]


def add(src):
    rec = json.load(sys.stdin if src == "-" else open(src))
    validate(rec)
    rec.setdefault("ts", time.strftime("%Y-%m-%dT%H:%M:%S%z"))
    rec["id"] = f'{rec["run"]}:{rec["phase"]}:{rec["subtask"]}'
    os.makedirs(os.path.dirname(PATH), exist_ok=True)
    with open(PATH, "a") as f:
        f.write(json.dumps(rec, separators=(",", ":")) + "\n")
    print(f"recorded {rec['type']} {rec['id']}")


def compose(a):
    """Unblind the synthesizer's A/B output with key.json and add the measured branch costs."""
    syn, key = json.load(open(a.synthesis)), json.load(open(a.key))  # key: {"A": "codex", "B": "sonnet"}
    if sorted(key.values()) != ["codex", "sonnet"]:
        fail("key must map A and B to sonnet and codex")
    unblind = lambda d: {key[k]: v for k, v in d.items()}
    it = syn["items"]
    meta = json.load(open(a.codex_meta)) if a.codex_meta and os.path.exists(a.codex_meta) else {}
    usage = meta.get("usage", {})
    rec = {
        "type": "phase", "project": a.project, "run": a.run, "kind": a.kind, "size": a.size,
        "phase": a.phase, "subtask": a.subtask, "task_type": syn.get("task_type") or a.subtask,
        "attempt": a.attempt, "artifact": syn.get("artifact"),
        "branches": {
            "sonnet": {"model": "sonnet", "status": a.sonnet_status, "tokens": a.sonnet_tokens,
                       "duration_s": a.sonnet_duration, "relays": a.sonnet_relays},
            "codex": {"model": a.codex_model, "effort": a.codex_effort, "status": a.codex_status,
                      "tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
                      "input_tokens": usage.get("input_tokens", 0),
                      "cached_input_tokens": usage.get("cached_input_tokens", 0),
                      "output_tokens": usage.get("output_tokens", 0),
                      "duration_s": meta.get("duration_s", 0), "relays": max(meta.get("turns", 1) - 1, 0)},
        },
        "synthesis": {
            "model": "opus", "tokens": a.synth_tokens, "blind_key": key,
            "items": {"total": it["total"], "both": it["both"], "synth_added": it["synth_added"],
                      key["A"] + "_only": it["A_only"], key["B"] + "_only": it["B_only"]},
            "dropped": unblind(syn.get("dropped", {})), "errors": unblind(syn.get("errors", {})),
            "unique_catches": unblind(syn.get("unique_catches", {})),
            "winner": key.get(syn["winner"], syn["winner"]),
            "rationale": syn.get("rationale", "").replace("Draft A", key["A"].capitalize())
                                                 .replace("Draft B", key["B"].capitalize()),
        },
    }
    validate(rec)
    rec["ts"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    rec["id"] = f'{rec["run"]}:{rec["phase"]}:{rec["subtask"]}'
    os.makedirs(os.path.dirname(PATH), exist_ok=True)
    with open(PATH, "a") as f:
        f.write(json.dumps(rec, separators=(",", ":")) + "\n")
    print(f"recorded phase {rec['id']}: winner {rec['synthesis']['winner']}")


def summary(by, project):
    recs = [r for r in load() if not project or r.get("project") == project]
    # A later record with the same id (a Revise's new attempt) supersedes the earlier one.
    gates = {r["id"]: r for r in recs if r["type"] == "gate"}
    phases = {r["id"]: r for r in recs if r["type"] == "phase"}
    rows = defaultdict(lambda: defaultdict(float))
    for r in phases.values():
        row = rows[r.get(by, "?")]
        it = r["synthesis"]["items"]
        total = max(it["total"], 1)
        row["n"] += 1
        row[r["synthesis"]["winner"]] += 1
        row["sonnet_kept"] += (it["both"] + it["sonnet_only"]) / total
        row["codex_kept"] += (it["both"] + it["codex_only"]) / total
        for b in ("sonnet", "codex"):
            row[f"{b}_tok"] += r["branches"][b].get("tokens", 0)
        g = gates.get(r["id"])
        if g and g["preferred"] != "unsure":
            row["gated"] += 1
            row[f"pref_{g['preferred']}"] += 1
    if not rows:
        print(f"no records in {PATH}")
        return
    hdr = f"{by:<22}{'n':>4}{'S win':>7}{'C win':>7}{'tie':>5}{'S kept':>8}{'C kept':>8}{'S tok':>9}{'C tok':>9}  you preferred"
    print(hdr)
    print("-" * len(hdr))
    for key, r in sorted(rows.items()):
        n = r["n"]
        pref = ", ".join(f"{k[5:]} {int(v)}" for k, v in r.items() if k.startswith("pref_")) or "-"
        print(f"{key:<22}{int(n):>4}{int(r['sonnet']):>7}{int(r['codex']):>7}{int(r['tie']):>5}"
              f"{r['sonnet_kept'] / n:>8.0%}{r['codex_kept'] / n:>8.0%}"
              f"{int(r['sonnet_tok'] / n):>9}{int(r['codex_tok'] / n):>9}  {pref}")


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("add")
    a.add_argument("file")
    s = sub.add_parser("summary")
    s.add_argument("--by", choices=["phase", "task_type"], default="phase")
    s.add_argument("--project")
    c = sub.add_parser("compose")
    for k in ("synthesis", "key", "project", "run", "phase", "subtask"):
        c.add_argument(f"--{k}", required=True)
    c.add_argument("--kind", default="")
    c.add_argument("--size", default="")
    c.add_argument("--attempt", type=int, default=1)
    c.add_argument("--codex-meta")
    c.add_argument("--codex-model", default="gpt-6.1-sol")
    c.add_argument("--codex-effort", default="medium")
    c.add_argument("--codex-status", default="done", choices=["done", "relay", "failed", "skipped"])
    c.add_argument("--sonnet-status", default="done", choices=["done", "relay", "failed", "skipped"])
    for k in ("sonnet-tokens", "sonnet-duration", "sonnet-relays", "synth-tokens"):
        c.add_argument(f"--{k}", type=int, default=0)
    sub.add_parser("path")
    args = p.parse_args()
    if args.cmd == "add":
        add(args.file)
    elif args.cmd == "compose":
        compose(args)
    elif args.cmd == "summary":
        summary(args.by, args.project)
    else:
        print(PATH)


if __name__ == "__main__":
    main()
