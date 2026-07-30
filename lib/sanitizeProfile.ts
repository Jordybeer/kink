import type {
  BdsmtestScore,
  ContractSnapshot,
  CustomKink,
  ExperienceLevel,
  KinkEntry,
  KinkStatus,
  Profile,
} from "@/types";
import {
  deriveProfileVerificationCode,
  normalizeProfileVerificationCode,
} from "@/lib/profileVerification";
import { sanitizeProfileConsentProof } from "@/lib/consentProof";
import {
  clamp,
  MAX_CUSTOM_KINKS,
  MAX_ID_LEN,
  MAX_KINK_ID_LEN,
  MAX_KINK_NAME_LEN,
  MAX_NAME_LEN,
  MAX_ROLE_LEN,
  sanitizeAvatar,
  VALID_LEVELS,
} from "@/lib/sessionImport";

// The full-profile bouncer. lib/sessionImport frisks the live-session wire
// format; this module gives the same treatment to the two doors that used to
// wave anything through on a TypeScript cast — v1 share-URLs and decrypted
// backups. Everything gets patted down: unknown fields dropped, strings
// clamped, enums enforced, collections capped. Malformed elements are turned
// away one by one; the rest of the payload still gets in.

const VALID_STATUSES: readonly NonNullable<KinkStatus>[] = ["yes", "willing", "maybe", "no", "hard_no"];

const MAX_COMMENT_LEN = 2_000;
const MAX_TAGS = 20;
const MAX_TAG_LEN = 60;
const MAX_ENTRIES = 400; // ~180 house kinks + 100 custom, with slack
const MAX_BDSMTEST_ROWS = 50;
const MAX_BDSMTEST_ROLE_LEN = 64;
const MAX_FREE_TEXT_LEN = 200; // relationshipStatus / fetLife / bdsmtestUrl

function asFiniteNumber(raw: unknown): number | undefined {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

function sanitizeStatus(raw: unknown): KinkStatus {
  return typeof raw === "string" && (VALID_STATUSES as readonly string[]).includes(raw)
    ? (raw as NonNullable<KinkStatus>)
    : null;
}

export function sanitizeKinkEntry(raw: unknown): KinkEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const entry: KinkEntry = {
    status: sanitizeStatus(r.status),
    comment: typeof r.comment === "string" ? clamp(r.comment, MAX_COMMENT_LEN) : "",
  };
  const desire = asFiniteNumber(r.desire);
  if (desire !== undefined) entry.desire = Math.min(5, Math.max(0, Math.round(desire)));
  if (typeof r.experienced === "boolean") entry.experienced = r.experienced;
  if (typeof r.curious === "boolean") entry.curious = r.curious;
  if (typeof r.privateResponse === "boolean") entry.privateResponse = r.privateResponse;
  const used = asFiniteNumber(r.usedInScene);
  if (used !== undefined) entry.usedInScene = Math.max(0, Math.round(used));
  if (Array.isArray(r.tags)) {
    const tags = r.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => clamp(t, MAX_TAG_LEN))
      .filter(Boolean)
      .slice(0, MAX_TAGS);
    if (tags.length) entry.tags = tags;
  }
  // A frisked entry that carries nothing is not worth keeping.
  if (entry.status === null && !entry.comment && entry.desire == null
    && entry.experienced == null && !entry.curious && !entry.privateResponse && !entry.tags) return null;
  return entry;
}

export function sanitizeBdsmtestScores(raw: unknown): BdsmtestScore[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows: BdsmtestScore[] = [];
  for (const item of raw) {
    if (rows.length >= MAX_BDSMTEST_ROWS) break;
    if (!item || typeof item !== "object") continue;
    const { role, pct } = item as Record<string, unknown>;
    const n = asFiniteNumber(pct);
    if (typeof role !== "string" || n === undefined) continue;
    const cleanRole = clamp(role, MAX_BDSMTEST_ROLE_LEN);
    if (!cleanRole) continue;
    rows.push({ role: cleanRole, pct: Math.min(100, Math.max(0, Math.round(n))) });
  }
  return rows.length ? rows : undefined;
}

function sanitizeCustomKinks(raw: unknown): CustomKink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is { id: string; name: string } =>
      !!c && typeof c === "object" && typeof (c as { id?: unknown }).id === "string"
      && typeof (c as { name?: unknown }).name === "string")
    .map((c) => ({ id: clamp(c.id, MAX_KINK_ID_LEN), name: clamp(c.name, MAX_KINK_NAME_LEN) }))
    .filter((c) => c.id && c.name)
    .slice(0, MAX_CUSTOM_KINKS);
}

