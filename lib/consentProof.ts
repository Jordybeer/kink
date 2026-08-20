import type {
  ConsentLedgerEvent,
  ConsentLedgerEventType,
  ConsentSnapshot,
  KinkEntry,
  Profile,
  ProfileConsentPayload,
  ProfileConsentProof,
  ProfileOwnerKey,
  SceneConsentAgreement,
  SceneConsentSnapshots,
  SceneRecord,
} from "@/types";
import { getProfileVerificationCode } from "@/lib/profileVerification";

const ALGORITHM = "ECDSA-P256-SHA256" as const;
const CURVE = "P-256";
const TEXT = new TextEncoder();

const FINGERPRINT_WORDS = [
  "aftercare", "anchor", "arc", "blindfold", "bondage", "brat", "candle", "caning",
  "chastity", "collar", "command", "consent", "control", "crop", "cuffs", "deference",
  "denial", "devotion", "discipline", "dominance", "edge", "flogging", "gag", "gloves",
  "harness", "heel", "hood", "impact", "keyholder", "kneel", "leash", "leather",
  "masochism", "obedience", "paddle", "permission", "play", "praise", "protocol", "primal",
  "restraint", "ritual", "rope", "safeword", "sensation", "service", "shibari", "spanking",
  "submission", "switch", "tease", "throne", "trust", "wax", "whip", "worship",
  "bound", "care", "claim", "devoted", "guided", "held", "honest", "intense",
  "linked", "marked", "mutual", "open", "owned", "patient", "playful", "present",
  "protected", "quiet", "ready", "sealed", "steady", "tender", "trusted", "willing",
  "amber", "black", "crimson", "gold", "indigo", "ivory", "midnight", "silver",
  "velvet", "violet", "ember", "flame", "moon", "night", "shadow", "smoke",
] as const;

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error("Deze browser kan bronbevestiging niet gebruiken");
  return globalThis.crypto.subtle;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const next = (value as Record<string, unknown>)[key];
      if (next !== undefined) out[key] = canonicalValue(next);
    }
    return out;
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  return new Uint8Array(await subtle().digest("SHA-256", TEXT.encode(value)));
}

export async function sha256Base64Url(value: string): Promise<string> {
  return bytesToBase64Url(await sha256Bytes(value));
}

function stablePublicJwk(raw: JsonWebKey): JsonWebKey {
  return {
    kty: raw.kty,
    crv: raw.crv,
    x: raw.x,
    y: raw.y,
    ext: true,
  };
}

function validPublicJwk(raw: unknown): raw is JsonWebKey {
  if (!raw || typeof raw !== "object") return false;
  const jwk = raw as JsonWebKey;
  return jwk.kty === "EC" && jwk.crv === CURVE
    && typeof jwk.x === "string" && typeof jwk.y === "string";
}

function validPrivateJwk(raw: unknown): raw is JsonWebKey {
  return validPublicJwk(raw) && typeof (raw as JsonWebKey).d === "string";
}

export async function keyIdForPublicKey(publicKeyJwk: JsonWebKey): Promise<string> {
  return sha256Base64Url(canonicalJson(stablePublicJwk(publicKeyJwk)));
}

export function sanitizeProfileConsentProof(raw: unknown): ProfileConsentProof | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  if (p.schema !== 1 || p.algorithm !== ALGORITHM || !validPublicJwk(p.publicKeyJwk)) return undefined;
  if (typeof p.keyId !== "string" || typeof p.payloadHash !== "string"
    || typeof p.signature !== "string" || typeof p.proofHash !== "string") return undefined;
  if (typeof p.version !== "number" || !Number.isSafeInteger(p.version) || p.version < 1) return undefined;
  if (typeof p.signedAt !== "number" || !Number.isFinite(p.signedAt)) return undefined;
  if (p.previousProofHash !== undefined && typeof p.previousProofHash !== "string") return undefined;
  return {
    schema: 1,
    algorithm: ALGORITHM,
    keyId: p.keyId,
    publicKeyJwk: stablePublicJwk(p.publicKeyJwk),
    version: p.version,
    signedAt: p.signedAt,
    ...(typeof p.previousProofHash === "string" ? { previousProofHash: p.previousProofHash } : {}),
    payloadHash: p.payloadHash,
    signature: p.signature,
    proofHash: p.proofHash,
  };
}

