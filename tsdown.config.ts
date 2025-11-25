import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "index": "src/index.ts",
  },
  format: ["cjs"],
  dts: true,
  outExtensions: (c) => {
    if (c.format === "cjs") {
      return {
        js: ".js",
        dts: ".d.ts",
      };
    }
    return undefined;
  },
  clean: true,
  platform: "node",
  unbundle: false,
  target: "node25",
  outDir: "dist",
});
