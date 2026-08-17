import { describe, expect, it } from "vitest";
import { APP_LOCK_PIN_LENGTH, isValidAppLockPin } from "@/lib/appLockPin";

/**
 * De PIN die je jezelf niet meer kon vertellen.
 *
 * PinFlowSheet liet 4 tot 8 cijfers instellen, AppLock tekende er vier en
 * weigerde het vijfde. Wie zes koos, kwam er nooit meer in: geen vergeten-PIN,
 * biometrie optioneel, en wissen kostte ook de eigendomssleutels. Deze tests
 * bewaken dat de twee kanten hetzelfde getal blijven lezen.
 */
describe("app-lock PIN lengte", () => {
  it("accepteert precies de lengte die het slot ook tekent", () => {
    expect(isValidAppLockPin("1".repeat(APP_LOCK_PIN_LENGTH))).toBe(true);
  });

  it("weigert een PIN die langer is dan het slot kan aannemen", () => {
    for (let extra = 1; extra <= 4; extra++) {
      expect(isValidAppLockPin("1".repeat(APP_LOCK_PIN_LENGTH + extra))).toBe(false);
    }
  });

  it("weigert een PIN die korter is", () => {
    for (let missing = 1; missing < APP_LOCK_PIN_LENGTH; missing++) {
      expect(isValidAppLockPin("1".repeat(APP_LOCK_PIN_LENGTH - missing))).toBe(false);
    }
  });

  it("weigert alles wat geen cijfers zijn", () => {
    expect(isValidAppLockPin("12a4")).toBe(false);
    expect(isValidAppLockPin("12 4")).toBe(false);
    expect(isValidAppLockPin("")).toBe(false);
  });
});
