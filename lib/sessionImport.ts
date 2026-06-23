import type { CustomKink, ExperienceLevel, KinkEntry, KinkStatus, Profile } from "@/types";

const VALID_LEVELS: readonly ExperienceLevel[] = ["beginner", "gevorderd", "ervaren", "diepgaand"];

const MAX_ID_LEN = 64;
const MAX_NAME_LEN = 80;
const MAX_ROLE_LEN = 32;
const MAX_CUSTOM_KINKS = 100;
const MAX_KINK_ID_LEN = 64;
const MAX_KINK_NAME_LEN = 80;
const MAX_AVATAR_LEN = 20_000;
const AVATAR_PREFIX_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

function clamp(s: string, max: number): string {
  return s.trim().slice(0, max);
}

function sanitizeAvatar(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (raw.length > MAX_AVATAR_LEN) return undefined;
  if (!AVATAR_PREFIX_RE.test(raw)) return undefined;
  return raw;
}

export interface RemoteProfileLite {
  name: string;
  role: string;
}

export interface RemoteProfileFull extends RemoteProfileLite {
  id: string;
  experienceLevel?: ExperienceLevel;
  customKinks?: CustomKink[];
  avatarDataUrl?: string;
}

function fnv1a32(input: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function fingerprint16(input: string): string {
  const forward = fnv1a32(input).toString(16).padStart(8, "0");
  let reversed = "";
  for (let i = input.length - 1; i >= 0; i--) reversed += input[i];
  const back = fnv1a32(reversed, 0x84222325).toString(16).padStart(8, "0");
  return forward + back;
}

export function synthesizePartnerId(
  name: string,
  role: string,
  entries: Record<string, KinkStatus>,
): string {
  const sig = Object.entries(entries)
    .filter(([, v]) => v != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return `partner_${fingerprint16(`${name.trim()}|${role.trim()}|${sig}`)}`;
}

export function sanitizeRemoteProfileFull(raw: unknown): RemoteProfileFull | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.n !== "string" || typeof r.r !== "string") return null;
  const id = clamp(r.id, MAX_ID_LEN);
  const name = clamp(r.n, MAX_NAME_LEN);
  const role = clamp(r.r, MAX_ROLE_LEN);
  if (!id || !name || !role) return null;
  const level = typeof r.e === "string" && (VALID_LEVELS as readonly string[]).includes(r.e)
    ? (r.e as ExperienceLevel)
    : undefined;
  let customKinks: CustomKink[] | undefined;
  if (Array.isArray(r.ck)) {
    customKinks = r.ck
      .filter((c): c is { id: string; name: string } =>
        !!c && typeof c === "object" && typeof (c as { id?: unknown }).id === "string"
        && typeof (c as { name?: unknown }).name === "string")
      .map((c) => ({ id: clamp(c.id, MAX_KINK_ID_LEN), name: clamp(c.name, MAX_KINK_NAME_LEN) }))
      .filter((c) => c.id && c.name)
      .slice(0, MAX_CUSTOM_KINKS);
  }
  return {
    id,
    name,
    role,
    experienceLevel: level,
    customKinks,
    avatarDataUrl: sanitizeAvatar(r.av),
  };
}

export function buildPartnerProfile(
  full: RemoteProfileFull | null,
  lite: RemoteProfileLite,
  remoteEntries: Record<string, KinkStatus>,
  now: number = Date.now(),
): Profile {
  const name = full?.name ?? clamp(lite.name, MAX_NAME_LEN);
  const role = full?.role ?? clamp(lite.role, MAX_ROLE_LEN);
  const id = full?.id ?? synthesizePartnerId(name, role, remoteEntries);
  const entries: Record<string, KinkEntry> = {};
  for (const [kinkId, status] of Object.entries(remoteEntries)) {
    if (status == null) continue;
    entries[kinkId] = { status, comment: "" };
  }
  return {
    id,
    name,
    role,
    experienceLevel: full?.experienceLevel ?? "beginner",
    customKinks: full?.customKinks ?? [],
    avatarDataUrl: full?.avatarDataUrl,
    entries,
    createdAt: now,
    updatedAt: now,
    isImported: true,
    origin: "shared",
    lockedAt: now,
  };
}
