import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";

/** Files read when a scanned path is a directory. */
export const DEFAULT_EXTENSIONS = [
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".svelte",
  ".ts",
  ".tsx",
  ".txt",
  ".vue",
];

export type CollectOptions = {
  /** Extensions read inside a scanned directory. */
  extensions?: string[];
  /** Directory names skipped while walking. */
  ignore?: string[];
};

const DEFAULT_IGNORE = [".git", ".next", "dist", "node_modules", "out"];

async function walk(
  target: string,
  extensions: Set<string>,
  ignore: Set<string>,
): Promise<string[]> {
  const entries = await readdir(target, { withFileTypes: true }).catch(
    () => null,
  );

  /* Not a directory: the caller named a single file, so take it as it is.
     Filtering by extension here would silently drop an explicitly named file. */
  if (entries === null) return [target];

  const files: string[] = [];

  for (const entry of entries) {
    if (ignore.has(entry.name)) continue;

    const full = join(target, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(full, extensions, ignore)));
    } else if (extensions.has(extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

/**
 * Read every scanned path and return the text as one string. Unreadable files
 * are skipped: a missing path should not stop a build over a font tier.
 */
export async function collectText(
  paths: string[],
  {
    extensions = DEFAULT_EXTENSIONS,
    ignore = DEFAULT_IGNORE,
  }: CollectOptions = {},
): Promise<string> {
  const extensionSet = new Set(extensions);
  const ignoreSet = new Set(ignore);
  let text = "";

  for (const path of paths) {
    /* stat first so a path that does not exist is skipped rather than read as
       a one-file list and then reported as an unreadable file. */
    const exists = await stat(path).then(
      () => true,
      () => false,
    );

    if (!exists) continue;

    for (const file of await walk(path, extensionSet, ignoreSet)) {
      text += await readFile(file, "utf8").catch(() => "");
    }
  }

  return text;
}
