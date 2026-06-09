import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results/unit-junit.xml"
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts"],
      thresholds: {
        lines: 90,
        statements: 90,
        branches: 70,
        functions: 25
      }
    }
  }
});