export function sanitizeProfileOwnerKey(raw: unknown): ProfileOwnerKey | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const key = raw as Record<string, unknown>;
  if (typeof key.profileId !== "string" || typeof key.keyId !== "string") return undefined;
  if (!validPublicJwk(key.publicKeyJwk) || !validPrivateJwk(key.privateKeyJwk)) return undefined;
  if (typeof key.createdAt !== "number" || !Number.isFinite(key.createdAt)) return undefined;
  if (typeof key.version !== "number" || !Number.isSafeInteger(key.version) || key.version < 0) return undefined;
  if (key.lastProofHash !== undefined && typeof key.lastProofHash !== "string") return undefined;
  return {
    profileId: key.profileId,
    keyId: key.keyId,
    publicKeyJwk: stablePublicJwk(key.publicKeyJwk),
    privateKeyJwk: key.privateKeyJwk,
    createdAt: key.createdAt,
    version: key.version,
    ...(typeof key.lastProofHash === "string" ? { lastProofHash: key.lastProofHash } : {}),
  };
}

export async function verifyProfileOwnerKey(key: ProfileOwnerKey): Promise<boolean> {
  try {
    if (await keyIdForPublicKey(key.publicKeyJwk) !== key.keyId) return false;
    const privateKey = await subtle().importKey(
      "jwk", key.privateKeyJwk, { name: "ECDSA", namedCurve: CURVE }, false, ["sign"],
    );
    const publicKey = await subtle().importKey(
      "jwk", key.publicKeyJwk, { name: "ECDSA", namedCurve: CURVE }, false, ["verify"],
    );
    const challenge = TEXT.encode(`kinksync-owner:${key.profileId}:${key.keyId}`);
    const signature = await subtle().sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, challenge);
    return subtle().verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signature, challenge);
  } catch {
    return false;
  }
}

export async function generateProfileOwnerKey(profileId: string): Promise<ProfileOwnerKey> {
  const pair = await subtle().generateKey(
    { name: "ECDSA", namedCurve: CURVE }, true, ["sign", "verify"],
  ) as CryptoKeyPair;
  const publicKeyJwk = stablePublicJwk(await subtle().exportKey("jwk", pair.publicKey));
  const privateKeyJwk = await subtle().exportKey("jwk", pair.privateKey);
  return {
    profileId,
    keyId: await keyIdForPublicKey(publicKeyJwk),
    publicKeyJwk,
    privateKeyJwk,
    createdAt: Date.now(),
    version: 0,
  };
}

function cleanEntry(entry: KinkEntry): KinkEntry {
  return {
    status: entry.status,
    comment: entry.comment || "",
    ...(entry.desire != null ? { desire: entry.desire } : {}),
    ...(entry.experienced != null ? { experienced: entry.experienced } : {}),
    ...(entry.tags?.length ? { tags: [...entry.tags] } : {}),
    ...(entry.curious === true ? { curious: true } : {}),
  };
}

