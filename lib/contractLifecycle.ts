import type { KinkStatus, Profile, ProfileOwnerKey, ProfilePerspective } from "@/types";
import {
  canonicalJson,
  keyIdForPublicKey,
  sha256Base64Url,
  verifyProfileOwnerKey,
} from "@/lib/consentProof";
import { getProfileVerificationCode } from "@/lib/profileVerification";

const CURVE = "P-256";
const TEXT = new TextEncoder();

export type ContractSeriesStatus =
  | "draft"
  | "pending_signature"
  | "active"
  | "paused"
  | "resume_pending"
  | "stopped";

export type ContractAction = "activate" | "pause" | "resume" | "stop" | "reactivate";

export type ContractEventType =
  | "draft_created"
  | "signature_added"
  | "activated"
  | "paused"
  | "pause_acknowledged"
  | "resume_requested"
  | "resumed"
  | "stopped"
  | "stop_acknowledged"
  | "reactivation_requested"
  | "reactivated"
  | "receipt_confirmed";

export interface ContractParticipant {
  profileId: string;
  personGroupId?: string;
  profileName: string;
  role: string;
  perspective?: ProfilePerspective;
  verificationCode: string;
  keyId?: string;
  publicKeyJwk?: JsonWebKey;
}

export interface ContractKinkDetail {
  name: string;
  statusA: KinkStatus | null;
  statusB: KinkStatus | null;
  commentA?: string;
  commentB?: string;
  desireA?: number | null;
  desireB?: number | null;
}

export interface ContractHardLimit {
  name: string;
  who: string;
}

export interface ContractSignals {
  green: string;
  amber: string;
  red: string;
  black: string;
}

export interface ContractVersionContent {
  schema: 1;
  profileA: ContractParticipant;
  profileB: ContractParticipant;
  preamble: string;
  createdAt: number;
  realNameA?: string;
  realNameB?: string;
  signalsA: ContractSignals;
  signalsB: ContractSignals;
  aftercareA: string[];
  aftercareB: string[];
  shared: ContractKinkDetail[];
  softLimits: ContractKinkDetail[];
  hardLimits: ContractHardLimit[];
  hardLimitDetails: ContractKinkDetail[];
  discuss: ContractKinkDetail[];
}

export interface ContractSummary {
  matchCount: number;
  hardLimitCount: number;
  softLimitCount: number;
  discussCount: number;
  safeword?: string;
}

export interface ContractSignatureProof {
  profileId: string;
  keyId: string;
  publicKeyJwk: JsonWebKey;
  signedAt: number;
  payloadHash: string;
  signature: string;
}

export interface ContractVersion {
  id: string;
  number: number;
  createdAt: number;
  updatedAt: number;
  contentHash: string;
  content?: ContractVersionContent;
  summary: ContractSummary;
  note?: string;
  state: "draft" | "pending_signature" | "signed";
  signatures: ContractSignatureProof[];
  legacySnapshotId?: string;
}

export interface ContractActionPayload {
  schema: 1;
  phase: "request" | "response";
  requestId: string;
  action: ContractAction;
  seriesId: string;
  versionId: string;
  contentHash: string;
  actorProfileId: string;
  counterpartyProfileId: string;
  createdAt: number;
  expiresAt: number;
  previousEventHash?: string;
  reason?: "Tijdelijk gepauzeerd" | "Dynamiek beëindigd";
  note?: string;
}


export interface ContractReceiptPayload {
  schema: 1;
  requestId: string;
  seriesId: string;
  action: ContractAction;
  contentHash: string;
  actorProfileId: string;
  counterpartyProfileId: string;
  responderProofHash: string;
  receivedAt: number;
}

export interface ContractLifecycleEvent {
  id: string;
  type: ContractEventType;
  createdAt: number;
  actorProfileId: string;
  actorName: string;
  counterpartyProfileId?: string;
  reason?: "Tijdelijk gepauzeerd" | "Dynamiek beëindigd";
  note?: string;
  proof?: ContractSignatureProof;
  requestId?: string;
  previousEventHash?: string;
  eventHash: string;
}

export interface ContractPendingRequest {
  requestId: string;
  action: ContractAction;
  seriesId: string;
  versionId: string;
  contentHash: string;
  createdAt: number;
  expiresAt: number;
  actorProfileId: string;
  counterpartyProfileId: string;
  previousEventHash?: string;
  reason?: "Tijdelijk gepauzeerd" | "Dynamiek beëindigd";
  note?: string;
  proof: ContractSignatureProof;
}

