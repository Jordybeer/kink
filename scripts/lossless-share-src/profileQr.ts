export const PROFILE_QR_SINGLE_LIMIT = 900;
export const PROFILE_QR_CHUNK_SIZE = 680;

export interface ProfileQrPart {
  transferId: string;
  index: number;
  total: number;
  checksum: string;
  chunk: string;
}

export interface ProfileQrAssembly {
  transferId: string;
  total: number;
  checksum: string;
  parts: Record<number, string>;
}

export interface ProfileQrSet {
  shareUrl: string;
  qrValues: string[];
  transferId: string | null;
}

export type ProfileQrCollectResult =
  | { status: "progress"; assembly: ProfileQrAssembly; received: number; total: number }
  | { status: "complete"; payload: string }
  | { status: "error"; message: string };

function cleanOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

export function profileShareUrl(origin: string, payload: string): string {
  return `${cleanOrigin(origin)}/#p3=${payload}`;
}

export function checksumProfilePayload(payload: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function buildProfileQrSet(origin: string, payload: string): ProfileQrSet {
  const shareUrl = profileShareUrl(origin, payload);
  if (shareUrl.length <= PROFILE_QR_SINGLE_LIMIT) {
    return { shareUrl, qrValues: [shareUrl], transferId: null };
  }

  const checksum = checksumProfilePayload(payload);
  const transferId = `${checksum}${payload.length.toString(36)}`;
  const chunks: string[] = [];
  for (let offset = 0; offset < payload.length; offset += PROFILE_QR_CHUNK_SIZE) {
    chunks.push(payload.slice(offset, offset + PROFILE_QR_CHUNK_SIZE));
  }
  const total = chunks.length;
  const base = cleanOrigin(origin);
  const qrValues = chunks.map(
    (chunk, idx) => `${base}/#p3m=${transferId}.${idx + 1}.${total}.${checksum}.${chunk}`,
  );
  return { shareUrl, qrValues, transferId };
}

export function parseProfileQrPart(value: string): ProfileQrPart | null {
  const pieces = value.split(".");
  if (pieces.length !== 5) return null;
  const [transferId, indexRaw, totalRaw, checksum, chunk] = pieces;
  const index = Number(indexRaw);
  const total = Number(totalRaw);
  if (!/^[a-z0-9]{8,40}$/i.test(transferId)) return null;
  if (!/^[a-z0-9]{7}$/i.test(checksum)) return null;
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 2 || total > 64) return null;
  if (index < 1 || index > total || !chunk) return null;
  return { transferId, index, total, checksum, chunk };
}

export function addProfileQrPart(
  current: ProfileQrAssembly | null,
  part: ProfileQrPart,
): ProfileQrCollectResult {
  if (current && current.transferId === part.transferId
    && (current.total !== part.total || current.checksum !== part.checksum)) {
    return { status: "error", message: "Deze QR hoort niet bij dezelfde profielset." };
  }

  const assembly: ProfileQrAssembly = current?.transferId === part.transferId
    ? { ...current, parts: { ...current.parts, [part.index]: part.chunk } }
    : {
        transferId: part.transferId,
        total: part.total,
        checksum: part.checksum,
        parts: { [part.index]: part.chunk },
      };

  const received = Object.keys(assembly.parts).length;
  if (received < assembly.total) {
    return { status: "progress", assembly, received, total: assembly.total };
  }

  const payload = Array.from({ length: assembly.total }, (_, index) => assembly.parts[index + 1] ?? "").join("");
  if (!payload || checksumProfilePayload(payload) !== assembly.checksum) {
    return { status: "error", message: "De QR-set is onvolledig of beschadigd. Scan de delen opnieuw." };
  }
  return { status: "complete", payload };
}
