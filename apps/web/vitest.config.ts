import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Minimal Vitest setup for the central-loop unit tests (Sprint 4).
 * - `@/*` mirrors the tsconfig path alias.
 * - `server-only` is stubbed to an empty module so server-only libs (classifier,
 *   importers, documents, gateway) can be imported in a plain Node test env.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "server-only": resolve(__dirname, "src/__tests__/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
});
