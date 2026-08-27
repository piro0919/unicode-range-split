import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { create as createFont } from "fontkit";
import subsetFont from "subset-font";
import { collectText } from "./collect";
import { buildCss, type FallbackFace } from "./css";
import { type AlwaysInclude, toPredicate, toUnicodeRange } from "./ranges";

export type TargetFormat = "sfnt" | "truetype" | "woff" | "woff2";

const EXTENSION: Record<TargetFormat, string> = {
  sfnt: ".ttf",
  truetype: ".ttf",
  woff: ".woff",
  woff2: ".woff2",
};

export type SplitFontOptions = {
  /** Codepoints kept in the common tier regardless of the scanned text. */
  alwaysInclude?: AlwaysInclude;
  /** Where to write the generated CSS. Returned either way when omitted. */
  cssPath?: string;
  /** `font-display`. Defaults to "swap". */
  display?: string;
  /** Extensions read inside a scanned directory. */
  extensions?: string[];
  /** A metric-matched local face, to hold the layout still until the font lands. */
  fallback?: FallbackFace;
  /** The `font-family` the generated CSS declares. */
  family: string;
  /** Output format. Defaults to "woff2". */
  format?: TargetFormat;
  /** Put a content hash in the filenames. Defaults to true. */
  hash?: boolean;
  /** Filename prefix. Defaults to the source font's basename. */
  id?: string;
  /** Directory the font files are written to. */
  outDir: string;
  /** URL prefix the CSS points at. Defaults to "/fonts". */
  publicPath?: string;
  /** Files and directories to read characters from. */
  scan?: string[];
  /** The font to split. */
  source: string;
  /** `font-style`. Defaults to "normal". */
  style?: string;
  /** Characters that must land in the common tier, on top of `scan`. */
  text?: string;
  /** `font-weight`. Defaults to 400. */
  weight?: number | string;
};

export type Tier = {
  /** Codepoints this tier carries. */
  characters: number;
  /** File size in bytes. */
  bytes: number;
  /** Filename, hash included. */
  file: string;
  /** Path on disk. */
  path: string;
  /** URL the CSS points at. */
  url: string;
};

export type SplitFontResult = {
  /** The generated `@font-face` rules. */
  css: string;
  /** Where the CSS was written, when `cssPath` was given. */
  cssPath?: string;
  family: string;
  source: { bytes: number; characters: number };
  tiers: { common: Tier; rest: Tier };
  /** The rare tier's `unicode-range` value. */
  unicodeRange: string;
};

/** Remove this font's earlier output, leaving anything else in the directory. */
async function clean(
  outDir: string,
  id: string,
  extension: string,
): Promise<void> {
  const pattern = new RegExp(
    `^${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(common|rest)\\.`,
  );

  for (const file of await readdir(outDir).catch(() => [])) {
    if (pattern.test(file) && extname(file) === extension) {
      await rm(join(outDir, file), { force: true });
    }
  }
}

/**
 * Split one font into a common tier and a rare tier.
 *
 * No glyph is dropped. Every codepoint the source covers lands in exactly one of
 * the two files: the ones the scanned text uses go in the common tier that every
 * page fetches, and the rest wait behind a `unicode-range` until a page actually
 * asks for one of them.
 */
export async function splitFont(
  options: SplitFontOptions,
): Promise<SplitFontResult> {
  const {
    alwaysInclude,
    cssPath,
    display = "swap",
    extensions,
    fallback,
    family,
    format = "woff2",
    hash = true,
    outDir,
    publicPath = "/fonts",
    scan = [],
    source,
    style = "normal",
    text = "",
    weight = 400,
  } = options;
  const id = options.id ?? basename(source, extname(source));
  const buffer = await readFile(source);
  /* Everything the source font covers. The two tiers are dealt from this set,
     so a rare kanji cannot go missing by being left out of both. */
  const covered = new Set<number>(createFont(buffer).characterSet);
  const scanned =
    scan.length > 0 ? await collectText(scan, { extensions }) : "";
  const isAlwaysIncluded = toPredicate(alwaysInclude);
  const common = new Set<number>();

  for (const character of `${scanned}${text}`) {
    const code = character.codePointAt(0);

    if (code !== undefined && covered.has(code)) common.add(code);
  }

  for (const code of covered) {
    if (isAlwaysIncluded(code)) common.add(code);
  }

  const rest = new Set([...covered].filter((code) => !common.has(code)));

  if (rest.size === 0) {
    throw new Error(
      `${id}: the scanned text uses every character the font covers, so there is nothing to defer. Narrow "scan", or leave this font whole.`,
    );
  }

  const extension = EXTENSION[format];

  await mkdir(outDir, { recursive: true });
  await clean(outDir, id, extension);

  const written: Record<string, Tier> = {};

  for (const [name, codes] of [
    ["common", common],
    ["rest", rest],
  ] as const) {
    const subsetText = [...codes]
      .map((code) => String.fromCodePoint(code))
      .join("");
    const output = await subsetFont(buffer, subsetText, {
      targetFormat: format,
    });
    /* Hash the contents into the name. A host that serves fonts immutable will
       otherwise keep handing out the old file after a rebuild. */
    const digest = hash
      ? `.${createHash("sha256").update(output).digest("hex").slice(0, 8)}`
      : "";
    const file = `${id}-${name}${digest}${extension}`;
    const path = join(outDir, file);

    await writeFile(path, output);

    written[name] = {
      bytes: output.length,
      characters: codes.size,
      file,
      path,
      url: `${publicPath.replace(/\/$/, "")}/${file}`,
    };
  }

  const tiers = written as { common: Tier; rest: Tier };
  const unicodeRange = toUnicodeRange(rest);
  const css = buildCss(
    { display, fallback, family, style, weight },
    { unicodeRange, urls: { common: tiers.common.url, rest: tiers.rest.url } },
    format === "woff2" ? "woff2" : format === "woff" ? "woff" : "truetype",
  );

  if (cssPath !== undefined) {
    await mkdir(dirname(cssPath), { recursive: true });
    await writeFile(cssPath, css);
  }

  return {
    css,
    cssPath,
    family,
    source: { bytes: buffer.length, characters: covered.size },
    tiers,
    unicodeRange,
  };
}

/** Split several fonts, one after another. */
export async function splitFonts(
  fonts: SplitFontOptions[],
): Promise<SplitFontResult[]> {
  const results: SplitFontResult[] = [];

  for (const font of fonts) {
    results.push(await splitFont(font));
  }

  return results;
}
