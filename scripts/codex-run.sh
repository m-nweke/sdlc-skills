#!/usr/bin/env bash
# Run one Codex worker for a dual-run branch and leave everything the orchestrator needs in --out:
#   last.md      Codex's final message (the only part anyone should read back)
#   events.jsonl full event stream (never read into an orchestrator's context)
#   meta.json    thread_id, token usage, duration, exit code — what the scorecard records
#
#   codex-run.sh --out DIR --cwd DIR --prompt-file FILE [--model M] [--effort low|medium|high]
#                [--sandbox read-only|workspace-write] [--schema FILE]
#   codex-run.sh --out DIR --cwd DIR --resume THREAD_ID --prompt-file FILE   (continue a session)
set -uo pipefail

out="" cwd="" prompt_file="" model="" effort="medium" sandbox="read-only" schema="" resume=""
while [ $# -gt 0 ]; do
  case "$1" in
    --out) out="$2"; shift 2 ;;
    --cwd) cwd="$2"; shift 2 ;;
    --prompt-file) prompt_file="$2"; shift 2 ;;
    --model) model="$2"; shift 2 ;;
    --effort) effort="$2"; shift 2 ;;
    --sandbox) sandbox="$2"; shift 2 ;;
    --schema) schema="$2"; shift 2 ;;
    --resume) resume="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
[ -n "$out" ] && [ -n "$cwd" ] && [ -f "$prompt_file" ] || {
  echo "usage: codex-run.sh --out DIR --cwd DIR --prompt-file FILE [--effort E] [--sandbox S] [--schema F] [--resume ID]" >&2
  exit 2
}
mkdir -p "$out"

args=(--json --skip-git-repo-check -o "$out/last.md"
      -c "model_reasoning_effort=\"$effort\"" -c "sandbox_mode=\"$sandbox\"")
[ -n "$schema" ] && args+=(--output-schema "$schema")
# Unset, Codex uses the config default (gpt-6.1-sol here); a Codex-driven run passes gpt-6-sol.
[ -n "$model" ] && args+=(-m "$model")

start=$(date +%s)
cd "$cwd" || exit 2
# A resumed turn appends to the same events file so meta.json totals cover the whole session.
if [ -n "$resume" ]; then
  codex exec resume "${args[@]}" "$resume" - < "$prompt_file" >> "$out/events.jsonl" 2>> "$out/stderr.log"
else
  : > "$out/events.jsonl"
  codex exec "${args[@]}" - < "$prompt_file" >> "$out/events.jsonl" 2>> "$out/stderr.log"
fi
code=$?
end=$(date +%s)

python3 - "$out" "$code" "$((end - start))" <<'PY'
import json, os, sys
out, code, secs = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
meta_path = os.path.join(out, "meta.json")
meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {"duration_s": 0, "turns": 0}
usage = {"input_tokens": 0, "cached_input_tokens": 0, "output_tokens": 0, "reasoning_output_tokens": 0}
thread_id, errors = meta.get("thread_id"), []
for line in open(os.path.join(out, "events.jsonl")):
    try:
        ev = json.loads(line)
    except ValueError:
        continue
    if ev.get("type") == "thread.started":
        thread_id = ev.get("thread_id") or thread_id
    elif ev.get("type") == "turn.completed":
        for k in usage:
            usage[k] += ev.get("usage", {}).get(k, 0)
    elif ev.get("type") in ("turn.failed", "error"):
        errors.append(str(ev.get("error") or ev.get("message"))[:300])
meta.update(thread_id=thread_id, usage=usage, exit_code=code, errors=errors[-3:],
            duration_s=meta["duration_s"] + secs, turns=meta["turns"] + 1)
json.dump(meta, open(meta_path, "w"), indent=2)
print(json.dumps({"thread_id": thread_id, "exit_code": code, "duration_s": meta["duration_s"],
                  "tokens": usage["input_tokens"] + usage["output_tokens"]}))
PY
exit "$code"
