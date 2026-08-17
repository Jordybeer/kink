import type {
  Profile,
  KinkEntry,
  ProfileConsentProof,
  ProfileOwnerKey,
} from "@/types";
import { sanitizeProfileFull } from "@/lib/sanitizeProfile";
import { decodeAny } from "@/lib/shareProfile";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import {
  canonicalJson,
  sha256Base64Url,
  verifyProfileConsent,
  verifyProfileOwnerKey,
} from "@/lib/consentProof";
import { sanitizeAvatar } from "@/lib/profileSanitizePrimitives";
import { checksumProfilePayload } from "@/lib/profileQr";
import { prepareAvatarForShare } from "@/lib/imageUtils";

export interface ProfileShareV3Options {
  includeFetLife?: boolean;
  includeAvatar?: boolean;
  avatarOwnerKey?: ProfileOwnerKey;
}

export interface ProfileShareTransport {
  encoded: string;
  profilePayload: string;
  /** Encoded avatar plus its owner-key proof; used as the avatar QR phase. */
  avatarPayload?: string;
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

interface ProfileAvatarProof {
  schema: 1;
  algorithm: "ECDSA-P256-SHA256";
  keyId: string;
  profileId: string;
  profileUpdatedAt: number;
  profileProofHash: string;
  avatarHash: string;
  signature: string;
}

interface ProfileAvatarEnvelope {
  v: 1;
  a: string;
  ap: ProfileAvatarProof;
}

interface ProfileShareBundleV4 {
  v: 4;
  p: string;
  x: string;
  h: string;
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
const PREFIX_BUNDLE = "4r.";
const PREFIX_AVATAR = "a1.";
const AVATAR_ALGORITHM = "ECDSA-P256-SHA256" as const;
const CURVE = "P-256";
const TEXT = new TextEncoder();

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error("Deze browser kan de profielfoto niet bevestigen");
  return globalThis.crypto.subtle;
}

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
  if (!clean) throw new Error("Ongeldig profiel: verwacht veld ontbreekt");
  return { ...clean, isImported: true, origin: "shared", lockedAt: Date.now() };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function avatarProofMessage(proof: Omit<ProfileAvatarProof, "signature">): string {
  return canonicalJson(proof);
}

function sanitizeAvatarProof(raw: unknown): ProfileAvatarProof | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const proof = raw as Record<string, unknown>;
  if (proof.schema !== 1 || proof.algorithm !== AVATAR_ALGORITHM) return undefined;
  if (typeof proof.keyId !== "string" || typeof proof.profileId !== "string"
    || typeof proof.profileProofHash !== "string" || typeof proof.avatarHash !== "string"
    || typeof proof.signature !== "string") return undefined;
  if (typeof proof.profileUpdatedAt !== "number" || !Number.isFinite(proof.profileUpdatedAt)) return undefined;
  return {
    schema: 1,
    algorithm: AVATAR_ALGORITHM,
    keyId: proof.keyId,
    profileId: proof.profileId,
    profileUpdatedAt: proof.profileUpdatedAt,
    profileProofHash: proof.profileProofHash,
    avatarHash: proof.avatarHash,
    signature: proof.signature,
  };
}

async function createAvatarProof(
  profile: Profile,
  avatarDataUrl: string,
  ownerKey: ProfileOwnerKey,
): Promise<ProfileAvatarProof> {
  const profileProof = profile.consentProof;
  if (!profileProof || profileProof.keyId !== ownerKey.keyId
    || ownerKey.profileId !== profile.id || !await verifyProfileOwnerKey(ownerKey)) {
    throw new Error("De profielfoto kan niet met deze eigendomssleutel worden bevestigd");
  }
  const unsigned = {
    schema: 1 as const,
    algorithm: AVATAR_ALGORITHM,
    keyId: ownerKey.keyId,
    profileId: profile.id,
    profileUpdatedAt: profile.updatedAt,
    profileProofHash: profileProof.proofHash,
    avatarHash: await sha256Base64Url(avatarDataUrl),
  };
  const privateKey = await subtle().importKey(
    "jwk", ownerKey.privateKeyJwk, { name: "ECDSA", namedCurve: CURVE }, false, ["sign"],
  );
  const signature = bytesToBase64Url(new Uint8Array(await subtle().sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    TEXT.encode(avatarProofMessage(unsigned)),
  )));
  return { ...unsigned, signature };
}

function encodeAvatarEnvelope(avatarDataUrl: string, proof: ProfileAvatarProof): string {
  const avatar = sanitizeAvatar(avatarDataUrl);
  if (!avatar) throw new Error("Profielfoto is ongeldig of te groot");
  const raw = new TextEncoder().encode(JSON.stringify({ v: 1, a: avatar, ap: proof } satisfies ProfileAvatarEnvelope));
  return PREFIX_AVATAR + bytesToBase64Url(raw);
}

