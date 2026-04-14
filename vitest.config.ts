import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["test/**/*.test.ts"],
		exclude: ["test/payload/client.test.ts"],
		env: loadEnv("test", "test", ""),
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/**/index.ts", "src/**/*.test.ts"],
			thresholds: { lines: 80 },
		},
	},
});
