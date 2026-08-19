import type { ContractVersionContent } from "@/lib/contractLifecycle";

const SIGNATURE_WIDTH = 240;
const SIGNATURE_HEIGHT = 80;

export interface HandwrittenSignature {
  schema: 1;
  width: number;
  height: number;
  bitmap: string;
  capturedAt: number;
}

export interface ContractHandwrittenSignatures {
  profileA: HandwrittenSignature;
  profileB: HandwrittenSignature;
}

export type ContractContentWithHandwriting = ContractVersionContent & {
  handwrittenSignatures?: ContractHandwrittenSignatures;
};

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

export function captureHandwrittenSignature(canvas: HTMLCanvasElement): HandwrittenSignature {
  if (!canvas.width || !canvas.height) throw new Error("Handtekening ontbreekt");
  const normalized = document.createElement("canvas");
  normalized.width = SIGNATURE_WIDTH;
  normalized.height = SIGNATURE_HEIGHT;
  const context = normalized.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Handtekening kon niet worden gelezen");
  context.clearRect(0, 0, normalized.width, normalized.height);
  context.drawImage(canvas, 0, 0, normalized.width, normalized.height);

  const pixels = context.getImageData(0, 0, normalized.width, normalized.height).data;
  const bitCount = normalized.width * normalized.height;
  const packed = new Uint8Array(Math.ceil(bitCount / 8));
  let ink = 0;
  for (let pixel = 0; pixel < bitCount; pixel += 1) {
    if (pixels[pixel * 4 + 3] < 24) continue;
    packed[pixel >> 3] |= 1 << (pixel & 7);
    ink += 1;
  }
  if (ink < 12) throw new Error("Handtekening is leeg");

  return {
    schema: 1,
    width: normalized.width,
    height: normalized.height,
    bitmap: bytesToBase64Url(packed),
    capturedAt: Date.now(),
  };
}

export function isValidHandwrittenSignature(value: unknown): value is HandwrittenSignature {
  if (!value || typeof value !== "object") return false;
  const signature = value as Partial<HandwrittenSignature>;
  if (signature.schema !== 1
    || !Number.isInteger(signature.width) || !Number.isInteger(signature.height)
    || signature.width !== SIGNATURE_WIDTH || signature.height !== SIGNATURE_HEIGHT
    || typeof signature.bitmap !== "string" || signature.bitmap.length === 0
    || typeof signature.capturedAt !== "number" || !Number.isFinite(signature.capturedAt)) return false;
  try {
    return base64UrlToBytes(signature.bitmap).length === Math.ceil(SIGNATURE_WIDTH * SIGNATURE_HEIGHT / 8);
  } catch {
    return false;
  }
}

export function handwrittenSignaturesFromContent(
  content: ContractVersionContent | undefined,
): ContractHandwrittenSignatures | null {
  if (!content) return null;
  const signatures = (content as ContractContentWithHandwriting).handwrittenSignatures;
  return signatures
    && isValidHandwrittenSignature(signatures.profileA)
    && isValidHandwrittenSignature(signatures.profileB)
    ? signatures
    : null;
}

export function hasRequiredHandwrittenSignatures(content: ContractVersionContent | undefined): boolean {
  return handwrittenSignaturesFromContent(content) !== null;
}

export function handwrittenSignatureToPngDataUrl(
  signature: HandwrittenSignature,
  colour = "#9f3e79",
): string {
  if (!isValidHandwrittenSignature(signature)) throw new Error("Handtekening is beschadigd");
  const packed = base64UrlToBytes(signature.bitmap);
  const canvas = document.createElement("canvas");
  canvas.width = signature.width;
  canvas.height = signature.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Handtekening kon niet worden getekend");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = colour;
  for (let pixel = 0; pixel < signature.width * signature.height; pixel += 1) {
    if ((packed[pixel >> 3] & (1 << (pixel & 7))) === 0) continue;
    context.fillRect(pixel % signature.width, Math.floor(pixel / signature.width), 1, 1);
  }
  return canvas.toDataURL("image/png");
}
