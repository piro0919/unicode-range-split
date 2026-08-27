import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create as createFont } from "fontkit";
import { describe, expect, it } from "vitest";
import { splitFont, splitFonts } from "../src/split";

const SOURCE = join(import.meta.dirname, "fixtures/Sora-400-subset.ttf");
/* The fixture is Latin only, and the default ranges keep all of Latin in the
   common tier. Pinning the always-included set to the uppercase letters is what
   gives these tests two non-empty tiers to look at. */
const ALWAYS = [[0x41, 0x5a]] as [number, number][];

async function out(): Promise<string> {
  return mkdtemp(join(tmpdir(), "split-"));
}

function codepoints(path: string): Promise<Set<number>> {
  return readFile(path).then(
    (buffer) => new Set<number>(createFont(buffer).characterSet),
  );
}

describe("splitFont", () => {
  it("keeps every glyph: the two tiers together cover the source exactly", async () => {
    const outDir = await out();
    const result = await splitFont({
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      outDir,
      source: SOURCE,
      text: "abc",
    });
    const source = await codepoints(SOURCE);
    const common = await codepoints(result.tiers.common.path);
    const rest = await codepoints(result.tiers.rest.path);

    for (const code of source) {
      expect(common.has(code) || rest.has(code)).toBe(true);
    }
  });

  it("puts the scanned characters in the common tier", async () => {
    const result = await splitFont({
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      outDir: await out(),
      source: SOURCE,
      text: "abc",
    });
    const common = await codepoints(result.tiers.common.path);

    for (const character of "abcXYZ") {
      expect(common.has(character.codePointAt(0) ?? 0)).toBe(true);
    }
  });

  it("leaves the unused characters out of the common tier", async () => {
    const result = await splitFont({
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      outDir: await out(),
      source: SOURCE,
      text: "abc",
    });
    const common = await codepoints(result.tiers.common.path);

    expect(common.has("z".codePointAt(0) ?? 0)).toBe(false);
    expect(result.tiers.common.bytes).toBeLessThan(result.source.bytes);
  });

  it("declares the common tier first and ranges only the rare one", async () => {
    const { css, unicodeRange } = await splitFont({
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      outDir: await out(),
      source: SOURCE,
      text: "abc",
    });
    const [first, second] = css.split("@font-face").slice(1);

    expect(first).not.toContain("unicode-range");
    expect(second).toContain(`unicode-range: ${unicodeRange};`);
    expect(unicodeRange).toContain("U+");
  });

  it("reads characters out of the files it is pointed at", async () => {
    const outDir = await out();

    await writeFile(join(outDir, "copy.md"), "z");

    const result = await splitFont({
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      outDir,
      scan: [join(outDir, "copy.md")],
      source: SOURCE,
    });

    expect((await codepoints(result.tiers.common.path)).has(0x7a)).toBe(true);
  });

  it("hashes the contents into the filename so an immutable host lets go", async () => {
    const result = await splitFont({
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      outDir: await out(),
      source: SOURCE,
      text: "abc",
    });

    expect(result.tiers.common.file).toMatch(
      /^Sora-400-subset-common\.[0-9a-f]{8}\.ttf$/,
    );
  });

  it("leaves the hash out when asked", async () => {
    const result = await splitFont({
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      hash: false,
      id: "plain",
      outDir: await out(),
      source: SOURCE,
      text: "abc",
    });

    expect(result.tiers.common.file).toBe("plain-common.ttf");
  });

  it("removes its own earlier output and leaves everything else alone", async () => {
    const outDir = await out();
    const options = {
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      id: "face",
      outDir,
      source: SOURCE,
    } as const;

    await writeFile(join(outDir, "OFL.txt"), "licence");
    await splitFont({ ...options, text: "abc" });
    await splitFont({ ...options, text: "abcdef" });

    const files = await readdir(outDir);

    expect(files.filter((file) => file.endsWith(".ttf"))).toHaveLength(2);
    expect(files).toContain("OFL.txt");
  });

  it("writes the CSS where it is told to", async () => {
    const outDir = await out();
    const cssPath = join(outDir, "nested/font.css");
    const result = await splitFont({
      alwaysInclude: ALWAYS,
      cssPath,
      family: "Fixture",
      format: "sfnt",
      outDir,
      source: SOURCE,
      text: "abc",
    });

    expect(await readFile(cssPath, "utf8")).toBe(result.css);
  });

  it("adds the metric-matched fallback face when one is described", async () => {
    const { css } = await splitFont({
      alwaysInclude: ALWAYS,
      fallback: {
        ascent: "117%",
        family: "Fixture Fallback",
        local: "Arial",
        sizeAdjust: "99.15%",
      },
      family: "Fixture",
      format: "sfnt",
      outDir: await out(),
      source: SOURCE,
      text: "abc",
    });

    expect(css).toContain("src: local(Arial);");
    expect(css).toContain("ascent-override: 117%;");
    expect(css).toContain("size-adjust: 99.15%;");
    expect(css).not.toContain("descent-override");
  });

  it("refuses when the text uses everything, because two files would be worse than one", async () => {
    await expect(
      splitFont({
        alwaysInclude: () => true,
        family: "Fixture",
        format: "sfnt",
        outDir: await out(),
        source: SOURCE,
      }),
    ).rejects.toThrow(/nothing to defer/);
  });

  it("points the CSS at the public path", async () => {
    const { css } = await splitFont({
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      outDir: await out(),
      publicPath: "/assets/type/",
      source: SOURCE,
      text: "abc",
    });

    expect(css).toContain('url("/assets/type/Sora-400-subset-common.');
  });
});

describe("splitFonts", () => {
  it("returns one result per font", async () => {
    const outDir = await out();
    const font = {
      alwaysInclude: ALWAYS,
      family: "Fixture",
      format: "sfnt",
      outDir,
      source: SOURCE,
      text: "abc",
    } as const;
    const results = await splitFonts([
      { ...font, id: "one" },
      { ...font, id: "two" },
    ]);

    expect(results.map((result) => result.tiers.common.file)).toHaveLength(2);
    expect(results[0]?.tiers.common.file).toContain("one-common");
    expect(results[1]?.tiers.common.file).toContain("two-common");
  });
});
