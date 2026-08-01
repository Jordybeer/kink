import type { Profile, KinkEntry, ProfileConsentProof } from "@/types";
import { sanitizeProfileFull } from "@/lib/sanitizeProfile";
import { decodeAny } from "@/lib/shareProfile";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import { verifyProfileConsent } from "@/lib/consentProof";

export interface ProfileShareV3Options {
  includeFetLife?: boolean;
}

export const MAX_PROFILE_SHARE_INFLATED_BYTES = 4_000_000;
export const MAX_PROFILE_SHARE_ENCODED_CHARS = 6_000_000;

type EntryRow = [
  id: string,
  status: string | null,
  desire: number | null,
  experienced: 0 | 1 | null,
  comment: string | null,
  tags: string[] | null,
  curious: 1 | null,
];

interface ProfilePayloadV3 {
  v: 3;
  i: string;
  n: string;
  r: string;
  l: Profile["experienceLevel"];
  c: number;
  u: number;
  vc?: string;
  rs?: string;
  fl?: string;
  bu?: string;
  bs?: Profile["bdsmtestScores"];
  k?: [string, string][];
  e?: EntryRow[];
  cp?: ProfileConsentProof;
}

const STATUS_ENC: Record<NonNullable<KinkEntry["status"]>, string> = {
  yes: "y",
  willing: "w",
  maybe: "m",
  no: "n",
  hard_no: "h",
};

const STATUS_DEC: Record<string, NonNullable<KinkEntry["status"]>> = {
  y: "yes",
  w: "willing",
  m: "maybe",
  n: "no",
  h: "hard_no",
};

const PREFIX_DEFLATE = "3d.";
const PREFIX_RAW = "3r.";

function compactProfile(profile: Profile, opts?: ProfileShareV3Options): ProfilePayloadV3 {
  const mayShare = (entry: KinkEntry | undefined) => entry?.privateResponse !== true;

  const entries: EntryRow[] = [];
  for (const [id, entry] of Object.entries(profile.entries)) {
    if (!mayShare(entry)) continue;
    const hasData = entry.status !== null
      || entry.desire != null
      || entry.experienced != null
      || !!entry.comment
      || !!entry.tags?.length
      || entry.curious === true;
    if (!hasData) continue;
    entries.push([
      id,
      entry.status ? STATUS_ENC[entry.status] : null,
      entry.desire ?? null,
      entry.experienced === true ? 1 : entry.experienced === false ? 0 : null,
      entry.comment || null,
      entry.tags?.length ? entry.tags : null,
      entry.curious === true ? 1 : null,
    ]);
  }

  const customKinks = (profile.customKinks ?? [])
    .filter((kink) => mayShare(profile.entries[kink.id]))
    .map((kink): [string, string] => [kink.id, kink.name]);

  const payload: ProfilePayloadV3 = {
    v: 3,
    i: profile.id,
    n: profile.name,
    r: profile.role,
    l: profile.experienceLevel,
    c: profile.createdAt,
    u: profile.updatedAt,
    vc: getProfileVerificationCode(profile),
  };
  if (profile.relationshipStatus) payload.rs = profile.relationshipStatus;
  if (opts?.includeFetLife && profile.fetLifeUsername) payload.fl = profile.fetLifeUsername;
  if (profile.bdsmtestUrl) payload.bu = profile.bdsmtestUrl;
  if (profile.bdsmtestScores?.length) payload.bs = profile.bdsmtestScores;
  if (customKinks.length) payload.k = customKinks;
  if (entries.length) payload.e = entries;
  if (profile.consentProof) payload.cp = profile.consentProof;
  return payload;
}

