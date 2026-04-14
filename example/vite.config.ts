import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@p2pdotme/sdk/react": path.resolve(__dirname, "../src/react/index.ts"),
      "@p2pdotme/sdk/order-routing": path.resolve(__dirname, "../src/order-routing/index.ts"),
      "@p2pdotme/sdk/profile": path.resolve(__dirname, "../src/profile/index.ts"),
      "@p2pdotme/sdk/payload": path.resolve(__dirname, "../src/payload/index.ts"),
    },
  },
});
