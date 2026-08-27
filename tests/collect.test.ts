import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { collectText } from "../src/collect";

let root = "";

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "collect-"));

  await mkdir(join(root, "nested"), { recursive: true });
  await mkdir(join(root, "node_modules"), { recursive: true });
  await writeFile(join(root, "page.md"), "surface");
  await writeFile(join(root, "nested", "deep.tsx"), "buried");
  await writeFile(join(root, "photo.png"), "binary");
  await writeFile(join(root, "node_modules", "dep.md"), "vendored");
});

describe("collectText", () => {
  it("reads a whole tree", async () => {
    const text = await collectText([root]);

    expect(text).toContain("surface");
    expect(text).toContain("buried");
  });

  it("skips extensions it was not asked for", async () => {
    expect(await collectText([root])).not.toContain("binary");
  });

  it("skips node_modules, which would otherwise pull in every character on disk", async () => {
    expect(await collectText([root])).not.toContain("vendored");
  });

  it("reads a named file whatever its extension", async () => {
    expect(await collectText([join(root, "photo.png")])).toContain("binary");
  });

  it("skips a path that does not exist instead of failing the build", async () => {
    expect(await collectText([join(root, "gone")])).toBe("");
  });

  it("honours a narrower extension list", async () => {
    const text = await collectText([root], { extensions: [".md"] });

    expect(text).toContain("surface");
    expect(text).not.toContain("buried");
  });
});