function projectProfileConsentBase(profile: Profile): ProfileConsentPayload {
  const entries: Record<string, KinkEntry> = {};
  for (const id of Object.keys(profile.entries).sort()) {
    const entry = profile.entries[id];
    if (entry.privateResponse === true) continue;
    const clean = cleanEntry(entry);
    const hasData = clean.status !== null || !!clean.comment || clean.desire != null
      || clean.experienced != null || !!clean.tags?.length || clean.curious === true;
    if (hasData) entries[id] = clean;
  }
  const customKinks = (profile.customKinks ?? [])
    .filter((kink) => profile.entries[kink.id]?.privateResponse !== true)
    .map((kink) => ({ id: kink.id, name: kink.name }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    schema: 1,
    profileId: profile.id,
    verificationCode: getProfileVerificationCode(profile),
    name: profile.name,
    role: profile.role,
    experienceLevel: profile.experienceLevel,
    ...(profile.relationshipStatus ? { relationshipStatus: profile.relationshipStatus } : {}),
    customKinks,
    entries,
  };
}

/**
 * Core profile proof. Optional external enrichments deliberately live outside
 * this payload so changing or withholding BDSMTest data never invalidates the
 * consent/profile source proof.
 */
export function projectProfileConsent(profile: Profile): ProfileConsentPayload {
  return projectProfileConsentBase(profile);
}

/** Legacy projection retained only to verify already-shared v3 profiles. */
function projectLegacyProfileConsent(profile: Profile): ProfileConsentPayload {
  return {
    ...projectProfileConsentBase(profile),
    ...(profile.bdsmtestUrl ? { bdsmtestUrl: profile.bdsmtestUrl } : {}),
    ...(profile.bdsmtestScores?.length ? { bdsmtestScores: profile.bdsmtestScores } : {}),
  };
}

export async function hashProfileConsent(profile: Profile): Promise<string> {
  return sha256Base64Url(canonicalJson(projectProfileConsent(profile)));
}

function proofMessage(proof: Omit<ProfileConsentProof, "signature" | "proofHash">): string {
  return canonicalJson(proof);
}

export async function signProfileConsent(
  profile: Profile,
  ownerKey: ProfileOwnerKey,
): Promise<{ proof: ProfileConsentProof; ownerKey: ProfileOwnerKey }> {
  if (ownerKey.profileId !== profile.id) throw new Error("Deze eigendomssleutel hoort bij een ander profiel");
  if (!await verifyProfileOwnerKey(ownerKey)) throw new Error("De eigendomssleutel is beschadigd");
  const payloadHash = await hashProfileConsent(profile);
  const previous = profile.consentProof?.keyId === ownerKey.keyId ? profile.consentProof : undefined;
  const unsigned = {
    schema: 1 as const,
    algorithm: ALGORITHM,
    keyId: ownerKey.keyId,
    publicKeyJwk: stablePublicJwk(ownerKey.publicKeyJwk),
    version: Math.max(ownerKey.version, previous?.version ?? 0) + 1,
    signedAt: Date.now(),
    ...(previous ? { previousProofHash: previous.proofHash } : {}),
    payloadHash,
  };
  const privateKey = await subtle().importKey(
    "jwk", ownerKey.privateKeyJwk, { name: "ECDSA", namedCurve: CURVE }, false, ["sign"],
  );
  const signature = bytesToBase64Url(new Uint8Array(await subtle().sign(
    { name: "ECDSA", hash: "SHA-256" }, privateKey, TEXT.encode(proofMessage(unsigned)),
  )));
  const withoutHash = { ...unsigned, signature };
  const proofHash = await sha256Base64Url(canonicalJson(withoutHash));
  const proof: ProfileConsentProof = { ...withoutHash, proofHash };
  return {
    proof,
    ownerKey: { ...ownerKey, version: proof.version, lastProofHash: proof.proofHash },
  };
}

export type ConsentVerification =
  | { status: "unsigned" }
  | { status: "valid"; proof: ProfileConsentProof }
  | { status: "invalid"; reason: string };

export async function verifyConsentPayload(
  payload: ProfileConsentPayload,
  proof: ProfileConsentProof,
): Promise<ConsentVerification> {
  try {
    if (await keyIdForPublicKey(proof.publicKeyJwk) !== proof.keyId) {
      return { status: "invalid", reason: "De broncode en publieke sleutel horen niet bij elkaar." };
    }
    const expectedPayloadHash = await sha256Base64Url(canonicalJson(payload));
    if (expectedPayloadHash !== proof.payloadHash) {
      return { status: "invalid", reason: "De antwoorden zijn gewijzigd na bevestiging." };
    }
    const { signature: _signature, proofHash: _proofHash, ...unsigned } = proof;
    const expectedProofHash = await sha256Base64Url(canonicalJson({ ...unsigned, signature: proof.signature }));
    if (expectedProofHash !== proof.proofHash) {
      return { status: "invalid", reason: "De bevestigingsketen is gewijzigd." };
    }
    const publicKey = await subtle().importKey(
      "jwk", proof.publicKeyJwk, { name: "ECDSA", namedCurve: CURVE }, false, ["verify"],
    );
    const valid = await subtle().verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      base64UrlToBytes(proof.signature),
      TEXT.encode(proofMessage(unsigned)),
    );
    return valid ? { status: "valid", proof } : { status: "invalid", reason: "De digitale bevestiging klopt niet." };
  } catch {
    return { status: "invalid", reason: "De digitale bevestiging kon niet worden gecontroleerd." };
  }
}

