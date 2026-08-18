import {
  contractPairKey,
  contractVersionById,
  type ContractAction,
  type ContractPendingRequest,
  type ContractSeries,
  type ContractSeriesStatus,
  type ContractVersion,
} from "@/lib/contractLifecycle";

export const CONTRACT_REQUEST_TTL_MS = 15 * 60 * 1000;
export const CONTRACT_REQUEST_CLOCK_SKEW_MS = 60 * 1000;

export type ContractStateMachineFailure =
  | "invalid_participants"
  | "invalid_series"
  | "invalid_transition"
  | "pending_request"
  | "invalid_version"
  | "expired_request"
  | "future_request"
  | "invalid_lifetime"
  | "stale_tail"
  | "forked_request"
  | "bootstrap_not_allowed";

export type ContractStateMachineResult =
  | { ok: true }
  | { ok: false; reason: ContractStateMachineFailure };

const REQUEST_FROM: Record<ContractAction, readonly ContractSeriesStatus[]> = {
  activate: ["draft", "pending_signature", "active", "paused", "stopped"],
  pause: ["active"],
  resume: ["paused", "resume_pending"],
  stop: ["active", "paused", "resume_pending"],
  reactivate: ["stopped"],
};

function fail(reason: ContractStateMachineFailure): ContractStateMachineResult {
  return { ok: false, reason };
}

function sameTail(left: string | undefined, right: string | undefined): boolean {
  return (left ?? null) === (right ?? null);
}

function exactParticipants(
  series: ContractSeries,
  actorProfileId: string,
  counterpartyProfileId: string,
): boolean {
  if (!actorProfileId || !counterpartyProfileId || actorProfileId === counterpartyProfileId) return false;
  if (series.participants.length !== 2) return false;
  const ids = new Set(series.participants.map((participant) => participant.profileId));
  return ids.size === 2
    && ids.has(actorProfileId)
    && ids.has(counterpartyProfileId)
    && series.pairKey === contractPairKey(actorProfileId, counterpartyProfileId);
}

function versionParticipantsMatchSeries(
  series: ContractSeries,
  version: ContractVersion | undefined,
): boolean {
  const left = version?.content?.profileA?.profileId;
  const right = version?.content?.profileB?.profileId;
  if (!left || !right || left === right) return false;
  if (contractPairKey(left, right) !== series.pairKey) return false;
  const seriesIds = new Set(series.participants.map((participant) => participant.profileId));
  return seriesIds.size === 2 && seriesIds.has(left) && seriesIds.has(right);
}

function hasModernCurrentVersion(series: ContractSeries): boolean {
  const version = contractVersionById(series, series.currentVersionId);
  return !!version
    && !!version.content
    && version.state === "signed"
    && !version.legacySnapshotId
    && version.signatures.length >= 2;
}

function requestTransitionAllowed(series: ContractSeries, action: ContractAction): boolean {
  return REQUEST_FROM[action].includes(series.status);
}

function requestVersionMatchesLocal(series: ContractSeries, request: ContractPendingRequest): boolean {
  if (request.action === "activate") {
    if (request.versionId === series.currentVersionId) return false;
    const existing = contractVersionById(series, request.versionId);
    return !existing || existing.contentHash === request.contentHash;
  }
  const current = contractVersionById(series, series.currentVersionId);
  if (!current
    || current.id !== request.versionId
    || current.contentHash !== request.contentHash) return false;
  return isRestrictiveAction(request.action) || hasModernCurrentVersion(series);
}

function requestVersionMatchesTransport(series: ContractSeries, request: ContractPendingRequest): boolean {
  const version = contractVersionById(series, request.versionId);
  if (!version || version.contentHash !== request.contentHash) return false;
  if (request.action === "activate") {
    return series.draftVersionId === request.versionId
      && version.state === "pending_signature"
      && versionParticipantsMatchSeries(series, version);
  }
  return series.currentVersionId === request.versionId;
}

function isRestrictiveAction(action: ContractAction): boolean {
  return action === "pause" || action === "stop";
}

function pendingRequestBlocks(
  series: ContractSeries,
  action: ContractAction,
  now: number,
): boolean {
  if (isRestrictiveAction(action)) return false;
  return !!series.pendingRequest && series.pendingRequest.expiresAt > now;
}

export function contractRequestEventType(action: ContractAction) {
  if (action === "activate") return "signature_added" as const;
  if (action === "pause") return "paused" as const;
  if (action === "resume") return "resume_requested" as const;
  if (action === "stop") return "stopped" as const;
  return "reactivation_requested" as const;
}

export function contractResponseEventType(action: ContractAction) {
  if (action === "activate") return "activated" as const;
  if (action === "pause") return "pause_acknowledged" as const;
  if (action === "resume") return "resumed" as const;
  if (action === "stop") return "stop_acknowledged" as const;
  return "reactivated" as const;
}

export function contractTailHash(series: ContractSeries): string | undefined {
  return series.events.at(-1)?.eventHash;
}

export function contractStatusAfterRequest(
  series: ContractSeries,
  action: ContractAction,
): ContractSeriesStatus {
  if (action === "activate") return series.currentVersionId ? series.status : "pending_signature";
  if (action === "pause") return "paused";
  if (action === "resume") return "resume_pending";
  if (action === "stop") return "stopped";
  return "stopped";
}

export function contractStatusAfterResponse(action: ContractAction): ContractSeriesStatus {
  if (action === "pause") return "paused";
  if (action === "stop") return "stopped";
  return "active";
}

