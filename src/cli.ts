import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import type { Config } from "./config";
import {
  assertDistinctIds,
  isTargetFormat,
  type SplitFontOptions,
  type SplitFontResult,
  splitFont,
  TARGET_FORMATS,
} from "./split";

const CONFIG_NAMES = [
  "unicode-range-split.config.js",
  "unicode-range-split.config.mjs",
  "unicode-range-split.config.cjs",
  "unicode-range-split.config.json",
];

const USAGE = `unicode-range-split — split a font into a common tier and a rare tier

  unicode-range-split [config]

Without an argument it looks for one of:
  ${CONFIG_NAMES.join("\n  ")}

Or describe a single font on the command line:

  unicode-range-split --source src/font.woff2 --family "My Face" \\
    --out-dir public/fonts --scan src,content --css src/font.css

Options:
  --source <path>       the font to split (required)
  --family <name>       font-family the generated CSS declares (required)
  --out-dir <path>      where the font files go (required)
  --scan <a,b>          files and directories to read characters from
  --text <string>       extra characters for the common tier
  --css <path>          write the generated CSS here
  --public-path <path>  URL prefix the CSS points at (default /fonts)
  --weight <value>      font-weight (default 400)
  --style <value>       font-style (default normal)
  --display <value>     font-display (default swap)
  --format <value>      ${TARGET_FORMATS.join(" | ")} (default woff2)
  --id <name>           filename prefix (default the font's basename)
  --no-hash             leave the content hash out of the filenames
  -h, --help            this text
`;

const OPTIONS = {
  css: { type: "string" },
  display: { type: "string" },
  family: { type: "string" },
  format: { type: "string" },
  help: { short: "h", type: "boolean" },
  id: { type: "string" },
  "no-hash": { type: "boolean" },
  "out-dir": { type: "string" },
  "public-path": { type: "string" },
  scan: { type: "string" },
  source: { type: "string" },
  style: { type: "string" },
  text: { type: "string" },
  weight: { type: "string" },
} as const;

type Flags = ReturnType<typeof parseFlags>["values"];

/** Unknown flags are an error: a typo would otherwise be ignored silently. */
function parseFlags(argv: string[]) {
  try {
    return parseArgs({
      allowPositionals: true,
      args: argv,
      options: OPTIONS,
      strict: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `${message}\nRun unicode-range-split --help for the options.`,
    );
  }
}

function fromFlags(flags: Flags): SplitFontOptions {
  const { family, format, source } = flags;
  const outDir = flags["out-dir"];

  if (
    source === undefined ||
    family === undefined ||
    outDir === undefined ||
    source === "" ||
    family === "" ||
    outDir === ""
  ) {
    throw new Error("--source, --family and --out-dir are all required");
  }

  if (format !== undefined && !isTargetFormat(format)) {
    throw new Error(
      `--format must be one of ${TARGET_FORMATS.join(", ")}, not "${format}"`,
    );
  }

  const scan = flags.scan;

  return {
    cssPath: flags.css,
    display: flags.display,
    family,
    format,
    hash: flags["no-hash"] !== true,
    id: flags.id,
    outDir,
    publicPath: flags["public-path"],
    scan: scan === undefined || scan === "" ? [] : scan.split(","),
    source,
    style: flags.style,
    text: flags.text,
    weight: flags.weight,
  };
}

/** Drop the keys a flag did not set, so the defaults in splitFont still apply. */
function compact(options: SplitFontOptions): SplitFontOptions {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  ) as unknown as SplitFontOptions;
}

async function findConfig(argument?: string): Promise<null | string> {
  const candidates =
    argument === undefined
      ? CONFIG_NAMES.map((name) => resolve(process.cwd(), name))
      : [resolve(process.cwd(), argument)];

  for (const candidate of candidates) {
    const found = await stat(candidate).then(
      () => true,
      () => false,
    );

    if (found) return candidate;
  }

  return null;
}

async function loadConfig(path: string): Promise<SplitFontOptions[]> {
  /* JSON is read rather than imported: import attributes are not available in
     every environment this build targets, and JSON.parse needs no attribute. */
  const value = path.endsWith(".json")
    ? (JSON.parse(await readFile(path, "utf8")) as unknown)
    : await import(pathToFileURL(path).href).then((loaded: unknown) =>
        loaded !== null && typeof loaded === "object" && "default" in loaded
          ? (loaded as { default: unknown }).default
          : loaded,
      );
  const config = value as Config;

  if (Array.isArray(config)) return config;

  return "fonts" in config ? config.fonts : [config];
}

/** Resolve every path in the config against the directory the command ran in. */
function absolute(font: SplitFontOptions, root: string): SplitFontOptions {
  const against = (path: string): string =>
    isAbsolute(path) ? path : resolve(root, path);

  return {
    ...font,
    cssPath: font.cssPath === undefined ? undefined : against(font.cssPath),
    outDir: against(font.outDir),
    scan: font.scan?.map(against),
    source: against(font.source),
  };
}

function kib(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KiB`;
}

/** Say so when scanning found nothing: the common tier then holds only `text` and the always-included set. */
function warn(font: SplitFontOptions, { family, scan }: SplitFontResult): void {
  const shown = (path: string): string => relative(process.cwd(), path) || ".";

  for (const path of scan.missing) {
    console.error(`warning: ${family}: scan path not found: ${shown(path)}`);
  }

  if ((font.scan?.length ?? 0) > 0 && scan.characters === 0) {
    console.error(
      `warning: ${family}: scanning found no characters this font covers; check "scan"`,
    );
  }
}

function report({ family, source, tiers }: SplitFontResult): void {
  const saved = Math.round((1 - tiers.common.bytes / source.bytes) * 100);

  console.log(
    [
      `${family}`,
      `  common  ${String(tiers.common.characters).padStart(6)} chars  ${kib(tiers.common.bytes).padStart(9)}  ${tiers.common.file}`,
      `  rest    ${String(tiers.rest.characters).padStart(6)} chars  ${kib(tiers.rest.bytes).padStart(9)}  ${tiers.rest.file}`,
      `  every page now fetches ${kib(tiers.common.bytes)} instead of ${kib(source.bytes)} (${saved}% less)`,
    ].join("\n"),
  );
}

export async function run(argv: string[]): Promise<number> {
  const { positionals, values: flags } = parseFlags(argv);

  if (flags.help === true) {
    console.log(USAGE);

    return 0;
  }

  const positional = positionals[0];
  const fonts =
    flags.source !== undefined
      ? [compact(fromFlags(flags))]
      : await (async (): Promise<SplitFontOptions[]> => {
          const path = await findConfig(positional);

          if (path === null) {
            console.error(
              `no config found. Looked for ${CONFIG_NAMES.join(", ")} in ${process.cwd()}.\n\n${USAGE}`,
            );

            return [];
          }

          return loadConfig(path);
        })();

  if (fonts.length === 0) return 1;

  const resolved = fonts.map((font) => absolute(font, process.cwd()));

  assertDistinctIds(resolved);

  for (const font of resolved) {
    const result = await splitFont(font);

    warn(font, result);
    report(result);
  }

  return 0;
}
