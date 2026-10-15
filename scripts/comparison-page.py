#!/usr/bin/env python3
"""Render a dual-run attempt's comparison.json as an unblinded side-by-side HTML page.

Usage: comparison-page.py <attempt dir> --title "CMC-157 dev seed" [--out <file.html>]
Reads comparison.json, key.json and synthesis.json from the attempt dir.
"""
import argparse
import html
import json
from pathlib import Path

NAMES = {"sonnet": "Sonnet", "codex": "Codex"}

CSS = """
:root{--bg:#f6f7f9;--panel:#ffffff;--fg:#1c2128;--muted:#5b6573;--line:#dde1e7;
--a:#2f5fb3;--b:#8a4b14;--m:#2c7a54;--chip:#eef1f5;--code:#f1f3f6;
--display:"IBM Plex Sans Condensed",system-ui,sans-serif;--body:"IBM Plex Sans",system-ui,sans-serif;
--mono:"IBM Plex Mono",ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#14171c;--panel:#1b1f26;--fg:#e4e8ee;
--muted:#9aa4b2;--line:#2c323c;--a:#7ea6f0;--b:#e0a061;--m:#6fcf9f;--chip:#242a33;--code:#20252d;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#14171c;--panel:#1b1f26;--fg:#e4e8ee;--muted:#9aa4b2;--line:#2c323c;
--a:#7ea6f0;--b:#e0a061;--m:#6fcf9f;--chip:#242a33;--code:#20252d;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font:15px/1.55 var(--body);padding-inline:16px;padding-block:28px 48px}
main{max-width:1240px;margin:0 auto;display:grid;gap:28px}
h1{font:600 1.9rem/1.15 var(--display);margin:0;text-wrap:balance}
h2{font:600 1.15rem/1.2 var(--display);margin:0 0 10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.verdict{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px 18px;display:grid;gap:8px}
.verdict p{margin:0;max-width:75ch}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;min-width:900px;background:var(--panel);border:1px solid var(--line)}
th,td{text-align:left;vertical-align:top;padding:10px 12px;border-bottom:1px solid var(--line)}
th{font:600 .8rem var(--display);text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
td.aspect{font-weight:600;width:14%}
th.a{color:var(--a)}th.b{color:var(--b)}th.m{color:var(--m)}
.pick{display:inline-block;font:600 .72rem var(--mono);padding:2px 8px;border-radius:99px;background:var(--chip);white-space:nowrap}
.pick.a{color:var(--a)}.pick.b{color:var(--b)}.pick.m{color:var(--m)}
.why{color:var(--muted);font-size:.88rem;margin-top:6px}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
.cols>div{min-width:0;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px}
.lbl{font:600 .78rem var(--display);text-transform:uppercase;letter-spacing:.06em}
.lbl.a{color:var(--a)}.lbl.b{color:var(--b)}.lbl.m{color:var(--m)}
pre{background:var(--code);padding:10px;border-radius:6px;overflow-x:auto;font:12.5px/1.45 var(--mono);margin:6px 0 0}
ul{margin:6px 0 0;padding-left:18px}
.nums{font-variant-numeric:tabular-nums;color:var(--muted);font-size:.9rem}
"""


def esc(s):
    return html.escape(str(s or ""))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("dir")
    p.add_argument("--title", required=True)
    p.add_argument("--out")
    a = p.parse_args()
    d = Path(a.dir)
    comp = json.loads((d / "comparison.json").read_text())
    key = json.loads((d / "key.json").read_text())
    syn = json.loads((d / "synthesis.json").read_text())
    name = {lbl: NAMES.get(m, m) for lbl, m in key.items()}
    cls = {"A": "a", "B": "b"}

    def pick_label(pk):
        pk = (pk or "").strip()
        if pk in name:
            return f'<span class="pick {cls[pk]}">{esc(name[pk])}</span>'
        txt = {"both": "Both", "neither": "Neither", "new": "Merger added"}.get(pk.lower(), pk)
        return f'<span class="pick m">{esc(txt)}</span>'

    w = syn.get("winner", "")
    winner = name.get(w, "Tie" if w == "tie" else w)
    it, err = syn.get("items", {}), syn.get("errors", {})
    uc = syn.get("unique_catches", {})

    out = [f"<title>{esc(a.title)}</title>",
           '<link rel="preconnect" href="https://fonts.googleapis.com">',
           '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600'
           '&family=IBM+Plex+Sans+Condensed:wght@600&family=IBM+Plex+Sans:wght@400;600&display=swap">',
           f"<style>{CSS}</style><main>",
           f"<header><h1>{esc(a.title)}</h1></header>",
           '<section class="verdict">',
           f"<p><strong>Blind judge's pick: {esc(winner)}.</strong> {esc(syn.get('rationale'))}</p>",
           '<p class="nums">'
           + " · ".join(f"{esc(name[l])}: {it.get(l + '_only', 0)} unique items kept, {err.get(l, 0)} errors"
                        for l in ("A", "B"))
           + f" · shared {it.get('both', 0)} · merger added {it.get('synth_added', 0)}</p>"]
    for l in ("A", "B"):
        if uc.get(l):
            out.append(f'<div><span class="lbl {cls[l]}">Only {esc(name[l])} caught</span><ul>'
                       + "".join(f"<li>{esc(x)}</li>" for x in uc[l]) + "</ul></div>")
    if comp.get("concerns"):
        out.append('<div><span class="lbl m">Concerns for the gate</span><ul>'
                   + "".join(f"<li>{esc(x)}</li>" for x in comp["concerns"]) + "</ul></div>")
    out.append("</section>")

    out.append('<section><h2>Side by side</h2><div class="scroll"><table><thead><tr><th>Aspect</th>'
               f'<th class="a">{esc(name["A"])}</th><th class="b">{esc(name["B"])}</th>'
               '<th class="m">Merged</th></tr></thead><tbody>')
    for r in comp.get("rows", []):
        out.append(f'<tr><td class="aspect">{esc(r.get("aspect"))}</td><td>{esc(r.get("a"))}</td>'
                   f'<td>{esc(r.get("b"))}</td><td>{esc(r.get("merged"))}<div class="why">'
                   f'{pick_label(r.get("pick"))} {esc(r.get("why"))}</div></td></tr>')
    out.append("</tbody></table></div></section>")

    t = comp.get("tests")
    if t:
        out.append('<section><h2>Tests</h2><div class="cols">'
                   + "".join(f'<div><div class="lbl {c}">{esc(n)}</div>{esc(t.get(k))}</div>'
                             for k, c, n in (("a", "a", name["A"]), ("b", "b", name["B"]),
                                             ("merged", "m", "Merged")))
                   + "</div></section>")

    if comp.get("excerpts"):
        out.append("<section><h2>Excerpts</h2>")
        for e in comp["excerpts"]:
            out.append(f'<h3 style="font:600 1rem var(--display);margin:14px 0 8px">{esc(e.get("aspect"))}</h3>'
                       '<div class="cols">'
                       f'<div><div class="lbl a">{esc(name["A"])}</div><pre>{esc(e.get("a"))}</pre></div>'
                       f'<div><div class="lbl b">{esc(name["B"])}</div><pre>{esc(e.get("b"))}</pre></div></div>')
        out.append("</section>")
    out.append("</main>")

    dest = Path(a.out) if a.out else d / "comparison.html"
    dest.write_text("\n".join(out))
    print(dest)


if __name__ == "__main__":
    main()
