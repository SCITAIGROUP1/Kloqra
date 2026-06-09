import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: "es6" },
      jsc: {
        parser: {
          syntax: "typescript",
          decorators: true
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true
        }
      }
    })
  ],
  test: {
    environment: "node",
    include: ["test/**/*.e2e.ts"],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    fileParallelism: false,
    sequence: {
      concurrent: false
    },
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./test-results/integration-junit.xml"
    }
  }
});
