export type ClientPlatform = "ios" | "android" | "other";

/**
 * Classify the client platform without touching browser globals. Keeping this
 * pure lets browser-aware UI share one hydration-safe source of truth.
 * iPadOS may identify itself as a Mac, so touch points distinguish that case.
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
