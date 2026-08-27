import { readFile, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  type SplitFontOptions,
  type SplitFontResult,
  splitFont,
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
  --format <value>      woff2 | woff | sfnt (default woff2)
  --id <name>           filename prefix (default the font's basename)
  --no-hash             leave the content hash out of the filenames
  -h, --help            this text
`;

function parseFlags(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === undefined || !argument.startsWith("--")) continue;

    const body = argument.slice(2);
    const equals = body.indexOf("=");
    const name = equals === -1 ? body : body.slice(0, equals);
    const inline = equals === -1 ? undefined : body.slice(equals + 1);
    /* A flag either carries its value after "=" or in the next argument.
       Anything else is a boolean flag such as --no-hash. */
    const next = argv[index + 1];
    const value =
      inline ?? (next !== undefined && !next.startsWith("--") ? next : "");

    if (inline === undefined && value !== "") index += 1;

    flags.set(name, value);
  }

  return flags;
}

function fromFlags(flags: Map<string, string>): SplitFontOptions {
  const source = flags.get("source");
  const family = flags.get("family");
  const outDir = flags.get("out-dir");

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

  const scan = flags.get("scan");
  const format = flags.get("format");

  return {
    cssPath: flags.get("css"),
    display: flags.get("display"),
    family,
    format: format as SplitFontOptions["format"],
    hash: !flags.has("no-hash"),
    id: flags.get("id"),
    outDir,
    publicPath: flags.get("public-path"),
    scan: scan === undefined || scan === "" ? [] : scan.split(","),
    source,
    style: flags.get("style"),
    text: flags.get("text"),
    weight: flags.get("weight"),
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
  const config = value as
    | SplitFontOptions
    | SplitFontOptions[]
    | { fonts: SplitFontOptions[] };

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
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);

    return 0;
  }

  const flags = parseFlags(argv);
  const positional = argv.find((argument) => !argument.startsWith("--"));
  const fonts = flags.has("source")
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

  for (const font of fonts) {
    report(await splitFont(absolute(font, process.cwd())));
  }

  return 0;
}
