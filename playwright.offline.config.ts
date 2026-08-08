import { defineConfig, devices } from "@playwright/test";

const galaxyS26Ultra = {
  ...devices["Galaxy S24"],
  // Keep this S26 Ultra-class viewport tightly restrained: its 1440×3120
  // panel shares the 13:6 portrait ratio, while 360×780 CSS px at DPR 4
  // puts the layout through a properly phone-sized stress test.
  viewport: { width: 360, height: 780 },
  screen: { width: 360, height: 780 },
  deviceScaleFactor: 4,
};

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
  projects: [
    { name: "galaxy-s26-ultra", use: galaxyS26Ultra },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
  },
});
