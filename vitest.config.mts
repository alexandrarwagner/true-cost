import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/property/**/*.test.ts",
      "tests/golden/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "tests/adapters/**/*.test.ts",
      "tests/ai-contract/**/*.test.ts",
      "tests/design/**/*.test.ts",
    ],
    env: { NODE_ENV: "test", DEMO_MODE: "true" },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      // `server-only` throws outside a Next server build; tests run server code in Node.
      "server-only": path.resolve(import.meta.dirname, "tests/mocks/server-only.ts"),
    },
  },
});