async function verifyProfileConsentWithPayload(profile: Profile): Promise<{
  verification: ConsentVerification;
  payload: ProfileConsentPayload;
}> {
  if (!profile.consentProof) {
    return { verification: { status: "unsigned" }, payload: projectProfileConsent(profile) };
  }

  const core = projectProfileConsent(profile);
  const current = await verifyConsentPayload(core, profile.consentProof);
  if (current.status === "valid") return { verification: current, payload: core };

  // Legacy profiles signed before external enrichments were separated can still
  // be read when they arrive from a shared source. Own profiles intentionally
  // re-seal on the next share/scene instead of continuing the old semantics.
  const shared = profile.origin === "shared" || profile.isImported === true;
  if (shared && (profile.bdsmtestUrl || profile.bdsmtestScores?.length)) {
    const legacy = projectLegacyProfileConsent(profile);
    const legacyVerification = await verifyConsentPayload(legacy, profile.consentProof);
    if (legacyVerification.status === "valid") {
      return { verification: legacyVerification, payload: legacy };
    }
  }

  return { verification: current, payload: core };
}

export async function verifyProfileConsent(profile: Profile): Promise<ConsentVerification> {
  return (await verifyProfileConsentWithPayload(profile)).verification;
}

export async function createConsentSnapshot(profile: Profile): Promise<ConsentSnapshot | null> {
  const checked = await verifyProfileConsentWithPayload(profile);
  if (checked.verification.status !== "valid") return null;
  return {
    profileId: profile.id,
    profileName: profile.name,
    verificationCode: getProfileVerificationCode(profile),
    alias: profileConsentAlias(profile),
    capturedAt: Date.now(),
    payload: checked.payload,
    proof: checked.verification.proof,
  };
}

