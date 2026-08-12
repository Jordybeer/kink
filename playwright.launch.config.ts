import { defineConfig, devices } from "@playwright/test";

const iPhone17 = {
  ...devices["iPhone 15"],
  // Apple panel: 1206×2622 at DPR 3 => 402×874 CSS screen. Keep the
  // Playwright Safari chrome delta (193px) for a browser-sized viewport.
  viewport: { width: 402, height: 681 },
  screen: { width: 402, height: 874 },
  deviceScaleFactor: 3,
};

const iPhone17ProMax = {
  ...devices["iPhone 15 Pro Max"],
  // Apple panel: 1320×2868 at DPR 3 => 440×956 CSS screen.
  viewport: { width: 440, height: 763 },
  screen: { width: 440, height: 956 },
  deviceScaleFactor: 3,
};

const iPadPro = {
  ...devices["iPad Pro 11"],
  viewport: { width: 834, height: 1194 },
  screen: { width: 834, height: 1210 },
};

const iPadProLandscape = {
  ...devices["iPad Pro 11 landscape"],
  viewport: { width: 1194, height: 834 },
  screen: { width: 1210, height: 834 },
};

const galaxyS26Ultra = {
  ...devices["Galaxy S24"],
  viewport: { width: 360, height: 780 },
  screen: { width: 360, height: 780 },
  deviceScaleFactor: 4,
};

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["device-launch.smoke.ts", "device-overlays.smoke.ts"],
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
    { name: "iphone-17", use: iPhone17 },
    { name: "iphone-17-pro-max", use: iPhone17ProMax },
    { name: "ipad-pro-11", use: iPadPro },
    { name: "ipad-pro-11-landscape", use: iPadProLandscape },
    { name: "galaxy-s26-ultra", use: galaxyS26Ultra },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
