import type { ContractSnapshot, Profile, ProfileOwnerKey } from "@/types";
import {
  contractPairKey,
  hashContractContent,
  verifyContractProof,
  type ContractActionPayload,
  type ContractParticipant,
  type ContractSeries,
  type ContractSignatureProof,
} from "@/lib/contractLifecycle";
import { sanitizeContractSnapshot, sanitizeProfileFull } from "@/lib/sanitizeProfile";
import {
  canonicalJson,
  keyIdForPublicKey,
  sanitizeProfileOwnerKey,
  sha256Base64Url,
  verifyProfileConsent,
  verifyProfileOwnerKey,
} from "@/lib/consentProof";


const CONTRACT_STATUSES = new Set<ContractSeries["status"]>([
  "draft",
  "pending_signature",
  "active",
  "paused",
  "resume_pending",
  "stopped",
]);
const CONTRACT_VERSION_STATES = new Set(["draft", "pending_signature", "signed"]);
const CONTRACT_ACTIONS = new Set(["activate", "pause", "resume", "stop", "reactivate"]);
const CONTRACT_EVENT_TYPES = new Set([
  "draft_created",
  "signature_added",
  "activated",
  "paused",
  "pause_acknowledged",
  "resume_requested",
  "resumed",
  "stopped",
  "stop_acknowledged",
  "reactivation_requested",
  "reactivated",
  "receipt_confirmed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function validParticipant(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.profileId === "string"
    && typeof value.profileName === "string"
    && typeof value.role === "string"
    && typeof value.verificationCode === "string"
    && optionalString(value.personGroupId)
    && optionalString(value.perspective)
    && optionalString(value.keyId)
    && (value.publicKeyJwk === undefined || isRecord(value.publicKeyJwk));
}

function validProof(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.profileId === "string"
    && typeof value.keyId === "string"
    && isRecord(value.publicKeyJwk)
    && isFiniteNumber(value.signedAt)
    && typeof value.payloadHash === "string"
    && typeof value.signature === "string";
}

function validDetail(value: unknown): boolean {
  if (!isRecord(value) || typeof value.name !== "string") return false;
  const status = (candidate: unknown) => candidate === null || typeof candidate === "string";
  const desire = (candidate: unknown) => candidate === undefined || candidate === null || isFiniteNumber(candidate);
  return status(value.statusA)
    && status(value.statusB)
    && optionalString(value.commentA)
    && optionalString(value.commentB)
    && desire(value.desireA)
    && desire(value.desireB);
}

function validSignals(value: unknown): boolean {
  return isRecord(value)
    && typeof value.green === "string"
    && typeof value.amber === "string"
    && typeof value.red === "string"
    && typeof value.black === "string";
}

function validContent(value: unknown): boolean {
  if (!isRecord(value) || value.schema !== 1) return false;
  if (!validParticipant(value.profileA) || !validParticipant(value.profileB)) return false;
  if (typeof value.preamble !== "string" || !isFiniteNumber(value.createdAt)) return false;
  if (!optionalString(value.realNameA) || !optionalString(value.realNameB)) return false;
  if (!validSignals(value.signalsA) || !validSignals(value.signalsB)) return false;
  if (!Array.isArray(value.aftercareA) || !value.aftercareA.every((item) => typeof item === "string")) return false;
  if (!Array.isArray(value.aftercareB) || !value.aftercareB.every((item) => typeof item === "string")) return false;
  if (!Array.isArray(value.shared) || !value.shared.every(validDetail)) return false;
  if (!Array.isArray(value.softLimits) || !value.softLimits.every(validDetail)) return false;
  if (!Array.isArray(value.discuss) || !value.discuss.every(validDetail)) return false;
  if (!Array.isArray(value.hardLimitDetails) || !value.hardLimitDetails.every(validDetail)) return false;
  return Array.isArray(value.hardLimits) && value.hardLimits.every((item) =>
    isRecord(item) && typeof item.name === "string" && typeof item.who === "string");
}

function validSummary(value: unknown): boolean {
  return isRecord(value)
    && isFiniteNumber(value.matchCount)
    && isFiniteNumber(value.hardLimitCount)
    && isFiniteNumber(value.softLimitCount)
    && isFiniteNumber(value.discussCount)
    && optionalString(value.safeword);
}

function validVersion(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && isFiniteNumber(value.number)
    && isFiniteNumber(value.createdAt)
    && isFiniteNumber(value.updatedAt)
    && typeof value.contentHash === "string"
    && (value.content === undefined || validContent(value.content))
    && validSummary(value.summary)
    && optionalString(value.note)
    && CONTRACT_VERSION_STATES.has(String(value.state))
    && Array.isArray(value.signatures)
    && value.signatures.every(validProof)
    && optionalString(value.legacySnapshotId);
}

function validEvent(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && CONTRACT_EVENT_TYPES.has(String(value.type))
    && isFiniteNumber(value.createdAt)
    && typeof value.actorProfileId === "string"
    && typeof value.actorName === "string"
    && optionalString(value.counterpartyProfileId)
    && optionalString(value.reason)
    && optionalString(value.note)
    && (value.proof === undefined || validProof(value.proof))
    && optionalString(value.requestId)
    && optionalString(value.previousEventHash)
    && typeof value.eventHash === "string";
}

function validPendingRequest(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.requestId === "string"
    && CONTRACT_ACTIONS.has(String(value.action))
    && typeof value.seriesId === "string"
    && typeof value.versionId === "string"
    && typeof value.contentHash === "string"
    && isFiniteNumber(value.createdAt)
    && isFiniteNumber(value.expiresAt)
    && typeof value.actorProfileId === "string"
    && typeof value.counterpartyProfileId === "string"
    && optionalString(value.previousEventHash)
    && optionalString(value.reason)
    && optionalString(value.note)
    && validProof(value.proof);
}

function sanitizeContractSeries(raw: unknown): ContractSeries | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || typeof raw.pairKey !== "string") return null;
  if (!Array.isArray(raw.participants) || raw.participants.length !== 2 || !raw.participants.every(validParticipant)) return null;
  if (!CONTRACT_STATUSES.has(raw.status as ContractSeries["status"])) return null;
  if (!isFiniteNumber(raw.createdAt) || !isFiniteNumber(raw.updatedAt)) return null;
  if (!optionalString(raw.currentVersionId) || !optionalString(raw.draftVersionId)) return null;
  if (!Array.isArray(raw.versions) || !raw.versions.every(validVersion)) return null;
  if (!Array.isArray(raw.events) || !raw.events.every(validEvent)) return null;
  if (raw.pendingRequest !== undefined && !validPendingRequest(raw.pendingRequest)) return null;
  if (raw.legacySnapshotIds !== undefined
    && (!Array.isArray(raw.legacySnapshotIds) || !raw.legacySnapshotIds.every((item) => typeof item === "string"))) return null;

  const versionIds = new Set(raw.versions.map((version) => (version as Record<string, unknown>).id));
  if (typeof raw.currentVersionId === "string" && !versionIds.has(raw.currentVersionId)) return null;
  if (typeof raw.draftVersionId === "string" && !versionIds.has(raw.draftVersionId)) return null;
  if (isRecord(raw.pendingRequest)) {
    if (raw.pendingRequest.seriesId !== raw.id || !versionIds.has(raw.pendingRequest.versionId)) return null;
  }

  return structuredClone(raw) as unknown as ContractSeries;
}

