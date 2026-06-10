import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@kloqra/ui": path.resolve(__dirname, "../ui/src/index.ts")
    }
  },
  esbuild: {
    jsx: "automatic"
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    setupFiles: [path.resolve(__dirname, "../ui/src/test-setup.ts")]
  }
});
