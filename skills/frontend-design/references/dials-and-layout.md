# Dials, Layout Discipline, and Dark Mode

Load this while drafting the token/layout plan, alongside `ai-tells.md`. Adapted from
[taste-skill](https://github.com/Leonxlnx/taste-skill).

## The three dials

Set these after the design read; every layout, motion, and density decision is gated by
them. Baseline `8 / 6 / 4` unless the design read overrides them — overrides happen
conversationally, never by asking the user to edit a config file.

- **`DESIGN_VARIANCE`** (1-10) — 1 = perfect symmetry, 10 = artsy chaos
- **`MOTION_INTENSITY`** (1-10) — 1 = static, 10 = cinematic/physics
- **`VISUAL_DENSITY`** (1-10) — 1 = art gallery/airy, 10 = cockpit/packed data

| Signal | VARIANCE | MOTION | DENSITY |
| --- | --- | --- | --- |
| minimalist / calm / editorial / Linear-style | 5-6 | 3-4 | 2-3 |
| premium consumer / Apple-y / luxury / brand | 7-8 | 5-7 | 3-4 |
| playful / Dribbble / Awwwards / experimental | 9-10 | 8-10 | 3-4 |
| landing/portfolio/marketing (default) | 7-9 | 6-8 | 3-5 |
| trust-first / public-sector / accessibility-critical | 3-4 | 2-3 | 4-5 |
| redesign — preserve | match existing | +1 | match existing |
| redesign — overhaul | +2 | +2 | match existing |

Use these exact variable names throughout a session — never invent aliases like
`LAYOUT_VARIANCE`.

## Layout discipline (hard rules — failing any of these ships broken work)

- **Hero fits the initial viewport.** Headline max 2 lines desktop, subtext max 20 words
  and max 3-4 lines, CTAs visible without scroll. A 4-line hero headline is a font-size
  error, never a copy-length one.
- **Hero font-scale discipline.** Plan font size and image size together; don't start at
  `text-7xl/8xl` with a >6-word headline. Default `text-4xl md:text-5xl lg:text-6xl`;
  `text-6xl md:text-7xl` only for 3-5 word headlines.
- **Hero top padding cap:** max `pt-24` (~6rem) desktop. More reads as a layout bug, not
  intentional space — fix by increasing font/asset scale, not padding.
- **Hero stack discipline (max 4 text elements):** eyebrow OR brand strip (pick zero or
  one), headline, subtext, CTAs (1 primary + max 1 secondary). Banned in the hero: tiny
  tagline below CTAs, trust micro-strip, pricing teaser, feature bullets, social-proof
  avatar row — all of those move to a dedicated section below the hero.
- **Trust/logo walls live under the hero,** never inside it.
- **Nav renders on one line on desktop.** Condense, drop secondary items, or hamburger
  before letting it wrap. Height cap 80px max, default 64-72px.
- **Bento grids need rhythm.** Never 6 left-image/right-text rows in a row. Cell count =
  content count exactly (3 items → 3 cells, not a blank filler tile).
- **Section-layout-repetition ban.** Once a layout family is used (3-col cards, full-width
  quote, split-text-image), it appears at most once per page. An 8-section page needs at
  least 4 different layout families.
- **Zigzag alternation cap:** max 2 consecutive image+text-split sections. The 3rd
  consecutive one fails pre-flight — break it with a full-width, vertical-stack, bento, or
  marquee section.
- **Eyebrow restraint (the #1 violated rule):** max 1 eyebrow per 3 sections (hero counts
  as 1). If section A has one, the next 2 can't. Mechanical check: count `uppercase
  tracking`-style labels; fail if count > ceil(sectionCount / 3). Default to no eyebrow —
  the headline alone is usually enough.
- **Split-header ban:** "left big headline + right small explainer paragraph" as a section
  header is banned as default. Stack vertically instead, unless the right column carries a
  real visual/interactive element.
- **Bento background diversity:** at least 2-3 cells in any multi-cell grid need real
  visual variation (image, brand gradient, pattern, tint) — not 6 white-on-white cards.
- **Mobile collapse declared per section**, not assumed ("Tailwind handles it").

## Content density

- Default per section: headline ≤8 words + sub-paragraph ≤25 words + one visual asset OR
  one CTA. More must be justified by the section's job.
- No data-dump sections (20-row tables, 30-row lists) on a marketing page — top 3-5
  highlights + "view full list," a marquee/carousel, or a dedicated page instead.
- Lists >5 items need a real component (card grid, tabs/accordion, scroll-snap pills,
  carousel, marquee), not a longer `<ul>`.
- Spec sheets: never a `border-b`-per-row table. Use a 2-col card grid, scroll-snap pills,
  grouped clusters with one divider each, or featured-vs-rest with a disclosure.
- **Copy self-audit before shipping:** re-read every visible string for grammatical breaks,
  unclear referents, AI-hallucination tells (forced metaphors, cute-but-wrong wordplay),
  and passive-aggressive faux-thoughtful phrasing. Replace anything flagged with a plain
  functional sentence — boring beats AI-cute.
- Fake-precise numbers (`92%`, `4.1×`, `5.8mm`) are banned unless real, explicitly labeled
  mock, or genuinely sourced from the brief.
- One copy register per page — don't mix technical mono, editorial prose, and marketing
  punch unless the brand voice explicitly calls for it.

## Quotes & testimonials

Max 3 lines of quote body (never 6) — cut the original if longer. No em-dash inside quote
text. Attribution is name + role + (optionally) company, never name alone. Real
typographic quote marks, not straight ASCII ones.

## Page theme lock

The page has one theme; sections don't invert mid-scroll. A deliberate "theme switch on
scroll" device is allowed once per page if the brief calls for it; otherwise pick
light/dark/`prefers-color-scheme` at the page root and lock it there (not per-section).

## Dark mode protocol

Dual-mode by default unless the brief is print-emulating editorial.

- **Token strategy** (pick one, stick to it): Tailwind `dark:` variant paired on every
  color utility, or CSS variables (`--surface`, `--text-primary`, etc.) swapped under
  `[data-theme="dark"]`/`prefers-color-scheme` — for shadcn/Radix-style theming.
- This skill enforces contrast (WCAG AA body text, AAA target for hero copy), hierarchy
  parity between modes, brand-color fidelity, and no pure `#000`/`#fff` — the brief and
  brand decide the actual colors.
- Respect `prefers-color-scheme` by default; add a manual toggle only if either mode would
  lose key brand expression.
- Test both modes before finishing — never ship having seen only one.
