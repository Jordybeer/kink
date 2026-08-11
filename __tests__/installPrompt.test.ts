import { describe, expect, it } from "vitest";
import { detectIosInstallBrowser } from "@/lib/installPrompt";

const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CHROME_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1";
const FIREFOX_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15";
const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";

describe("detectIosInstallBrowser", () => {
  it("herkent Safari op iPhone", () => {
    expect(detectIosInstallBrowser(SAFARI_IPHONE)).toBe("safari");
  });

  it("herkent Chrome op iPhone aan CriOS", () => {
    expect(detectIosInstallBrowser(CHROME_IPHONE)).toBe("chrome");
  });

  it("houdt andere iOS-browsers uit de Safari-specifieke route", () => {
    expect(detectIosInstallBrowser(FIREFOX_IPHONE)).toBe("other");
  });

  it("behandelt Android Chrome niet als iOS", () => {
    expect(detectIosInstallBrowser(CHROME_ANDROID, "Linux armv8l", 5)).toBeNull();
  });

  it("herkent iPadOS wanneer het zich als Mac identificeert", () => {
    const ipadDesktopUa = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
    expect(detectIosInstallBrowser(ipadDesktopUa, "MacIntel", 5)).toBe("safari");
  });
});
