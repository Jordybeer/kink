import { defineConfig, devices } from "@playwright/test";

const reporter = process.env.CI
  ? [
      ["github" as const],
      ["list" as const, { printFailuresInline: true }],
      ["html" as const, { open: "never" as const, outputFolder: "playwright-report" }],
    ]
  : [
      ["list" as const],
      ["html" as const, { open: "never" as const, outputFolder: "playwright-report" }],
    ];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 45000,
  reporter,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Local dev may reuse a running server; a gate-keeping run (CI=1) must
    // own its own — a stale server once green-lit code that never ran
    // (corrections.md 2026-07-11, the stale-server mirage).
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
