import { describe, expect, it } from "vitest";
import { shouldUseCanonicalPdfPreview } from "@/lib/pdfPreview";

describe("shouldUseCanonicalPdfPreview", () => {
  it.each([
    ["iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X)", "iPhone", 5, true],
    ["iPad", "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X)", "iPad", 5, true],
    ["iPadOS desktopmodus", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 5, true],
    ["Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0, false],
    ["Android", "Mozilla/5.0 (Linux; Android 15)", "Linux armv8l", 5, false],
  ])("kiest voor %s de juiste preview", (_name, userAgent, platform, maxTouchPoints, expected) => {
    expect(shouldUseCanonicalPdfPreview({ userAgent, platform, maxTouchPoints })).toBe(expected);
  });
});