/**
 * Full Profile sanitizer for untrusted JSON (v1 share-URLs, backup files).
 * Returns null when the payload can't even produce an id + name; otherwise
 * a Profile built exclusively from validated fields.
 */
export function sanitizeProfileFull(raw: unknown, now: number = Date.now()): Profile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  const id = clamp(r.id, MAX_ID_LEN);
  const name = clamp(r.name, MAX_NAME_LEN);
  if (!id || !name) return null;

  const entries: Record<string, KinkEntry> = {};
  if (r.entries && typeof r.entries === "object" && !Array.isArray(r.entries)) {
    for (const [key, value] of Object.entries(r.entries as Record<string, unknown>)) {
      if (Object.keys(entries).length >= MAX_ENTRIES) break;
      const cleanKey = clamp(key, MAX_KINK_ID_LEN);
      if (!cleanKey) continue;
      const entry = sanitizeKinkEntry(value);
      if (entry) entries[cleanKey] = entry;
    }
  }

  const profile: Profile = {
    id,
    verificationCode: normalizeProfileVerificationCode(r.verificationCode)
      ?? deriveProfileVerificationCode(id),
    name,
    role: typeof r.role === "string" ? clamp(r.role, MAX_ROLE_LEN) : "",
    experienceLevel: typeof r.experienceLevel === "string"
      && (VALID_LEVELS as readonly string[]).includes(r.experienceLevel)
      ? (r.experienceLevel as ExperienceLevel)
      : "beginner",
    customKinks: sanitizeCustomKinks(r.customKinks),
    createdAt: asFiniteNumber(r.createdAt) ?? now,
    updatedAt: asFiniteNumber(r.updatedAt) ?? now,
    entries,
  };

  if (typeof r.relationshipStatus === "string" && r.relationshipStatus.trim()) {
    profile.relationshipStatus = clamp(r.relationshipStatus, MAX_FREE_TEXT_LEN);
  }
  if (typeof r.fetLifeUsername === "string" && r.fetLifeUsername.trim()) {
    profile.fetLifeUsername = clamp(r.fetLifeUsername, MAX_FREE_TEXT_LEN);
  }
  if (typeof r.bdsmtestUrl === "string" && r.bdsmtestUrl.trim()) {
    profile.bdsmtestUrl = clamp(r.bdsmtestUrl, MAX_FREE_TEXT_LEN);
  }
  if (typeof r.privateNote === "string" && r.privateNote.trim()) {
    profile.privateNote = clamp(r.privateNote, MAX_COMMENT_LEN);
  }
  const bs = sanitizeBdsmtestScores(r.bdsmtestScores);
  if (bs) profile.bdsmtestScores = bs;
  const avatar = sanitizeAvatar(r.avatarDataUrl);
  if (avatar) profile.avatarDataUrl = avatar;
  if (typeof r.isImported === "boolean") profile.isImported = r.isImported;
  if (r.origin === "own" || r.origin === "shared") profile.origin = r.origin;
  const lockedAt = asFiniteNumber(r.lockedAt);
  if (lockedAt !== undefined) profile.lockedAt = lockedAt;
  const consentProof = sanitizeProfileConsentProof(r.consentProof);
  if (consentProof) profile.consentProof = consentProof;

  return profile;
}

/** ContractSnapshot bouncer for backup restores — element-wise, drop the fakes. */
export function sanitizeContractSnapshot(raw: unknown): ContractSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.profileAName !== "string" || typeof r.profileBName !== "string") return null;
  const id = clamp(r.id, MAX_ID_LEN);
  const profileAName = clamp(r.profileAName, MAX_NAME_LEN);
  const profileBName = clamp(r.profileBName, MAX_NAME_LEN);
  if (!id || !profileAName || !profileBName) return null;
  const count = (v: unknown) => Math.max(0, Math.round(asFiniteNumber(v) ?? 0));
  const snapshot: ContractSnapshot = {
    id,
    date: asFiniteNumber(r.date) ?? Date.now(),
    profileAName,
    profileBName,
    matchCount: count(r.matchCount),
    hardLimitCount: count(r.hardLimitCount),
    softLimitCount: count(r.softLimitCount),
    discussCount: count(r.discussCount),
  };
  if (typeof r.profileAId === "string" && r.profileAId) snapshot.profileAId = clamp(r.profileAId, MAX_ID_LEN);
  if (typeof r.profileBId === "string" && r.profileBId) snapshot.profileBId = clamp(r.profileBId, MAX_ID_LEN);
  if (typeof r.safeword === "string" && r.safeword.trim()) snapshot.safeword = clamp(r.safeword, MAX_NAME_LEN);
  return snapshot;
}
