# AI Tells (Forbidden Patterns)

Load this before final self-critique, or whenever a page feels "templated" and you can't
name why. Adapted from [taste-skill](https://github.com/Leonxlnx/taste-skill). Avoid these
signatures unless the brief explicitly asks for them.

## Visual & CSS
- No neon / outer glows by default — inner borders or subtle tinted shadows instead.
- No pure black (`#000000`) or pure white (`#ffffff`) — off-black (zinc-950) and off-white.
- No oversaturated accents — desaturate to blend with neutrals.
- No excessive gradient text on large headers.
- No custom mouse cursors — accessibility- and perf-hostile.

## Typography
- No oversized H1s that just scream. Control hierarchy with weight + color, not raw scale.
- Serif for editorial/luxury/publication only, never dashboards.

## Layout & spacing
- Mathematically perfect padding/margins — no floating elements with awkward gaps.
- No 3-column equal feature cards. That generic row is banned — use 2-column zig-zag,
  asymmetric grid, scroll-pinned, or horizontal-scroll instead.

## Content & data ("Jane Doe" effect)
- No generic names ("John Doe", "Sarah Chan") — creative, realistic, locale-appropriate.
- No generic avatars (SVG "egg," Lucide user icon) — believable photo placeholders.
- No fake-perfect numbers (`99.99%`, `50%`, round thousands) — organic, messy data
  (`47.2%`, real-looking phone numbers).
- No startup-slop brand names ("Acme", "Nexus", "SmartFlow") — invent contextual, premium
  names that sound real.
- No filler verbs ("Elevate", "Seamless", "Unleash", "Next-Gen", "Revolutionize") — concrete
  verbs only.

## External resources & components
- No hand-rolled SVG icons — use Phosphor / HugeIcons / Radix / Tabler (Lucide only on
  explicit request).
- No div-based fake screenshots — never build a fake product UI out of styled `<div>`s to
  simulate a screenshot. Real images, generated images, or skip the preview.
- No broken Unsplash links — use `https://picsum.photos/seed/{descriptive-string}/{w}/{h}`,
  generated placeholders, or real assets.
- shadcn/ui: never ship in default state — customize radii, colors, shadows, typography.

## Production-test tells (banned outright)

These came out of real LLM-generated landing-page tests — the signatures the model
defaults to when it tries to "look designed." Hard bans unless the brief explicitly calls
for one:

- **Version labels in the hero** (`V0.6`, `BETA`, `EARLY ACCESS`) unless the brief is
  explicitly about launch/preview status.
- **Section-number eyebrows** (`00 / INDEX`, `001 · Capabilities`) or `01 / 4`-style
  pagination on images/tiles, or `Scroll · 001 Capabilities` cues. Name the topic plainly.
- **Middle-dot (`·`) overuse** — max 1 per line in metadata strips, never the default
  separator everywhere.
- **Decorative colored status dots** on every list/nav/badge, unless it conveys real
  semantic state and is used sparingly.
- **Em-dash (`—`) anywhere, period** — see the dedicated ban below.
- **`<br>`-broken-and-italicized headlines** as a default "design move."
- **Vertical rotated text** ("INDEX OF WORK, 2018-2026" rotated 90°) — agency cliché,
  only when the brief is explicitly agency/Awwwards/experimental and it serves composition.
- **Crosshair/hairline grid lines** as pure decoration, not organizing real content.
- **Div-based fake product UI in the hero** (fake task list, terminal, dashboard) — the
  #1 LLM-design tell. Real screenshot, generated image, real component preview, or none.
- **Fake version footers** (`v0.6.2-rc.1`, "last sync 4s ago") inside fake screenshots.
- **"Quietly in use at" / "Quietly trusted by"** — use natural language or skip the heading.
- **Poetic section labels** ("Field notes", "On our desks", "Loose plates") — plain
  functional labels ("Testimonials", "Latest writing") or skip the label.
- **Mock-humble asides** ("We respect the French ones") in body copy.
- **Locale/time/weather strips** ("LIS 14:23 · 18°C") unless the brief is genuinely about a
  place or a timezone-distributed studio.
- **Micro-meta sentences under eyebrows** — Eyebrow + Headline + Body is enough.
- **Generic step labels** ("Stage 1 / Stage 2", "Phase 01 / Phase 02") — the actual step
  content is the label ("Install", "Configure", "Ship").
- **Pills/labels overlaid on images** (`Brand · 02`, `PLATE · BRAND`) — let the image speak,
  or caption below it.
- **Photo-credit captions as decoration** on stock/picsum images — only for a real credited
  photo with permission.
- **Version footers on marketing pages** (`v1.4.2`, `Build 0048`) — devtool fixtures, not
  landing-page content.
- **Live-stock counters** ("Reservation 412 of 800") unless the brief is a real waitlist.
- **Decoration text strips at hero bottom** (`BRAND. MOTION. SPATIAL.`) — agency cliché,
  banned unless it carries real navigable links or real status info.
- **Floating top-right sub-text** beside a giant left-aligned headline with no alignment
  to anything — put the sub-text under the headline or build a real 2-column header.
- **`border-t`+`border-b` on every row** of a long list/spec table — pick one, use sparsely.
- **Filled-track progress/score bars** as comparison visuals on a landing page — prefer a
  number + small icon, or a thin bar with no background track.
- **Locale/city/time/weather strips** for 99% of briefs — allowed only for a genuinely
  distributed studio, a travel brand, or a real physical venue.
- **Scroll cues** (`↓ scroll`, animated mouse-wheel) — if they haven't scrolled yet, they're
  looking at the hero; they know what scroll is.

## The em-dash ban (the single most-violated tell)

Em-dash (`—`) is completely banned. No "limited use" allowance, no "in body copy is fine"
exception. Banned in headlines, eyebrows, labels, pills, button text, captions, nav items,
body copy, and quote attribution — restructure with a period, comma, colon, or parentheses
instead. En-dash (`–`) as a separator is banned the same way; date and number ranges use a
regular hyphen (`2018-2026`, `€40-80k`).

The only permitted dash characters are the regular hyphen (`-`) and a minus sign in math
(`-5°C`). One `—` or `–` visible to the user fails the pre-flight check and must be rewritten.
