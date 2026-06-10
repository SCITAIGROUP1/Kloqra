import { defineConfig } from "@playwright/test";

const clientDevEnv = {
  NEXT_PUBLIC_AUTH_SCOPE: "client",
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"
};

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
      command: "pnpm --filter @kloqra/api dev",
      url: "http://localhost:3001/api/docs",
      reuseExistingServer: true,
      timeout: 180_000
    },
    {
      command: "pnpm --filter @kloqra/admin dev",
      url: "http://localhost:3002/login",
      reuseExistingServer: true,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_AUTH_SCOPE: "admin",
        NEXT_PUBLIC_API_BASE_URL: clientDevEnv.NEXT_PUBLIC_API_BASE_URL
      }
    },
    {
      command: "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 180_000,
      env: clientDevEnv
    }
  ]
});
