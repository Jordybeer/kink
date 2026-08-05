import { isMunchPunchPromptId, type MunchPunchPromptId } from "./munchPunchCatalog";
import { validateMunchPunchAnswers, type MunchPunchRoom } from "./munchPunch";

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const JOIN_PREFIX = "KSMJ1:";
const RESPONSE_PREFIX = "KSMR1:";
const ROOM_KEY_PREFIX = "kinksync:munch-punch:key:";

export interface MunchPunchJoinEnvelope {
  v: 1;
  r: string;
  k: string;
  e: number;
  p: MunchPunchPromptId[];
  t: string;
}

interface MunchPunchPlainResponse {
  v: 1;
  r: string;
  e: number;
  p: MunchPunchPromptId[];
  a: number[];
  n: string;
}

export interface MunchPunchDecryptedResponse {
  answers: number[];
  replayHash: string;
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return ownedBuffer(bytes);
}

function randomToken(length = 12): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(length)));
}

function aadFor(join: Pick<MunchPunchJoinEnvelope, "r" | "e" | "p">): ArrayBuffer {
  return ownedBuffer(TEXT_ENCODER.encode(`${RESPONSE_PREFIX}${join.r}:${join.e}:${join.p.join(",")}`));
}

function parseJsonBase64<T>(encoded: string): T {
  return JSON.parse(TEXT_DECODER.decode(base64UrlToBytes(encoded))) as T;
}

function encodeJsonBase64(value: unknown): string {
  return bytesToBase64Url(TEXT_ENCODER.encode(JSON.stringify(value)));
}

function validRoomId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{12,32}$/.test(value);
}

function normalizeJoin(value: unknown): MunchPunchJoinEnvelope {
  if (!value || typeof value !== "object") throw new Error("Geen geldige Munch Punch-room");
  const candidate = value as Partial<MunchPunchJoinEnvelope>;
  if (candidate.v !== 1 || !validRoomId(candidate.r) || typeof candidate.k !== "string" || candidate.k.length < 80) {
    throw new Error("Geen geldige Munch Punch-room");
  }
  if (!Number.isFinite(candidate.e) || Number(candidate.e) <= 0) throw new Error("De room heeft geen geldige vervaltijd");
  if (!Array.isArray(candidate.p) || candidate.p.length < 1 || candidate.p.length > 8 || !candidate.p.every(isMunchPunchPromptId)) {
    throw new Error("De room bevat ongeldige vragen");
  }
  return {
    v: 1,
    r: candidate.r,
    k: candidate.k,
    e: Number(candidate.e),
    p: [...new Set(candidate.p)],
    t: typeof candidate.t === "string" ? candidate.t.slice(0, 48) : "Munch Punch",
  };
}

export function newMunchPunchRoomId(): string {
  return randomToken(12);
}

export async function generateMunchPunchRoomKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const privateKey = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  return { publicKey: bytesToBase64Url(publicKey), privateKey: bytesToBase64Url(privateKey) };
}

export function saveMunchPunchPrivateKey(roomId: string, privateKey: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${ROOM_KEY_PREFIX}${roomId}`, privateKey);
}

export function loadMunchPunchPrivateKey(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(`${ROOM_KEY_PREFIX}${roomId}`);
}

export function forgetMunchPunchPrivateKey(roomId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${ROOM_KEY_PREFIX}${roomId}`);
}

export function joinEnvelopeFromRoom(room: MunchPunchRoom): MunchPunchJoinEnvelope {
  return { v: 1, r: room.id, k: room.hostPublicKey, e: room.expiresAt, p: room.promptIds, t: room.title };
}

export function encodeMunchPunchJoin(join: MunchPunchJoinEnvelope): string {
  return `${JOIN_PREFIX}${encodeJsonBase64(normalizeJoin(join))}`;
}

export function decodeMunchPunchJoin(value: string): MunchPunchJoinEnvelope {
  const raw = value.includes("#") ? value.slice(value.indexOf("#") + 1) : value.trim();
  if (!raw.startsWith(JOIN_PREFIX)) throw new Error("Geen geldige Munch Punch-link");
  return normalizeJoin(parseJsonBase64(raw.slice(JOIN_PREFIX.length)));
}

