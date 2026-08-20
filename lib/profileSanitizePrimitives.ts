import type { ExperienceLevel } from "@/types";

export const VALID_LEVELS: readonly ExperienceLevel[] = [
  "beginner",
  "gevorderd",
  "ervaren",
  "diepgaand",
];

export const MAX_ID_LEN = 64;
export const MAX_NAME_LEN = 80;
export const MAX_ROLE_LEN = 32;
export const MAX_CUSTOM_KINKS = 100;
export const MAX_KINK_ID_LEN = 64;
export const MAX_KINK_NAME_LEN = 80;

const MAX_AVATAR_LEN = 20_000;
const AVATAR_PREFIX_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const BDSMTEST_RESULT_ID_RE = /^[A-Za-z0-9_-]{3,128}$/;

export const MAX_BDSMTEST_URL_LEN = 200;

export function clamp(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/**
 * Accept only a concrete bdsmtest.org result page and return one canonical URL.
 * Query strings and fragments are intentionally dropped so tracking never lands
 * in persisted profile data or a later href.
 */
export function sanitizeBdsmtestUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  if (!value || value.length > MAX_BDSMTEST_URL_LEN) return undefined;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    if (parsed.username || parsed.password || parsed.port) return undefined;

    const host = parsed.hostname.toLowerCase();
    if (host !== "bdsmtest.org" && host !== "www.bdsmtest.org") return undefined;

    const match = parsed.pathname.match(/^\/r\/([^/]+)\/?$/);
    if (!match || !BDSMTEST_RESULT_ID_RE.test(match[1])) return undefined;

    return `https://bdsmtest.org/r/${match[1]}`;
  } catch {
    return undefined;
  }
}

export function sanitizeAvatar(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (raw.length > MAX_AVATAR_LEN) return undefined;
  if (!AVATAR_PREFIX_RE.test(raw)) return undefined;
  return raw;
}