function participantForProof(
  series: ContractSeries,
  proof: ContractSignatureProof,
): ContractParticipant | undefined {
  return series.participants.find((participant) => participant.profileId === proof.profileId);
}

async function proofKeyMatchesParticipant(
  participant: ContractParticipant | undefined,
  proof: ContractSignatureProof,
): Promise<boolean> {
  try {
    if (!participant?.keyId || participant.keyId !== proof.keyId) return false;
    if (await keyIdForPublicKey(proof.publicKeyJwk) !== proof.keyId) return false;
    return !participant.publicKeyJwk
      || await keyIdForPublicKey(participant.publicKeyJwk) === proof.keyId;
  } catch {
    return false;
  }
}

function pendingRequestPayload(series: ContractSeries): ContractActionPayload | null {
  const request = series.pendingRequest;
  if (!request) return null;
  return {
    schema: 1,
    phase: "request",
    requestId: request.requestId,
    action: request.action,
    seriesId: request.seriesId,
    versionId: request.versionId,
    contentHash: request.contentHash,
    actorProfileId: request.actorProfileId,
    counterpartyProfileId: request.counterpartyProfileId,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    ...(request.previousEventHash ? { previousEventHash: request.previousEventHash } : {}),
    ...(request.reason ? { reason: request.reason } : {}),
    ...(request.note ? { note: request.note } : {}),
  };
}

