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

export function clamp(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function sanitizeAvatar(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (raw.length > MAX_AVATAR_LEN) return undefined;
  if (!AVATAR_PREFIX_RE.test(raw)) return undefined;
  return raw;
}
