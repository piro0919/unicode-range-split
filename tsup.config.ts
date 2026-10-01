import { defineConfig } from "tsup";

const shared = {
  sourcemap: true,
  treeshake: true,
  external: ["fontkit", "subset-font"],
  tsconfig: "tsconfig.build.json",
};

/* Two builds: the library ships ESM, CJS and types; the bin is only ever run by
   node through the "bin" entry, so it ships as ESM with no types. They run in
   parallel, so neither cleans dist — build:lib removes it first. */
export default defineConfig([
  {
    ...shared,
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
  },
  {
    ...shared,
    entry: ["src/bin.ts"],
    format: ["esm"],
    dts: false,
  },
]);
