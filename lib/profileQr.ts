export const PROFILE_QR_SINGLE_LIMIT = 900;
export const PROFILE_QR_CHUNK_SIZE = 680;
export const PROFILE_QR_MAX_PARTS = 64;
export const PROFILE_QR_MAX_BUNDLE_FRAMES = 96;
export const PROFILE_QR_AUTO_INTERVAL_MS = 550;
export const PROFILE_QR_SLOW_INTERVAL_MS = 900;

export type ProfileQrPhase = "profile" | "avatar";

export interface ProfileQrPart {
  transferId: string;
  index: number;
  total: number;
  checksum: string;
  chunk: string;
}

export interface ProfileQrBundlePart extends ProfileQrPart {
  phase: ProfileQrPhase;
}

export interface ProfileQrAssembly {
  transferId: string;
  total: number;
  checksum: string;
  parts: Record<number, string>;
}

export interface ProfileQrBundleAssembly {
  transferId: string;
  profile: ProfileQrAssembly | null;
  avatar: ProfileQrAssembly | null;
}

export interface ProfileQrFrame {
  value: string;
  phase: ProfileQrPhase;
  index: number;
  total: number;
}

export interface ProfileQrSet {
  shareUrl: string;
  qrValues: string[];
  frames: ProfileQrFrame[];
  transferId: string | null;
  qrTooLarge: boolean;
  hasAvatar: boolean;
}

export type ProfileQrCollectResult =
  | { status: "progress"; assembly: ProfileQrAssembly; received: number; total: number }
  | { status: "complete"; payload: string }
  | { status: "error"; message: string };

export type ProfileQrBundleCollectResult =
  | {
      status: "progress";
      assembly: ProfileQrBundleAssembly;
      profileReceived: number;
      profileTotal: number;
      profileComplete: boolean;
      avatarReceived: number;
      avatarTotal: number;
      avatarComplete: boolean;
    }
  | { status: "complete"; profilePayload: string; avatarPayload: string }
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

export function nextProfileQrIndex(current: number, total: number): number {
  if (!Number.isInteger(total) || total <= 1) return 0;
  const safeCurrent = Number.isFinite(current) ? Math.trunc(current) : 0;
  return ((safeCurrent % total) + total + 1) % total;
}

function splitPayload(payload: string): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < payload.length; offset += PROFILE_QR_CHUNK_SIZE) {
    chunks.push(payload.slice(offset, offset + PROFILE_QR_CHUNK_SIZE));
  }
  return chunks;
}

export function buildProfileQrSet(origin: string, payload: string): ProfileQrSet {
  const shareUrl = profileShareUrl(origin, payload);
  if (shareUrl.length <= PROFILE_QR_SINGLE_LIMIT) {
    const frame = { value: shareUrl, phase: "profile" as const, index: 1, total: 1 };
    return {
      shareUrl,
      qrValues: [shareUrl],
      frames: [frame],
      transferId: null,
      qrTooLarge: false,
      hasAvatar: false,
    };
  }

  const checksum = checksumProfilePayload(payload);
  const transferId = `${checksum}${payload.length.toString(36)}`;
  const chunks = splitPayload(payload);
  const total = chunks.length;
  if (total > PROFILE_QR_MAX_PARTS) {
    return {
      shareUrl,
      qrValues: [],
      frames: [],
      transferId: null,
      qrTooLarge: true,
      hasAvatar: false,
    };
  }
  const base = cleanOrigin(origin);
  const frames = chunks.map((chunk, idx): ProfileQrFrame => ({
    value: `${base}/#p3m=${transferId}.${idx + 1}.${total}.${checksum}.${chunk}`,
    phase: "profile",
    index: idx + 1,
    total,
  }));
  return {
    shareUrl,
    qrValues: frames.map((frame) => frame.value),
    frames,
    transferId,
    qrTooLarge: false,
    hasAvatar: false,
  };
}

export function buildProfileQrBundleSet(
  origin: string,
  profilePayload: string,
  fullPayload: string,
  avatarPayload?: string,
): ProfileQrSet {
  if (!avatarPayload) return buildProfileQrSet(origin, fullPayload);

  const shareUrl = profileShareUrl(origin, fullPayload);
  const profileChecksum = checksumProfilePayload(profilePayload);
  const avatarChecksum = checksumProfilePayload(avatarPayload);
  const transferId = `${profileChecksum}${avatarChecksum}${profilePayload.length.toString(36)}${avatarPayload.length.toString(36)}`;
  const profileChunks = splitPayload(profilePayload);
  const avatarChunks = splitPayload(avatarPayload);
  const frameCount = profileChunks.length + avatarChunks.length;

  if (profileChunks.length > PROFILE_QR_MAX_PARTS
    || avatarChunks.length > PROFILE_QR_MAX_PARTS
    || frameCount > PROFILE_QR_MAX_BUNDLE_FRAMES) {
    return {
      shareUrl,
      qrValues: [],
      frames: [],
      transferId: null,
      qrTooLarge: true,
      hasAvatar: true,
    };
  }

  const base = cleanOrigin(origin);
  const profileFrames = profileChunks.map((chunk, idx): ProfileQrFrame => ({
    value: `${base}/#p3b=${transferId}.p.${idx + 1}.${profileChunks.length}.${profileChecksum}.${chunk}`,
    phase: "profile",
    index: idx + 1,
    total: profileChunks.length,
  }));
  const avatarFrames = avatarChunks.map((chunk, idx): ProfileQrFrame => ({
    value: `${base}/#p3b=${transferId}.a.${idx + 1}.${avatarChunks.length}.${avatarChecksum}.${chunk}`,
    phase: "avatar",
    index: idx + 1,
    total: avatarChunks.length,
  }));
  const frames = [...profileFrames, ...avatarFrames];

  return {
    shareUrl,
    qrValues: frames.map((frame) => frame.value),
    frames,
    transferId,
    qrTooLarge: false,
    hasAvatar: true,
  };
}

