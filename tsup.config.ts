import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/bin.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["fontkit", "subset-font"],
  tsconfig: "tsconfig.build.json",
});
