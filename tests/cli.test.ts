import {
  copyFile,
  mkdtemp,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/cli";

const SOURCE = join(import.meta.dirname, "fixtures/Sora-400-subset.ttf");
const ALWAYS = [[0x41, 0x5a]];

let root = "";
let cwd = "";

beforeEach(async () => {
  cwd = process.cwd();
  root = await mkdtemp(join(tmpdir(), "cli-"));

  await copyFile(SOURCE, join(root, "face.ttf"));
  await writeFile(join(root, "copy.md"), "abc");

  process.chdir(root);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  process.chdir(cwd);
  vi.restoreAllMocks();
});

describe("run", () => {
  it("splits the font a config file describes", async () => {
    await writeFile(
      join(root, "unicode-range-split.config.json"),
      JSON.stringify({
        fonts: [
          {
            alwaysInclude: ALWAYS,
            cssPath: "out/face.css",
            family: "Fixture",
            format: "sfnt",
            outDir: "out",
            scan: ["copy.md"],
            source: "face.ttf",
          },
        ],
      }),
    );

    expect(await run([])).toBe(0);

    const files = await readdir(join(root, "out"));

    expect(files.filter((file) => file.endsWith(".ttf"))).toHaveLength(2);
    expect(await readFile(join(root, "out/face.css"), "utf8")).toContain(
      "unicode-range",
    );
  });

  it("takes a config path as an argument", async () => {
    await writeFile(
      join(root, "custom.json"),
      JSON.stringify({
        alwaysInclude: ALWAYS,
        family: "Fixture",
        format: "sfnt",
        outDir: "out",
        source: "face.ttf",
        text: "abc",
      }),
    );

    expect(await run(["custom.json"])).toBe(0);
    expect(await readdir(join(root, "out"))).toHaveLength(2);
  });

  it("describes one font entirely on the command line", async () => {
    expect(
      await run([
        "--source",
        "face.ttf",
        "--family",
        "Fixture",
        "--out-dir",
        "out",
        "--format",
        "sfnt",
        "--text",
        "abc",
        "--id",
        "flagged",
        "--no-hash",
      ]),
    ).toBe(0);

    expect(await readdir(join(root, "out"))).toContain("flagged-common.ttf");
  });

  it("reports a missing config rather than doing nothing quietly", async () => {
    expect(await run([])).toBe(1);
    expect(console.error).toHaveBeenCalled();
  });

  it("prints the usage for --help", async () => {
    expect(await run(["--help"])).toBe(0);
    expect(console.log).toHaveBeenCalled();
  });

  it("rejects an unknown flag instead of ignoring it", async () => {
    await expect(
      run([
        "--source",
        "face.ttf",
        "--family",
        "F",
        "--out-dir",
        "out",
        "--sacn",
        "src",
      ]),
    ).rejects.toThrow(/--sacn/);
  });

  it("rejects a format subset-font cannot write", async () => {
    await expect(
      run([
        "--source",
        "face.ttf",
        "--family",
        "F",
        "--out-dir",
        "out",
        "--format",
        "otf",
      ]),
    ).rejects.toThrow(/woff2, woff, truetype, sfnt/);
  });

  it("warns when a scan path does not exist", async () => {
    expect(
      await run([
        "--source",
        "face.ttf",
        "--family",
        "Fixture",
        "--out-dir",
        "out",
        "--format",
        "sfnt",
        "--scan",
        "copy.md,missing",
        "--text",
        "abc",
      ]),
    ).toBe(0);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("scan path not found: missing"),
    );
  });

  it("warns when scanning finds no characters", async () => {
    expect(
      await run([
        "--source",
        "face.ttf",
        "--family",
        "Fixture",
        "--out-dir",
        "out",
        "--format",
        "sfnt",
        "--scan",
        "missing",
        "--text",
        "abc",
      ]),
    ).toBe(0);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("scanning found no characters"),
    );
  });

  it("stays quiet when scanning found what it was asked to", async () => {
    await run([
      "--source",
      "face.ttf",
      "--family",
      "Fixture",
      "--out-dir",
      "out",
      "--format",
      "sfnt",
      "--scan",
      "copy.md",
    ]);

    expect(console.error).not.toHaveBeenCalled();
  });

  it("refuses two fonts that would write under the same id", async () => {
    await writeFile(
      join(root, "unicode-range-split.config.json"),
      JSON.stringify([
        { family: "A", outDir: "out", source: "face.ttf", text: "abc" },
        { family: "B", outDir: "./out", source: "face.ttf", text: "abc" },
      ]),
    );

    await expect(run([])).rejects.toThrow(/Give each an "id"/);
  });
});
