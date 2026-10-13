import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-print",
  outputDir: "test-results/print-results",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    { name: "chromium-print", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit-print", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