async function verifyContractSeriesIntegrity(series: ContractSeries): Promise<boolean> {
  const participantIds = series.participants.map((participant) => participant.profileId);
  if (new Set(participantIds).size !== 2) return false;
  if (series.pairKey !== contractPairKey(participantIds[0], participantIds[1])) return false;

  for (const version of series.versions) {
    if (version.legacySnapshotId) {
      if (version.content || version.signatures.length > 0
        || version.contentHash !== `legacy:${version.legacySnapshotId}`) return false;
      continue;
    }
    if (!version.content) return false;
    if (await hashContractContent(version.content) !== version.contentHash) return false;
    if (contractPairKey(version.content.profileA.profileId, version.content.profileB.profileId) !== series.pairKey) {
      return false;
    }

    const seenSigners = new Set<string>();
    for (const proof of version.signatures) {
      if (seenSigners.has(proof.profileId)) return false;
      seenSigners.add(proof.profileId);
      if (!await proofKeyMatchesParticipant(participantForProof(series, proof), proof)) return false;
      if (!await verifyContractProof(version.content, proof)) return false;
    }

    if (version.state === "signed") {
      if (version.signatures.length !== 2
        || series.participants.some((participant) => !seenSigners.has(participant.profileId))) return false;
    } else if (version.state === "pending_signature") {
      if (version.signatures.length !== 1) return false;
    } else if (version.signatures.length !== 0) {
      return false;
    }
  }

  const currentVersion = series.currentVersionId
    ? series.versions.find((version) => version.id === series.currentVersionId)
    : undefined;
  if (currentVersion && !currentVersion.legacySnapshotId && currentVersion.state !== "signed") return false;

  let previousEventHash: string | undefined;
  for (const event of series.events) {
    if (event.eventHash.startsWith("legacy:")) {
      const snapshotId = event.eventHash.slice("legacy:".length);
      if (event.type !== "activated" || event.proof || !series.legacySnapshotIds?.includes(snapshotId)) return false;
      previousEventHash = event.eventHash;
      continue;
    }
    if (event.previousEventHash !== previousEventHash) return false;
    const { eventHash, ...unsignedEvent } = event;
    if (await sha256Base64Url(canonicalJson(unsignedEvent)) !== eventHash) return false;
    if (event.proof) {
      if (event.proof.profileId !== event.actorProfileId
        || !await proofKeyMatchesParticipant(participantForProof(series, event.proof), event.proof)) return false;
    } else if (event.type !== "draft_created") {
      return false;
    }
    previousEventHash = eventHash;
  }

  if (series.pendingRequest) {
    const request = series.pendingRequest;
    const payload = pendingRequestPayload(series);
    const version = series.versions.find((candidate) => candidate.id === request.versionId);
    const actor = participantForProof(series, request.proof);
    if (!payload || request.seriesId !== series.id || request.proof.profileId !== request.actorProfileId
      || !version || version.contentHash !== request.contentHash
      || !series.participants.some((participant) => participant.profileId === request.counterpartyProfileId)
      || !await proofKeyMatchesParticipant(actor, request.proof)
      || !await verifyContractProof(payload, request.proof)) return false;
  }

  return true;
}

