import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

// Bundle @noble/* into the dist output so consumers don't hit version conflicts
// (e.g. @noble/hashes v2 in their tree missing the v1.x subpath exports we use).
const NOBLE_NO_EXTERNAL = [/^@noble\//];

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    define: { __SDK_VERSION__: JSON.stringify(version) },
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
  {
    entry: { "order-routing": "src/order-routing/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
  {
    entry: { orders: "src/orders/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
  {
    entry: { react: "src/react/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    external: ["react"],
    noExternal: NOBLE_NO_EXTERNAL,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
  {
    entry: { "qr-parsers": "src/qr-parsers/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
  {
    entry: { "fraud-engine": "src/fraud-engine/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
  {
    entry: { payload: "src/payload/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    noExternal: NOBLE_NO_EXTERNAL,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
  {
    entry: { profile: "src/profile/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
  {
    entry: { country: "src/country/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
  {
    entry: { zkkyc: "src/zkkyc/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    outExtension({ format }) {
      return { js: format === "cjs" ? ".cjs" : ".mjs" };
    },
  },
]);