export interface ContractSeries {
  id: string;
  pairKey: string;
  participants: [ContractParticipant, ContractParticipant];
  status: ContractSeriesStatus;
  createdAt: number;
  updatedAt: number;
  currentVersionId?: string;
  draftVersionId?: string;
  versions: ContractVersion[];
  events: ContractLifecycleEvent[];
  pendingRequest?: ContractPendingRequest;
  legacySnapshotIds?: string[];
}

export interface ContractExchangeEnvelope {
  schema: 1;
  kind: "request" | "response" | "receipt";
  request: ContractPendingRequest;
  series?: ContractSeries;
  responderProof?: ContractSignatureProof;
  versionProof?: ContractSignatureProof;
  receipt?: ContractReceiptPayload;
  receiptProof?: ContractSignatureProof;
}

export type ContractDisplayBucket = "active" | "paused" | "archive" | "draft";

function stablePublicJwk(raw: JsonWebKey): JsonWebKey {
  return {
    kty: raw.kty,
    crv: raw.crv,
    x: raw.x,
    y: raw.y,
    ext: true,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function publicKeyIsUsable(raw: JsonWebKey | undefined): raw is JsonWebKey {
  return !!raw && raw.kty === "EC" && raw.crv === CURVE
    && typeof raw.x === "string" && typeof raw.y === "string";
}

export function contractParticipantFromProfile(profile: Profile): ContractParticipant {
  return {
    profileId: profile.id,
    ...(profile.personGroupId ? { personGroupId: profile.personGroupId } : {}),
    profileName: profile.name,
    role: profile.role,
    ...(profile.perspective ? { perspective: profile.perspective } : {}),
    verificationCode: getProfileVerificationCode(profile),
    ...(profile.consentProof ? {
      keyId: profile.consentProof.keyId,
      publicKeyJwk: stablePublicJwk(profile.consentProof.publicKeyJwk),
    } : {}),
  };
}

export function contractPairKey(profileAId: string, profileBId: string): string {
  return [profileAId, profileBId].sort().join("|");
}

export function activeSignedContractForPair(
  series: readonly ContractSeries[],
  profileAId: string,
  profileBId: string,
): ContractSeries | undefined {
  if (!profileAId || !profileBId || profileAId === profileBId) return undefined;
  const pairKey = contractPairKey(profileAId, profileBId);
  return series.find((candidate) => {
    if (candidate.pairKey !== pairKey || candidate.status !== "active" || !candidate.currentVersionId) return false;
    const version = contractVersionById(candidate, candidate.currentVersionId);
    if (!version?.content || version.state !== "signed" || version.legacySnapshotId) return false;
    if (contractPairKey(version.content.profileA.profileId, version.content.profileB.profileId) !== pairKey) return false;

    const expectedIds = new Set([profileAId, profileBId]);
    if (candidate.participants.length !== 2
      || candidate.participants.some((participant) => !expectedIds.has(participant.profileId))) return false;

    return candidate.participants.every((participant) => {
      if (!participant.keyId) return false;
      const proof = version.signatures.find((signature) => signature.profileId === participant.profileId);
      return !!proof && proof.keyId === participant.keyId;
    });
  });
}

export function contractPersonIdentity(participant: ContractParticipant): string {
  return participant.personGroupId ?? participant.profileId;
}

export function contractVersionById(
  series: ContractSeries,
  versionId: string | undefined,
): ContractVersion | undefined {
  return versionId ? series.versions.find((version) => version.id === versionId) : undefined;
}

export function currentContractVersion(series: ContractSeries): ContractVersion | undefined {
  return contractVersionById(series, series.currentVersionId)
    ?? contractVersionById(series, series.draftVersionId)
    ?? [...series.versions].sort((left, right) => right.number - left.number)[0];
}

export function contractSummaryFromContent(content: ContractVersionContent): ContractSummary {
  return {
    matchCount: content.shared.length,
    hardLimitCount: content.hardLimits.length,
    softLimitCount: content.softLimits.length,
    discussCount: content.discuss.length,
    safeword: content.signalsA.black || content.signalsB.black || undefined,
  };
}

export async function hashContractContent(content: ContractVersionContent): Promise<string> {
  return sha256Base64Url(canonicalJson(content));
}

export async function signContractPayload(
  payload: ContractActionPayload | ContractVersionContent | ContractReceiptPayload,
  profileId: string,
  ownerKey: ProfileOwnerKey,
): Promise<ContractSignatureProof> {
  if (ownerKey.profileId !== profileId) throw new Error("Deze eigendomssleutel hoort bij een ander profiel");
  if (!await verifyProfileOwnerKey(ownerKey)) throw new Error("De eigendomssleutel is beschadigd");
  const signedAt = Date.now();
  const payloadHash = await sha256Base64Url(canonicalJson(payload));
  const signedBody = { payload, profileId, signedAt };
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    ownerKey.privateKeyJwk,
    { name: "ECDSA", namedCurve: CURVE },
    false,
    ["sign"],
  );
  const signature = bytesToBase64Url(new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    TEXT.encode(canonicalJson(signedBody)),
  )));
  return {
    profileId,
    keyId: ownerKey.keyId,
    publicKeyJwk: stablePublicJwk(ownerKey.publicKeyJwk),
    signedAt,
    payloadHash,
    signature,
  };
}