export interface PreparedBackupRestore {
  source: "backup" | "shared";
  profiles: Profile[];
  contracts: ContractSnapshot[];
  contractSeries: ContractSeries[];
  ownerKeys: ProfileOwnerKey[];
}

export async function prepareBackupRestore(raw: unknown): Promise<PreparedBackupRestore> {
  if (!raw || typeof raw !== "object") throw new Error("Ongeldig bestand");
  const parsed = raw as Record<string, unknown>;
  if (!Array.isArray(parsed.profiles)) throw new Error("Geen geldige profielen gevonden");

  const source = parsed.source === "backup" ? "backup" : "shared";
  const sanitizedProfiles = parsed.profiles
    .map((profile) => sanitizeProfileFull(profile))
    .filter((profile): profile is Profile => profile !== null);
  const contracts = (Array.isArray(parsed.contracts) ? parsed.contracts : [])
    .map((contract) => sanitizeContractSnapshot(contract))
    .filter((contract): contract is ContractSnapshot => contract !== null);
  const contractSeriesCandidates = (Array.isArray(parsed.contractSeries) ? parsed.contractSeries : [])
    .map((series) => sanitizeContractSeries(series))
    .filter((series): series is ContractSeries => series !== null);
  const contractSeries: ContractSeries[] = [];
  for (const series of contractSeriesCandidates) {
    if (await verifyContractSeriesIntegrity(series)) contractSeries.push(series);
  }

  const profilesById = new Map(sanitizedProfiles.map((profile) => [profile.id, profile]));
  const keyByProfile = new Map<string, ProfileOwnerKey>();

  for (const rawKey of Array.isArray(parsed.profileOwnerKeys) ? parsed.profileOwnerKeys : []) {
    const key = sanitizeProfileOwnerKey(rawKey);
    const profile = key ? profilesById.get(key.profileId) : undefined;
    if (!key || !profile || !await verifyProfileOwnerKey(key)) continue;
    if (profile.consentProof && profile.consentProof.keyId !== key.keyId) continue;
    keyByProfile.set(key.profileId, key);
  }

  const profiles: Profile[] = [];
  for (const profile of sanitizedProfiles) {
    const wasShared = profile.origin === "shared" || profile.isImported === true;
    const key = keyByProfile.get(profile.id);
    const verification = profile.consentProof
      ? await verifyProfileConsent(profile)
      : { status: "unsigned" as const };

    if (source !== "backup") {
      if (verification.status === "invalid") continue;
      profiles.push({
        ...profile,
        origin: "shared",
        isImported: true,
        lockedAt: profile.lockedAt ?? Date.now(),
      });
      continue;
    }

    if (key) {
      const { lockedAt: _lockedAt, ...rest } = profile;
      profiles.push({ ...rest, origin: "own", isImported: false });
      continue;
    }

    // Backups van vóór bronbevestiging bevatten terecht nog geen sleutel.
    if (!wasShared && !profile.consentProof) {
      const { lockedAt: _lockedAt, ...rest } = profile;
      profiles.push({ ...rest, origin: "own", isImported: false });
      continue;
    }

    // Een ondertekend profiel zonder de passende private sleutel is geen eigendom.
    if (verification.status === "invalid") continue;
    profiles.push({
      ...profile,
      origin: "shared",
      isImported: true,
      lockedAt: profile.lockedAt ?? Date.now(),
    });
  }

  return {
    source,
    profiles,
    contracts,
    contractSeries,
    ownerKeys: [...keyByProfile.values()],
  };
}
