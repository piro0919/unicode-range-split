# unicode-range-split

Splits a font into two files: the characters your site actually uses, and
everything else. No glyph is dropped.

```js
// unicode-range-split.config.js
export default {
  fonts: [
    {
      source: "src/fonts/NotoSansJP-400.ttf",
      family: "Noto Sans JP",
      outDir: "public/fonts",
      cssPath: "src/app/noto.css",
      scan: ["src", "content", "messages"],
    },
  ],
};
```

```bash
npx unicode-range-split
```

```text
Noto Sans JP
  common    1193 chars    125 KiB  noto-common.0568b082.woff2
  rest     15539 chars    2.0 MiB  noto-rest.6bc37b03.woff2
  every page now fetches 125 KiB instead of 5.5 MiB (98% less)
```

Ordinary pages fetch the small file. The other one waits behind a
`unicode-range` until a page uses a character from it.

<https://unicode-range-split.kkweb.io> is set in the two files this produced,
and shows the second one being fetched the moment you type a rare kanji.

## Why not just subset the font

Subsetting to the characters you use today is the usual advice, and it works
until someone's name has a kanji nobody wrote before. That character is then
missing from your typeface: the browser falls back to whatever the system has,
and one glyph in the middle of a line is set in a different face at a different
weight.

The split keeps the whole coverage and moves the cost instead. The common tier
is what every page pays for. The rare tier is a file most visitors never fetch,
and the ones who do get it once.

## Install

```bash
npm install -D unicode-range-split
```

## Use it from the command line

With a config file — `unicode-range-split.config.js`, `.mjs`, `.cjs` or
`.json`, holding one font, an array of fonts, or `{ fonts: [...] }`:

```bash
npx unicode-range-split              # finds the config
npx unicode-range-split fonts.json   # or takes a path
```

Or describe one font in flags:

```bash
npx unicode-range-split \
  --source src/fonts/NotoSansJP-400.ttf \
  --family "Noto Sans JP" \
  --out-dir public/fonts \
  --scan src,content \
  --css src/app/noto.css
```

## Use it from a script

```js
import { splitFont } from "unicode-range-split";

const { css, tiers, unicodeRange } = await splitFont({
  source: "src/fonts/NotoSansJP-400.ttf",
  family: "Noto Sans JP",
  outDir: "public/fonts",
  scan: ["src", "content"],
});

tiers.common.url; // "/fonts/NotoSansJP-400-common.1f4a9c2b.woff2"
tiers.rest.bytes; // the file most visitors never fetch
```

`splitFonts([...])` runs several, one after another.

## Options

| Option | Default | |
| ---- | ---- | ---- |
| `source` | — | the font to split |
| `family` | — | the `font-family` the generated CSS declares |
| `outDir` | — | where the font files are written |
| `scan` | `[]` | files and directories to read characters from |
| `text` | `""` | extra characters for the common tier |
| `cssPath` | — | write the generated CSS here; it is returned either way |
| `publicPath` | `"/fonts"` | the URL prefix the CSS points at |
| `id` | the source's basename | filename prefix |
| `format` | `"woff2"` | `woff2`, `woff` or `sfnt` |
| `hash` | `true` | put a content hash in the filenames |
| `weight` `style` `display` | `400` `normal` `swap` | the descriptors |
| `alwaysInclude` | Latin, punctuation, kana, fullwidth | codepoints kept in the common tier whatever the text says |
| `fallback` | — | a metric-matched `local()` face |
| `extensions` | source and content extensions | what to read inside a scanned directory |

### `alwaysInclude`

Latin, punctuation, kana and the fullwidth forms stay in the common tier even
when your text does not use them. Without that, adding one article that happens
to use a bracket you had not used before moves that bracket into the rare tier
and makes every ordinary page fetch it.

Pass ranges or a predicate to decide differently:

```js
alwaysInclude: [[0x0000, 0x20ff], [0x3000, 0x30ff]]
alwaysInclude: (code) => code < 0x2000
```

### `fallback`

The line boxes change width the moment a webfont arrives, and the text reflows
in front of the reader. A metric-matched face built from a font they already
have holds the layout still:

```js
fallback: {
  family: "Noto Sans JP Fallback",
  local: "Arial",
  ascent: "117%",
  descent: "29.05%",
  lineGap: "0.0%",
  sizeAdjust: "99.15%",
}
```

## What it writes

```css
@font-face {
  font-display: swap;
  font-family: "Noto Sans JP";
  font-style: normal;
  font-weight: 400;
  src: url("/fonts/noto-common.0568b082.woff2") format("woff2");
}

@font-face {
  font-display: swap;
  font-family: "Noto Sans JP";
  font-style: normal;
  font-weight: 400;
  src: url("/fonts/noto-rest.6bc37b03.woff2") format("woff2");
  unicode-range: U+4E18-4E19,U+4E32,U+4E39,/* … */;
}
```

The order is the mechanism. The common tier is declared first with no range, so
it claims every character; the rare tier follows with an explicit range, and a
later rule wins for the characters it names. Swap the two and the rare tier is
never fetched.

Filenames carry a content hash, because a host that serves fonts immutable will
otherwise keep handing out the old file after a rebuild.

## Rerunning it

Run it when your writing changes — as a `prebuild` script, or by hand. Forget,
and nothing breaks: the new characters are still in the font, they just come
from the second file.

```json
{ "scripts": { "prebuild": "unicode-range-split" } }
```

## Licence

MIT
