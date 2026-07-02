import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const apiRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@kloqra/contracts": path.resolve(apiRoot, "../../packages/contracts/src/index.ts")
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "prisma/**/*.spec.ts", "scripts/**/*.spec.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results/unit-junit.xml"
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/main.ts"]
    }
  }
});
