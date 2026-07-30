from pathlib import Path
from textwrap import dedent

ROOT = Path('.')

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(dedent(content).lstrip(), encoding='utf-8')

def replace_once(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise RuntimeError(f'{path}: expected one match, found {text.count(old)} for {old[:80]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

write('lib/profileAlias.ts', r'''
import { getProfileVerificationCode } from "@/lib/profileVerification";
import type { Profile } from "@/types";

const WORDS = [
  "rope", "velvet", "ember", "ritual", "praise", "collar", "tease", "pulse",
  "trust", "silk", "leather", "candle", "whisper", "knot", "moon", "flame",
  "shadow", "satin", "rhythm", "surrender", "command", "devotion", "bite", "bloom",
  "chain", "lace", "spark", "trance", "touch", "thrill", "restraint", "play",
  "vow", "gaze", "hush", "crave", "bond", "heat", "echo", "key",
  "mask", "glide", "storm", "grace", "tempo", "secret", "signal", "anchor",
  "daring", "gentle", "fierce", "tender", "wild", "soft", "bold", "night",
  "rose", "copper", "onyx", "ivory", "crimson", "silver", "raven", "feather",
] as const;

function hash(input: string, seed: number): number {
  let value = seed >>> 0;
  for (let index = 0; index < input.length; index++) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}

export function profileAliasFromCode(code: string): string {
  const clean = code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const a = hash(clean, 0x811c9dc5);
  const b = hash(clean.split("").reverse().join(""), 0x9e3779b9);
  const c = hash(`${clean}:${a}:${b}`, 0x85ebca6b);
  return `${WORDS[a & 63]}-${WORDS[b & 63]}-${WORDS[c & 63]}`;
}

export function getProfileAlias(profile: Pick<Profile, "id" | "verificationCode">): string {
  return profileAliasFromCode(getProfileVerificationCode(profile));
}
''')

write('lib/consentCrypto.ts', r'''
import { getProfileVerificationCode } from "@/lib/profileVerification";
import type {
  Profile,
  ProfileConsentData,
  ProfileConsentSeal,
  ProfileOwnershipKey,
  SharedKinkConsent,
} from "@/types";

const FORMAT = 1 as const;
const ALGORITHM = "ECDSA-P256-SHA256" as const;
const MAX_CRYPTO_TEXT = 2_000;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Niet-eindig getal in ondertekenbare data");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  throw new Error("Niet-ondersteunde waarde in ondertekenbare data");
}

export async function hashCanonical(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes));
  return bytesToBase64Url(new Uint8Array(digest));
}

function publicKeyMaterial(key: JsonWebKey): Record<string, string> {
  if (key.kty !== "EC" || key.crv !== "P-256" || typeof key.x !== "string" || typeof key.y !== "string") {
    throw new Error("Ongeldige publieke profielsleutel");
  }
  return { kty: key.kty, crv: key.crv, x: key.x, y: key.y };
}

async function keyIdFor(publicKey: JsonWebKey): Promise<string> {
  return (await hashCanonical(publicKeyMaterial(publicKey))).slice(0, 22);
}

async function importPrivateKey(key: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    key,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function importPublicKey(key: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    key,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
}

export async function signCanonical(value: unknown, privateKey: JsonWebKey): Promise<string> {
  const key = await importPrivateKey(privateKey);
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(bytes),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifyCanonical(
  value: unknown,
  signature: string,
  publicKey: JsonWebKey,
): Promise<boolean> {
  try {
    const key = await importPublicKey(publicKey);
    const bytes = new TextEncoder().encode(canonicalJson(value));
    return crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      toArrayBuffer(base64UrlToBytes(signature)),
      toArrayBuffer(bytes),
    );
  } catch {
    return false;
  }
}

function cleanEntry(entry: Profile["entries"][string]): SharedKinkConsent | null {
  if (entry.privateResponse === true) return null;
  const clean: SharedKinkConsent = {
    status: entry.status,
    comment: entry.comment || "",
  };
  if (entry.desire != null) clean.desire = entry.desire;
  if (entry.experienced != null) clean.experienced = entry.experienced;
  if (entry.tags?.length) clean.tags = [...entry.tags];
  if (entry.curious === true) clean.curious = true;
  const hasData = clean.status !== null || clean.comment || clean.desire != null
    || clean.experienced != null || !!clean.tags?.length || clean.curious === true;
  return hasData ? clean : null;
}

export function buildProfileConsentData(profile: Profile): ProfileConsentData {
  const entries: Record<string, SharedKinkConsent> = {};
  for (const [id, entry] of Object.entries(profile.entries)) {
    const clean = cleanEntry(entry);
    if (clean) entries[id] = clean;
  }
  const customKinks = (profile.customKinks ?? [])
    .filter((kink) => profile.entries[kink.id]?.privateResponse !== true)
    .map((kink) => ({ id: kink.id, name: kink.name }));
  return {
    profileId: profile.id,
    profileCode: getProfileVerificationCode(profile),
    name: profile.name,
    role: profile.role,
    experienceLevel: profile.experienceLevel,
    createdAt: profile.createdAt,
    relationshipStatus: profile.relationshipStatus,
    bdsmtestUrl: profile.bdsmtestUrl,
    bdsmtestScores: profile.bdsmtestScores,
    customKinks,
    entries,
  };
}

export async function generateProfileOwnershipKey(profileId: string): Promise<ProfileOwnershipKey> {
  if (!crypto.subtle) throw new Error("Dit toestel kan geen veilige profielsleutel maken");
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  ) as CryptoKeyPair;
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.exportKey("jwk", pair.publicKey),
    crypto.subtle.exportKey("jwk", pair.privateKey),
  ]);
  return {
    profileId,
    algorithm: ALGORITHM,
    keyId: await keyIdFor(publicKey),
    publicKey,
    privateKey,
    createdAt: Date.now(),
  };
}

function sealDocument(
  data: ProfileConsentData,
  seal: Pick<ProfileConsentSeal, "revision" | "issuedAt" | "previousHash" | "keyId" | "publicKey">,
) {
  return {
    format: FORMAT,
    data,
    revision: seal.revision,
    issuedAt: seal.issuedAt,
    previousHash: seal.previousHash,
    keyId: seal.keyId,
    publicKey: publicKeyMaterial(seal.publicKey),
  };
}

export async function createProfileConsentSeal(
  profile: Profile,
  ownership: ProfileOwnershipKey,
  issuedAt = Date.now(),
): Promise<ProfileConsentSeal> {
  if (ownership.profileId !== profile.id) throw new Error("Profielsleutel hoort bij een ander profiel");
  const computedKeyId = await keyIdFor(ownership.publicKey);
  if (computedKeyId !== ownership.keyId) throw new Error("Profielsleutel is beschadigd");
  const base = {
    algorithm: ALGORITHM,
    revision: Math.max(1, profile.consentRevision ?? 1),
    issuedAt,
    previousHash: profile.previousConsentHash,
    keyId: ownership.keyId,
    publicKey: ownership.publicKey,
  } satisfies Omit<ProfileConsentSeal, "payloadHash" | "signature">;
  const document = sealDocument(buildProfileConsentData(profile), base);
  return {
    ...base,
    payloadHash: await hashCanonical(document),
    signature: await signCanonical(document, ownership.privateKey),
  };
}

export type ConsentSealVerification =
  | { status: "confirmed"; keyId: string; revision: number }
  | { status: "legacy"; reason: "missing" }
  | { status: "invalid"; reason: string };

export async function verifyProfileConsentData(
  data: ProfileConsentData,
  seal: ProfileConsentSeal | undefined,
  expectedRevision?: number,
): Promise<ConsentSealVerification> {
  if (!seal) return { status: "legacy", reason: "missing" };
  try {
    if (seal.algorithm !== ALGORITHM) return { status: "invalid", reason: "Onbekend sleuteltype" };
    if (expectedRevision != null && expectedRevision !== seal.revision) {
      return { status: "invalid", reason: "Versienummer komt niet overeen" };
    }
    const computedKeyId = await keyIdFor(seal.publicKey);
    if (computedKeyId !== seal.keyId) return { status: "invalid", reason: "Broncode komt niet overeen" };
    const document = sealDocument(data, seal);
    if (await hashCanonical(document) !== seal.payloadHash) {
      return { status: "invalid", reason: "Inhoud is gewijzigd" };
    }
    if (!await verifyCanonical(document, seal.signature, seal.publicKey)) {
      return { status: "invalid", reason: "Verzegeling is ongeldig" };
    }
    return { status: "confirmed", keyId: seal.keyId, revision: seal.revision };
  } catch {
    return { status: "invalid", reason: "Broncontrole kon niet worden uitgevoerd" };
  }
}

export async function verifyProfileConsentSeal(profile: Profile): Promise<ConsentSealVerification> {
  return verifyProfileConsentData(
    buildProfileConsentData(profile),
    profile.consentSeal,
    profile.consentRevision ?? profile.consentSeal?.revision,
  );
}

function shortText(value: unknown, max = MAX_CRYPTO_TEXT): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

function sanitizePublicJwk(raw: unknown): JsonWebKey | null {
  if (!raw || typeof raw !== "object") return null;
  const key = raw as JsonWebKey;
  if (key.kty !== "EC" || key.crv !== "P-256" || !shortText(key.x, 200) || !shortText(key.y, 200)) return null;
  return { kty: "EC", crv: "P-256", x: key.x, y: key.y, ext: true, key_ops: ["verify"] };
}

export function sanitizeProfileConsentSeal(raw: unknown): ProfileConsentSeal | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  const publicKey = sanitizePublicJwk(value.publicKey);
  const keyId = shortText(value.keyId, 100);
  const payloadHash = shortText(value.payloadHash, 200);
  const signature = shortText(value.signature, 500);
  const revision = typeof value.revision === "number" && Number.isFinite(value.revision)
    ? Math.max(1, Math.round(value.revision)) : null;
  const issuedAt = typeof value.issuedAt === "number" && Number.isFinite(value.issuedAt)
    ? value.issuedAt : null;
  if (value.algorithm !== ALGORITHM || !publicKey || !keyId || !payloadHash || !signature || !revision || issuedAt == null) {
    return undefined;
  }
  const previousHash = value.previousHash == null ? undefined : shortText(value.previousHash, 200) ?? undefined;
  return { algorithm: ALGORITHM, publicKey, keyId, payloadHash, signature, revision, issuedAt, previousHash };
}

export function sanitizeProfileOwnershipKey(raw: unknown): ProfileOwnershipKey | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const profileId = shortText(value.profileId, 100);
  const keyId = shortText(value.keyId, 100);
  const publicKey = sanitizePublicJwk(value.publicKey);
  const privateRaw = value.privateKey;
  if (!privateRaw || typeof privateRaw !== "object") return null;
  const privateKey = privateRaw as JsonWebKey;
  if (privateKey.kty !== "EC" || privateKey.crv !== "P-256" || !shortText(privateKey.x, 200)
    || !shortText(privateKey.y, 200) || !shortText(privateKey.d, 200)) return null;
  const createdAt = typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
    ? value.createdAt : Date.now();
  if (value.algorithm !== ALGORITHM || !profileId || !keyId || !publicKey) return null;
  return {
    profileId,
    algorithm: ALGORITHM,
    keyId,
    publicKey,
    privateKey: {
      kty: "EC", crv: "P-256", x: privateKey.x, y: privateKey.y, d: privateKey.d,
      ext: true, key_ops: ["sign"],
    },
    createdAt,
  };
}
''')