function decodeAvatarEnvelope(encoded: string): ProfileAvatarEnvelope {
  if (!encoded.startsWith(PREFIX_AVATAR) || encoded.length > MAX_PROFILE_SHARE_ENCODED_CHARS) {
    throw new Error("Ongeldige profielfotocode");
  }
  const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded.slice(PREFIX_AVATAR.length)))) as Partial<ProfileAvatarEnvelope>;
  const avatar = sanitizeAvatar(parsed.a);
  const proof = sanitizeAvatarProof(parsed.ap);
  if (parsed.v !== 1 || !avatar || !proof) throw new Error("Ongeldige profielfotocode");
  return { v: 1, a: avatar, ap: proof };
}

async function verifyAvatarEnvelope(profile: Profile, envelope: ProfileAvatarEnvelope): Promise<void> {
  const profileProof = profile.consentProof;
  const proof = envelope.ap;
  if (!profileProof || proof.keyId !== profileProof.keyId
    || proof.profileProofHash !== profileProof.proofHash
    || proof.profileId !== profile.id
    || proof.profileUpdatedAt !== profile.updatedAt
    || proof.avatarHash !== await sha256Base64Url(envelope.a)) {
    throw new Error("De profielfoto hoort niet bij dit bevestigde profiel");
  }
  try {
    const { signature: _signature, ...unsigned } = proof;
    const publicKey = await subtle().importKey(
      "jwk", profileProof.publicKeyJwk, { name: "ECDSA", namedCurve: CURVE }, false, ["verify"],
    );
    const valid = await subtle().verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      base64UrlToBytes(proof.signature),
      TEXT.encode(avatarProofMessage(unsigned)),
    );
    if (!valid) throw new Error("invalid signature");
  } catch {
    throw new Error("De profielfoto hoort niet bij dit bevestigde profiel");
  }
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

export function isProfileShareBundle(encoded: string): boolean {
  return encoded.startsWith(PREFIX_BUNDLE);
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

export function encodeProfileShareBundle(profilePayload: string, avatarPayload: string): string {
  decodeAvatarEnvelope(avatarPayload);
  if (!profilePayload || profilePayload.length > MAX_PROFILE_SHARE_ENCODED_CHARS) {
    throw new Error("Profielcode is te groot");
  }
  const bundle: ProfileShareBundleV4 = {
    v: 4,
    p: profilePayload,
    x: avatarPayload,
    h: checksumProfilePayload(avatarPayload),
  };
  const raw = new TextEncoder().encode(JSON.stringify(bundle));
  const encoded = PREFIX_BUNDLE + bytesToBase64Url(raw);
  if (encoded.length > MAX_PROFILE_SHARE_ENCODED_CHARS) {
    throw new Error("Profielbundel is te groot");
  }
  return encoded;
}

export async function encodeProfileShareTransport(
  profile: Profile,
  opts?: ProfileShareV3Options,
): Promise<ProfileShareTransport> {
  const profilePayload = await encodeProfileV3(profile, opts);
  let avatarDataUrl: string | undefined;
  if (opts?.includeAvatar && profile.avatarDataUrl) {
    avatarDataUrl = typeof document !== "undefined" && typeof Image !== "undefined"
      ? await prepareAvatarForShare(profile.avatarDataUrl) ?? sanitizeAvatar(profile.avatarDataUrl)
      : sanitizeAvatar(profile.avatarDataUrl);
  }
  if (!avatarDataUrl || !opts?.avatarOwnerKey || !profile.consentProof) {
    return { encoded: profilePayload, profilePayload };
  }
  const avatarProof = await createAvatarProof(profile, avatarDataUrl, opts.avatarOwnerKey);
  const avatarPayload = encodeAvatarEnvelope(avatarDataUrl, avatarProof);
  return {
    encoded: encodeProfileShareBundle(profilePayload, avatarPayload),
    profilePayload,
    avatarPayload,
  };
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

async function decodeProfileShareBundle(encoded: string): Promise<Profile> {
  if (encoded.length > MAX_PROFILE_SHARE_ENCODED_CHARS) {
    throw new Error("Profielbundel is te groot");
  }
  const decoded = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded.slice(PREFIX_BUNDLE.length)))) as Partial<ProfileShareBundleV4>;
  if (decoded.v !== 4 || typeof decoded.p !== "string"
    || typeof decoded.x !== "string" || typeof decoded.h !== "string") {
    throw new Error("Ongeldige profielbundel");
  }
  if (checksumProfilePayload(decoded.x) !== decoded.h) {
    throw new Error("Profielfoto is beschadigd");
  }
  const profile = isProfileV3(decoded.p)
    ? await decodeProfileV3(decoded.p)
    : decodeAny(decoded.p);
  const envelope = decodeAvatarEnvelope(decoded.x);
  await verifyAvatarEnvelope(profile, envelope);
  return { ...profile, avatarDataUrl: envelope.a };
}

export async function decodeSharedProfile(encoded: string): Promise<Profile> {
  if (isProfileShareBundle(encoded)) return decodeProfileShareBundle(encoded);
  return isProfileV3(encoded) ? decodeProfileV3(encoded) : decodeAny(encoded);
}
