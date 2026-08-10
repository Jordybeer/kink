import type {
  Profile,
  ProfileOwnerKey,
  SwitchShareProof,
} from "@/types";
import {
  decodeSharedProfile,
  encodeProfileShareTransport,
  encodeProfileV3,
  MAX_PROFILE_SHARE_ENCODED_CHARS,
  type ProfileShareTransport,
} from "@/lib/profileShareV3";
import {
  createSwitchShareProof,
  deriveSharedSwitchGroupId,
  sanitizeSwitchShareProof,
  verifySwitchShareProof,
} from "@/lib/switchProfileProof";

const PREFIX_SWITCH = "5r.";

interface SwitchShareEnvelope {
  v: 1;
  p: SwitchShareProof;
  d: string;
  s: string;
}

export interface SwitchProfileShareOptions {
  includeFetLife?: boolean;
  includeAvatar?: boolean;
  avatarProfileId?: string;
  ownerKeys?: ProfileOwnerKey[];
  linkProof?: SwitchShareProof;
}

export interface SwitchProfileShareTransport extends ProfileShareTransport {
  avatarEmbedded: boolean;
  linkProof: SwitchShareProof;
}

export interface SharedProfileTransfer {
  profiles: Profile[];
  isSwitch: boolean;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function role(profile: Profile): "dominant" | "submissive" | null {
  if (profile.perspective === "dominant" || profile.perspective === "submissive") {
    return profile.perspective;
  }
  const normalized = profile.role.trim().toLowerCase();
  if (normalized === "dominant" || normalized === "submissive") return normalized;
  return null;
}

export function getSwitchProfilePair(
  selected: Profile,
  profiles: Profile[],
): [dominant: Profile, submissive: Profile] | null {
  if (!selected.personGroupId) return null;
  const group = profiles.filter((profile) => profile.personGroupId === selected.personGroupId);
  if (group.length !== 2) return null;
  const dominant = group.find((profile) => role(profile) === "dominant");
  const submissive = group.find((profile) => role(profile) === "submissive");
  return dominant && submissive ? [dominant, submissive] : null;
}

export function isSwitchProfileShare(encoded: string): boolean {
  return encoded.startsWith(PREFIX_SWITCH);
}

async function resolveLinkProof(
  dominant: Profile,
  submissive: Profile,
  options: SwitchProfileShareOptions,
): Promise<SwitchShareProof> {
  const candidate = sanitizeSwitchShareProof(
    options.linkProof ?? dominant.switchShareProof ?? submissive.switchShareProof,
  );
  if (candidate && await verifySwitchShareProof(candidate, dominant, submissive)) return candidate;
  if (!options.ownerKeys?.length) {
    throw new Error("De bevestigde Switch-koppeling ontbreekt");
  }
  return createSwitchShareProof(dominant, submissive, options.ownerKeys);
}

async function encodeMember(
  profile: Profile,
  options: SwitchProfileShareOptions,
  includeAvatar: boolean,
): Promise<{ encoded: string; avatarIncluded: boolean }> {
  if (!includeAvatar) {
    return {
      encoded: await encodeProfileV3(profile, { includeFetLife: options.includeFetLife }),
      avatarIncluded: false,
    };
  }
  const avatarOwnerKey = options.ownerKeys?.find((key) => key.profileId === profile.id);
  const transport = await encodeProfileShareTransport(profile, {
    includeFetLife: options.includeFetLife,
    includeAvatar: true,
    avatarOwnerKey,
  });
  return { encoded: transport.encoded, avatarIncluded: !!transport.avatarPayload };
}

export async function encodeSwitchProfileShareTransport(
  dominant: Profile,
  submissive: Profile,
  options: SwitchProfileShareOptions = {},
): Promise<SwitchProfileShareTransport> {
  const linkProof = await resolveLinkProof(dominant, submissive, options);
  const avatarProfileId = options.includeAvatar ? options.avatarProfileId : undefined;
  const [dominantPayload, submissivePayload] = await Promise.all([
    encodeMember(dominant, options, avatarProfileId === dominant.id),
    encodeMember(submissive, options, avatarProfileId === submissive.id),
  ]);
  const envelope: SwitchShareEnvelope = {
    v: 1,
    p: linkProof,
    d: dominantPayload.encoded,
    s: submissivePayload.encoded,
  };
  const raw = new TextEncoder().encode(JSON.stringify(envelope));
  const encoded = PREFIX_SWITCH + bytesToBase64Url(raw);
  if (encoded.length > MAX_PROFILE_SHARE_ENCODED_CHARS) {
    throw new Error("Switch-profiel is te groot om te delen");
  }
  return {
    encoded,
    profilePayload: encoded,
    avatarEmbedded: dominantPayload.avatarIncluded || submissivePayload.avatarIncluded,
    linkProof,
  };
}

export async function decodeSwitchProfileShare(encoded: string): Promise<Profile[]> {
  if (!isSwitchProfileShare(encoded) || encoded.length > MAX_PROFILE_SHARE_ENCODED_CHARS) {
    throw new Error("Ongeldig Switch-profiel");
  }
  let parsed: Partial<SwitchShareEnvelope>;
  try {
    parsed = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encoded.slice(PREFIX_SWITCH.length))),
    ) as Partial<SwitchShareEnvelope>;
  } catch {
    throw new Error("Ongeldig Switch-profiel");
  }
  const proof = sanitizeSwitchShareProof(parsed.p);
  if (parsed.v !== 1 || !proof || typeof parsed.d !== "string" || typeof parsed.s !== "string") {
    throw new Error("Ongeldig Switch-profiel");
  }
  if (parsed.d.length > MAX_PROFILE_SHARE_ENCODED_CHARS || parsed.s.length > MAX_PROFILE_SHARE_ENCODED_CHARS) {
    throw new Error("Switch-profiel is te groot");
  }
  const [dominant, submissive] = await Promise.all([
    decodeSharedProfile(parsed.d),
    decodeSharedProfile(parsed.s),
  ]);
  if (!await verifySwitchShareProof(proof, dominant, submissive)) {
    throw new Error("De Switch-koppeling kon niet worden bevestigd");
  }

  const groupId = await deriveSharedSwitchGroupId(proof);
  const sharedAvatar = dominant.avatarDataUrl ?? submissive.avatarDataUrl;
  const now = Date.now();
  return [
    {
      ...dominant,
      role: "Dominant",
      personGroupId: groupId,
      perspective: "dominant",
      switchShareProof: proof,
      ...(sharedAvatar ? { avatarDataUrl: sharedAvatar } : {}),
      isImported: true,
      origin: "shared",
      lockedAt: now,
    },
    {
      ...submissive,
      role: "Submissive",
      personGroupId: groupId,
      perspective: "submissive",
      switchShareProof: proof,
      ...(sharedAvatar ? { avatarDataUrl: sharedAvatar } : {}),
      isImported: true,
      origin: "shared",
      lockedAt: now,
    },
  ];
}

export async function decodeSharedProfileTransfer(encoded: string): Promise<SharedProfileTransfer> {
  if (isSwitchProfileShare(encoded)) {
    return { profiles: await decodeSwitchProfileShare(encoded), isSwitch: true };
  }
  return { profiles: [await decodeSharedProfile(encoded)], isSwitch: false };
}
