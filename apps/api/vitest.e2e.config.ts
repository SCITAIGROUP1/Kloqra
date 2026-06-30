import path from "node:path";
import { fileURLToPath } from "node:url";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

const apiRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@kloqra/contracts": path.resolve(apiRoot, "../../packages/contracts/src/index.ts")
    }
  },
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
