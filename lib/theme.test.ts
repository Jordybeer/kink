import { describe, expect, it } from "vitest";
import { isThemePreference, resolveTheme } from "@/lib/theme";

describe("theme preference", () => {
  it("accepts only supported persisted values", () => {
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("midnight")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("resolves system while explicit choices ignore it", () => {
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
