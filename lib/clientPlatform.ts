export type ClientPlatform = "ios" | "android" | "other";

/**
 * Classify the client platform with browser globals kept outside the ropes.
 * The pure helper keeps hydration predictable, while touch points unmask an
 * iPadOS client that has dressed itself up as a Mac.
 */
export function detectClientPlatform(
  userAgent: string,
  platform = "",
  maxTouchPoints = 0,
): ClientPlatform {
  const isIos = /iP(hone|ad|od)/i.test(userAgent)
    || (platform === "MacIntel" && maxTouchPoints > 1);

  if (isIos) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}
