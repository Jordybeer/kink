import { canonicalJson } from "@/lib/consentProof";
import type { ContractExchangeEnvelope } from "@/lib/contractLifecycle";

const SINGLE_LIMIT = 900;
const CHUNK_SIZE = 650;
const MAX_PARTS = 96;
const MAX_ENCODED_CHARS = CHUNK_SIZE * MAX_PARTS;
const MAX_FRAME_CHARS = MAX_ENCODED_CHARS + 64;
export const CONTRACT_QR_AUTO_INTERVAL_MS = 600;

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export interface ContractQrFrame {
  value: string;
  index: number;
  total: number;
}

export interface ContractQrAssembly {
  transferId: string;
  total: number;
  checksum: string;
  parts: Record<number, string>;
}

export type ContractQrCollectResult =
  | { status: "progress"; assembly: ContractQrAssembly; received: number; total: number }
  | { status: "complete"; encoded: string }
  | { status: "error"; message: string };

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
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function encodeContractEnvelope(envelope: ContractExchangeEnvelope): string {
  return bytesToBase64Url(TEXT_ENCODER.encode(canonicalJson(envelope)));
}

export function decodeContractEnvelope(encoded: string): ContractExchangeEnvelope {
  if (!encoded || encoded.length > MAX_ENCODED_CHARS) throw new Error("Contractoverdracht is te groot");
  const parsed = JSON.parse(TEXT_DECODER.decode(base64UrlToBytes(encoded))) as ContractExchangeEnvelope;
  if (!parsed || parsed.schema !== 1 || (parsed.kind !== "request" && parsed.kind !== "response" && parsed.kind !== "receipt")) {
    throw new Error("Geen geldige contractoverdracht");
  }
  return parsed;
}

export function buildContractQrFrames(encoded: string): ContractQrFrame[] {
  const single = `KSC1:${encoded}`;
  if (single.length <= SINGLE_LIMIT) return [{ value: single, index: 1, total: 1 }];
  const chunks: string[] = [];
  for (let offset = 0; offset < encoded.length; offset += CHUNK_SIZE) {
    chunks.push(encoded.slice(offset, offset + CHUNK_SIZE));
  }
  if (chunks.length > MAX_PARTS) throw new Error("Deze contractoverdracht is te groot voor QR");
  const sum = checksum(encoded);
  const transferId = `${sum}${encoded.length.toString(36)}`;
  return chunks.map((chunk, index) => ({
    value: `KSC1P:${transferId}.${index + 1}.${chunks.length}.${sum}.${chunk}`,
    index: index + 1,
    total: chunks.length,
  }));
}

export function parseContractQrValue(raw: string):
  | { kind: "complete"; encoded: string }
  | { kind: "part"; transferId: string; index: number; total: number; checksum: string; chunk: string }
  | null {
  if (raw.length > MAX_FRAME_CHARS) return null;
  const value = raw.trim();
  if (value.startsWith("KSC1:")) {
    const encoded = value.slice(5);
    return encoded && encoded.length <= MAX_ENCODED_CHARS ? { kind: "complete", encoded } : null;
  }
  if (!value.startsWith("KSC1P:")) return null;
  const match = value.slice(6).match(/^([a-z0-9]{8,40})\.(\d{1,3})\.(\d{1,3})\.([a-z0-9]{7})\.([\s\S]+)$/i);
  if (!match) return null;
  const [, transferId, indexRaw, totalRaw, sum, chunk] = match;
  const index = Number(indexRaw);
  const total = Number(totalRaw);
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 2 || total > MAX_PARTS) return null;
  if (index < 1 || index > total || !chunk || chunk.length > CHUNK_SIZE) return null;
  return { kind: "part", transferId, index, total, checksum: sum, chunk };
}

export function addContractQrPart(
  current: ContractQrAssembly | null,
  part: Extract<NonNullable<ReturnType<typeof parseContractQrValue>>, { kind: "part" }>,
): ContractQrCollectResult {
  if (!part.chunk || part.chunk.length > CHUNK_SIZE) {
    return { status: "error", message: "Dit QR-deel is te groot." };
  }
  if (current && (current.transferId !== part.transferId
    || current.total !== part.total
    || current.checksum !== part.checksum)) {
    return { status: "error", message: "Deze QR hoort bij een andere contractoverdracht." };
  }
  const assembly: ContractQrAssembly = current
    ? { ...current, parts: { ...current.parts, [part.index]: part.chunk } }
    : {
        transferId: part.transferId,
        total: part.total,
        checksum: part.checksum,
        parts: { [part.index]: part.chunk },
      };
  const received = Object.keys(assembly.parts).length;
  if (received < assembly.total) return { status: "progress", assembly, received, total: assembly.total };
  const encoded = Array.from({ length: assembly.total }, (_, index) => assembly.parts[index + 1] ?? "").join("");
  if (!encoded || encoded.length > MAX_ENCODED_CHARS || checksum(encoded) !== assembly.checksum) {
    return { status: "error", message: "De QR-reeks is onvolledig of beschadigd." };
  }
  return { status: "complete", encoded };
}
