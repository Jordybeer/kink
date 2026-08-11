import { describe, expect, it } from "vitest";
import {
  DEFAULT_INSTALL_PROMPT_POLICY,
  disableAutomaticInstallPrompt,
  detectIosInstallBrowser,
  enableAutomaticInstallPrompt,
  INSTALL_PROMPT_SNOOZE_MS,
  shouldAutoShowInstallPrompt,
  snoozeInstallPrompt,
} from "@/lib/installPrompt";

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

describe("install prompt policy", () => {
  const fresh = DEFAULT_INSTALL_PROMPT_POLICY;
  const now = 1_800_000_000_000;

  it("wacht op betekenisvol gebruik voor de eerste automatische vraag", () => {
    expect(shouldAutoShowInstallPrompt(fresh, false, now)).toBe(false);
    expect(shouldAutoShowInstallPrompt(fresh, true, now)).toBe(true);
  });

  it("geeft na de eerste sluiting vijf dagen rust", () => {
    const snoozed = snoozeInstallPrompt(fresh, now);
    expect(snoozed.dismissals).toBe(1);
    expect(snoozed.snoozedUntil).toBe(now + INSTALL_PROMPT_SNOOZE_MS);
    expect(shouldAutoShowInstallPrompt(snoozed, true, now + INSTALL_PROMPT_SNOOZE_MS - 1)).toBe(false);
    expect(shouldAutoShowInstallPrompt(snoozed, true, now + INSTALL_PROMPT_SNOOZE_MS)).toBe(true);
  });

  it("stopt automatisch vragen na de tweede sluiting", () => {
    const once = snoozeInstallPrompt(fresh, now);
    const twice = snoozeInstallPrompt(once, now + INSTALL_PROMPT_SNOOZE_MS);
    expect(twice.dismissals).toBe(2);
    expect(shouldAutoShowInstallPrompt(twice, true, now + 365 * 24 * 60 * 60 * 1000)).toBe(false);
  });

  it("respecteert niet meer vragen permanent voor automatische prompts", () => {
    const disabled = disableAutomaticInstallPrompt(fresh);
    expect(disabled.neverAsk).toBe(true);
    expect(shouldAutoShowInstallPrompt(disabled, true, Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it("kan automatische installatievragen via Instellingen opnieuw toelaten", () => {
    const disabled = disableAutomaticInstallPrompt({
      dismissals: 2,
      snoozedUntil: now + INSTALL_PROMPT_SNOOZE_MS,
      neverAsk: false,
    });
    expect(enableAutomaticInstallPrompt()).toEqual(fresh);
    expect(shouldAutoShowInstallPrompt(enableAutomaticInstallPrompt(), true, now)).toBe(true);
    expect(disabled).not.toEqual(fresh);
  });
});