export async function verifyContractProof(
  payload: ContractActionPayload | ContractVersionContent | ContractReceiptPayload,
  proof: ContractSignatureProof,
): Promise<boolean> {
  try {
    if (!publicKeyIsUsable(proof.publicKeyJwk)) return false;
    if (await keyIdForPublicKey(proof.publicKeyJwk) !== proof.keyId) return false;
    if (await sha256Base64Url(canonicalJson(payload)) !== proof.payloadHash) return false;
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      proof.publicKeyJwk,
      { name: "ECDSA", namedCurve: CURVE },
      false,
      ["verify"],
    );
    return crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      base64UrlToBytes(proof.signature),
      TEXT.encode(canonicalJson({ payload, profileId: proof.profileId, signedAt: proof.signedAt })),
    );
  } catch {
    return false;
  }
}

export async function createContractEvent(input: Omit<ContractLifecycleEvent, "eventHash">): Promise<ContractLifecycleEvent> {
  const eventHash = await sha256Base64Url(canonicalJson(input));
  return { ...input, eventHash };
}

export function contractBucket(series: ContractSeries, profiles: readonly Profile[]): ContractDisplayBucket {
  const existingIds = new Set(profiles.map((profile) => profile.id));
  const orphaned = series.participants.some((participant) => !existingIds.has(participant.profileId));
  if (orphaned || series.status === "stopped") return "archive";
  if (!series.currentVersionId && (series.status === "draft" || series.status === "pending_signature")) return "draft";
  if (series.status === "paused" || series.status === "resume_pending") return "paused";
  return "active";
}

export function seriesMatchesPerson(series: ContractSeries, personId: string | null): boolean {
  if (!personId) return true;
  return series.participants.some((participant) => contractPersonIdentity(participant) === personId);
}

export function countCurrentContractsForProfile(
  series: readonly ContractSeries[],
  profile: Profile,
  profiles: readonly Profile[],
): number {
  const personId = profile.personGroupId ?? profile.id;
  return series.filter((item) => {
    const bucket = contractBucket(item, profiles);
    return (bucket === "active" || bucket === "paused") && seriesMatchesPerson(item, personId);
  }).length;
}

export function mostRecentReadableContractForProfile(
  series: readonly ContractSeries[],
  profile: Profile,
): ContractSeries | undefined {
  const personId = profile.personGroupId ?? profile.id;
  return series
    .filter((item) => (
      seriesMatchesPerson(item, personId)
      && Boolean(item.currentVersionId)
      && Boolean(contractVersionById(item, item.currentVersionId))
    ))
    .sort((left, right) => right.updatedAt - left.updatedAt)[0];
}

export function formatContractTimestamp(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const month = value("month").replace(".", "").toLocaleLowerCase("nl-BE");
  return `${value("day")} ${month} ${value("year")} - ${value("hour")}:${value("minute")}`;
}

export function contractStatusLabel(series: ContractSeries, profiles: readonly Profile[]): string {
  const bucket = contractBucket(series, profiles);
  if (bucket === "archive") {
    const existingIds = new Set(profiles.map((profile) => profile.id));
    return series.participants.some((participant) => !existingIds.has(participant.profileId))
      ? "Profiel niet meer beschikbaar"
      : "Stopgezet";
  }
  if (bucket === "draft") return series.status === "pending_signature" ? "Wacht op tweede bevestiging" : "Concept";
  if (bucket === "paused") return series.status === "resume_pending" ? "Hervatting wacht op bevestiging" : "Gepauzeerd";
  return "Actief";
}

export function cloneSeries(series: ContractSeries): ContractSeries {
  return structuredClone(series);
}
