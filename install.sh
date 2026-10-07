#!/usr/bin/env bash
# Symlink sdlc-skills into Claude Code and/or Codex. Idempotent; never overwrites a real file.
#   ./install.sh            both hosts
#   ./install.sh claude     Claude Code only ($CLAUDE_CONFIG_DIR, default ~/.claude)
#   ./install.sh codex      Codex only (~/.agents/skills, $CODEX_HOME default ~/.codex)
#   ./install.sh codex-driver  opt-in: the `codex -p sdlc-driver` profile, plus rules that let
#                           Codex run the worker scripts without asking (outside its sandbox)
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-all}"

link() { # link <src> <dest>
  if [ -L "$2" ]; then ln -sfn "$1" "$2"
  elif [ -e "$2" ]; then echo "skip (exists, not a symlink): $2"; return
  else ln -s "$1" "$2"; fi
}

install_claude() {
  local home="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
  mkdir -p "$home/skills" "$home/agents"
  for s in "$REPO"/skills/*/; do link "${s%/}" "$home/skills/$(basename "$s")"; done
  for a in "$REPO"/agents/*.md; do link "$a" "$home/agents/$(basename "$a")"; done
  link "$REPO/agents/design-review-refs" "$home/agents/design-review-refs"
  echo "Claude Code: linked into $home"
}

install_codex() {
  local home="${CODEX_HOME:-$HOME/.codex}" skills="$HOME/.agents/skills"
  python3 "$REPO/scripts/sync-codex.py" --check >/dev/null || python3 "$REPO/scripts/sync-codex.py"
  mkdir -p "$skills" "$home/agents"
  for s in "$REPO"/skills/*/; do link "${s%/}" "$skills/$(basename "$s")"; done
  for a in "$REPO"/codex/agents/*.toml; do link "$a" "$home/agents/$(basename "$a")"; done
  link "$REPO/agents/design-review-refs" "$home/agents/design-review-refs"

  # Tool-name translation block: replaced between markers, the rest of AGENTS.md left alone.
  local agents_md="$home/AGENTS.md" tmp
  touch "$agents_md"
  tmp="$(mktemp)"
  awk '/<!-- sdlc-skills:codex:start -->/{skip=1}
       !skip{ if ($0 == "") blank++; else { for (; blank > 0; blank--) print ""; print } }
       /<!-- sdlc-skills:codex:end -->/{skip=0}' "$agents_md" > "$tmp"
  { [ -s "$tmp" ] && printf '\n'; cat "$REPO/codex/AGENTS.md"; } >> "$tmp"
  mv "$tmp" "$agents_md"
  echo "Codex: skills linked into $skills, agents into $home/agents, translation block in $agents_md"
}

install_codex_driver() {
  local home="${CODEX_HOME:-$HOME/.codex}"
  mkdir -p "$home/rules"
  cp "$REPO/codex/sdlc-driver.config.toml" "$home/sdlc-driver.config.toml"
  sed "s#__REPO__#$REPO#g" "$REPO/codex/sdlc-skills.rules" > "$home/rules/sdlc-skills.rules"
  echo "Codex driver: profile at $home/sdlc-driver.config.toml (codex -p sdlc-driver), rules at $home/rules/sdlc-skills.rules"
}

case "$TARGET" in
  claude) install_claude ;;
  codex)  install_codex ;;
  all)    install_claude; install_codex ;;
  codex-driver) install_codex_driver ;;
  *) echo "usage: $0 [claude|codex|all|codex-driver]" >&2; exit 1 ;;
esac
