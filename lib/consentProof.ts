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

const SHA256_INITIAL = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
] as const;

const SHA256_ROUND = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const PROFILE_CONSENT_FINGERPRINT_BITS = 80;

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

function rotateRight(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256BytesSync(value: string): Uint8Array {
  const input = TEXT.encode(value);
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(input.length / 0x20000000), false);
  view.setUint32(paddedLength - 4, (input.length * 8) >>> 0, false);

  const state: number[] = [...SHA256_INITIAL];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index++) {
      words[index] = view.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index++) {
      const left = words[index - 15];
      const right = words[index - 2];
      const sigma0 = rotateRight(left, 7) ^ rotateRight(left, 18) ^ (left >>> 3);
      const sigma1 = rotateRight(right, 17) ^ rotateRight(right, 19) ^ (right >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index++) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + SHA256_ROUND[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  state.forEach((word, index) => digestView.setUint32(index * 4, word, false));
  return digest;
}

function crockfordBase32(bytes: Uint8Array): string {
  let buffer = 0;
  let bufferedBits = 0;
  let encoded = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bufferedBits += 8;
    while (bufferedBits >= 5) {
      bufferedBits -= 5;
      encoded += CROCKFORD_BASE32[(buffer >>> bufferedBits) & 31];
      buffer &= (1 << bufferedBits) - 1;
    }
  }
  if (bufferedBits > 0) encoded += CROCKFORD_BASE32[(buffer << (5 - bufferedBits)) & 31];
  return encoded;
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

export function projectProfileConsent(profile: Profile): ProfileConsentPayload {
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
    ...(profile.bdsmtestUrl ? { bdsmtestUrl: profile.bdsmtestUrl } : {}),
    ...(profile.bdsmtestScores?.length ? { bdsmtestScores: profile.bdsmtestScores } : {}),
    customKinks,
    entries,
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

export async function verifyProfileConsent(profile: Profile): Promise<ConsentVerification> {
  if (!profile.consentProof) return { status: "unsigned" };
  return verifyConsentPayload(projectProfileConsent(profile), profile.consentProof);
}

export async function createConsentSnapshot(profile: Profile): Promise<ConsentSnapshot | null> {
  const verification = await verifyProfileConsent(profile);
  if (verification.status !== "valid") return null;
  return {
    profileId: profile.id,
    profileName: profile.name,
    verificationCode: getProfileVerificationCode(profile),
    alias: profileConsentAlias(profile),
    capturedAt: Date.now(),
    payload: projectProfileConsent(profile),
    proof: verification.proof,
  };
}

export function profileConsentFingerprint(verificationCode: string, keyId: string): string {
  const digest = sha256BytesSync(canonicalJson({ verificationCode, keyId }));
  const encoded = crockfordBase32(digest.subarray(0, PROFILE_CONSENT_FINGERPRINT_BITS / 8));
  return encoded.match(/.{1,4}/g)!.join("-");
}

export function profileConsentAlias(profile: Pick<Profile, "id" | "verificationCode" | "consentProof">): string {
  const keyId = profile.consentProof?.keyId ?? `unsigned-profile:${profile.id}`;
  return profileConsentFingerprint(getProfileVerificationCode(profile), keyId);
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
