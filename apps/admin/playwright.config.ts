import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 60_000,
  reporter: [
    ["list"],
    ["junit", { outputFile: "test-results/playwright-junit.xml" }],
    ["html", { open: "never" }]
  ],
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "e2e",
      testIgnore: [/auth\.setup\.ts/, /smoke\.spec\.ts/],
      dependencies: ["setup"],
      use: {
        storageState: "e2e/.auth/admin.json"
      }
    },
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { storageState: { cookies: [], origins: [] } }
    }
  ],
  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: [
    {
      command: "pnpm --filter @kloqra/api dev",
      url: "http://localhost:3001/api/docs",
      reuseExistingServer: true,
      timeout: 180_000
    },
    {
      command: "pnpm dev",
      url: "http://localhost:3002/login",
      reuseExistingServer: true,
      timeout: 180_000
    }
  ]
});
