import { defineConfig, devices } from "@playwright/test";

// Offline tests need a real production build (Serwist is disabled in dev).
// Kept separate from playwright.config.ts so the regular dev-server suite never
// tries to exercise the service worker.
export default defineConfig({
  testDir: "./e2e-offline",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    serviceWorkers: "allow",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
  },
});