function fnv1a32(input: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function profileConsentAlias(profile: Pick<Profile, "id" | "verificationCode" | "consentProof">): string {
  const source = `${getProfileVerificationCode(profile)}:${profile.consentProof?.keyId ?? profile.id}`;
  const a = fnv1a32(source, 0x811c9dc5);
  const b = fnv1a32(source.split("").reverse().join(""), 0x9e3779b9);
  const c = fnv1a32(`${source}:kinksync`, 0x85ebca6b);
  const d = fnv1a32(`kinksync:${source}`, 0xc2b2ae35);
  return [a, b, c, d].map((value) => FINGERPRINT_WORDS[value % FINGERPRINT_WORDS.length]).join("-");
}

export function projectSceneConsentAgreement(
  scene: SceneRecord,
  snapshots: SceneConsentSnapshots,
): SceneConsentAgreement {
  return {
    schema: 1,
    sceneId: scene.id,
    title: scene.title,
    profileAId: scene.profileAId,
    profileBId: scene.profileBId,
    profileAProofHash: snapshots.profileA.proof.proofHash,
    profileBProofHash: snapshots.profileB.proof.proofHash,
    ...(scene.plannedDate ? { plannedDate: scene.plannedDate } : {}),
    ...(scene.plannedTime ? { plannedTime: scene.plannedTime } : {}),
    ...(scene.safeword ? { safeword: scene.safeword } : {}),
    items: scene.items.map((item) => ({
      id: item.id,
      name: item.name,
      intensity: item.intensity,
      duration: item.duration,
      note: item.note,
      fromKink: item.fromKink,
      ...(item.kinkId ? { kinkId: item.kinkId } : {}),
      ...(item.tags?.length ? { tags: [...item.tags] } : {}),
    })),
  };
}

export function sceneMatchesConsentAgreement(scene: SceneRecord): boolean {
  if (!scene.consentSnapshots || !scene.consentAgreement) return false;
  return canonicalJson(projectSceneConsentAgreement(scene, scene.consentSnapshots))
    === canonicalJson(scene.consentAgreement);
}

function ledgerBody(event: Omit<ConsentLedgerEvent, "signature" | "eventHash" | "publicKeyJwk" | "keyId">): string {
  return canonicalJson(event);
}

export async function createConsentLedgerEvent(
  input: Omit<ConsentLedgerEvent, "signature" | "eventHash" | "publicKeyJwk" | "keyId">,
  ownerKey?: ProfileOwnerKey,
): Promise<ConsentLedgerEvent> {
  if (!ownerKey) throw new Error("Een deelnemende eigendomssleutel is verplicht");
  if (!await verifyProfileOwnerKey(ownerKey)) throw new Error("De eigendomssleutel is beschadigd");
  const privateKey = await subtle().importKey(
    "jwk", ownerKey.privateKeyJwk, { name: "ECDSA", namedCurve: CURVE }, false, ["sign"],
  );
  const signature = bytesToBase64Url(new Uint8Array(await subtle().sign(
    { name: "ECDSA", hash: "SHA-256" }, privateKey, TEXT.encode(ledgerBody(input)),
  )));
  const signed = {
    ...input,
    keyId: ownerKey.keyId,
    publicKeyJwk: stablePublicJwk(ownerKey.publicKeyJwk),
    signature,
  };
  return { ...signed, eventHash: await sha256Base64Url(canonicalJson(signed)) };
}

export async function verifyConsentLedgerEvent(event: ConsentLedgerEvent): Promise<boolean> {
  try {
    const { eventHash, signature, publicKeyJwk, keyId, ...body } = event;
    if (!signature || !publicKeyJwk || !keyId) return false;
    if (await keyIdForPublicKey(publicKeyJwk) !== keyId) return false;
    const expectedHash = await sha256Base64Url(canonicalJson({ ...body, keyId, publicKeyJwk, signature }));
    if (expectedHash !== eventHash) return false;
    const publicKey = await subtle().importKey(
      "jwk", publicKeyJwk, { name: "ECDSA", namedCurve: CURVE }, false, ["verify"],
    );
    return subtle().verify(
      { name: "ECDSA", hash: "SHA-256" }, publicKey,
      base64UrlToBytes(signature), TEXT.encode(canonicalJson(body)),
    );
  } catch {
    return false;
  }
}

export async function verifyConsentLedger(events: ConsentLedgerEvent[]): Promise<boolean> {
  let previous: string | undefined;
  for (const event of events) {
    if (event.previousEventHash !== previous) return false;
    if (!await verifyConsentLedgerEvent(event)) return false;
    if (event.snapshot) {
      const verified = await verifyConsentPayload(event.snapshot.payload, event.snapshot.proof);
      if (verified.status !== "valid") return false;
    }
    if (event.agreement && event.agreement.sceneId !== event.sceneId) return false;
    previous = event.eventHash;
  }
  return true;
}

export function consentEventLabel(type: ConsentLedgerEventType): string {
  if (type === "locked") return "Afspraken vastgezet";
  if (type === "changed") return "Wijziging bevestigd";
  return "Toestemming ingetrokken";
}
