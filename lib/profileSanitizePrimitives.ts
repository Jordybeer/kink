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

/**
 * Waar een BDSMTest-link vandaan mag komen.
 *
 * De edit-sheet hield deze regel al aan, maar die bewaakt alleen wat de eigenaar
 * zelf intikt. Een geimporteerd profiel komt langs een andere deur: het veld
 * reist mee in de v3-payload en zit in de ondertekende consentprojectie, dus een
 * vreemde URL passeert de handtekeningcontrole zonder een kik en landt daarna in
 * een `href`. Dezelfde regel hoort dus op de vertrouwensgrens te staan, niet
 * alleen in het formulier.
 */
const BDSMTEST_URL_RE = /^https?:\/\/(www\.)?bdsmtest\.org\//i;

export const MAX_BDSMTEST_URL_LEN = 200;

export function clamp(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function sanitizeBdsmtestUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const value = clamp(raw, MAX_BDSMTEST_URL_LEN);
  return BDSMTEST_URL_RE.test(value) ? value : undefined;
}

export function sanitizeAvatar(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (raw.length > MAX_AVATAR_LEN) return undefined;
  if (!AVATAR_PREFIX_RE.test(raw)) return undefined;
  return raw;
}
