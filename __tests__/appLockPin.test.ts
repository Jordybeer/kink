import { describe, expect, it } from "vitest";
import {
  APP_LOCK_PIN_LENGTH,
  LEGACY_APP_LOCK_PIN_MAX_LENGTH,
  isValidAppLockPin,
  normalizeAppLockPinInput,
} from "@/lib/appLockPin";

/**
 * Nieuwe PINs zijn precies vier cijfers; oudere 5–8-cijferige hashes moeten via
 * het lockscreen wel bereikbaar blijven zodat de oude setupfout niemand opsluit.
 */
describe("app-lock PIN contract", () => {
  it("accepteert precies het formaat voor nieuwe PINs", () => {
    expect(isValidAppLockPin("1".repeat(APP_LOCK_PIN_LENGTH))).toBe(true);
  });

  it("weigert een nieuwe PIN die langer is", () => {
    for (let extra = 1; extra <= LEGACY_APP_LOCK_PIN_MAX_LENGTH - APP_LOCK_PIN_LENGTH; extra++) {
      expect(isValidAppLockPin("1".repeat(APP_LOCK_PIN_LENGTH + extra))).toBe(false);
    }
  });

  it("weigert een nieuwe PIN die korter is", () => {
    for (let missing = 1; missing < APP_LOCK_PIN_LENGTH; missing++) {
      expect(isValidAppLockPin("1".repeat(APP_LOCK_PIN_LENGTH - missing))).toBe(false);
    }
  });

  it("weigert alles wat geen cijfers zijn", () => {
    expect(isValidAppLockPin("12a4")).toBe(false);
    expect(isValidAppLockPin("12 4")).toBe(false);
    expect(isValidAppLockPin("")).toBe(false);
  });

  it("verwijdert eerst opmaak en begrenst daarna een geplakte PIN", () => {
    expect(normalizeAppLockPinInput("12-34")).toBe("1234");
    expect(normalizeAppLockPinInput("1 2 3 4 5")).toBe("1234");
    expect(normalizeAppLockPinInput("abcd1234")).toBe("1234");
  });
});
