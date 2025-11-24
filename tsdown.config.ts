import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "gatsby-node": "gatsby-node.ts",
    "index": "src/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  copy: ["package.json", "package.json"],
  platform: "node",
  unbundle: false,
  target: "node25",
  outDir: "dist",
});
