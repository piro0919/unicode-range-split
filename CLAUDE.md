# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**unicode-range-split** splits a font into a common tier and a rare tier tied
together by `unicode-range`. Its differentiator over ordinary subsetting: no
glyph is dropped, so a rare kanji still renders in the right face — it just
arrives in a second file.

- **npm package:** unicode-range-split
- **Demo site:** <https://unicode-range-split.kkweb.io>

## Tech Stack

- TypeScript 5, `fontkit` (reading the source's coverage) and `subset-font`
  (harfbuzz) as the only runtime dependencies
- Next.js 16 (App Router) — demo site only
- Biome (linter/formatter)
- tsup (library build, ESM + CJS, plus the `bin`)
- Vitest — tests
- Vercel (deployment)

## Project Structure

```text
src/
├── index.ts        # public API
├── split.ts        # the split itself
├── collect.ts      # reading characters out of a project's files
├── css.ts          # the @font-face rules
├── ranges.ts       # always-included codepoints, unicode-range folding
├── cli.ts          # argument and config handling
├── bin.ts          # the executable
└── app/            # Next.js App Router (demo site)
scripts/
└── demo-font.mjs   # splits the demo font the site is set in
tests/
└── fixtures/       # a Sora subset; see its README before replacing it
assets/             # Fraunces subset drawn into the Open Graph card
```

## Design notes

- **The order of the two `@font-face` rules is the mechanism.** Common tier
  first with no `unicode-range`, rare tier second with an explicit one. A later
  rule wins for the codepoints it names. Reverse them and the rare tier never
  loads; give the common tier a range and every page parses a long value for
  nothing.
- **The two tiers are dealt from the source's own character set**, so a
  codepoint cannot go missing by being left out of both. `splitFont` throws
  rather than writing a rare tier with nothing in it.
- **`alwaysInclude` exists so the common tier is stable.** Latin, punctuation,
  kana and the fullwidth forms stay in it whatever the text says; otherwise one
  new article moves a bracket across the line and every page pays for it.
- **Filenames carry a content hash** because hosts serve fonts immutable.
- **`clean` only removes this font's own output**, matched by `id`. Licence
  files sit next to the fonts and must survive a rerun.

## Demo site

The site is set in the two tiers it produced from Noto Sans JP, and the corpus
is the site's own copy — `scripts/demo-font.mjs` scans `src/app`. Every figure
on the page comes from `src/app/demo-font.json`, written by that script.

The rare-kanji samples in `tier-probe.tsx` are spelled as codepoints on purpose:
written as characters they would land in the scanned copy, move into the common
tier, and stop demonstrating anything.

Regenerate after changing the copy:

```sh
curl -sL -o /tmp/NotoSansJP-VF.ttf \
  "https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/TTF/Subset/NotoSansJP-VF.ttf"
fonttools varLib.instancer /tmp/NotoSansJP-VF.ttf wght=400 -o /tmp/noto400.ttf
pnpm demo:font
```

## Commands

```bash
pnpm dev         # demo site
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
pnpm lint        # biome check
pnpm build:lib   # tsup -> dist
pnpm build       # next build (demo site)
pnpm demo:font   # rebuild the demo font's two tiers
```

## Testing

The fixture is a Latin-only Sora subset, and the default always-included ranges
keep all of Latin in the common tier — so most tests pin `alwaysInclude` to the
uppercase letters to get two non-empty tiers. The few codepoints above U+20FF in
the fixture are what let the default path be tested at all.

When changing the split, break it deliberately and confirm the tests fail before
restoring. The one that matters is "keeps every glyph": it reads both written
files back with fontkit and checks the union against the source.

## Releasing

Bump `version` in `package.json`, add a `CHANGELOG.md` entry, then push a
`vX.Y.Z` tag. The publish workflow checks the tag against `package.json`.