export function buildMunchPunchJoinUrl(join: MunchPunchJoinEnvelope, origin: string): string {
  const cleanOrigin = origin.replace(/\/$/, "");
  return `${cleanOrigin}/munch-punch/join#${encodeMunchPunchJoin(join)}`;
}

export async function encryptMunchPunchResponse(
  joinInput: MunchPunchJoinEnvelope,
  answersInput: readonly number[],
  now = Date.now(),
): Promise<string> {
  const join = normalizeJoin(joinInput);
  if (now >= join.e) throw new Error("Deze room is vervallen");
  const room = {
    id: join.r,
    title: join.t,
    status: "open" as const,
    createdAt: now,
    expiresAt: join.e,
    promptIds: join.p,
    hostPublicKey: join.k,
    responseCount: 0,
    aggregates: {},
    replayHashes: [],
  };
  const answers = validateMunchPunchAnswers(room, answersInput);
  const hostPublicKey = await crypto.subtle.importKey(
    "raw",
    base64UrlToBytes(join.k),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const guestPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "ECDH", public: hostPublicKey },
    guestPair.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const guestPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", guestPair.publicKey));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const payload: MunchPunchPlainResponse = {
    v: 1,
    r: join.r,
    e: join.e,
    p: join.p,
    a: answers,
    n: randomToken(12),
  };
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ownedBuffer(ivBytes), additionalData: aadFor(join) },
    key,
    ownedBuffer(TEXT_ENCODER.encode(JSON.stringify(payload))),
  ));
  return `${RESPONSE_PREFIX}${join.r}.${bytesToBase64Url(guestPublicKey)}.${bytesToBase64Url(ivBytes)}.${bytesToBase64Url(ciphertext)}`;
}

export async function hashMunchPunchResponse(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", ownedBuffer(TEXT_ENCODER.encode(value.trim())));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function decryptMunchPunchResponse(
  room: MunchPunchRoom,
  privateKeyEncoded: string,
  value: string,
  now = Date.now(),
): Promise<MunchPunchDecryptedResponse> {
  const normalized = value.trim();
  if (!normalized.startsWith(RESPONSE_PREFIX)) throw new Error("Geen geldige Munch Punch-response");
  const match = normalized.slice(RESPONSE_PREFIX.length).match(/^([A-Za-z0-9_-]{12,32})\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!match) throw new Error("De response-QR is beschadigd");
  const [, roomId, guestPublicEncoded, ivEncoded, ciphertextEncoded] = match;
  if (roomId !== room.id) throw new Error("Deze response hoort bij een andere room");
  if (now >= room.expiresAt) throw new Error("Deze room is vervallen");
  const replayHash = await hashMunchPunchResponse(normalized);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    base64UrlToBytes(privateKeyEncoded),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"],
  );
  const guestPublicKey = await crypto.subtle.importKey(
    "raw",
    base64UrlToBytes(guestPublicEncoded),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "ECDH", public: guestPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(ivEncoded),
        additionalData: aadFor(joinEnvelopeFromRoom(room)),
      },
      key,
      base64UrlToBytes(ciphertextEncoded),
    );
  } catch {
    throw new Error("De response kon niet worden geauthenticeerd");
  }
  const payload = JSON.parse(TEXT_DECODER.decode(plaintext)) as Partial<MunchPunchPlainResponse>;
  if (payload.v !== 1 || payload.r !== room.id || payload.e !== room.expiresAt) {
    throw new Error("De response hoort niet bij deze roomconfiguratie");
  }
  if (!Array.isArray(payload.p) || payload.p.join(",") !== room.promptIds.join(",")) {
    throw new Error("De response gebruikt een andere vragenlijst");
  }
  if (typeof payload.n !== "string" || payload.n.length < 12 || !Array.isArray(payload.a)) {
    throw new Error("De response is onvolledig");
  }
  return { answers: validateMunchPunchAnswers(room, payload.a), replayHash };
}
