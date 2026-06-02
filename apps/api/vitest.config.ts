import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const apiRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@chronomint/contracts": path.resolve(
        apiRoot,
        "../../packages/contracts/src/index.ts"
      )
    }
  },
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"]
  }
});
