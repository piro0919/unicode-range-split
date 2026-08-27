// Split the demo font the site is set in, using the site's own copy as the
// corpus. Every figure the page prints comes from this run; none is typed in.
//
// The source font is not in the repository — it is 5.7 MB, and the two tiers it
// produces are all the site needs. Fetch it once, then run `pnpm demo:font`:
//
//   curl -sL -o /tmp/NotoSansJP-VF.ttf \
//     "https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/TTF/Subset/NotoSansJP-VF.ttf"
//   fonttools varLib.instancer /tmp/NotoSansJP-VF.ttf wght=400 -o /tmp/noto400.ttf
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { create as createFont } from "fontkit";
import { splitFont } from "../dist/index.js";

const source = process.argv[2] ?? "/tmp/noto400.ttf";
const root = join(import.meta.dirname, "..");

const result = await splitFont({
  cssPath: join(root, "src/app/demo-font.css"),
  family: "Noto Sans JP Split",
  id: "noto",
  outDir: join(root, "public/fonts"),
  // The site's own words decide the common tier, exactly as a real site's would.
  scan: [join(root, "src/app")],
  source,
});

/* Read the characters back out of the file that shipped, rather than trusting
   the plan: the page tells visitors which tier a key lands in, and it should be
   answering from the font it actually serves. */
const common = createFont(
  await readFile(result.tiers.common.path),
).characterSet;

await writeFile(
  join(root, "src/app/demo-font.json"),
  `${JSON.stringify(
    {
      common: {
        bytes: result.tiers.common.bytes,
        characters: result.tiers.common.characters,
        file: result.tiers.common.file,
      },
      // Codepoints, so the page can classify a key press without the font.
      commonCodepoints: common,
      family: result.family,
      rest: {
        bytes: result.tiers.rest.bytes,
        characters: result.tiers.rest.characters,
        file: result.tiers.rest.file,
      },
      source: result.source,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `common ${result.tiers.common.characters} chars ${result.tiers.common.file}\n` +
    `rest   ${result.tiers.rest.characters} chars ${result.tiers.rest.file}`,
);
