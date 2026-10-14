import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/pricing.ts"],
      reporter: ["text", "html"],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