function expandProfile(payload: unknown): Profile {
  if (!payload || typeof payload !== "object" || (payload as { v?: unknown }).v !== 3) {
    throw new Error("Ongeldig v3-profiel");
  }
  const p = payload as Partial<ProfilePayloadV3>;
  const entries: Record<string, KinkEntry> = {};
  for (const row of Array.isArray(p.e) ? p.e : []) {
    if (!Array.isArray(row) || typeof row[0] !== "string") continue;
    const [id, statusCode, desire, experienced, comment, tags, curious] = row;
    entries[id] = {
      status: typeof statusCode === "string" ? (STATUS_DEC[statusCode] ?? null) : null,
      comment: typeof comment === "string" ? comment : "",
      ...(typeof desire === "number" ? { desire } : {}),
      ...(experienced === 1 ? { experienced: true } : experienced === 0 ? { experienced: false } : {}),
      ...(Array.isArray(tags) ? { tags: tags.filter((tag): tag is string => typeof tag === "string") } : {}),
      ...(curious === 1 ? { curious: true } : {}),
    };
  }

  const raw = {
    id: p.i,
    verificationCode: p.vc,
    name: p.n,
    role: p.r,
    experienceLevel: p.l,
    createdAt: p.c,
    updatedAt: p.u,
    relationshipStatus: p.rs,
    fetLifeUsername: p.fl,
    bdsmtestUrl: p.bu,
    bdsmtestScores: p.bs,
    customKinks: (Array.isArray(p.k) ? p.k : [])
      .filter((row): row is [string, string] =>
        Array.isArray(row) && typeof row[0] === "string" && typeof row[1] === "string")
      .map(([id, name]) => ({ id, name })),
    entries,
    consentProof: p.cp,
  };

  const clean = sanitizeProfileFull(raw);
  if (!clean) throw new Error("Ongeldig profiel — verwacht veld ontbreekt");
  return { ...clean, isImported: true, origin: "shared", lockedAt: Date.now() };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function compressBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof globalThis.CompressionStream !== "function") return bytes;
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompressBytesBounded(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof globalThis.DecompressionStream !== "function") {
    throw new Error("Deze browser kan het gecomprimeerde profiel niet openen");
  }
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream("deflate"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PROFILE_SHARE_INFLATED_BYTES) {
        await reader.cancel("Profielcode is te groot").catch(() => undefined);
        throw new Error("Profielcode is te groot");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export function isProfileV3(encoded: string): boolean {
  return encoded.startsWith(PREFIX_DEFLATE) || encoded.startsWith(PREFIX_RAW);
}

export async function encodeProfileV3(
  profile: Profile,
  opts?: ProfileShareV3Options,
): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(compactProfile(profile, opts)));
  if (raw.byteLength > MAX_PROFILE_SHARE_INFLATED_BYTES) {
    throw new Error("Profiel is te groot om te delen");
  }
  try {
    const compressed = await compressBytes(raw);
    if (compressed.length + 8 < raw.length) {
      return PREFIX_DEFLATE + bytesToBase64Url(compressed);
    }
  } catch {
    // Raw v3 remains lossless on browsers without CompressionStream.
  }
  return PREFIX_RAW + bytesToBase64Url(raw);
}

export async function decodeProfileV3(encoded: string): Promise<Profile> {
  if (encoded.length > MAX_PROFILE_SHARE_ENCODED_CHARS) {
    throw new Error("Profielcode is te groot");
  }
  const compressed = encoded.startsWith(PREFIX_DEFLATE);
  const raw = encoded.startsWith(PREFIX_RAW);
  if (!compressed && !raw) throw new Error("Onbekend v3-formaat");
  const bytes = base64UrlToBytes(encoded.slice(3));
  if (!compressed && bytes.byteLength > MAX_PROFILE_SHARE_INFLATED_BYTES) {
    throw new Error("Profielcode is te groot");
  }
  const decoded = compressed ? await decompressBytesBounded(bytes) : bytes;
  const profile = expandProfile(JSON.parse(new TextDecoder().decode(decoded)));
  if (profile.consentProof) {
    const verification = await verifyProfileConsent(profile);
    if (verification.status !== "valid") {
      throw new Error(verification.status === "invalid" ? verification.reason : "Profiel mist bronbevestiging");
    }
  }
  return profile;
}

export async function decodeSharedProfile(encoded: string): Promise<Profile> {
  return isProfileV3(encoded) ? decodeProfileV3(encoded) : decodeAny(encoded);
}
