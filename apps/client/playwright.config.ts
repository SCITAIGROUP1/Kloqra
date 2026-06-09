import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: [
    ["list"],
    ["junit", { outputFile: "test-results/playwright-junit.xml" }],
    ["html", { open: "never" }]
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: [
    {
      command: "pnpm --filter @chronomint/api dev",
      url: "http://localhost:3001/api/docs",
      reuseExistingServer: true,
      timeout: 180_000
    },
    {
      command: "pnpm --filter @chronomint/admin dev",
      url: "http://localhost:3002/login",
      reuseExistingServer: true,
      timeout: 180_000
    },
    {
      command: "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 180_000
    }
  ]
});