export function validateContractRequestTiming(
  request: Pick<ContractPendingRequest, "createdAt" | "expiresAt">,
  now: number = Date.now(),
): ContractStateMachineResult {
  if (!Number.isFinite(request.createdAt) || !Number.isFinite(request.expiresAt)) {
    return fail("invalid_lifetime");
  }
  const lifetime = request.expiresAt - request.createdAt;
  if (lifetime <= 0 || lifetime > CONTRACT_REQUEST_TTL_MS) return fail("invalid_lifetime");
  if (request.createdAt > now + CONTRACT_REQUEST_CLOCK_SKEW_MS) return fail("future_request");
  if (request.expiresAt <= now) return fail("expired_request");
  return { ok: true };
}

export function authorizeContractRequestCreation(input: {
  series: ContractSeries;
  action: ContractAction;
  actorProfileId: string;
  counterpartyProfileId: string;
  now?: number;
}): ContractStateMachineResult {
  const now = input.now ?? Date.now();
  const { series, action, actorProfileId, counterpartyProfileId } = input;
  if (!exactParticipants(series, actorProfileId, counterpartyProfileId)) {
    return fail("invalid_participants");
  }
  if (pendingRequestBlocks(series, action, now)) return fail("pending_request");
  if (!requestTransitionAllowed(series, action)) return fail("invalid_transition");

  if (action === "activate") {
    const version = contractVersionById(series, series.draftVersionId);
    if (!version?.content
      || !series.draftVersionId
      || series.draftVersionId === series.currentVersionId
      || !versionParticipantsMatchSeries(series, version)) {
      return fail("invalid_version");
    }
    return { ok: true };
  }

  const current = contractVersionById(series, series.currentVersionId);
  if (!current || !series.currentVersionId) return fail("invalid_version");
  if (!isRestrictiveAction(action) && !hasModernCurrentVersion(series)) return fail("invalid_version");
  return { ok: true };
}

export function authorizeIncomingContractRequest(input: {
  localSeries: ContractSeries | null;
  transportSeries: ContractSeries;
  request: ContractPendingRequest;
  now?: number;
}): ContractStateMachineResult {
  const now = input.now ?? Date.now();
  const { localSeries, transportSeries, request } = input;
  const timing = validateContractRequestTiming(request, now);
  if (!timing.ok) return timing;

  if (request.seriesId !== transportSeries.id
    || !exactParticipants(transportSeries, request.actorProfileId, request.counterpartyProfileId)) {
    return fail("invalid_series");
  }
  if (transportSeries.pendingRequest?.requestId !== request.requestId) return fail("forked_request");
  if (!requestVersionMatchesTransport(transportSeries, request)) return fail("invalid_version");

  if (!localSeries) {
    if (request.action !== "activate"
      || request.previousEventHash
      || transportSeries.currentVersionId
      || transportSeries.events.length !== 1) {
      return fail("bootstrap_not_allowed");
    }
    return { ok: true };
  }

  if (localSeries.id !== request.seriesId
    || !exactParticipants(localSeries, request.actorProfileId, request.counterpartyProfileId)) {
    return fail("invalid_series");
  }
  if (pendingRequestBlocks(localSeries, request.action, now)) return fail("pending_request");
  if (!requestTransitionAllowed(localSeries, request.action)) return fail("invalid_transition");
  if (!sameTail(request.previousEventHash, contractTailHash(localSeries))) return fail("stale_tail");
  if (!requestVersionMatchesLocal(localSeries, request)) return fail("invalid_version");
  return { ok: true };
}

export function authorizeContractResponse(input: {
  currentSeries: ContractSeries;
  request: ContractPendingRequest;
  now?: number;
}): ContractStateMachineResult {
  const now = input.now ?? Date.now();
  const { currentSeries, request } = input;
  const timing = validateContractRequestTiming(request, now);
  if (!timing.ok) return timing;
  if (currentSeries.id !== request.seriesId
    || !exactParticipants(currentSeries, request.actorProfileId, request.counterpartyProfileId)) {
    return fail("invalid_series");
  }
  if (!currentSeries.pendingRequest || currentSeries.pendingRequest.requestId !== request.requestId) {
    return fail("forked_request");
  }

  const requestEvent = currentSeries.events.at(-1);
  if (!requestEvent
    || requestEvent.requestId !== request.requestId
    || requestEvent.type !== contractRequestEventType(request.action)
    || requestEvent.actorProfileId !== request.actorProfileId
    || requestEvent.counterpartyProfileId !== request.counterpartyProfileId
    || !sameTail(requestEvent.previousEventHash, request.previousEventHash)) {
    return fail("stale_tail");
  }

  if (request.action === "activate") {
    if (currentSeries.draftVersionId !== request.versionId) return fail("invalid_version");
    const version = contractVersionById(currentSeries, request.versionId);
    if (!version?.content
      || version.contentHash !== request.contentHash
      || version.state !== "pending_signature"
      || !versionParticipantsMatchSeries(currentSeries, version)) {
      return fail("invalid_version");
    }
    if (!currentSeries.currentVersionId && currentSeries.status !== "pending_signature") {
      return fail("invalid_transition");
    }
    if (currentSeries.currentVersionId
      && !["active", "paused", "stopped"].includes(currentSeries.status)) {
      return fail("invalid_transition");
    }
  } else {
    const expectedStatus = contractStatusAfterRequest(currentSeries, request.action);
    if (currentSeries.status !== expectedStatus) return fail("invalid_transition");
    const version = contractVersionById(currentSeries, currentSeries.currentVersionId);
    if (!version || version.id !== request.versionId || version.contentHash !== request.contentHash) {
      return fail("invalid_version");
    }
  }

  if (currentSeries.events.some((event) =>
    event.requestId === request.requestId && event.type === contractResponseEventType(request.action))) {
    return fail("forked_request");
  }
  return { ok: true };
}