export function parseProfileQrPart(value: string): ProfileQrPart | null {
  const match = value.match(/^([a-z0-9]{8,40})\.(\d{1,2})\.(\d{1,2})\.([a-z0-9]{7})\.([\s\S]+)$/i);
  if (!match) return null;
  const [, transferId, indexRaw, totalRaw, checksum, chunk] = match;
  const index = Number(indexRaw);
  const total = Number(totalRaw);
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 2 || total > PROFILE_QR_MAX_PARTS) return null;
  if (index < 1 || index > total || !chunk) return null;
  return { transferId, index, total, checksum, chunk };
}

export function parseProfileQrBundlePart(value: string): ProfileQrBundlePart | null {
  const match = value.match(/^([a-z0-9]{12,80})\.([pa])\.(\d{1,2})\.(\d{1,2})\.([a-z0-9]{7})\.([\s\S]+)$/i);
  if (!match) return null;
  const [, transferId, phaseRaw, indexRaw, totalRaw, checksum, chunk] = match;
  const index = Number(indexRaw);
  const total = Number(totalRaw);
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || total > PROFILE_QR_MAX_PARTS) return null;
  if (index < 1 || index > total || !chunk) return null;
  return {
    transferId,
    phase: phaseRaw.toLowerCase() === "p" ? "profile" : "avatar",
    index,
    total,
    checksum,
    chunk,
  };
}

function assemblePayload(assembly: ProfileQrAssembly | null): string | null {
  if (!assembly || Object.keys(assembly.parts).length < assembly.total) return null;
  const payload = Array.from(
    { length: assembly.total },
    (_, index) => assembly.parts[index + 1] ?? "",
  ).join("");
  return payload && checksumProfilePayload(payload) === assembly.checksum ? payload : "";
}

function addAssemblyPart(
  current: ProfileQrAssembly | null,
  part: ProfileQrPart,
): ProfileQrAssembly | null {
  if (current && (current.transferId !== part.transferId
    || current.total !== part.total
    || current.checksum !== part.checksum)) return null;
  return current
    ? { ...current, parts: { ...current.parts, [part.index]: part.chunk } }
    : {
        transferId: part.transferId,
        total: part.total,
        checksum: part.checksum,
        parts: { [part.index]: part.chunk },
      };
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

  const payload = assemblePayload(assembly);
  if (!payload) {
    return { status: "error", message: "De QR-set is onvolledig of beschadigd. Scan de delen opnieuw." };
  }
  return { status: "complete", payload };
}

export function addProfileQrBundlePart(
  current: ProfileQrBundleAssembly | null,
  part: ProfileQrBundlePart,
): ProfileQrBundleCollectResult {
  if (current && current.transferId !== part.transferId) {
    return { status: "error", message: "Deze QR hoort bij een andere profieloverdracht." };
  }

  const phaseCurrent = part.phase === "profile" ? current?.profile ?? null : current?.avatar ?? null;
  const phasePart: ProfileQrPart = {
    transferId: part.transferId,
    index: part.index,
    total: part.total,
    checksum: part.checksum,
    chunk: part.chunk,
  };
  const nextPhase = addAssemblyPart(phaseCurrent, phasePart);
  if (!nextPhase) {
    return { status: "error", message: "Dit QR-deel past niet bij de reeds ontvangen reeks." };
  }

  const assembly: ProfileQrBundleAssembly = {
    transferId: part.transferId,
    profile: part.phase === "profile" ? nextPhase : current?.profile ?? null,
    avatar: part.phase === "avatar" ? nextPhase : current?.avatar ?? null,
  };
  const profilePayload = assemblePayload(assembly.profile);
  const avatarPayload = assemblePayload(assembly.avatar);
  if (profilePayload === "" || avatarPayload === "") {
    return { status: "error", message: "De profieloverdracht is beschadigd. Start de scan opnieuw." };
  }
  if (profilePayload && avatarPayload) {
    return { status: "complete", profilePayload, avatarPayload };
  }

  return {
    status: "progress",
    assembly,
    profileReceived: assembly.profile ? Object.keys(assembly.profile.parts).length : 0,
    profileTotal: assembly.profile?.total ?? (part.phase === "profile" ? part.total : 0),
    profileComplete: !!profilePayload,
    avatarReceived: assembly.avatar ? Object.keys(assembly.avatar.parts).length : 0,
    avatarTotal: assembly.avatar?.total ?? (part.phase === "avatar" ? part.total : 0),
    avatarComplete: !!avatarPayload,
  };
}
