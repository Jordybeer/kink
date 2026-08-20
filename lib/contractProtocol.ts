import type { Profile, ProfileOwnerKey } from "@/types";
import { canonicalJson, sha256Base64Url, verifyProfileConsent } from "@/lib/consentProof";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import {
  resolveProfileIdentityTrust,
  type ProfileIdentityTrust,
} from "@/lib/profileIdentityTrust";
import { getPersistedProfileIdentityAnchor } from "@/lib/storeSecurity";
import {
  cloneSeries,
  contractPairKey,
  contractParticipantFromProfile,
  contractSummaryFromContent,
  contractVersionById,
  hashContractContent,
  signContractPayload,
  verifyContractProof,
  type ContractAction,
  type ContractActionPayload,
  type ContractExchangeEnvelope,
  type ContractLifecycleEvent,
  type ContractPendingRequest,
  type ContractReceiptPayload,
  type ContractSeries,
  type ContractSignatureProof,
  type ContractVersion,
} from "@/lib/contractLifecycle";
import {
  CONTRACT_REQUEST_TTL_MS,
  authorizeContractRequestCreation,
  authorizeContractResponse,
  authorizeIncomingContractRequest,
  contractRequestEventType,
  contractResponseEventType,
  contractStatusAfterRequest,
  contractStatusAfterResponse,
  contractTailHash,
  type ContractStateMachineResult,
} from "@/lib/contractStateMachine";
import {
  createContractLineageEvent,
  lineageEventFromEnvelope,
  lineageReceiptPayload,
  verifyContractLineageEvent,
  type ContractLineageEnvelope,
  type ContractLineageReceiptPayload,
} from "@/lib/contractLineage";

function uid(): string {
  return crypto.randomUUID();
}

function isSharedProfile(profile: Pick<Profile, "origin" | "isImported">): boolean {
  return profile.origin === "shared" || profile.isImported === true;
}

export async function resolveContractCounterpartyIdentityTrust(
  profile: Profile,
): Promise<ProfileIdentityTrust> {
  const consent = await verifyProfileConsent(profile);
  const cryptographicStatus = consent.status === "valid"
    ? "valid"
    : profile.consentProof
      ? "invalid"
      : "unsigned";
  return resolveProfileIdentityTrust(
    profile,
    cryptographicStatus,
    getPersistedProfileIdentityAnchor(profile.id),
  );
}

async function activationCounterpartyIsAnchored(profile: Profile): Promise<boolean> {
  if (!isSharedProfile(profile)) return true;
  const trust = await resolveContractCounterpartyIdentityTrust(profile);
  return trust.status === "identity-anchored";
}

function stateMachineError(result: ContractStateMachineResult): string {
  if (result.ok) return "";
  if (result.reason === "pending_request") return "Er staat al een contractverzoek open.";
  if (result.reason === "invalid_transition") return "Deze contractactie past niet bij de huidige status.";
  if (result.reason === "invalid_version") return "De verwachte getekende contractversie ontbreekt of klopt niet.";
  if (result.reason === "expired_request") return "Dit contractverzoek is verlopen.";
  if (result.reason === "future_request" || result.reason === "invalid_lifetime") {
    return "De geldigheidsduur van dit contractverzoek klopt niet.";
  }
  if (result.reason === "stale_tail" || result.reason === "forked_request") {
    return "Dit contractverzoek sluit niet aan op de actuele contractgeschiedenis.";
  }
  if (result.reason === "bootstrap_not_allowed") {
    return "Dit toestel mist de actuele contractgeschiedenis voor deze actie.";
  }
  return "De contractpartijen of contractreeks komen niet overeen.";
}

function bindProfileIdentity(
  series: ContractSeries,
  profile: Profile,
  proof?: ContractSignatureProof,
): void {
  const fresh = contractParticipantFromProfile(profile);
  series.participants = series.participants.map((participant) =>
    participant.profileId === profile.id
      ? {
          ...participant,
          ...fresh,
          ...(proof ? { keyId: proof.keyId, publicKeyJwk: proof.publicKeyJwk } : {}),
        }
      : participant) as ContractSeries["participants"];
}

function bindProofIdentity(
  series: ContractSeries,
  profileId: string,
  proof: ContractSignatureProof,
): void {
  series.participants = series.participants.map((participant) =>
    participant.profileId === profileId
      ? { ...participant, keyId: proof.keyId, publicKeyJwk: proof.publicKeyJwk }
      : participant) as ContractSeries["participants"];
}

function requestPayload(
  request: ContractPendingRequest,
  phase: "request" | "response",
  actorProfileId = request.actorProfileId,
  counterpartyProfileId = request.counterpartyProfileId,
  lineagePreviousEventHash = request.previousEventHash,
): ContractActionPayload {
  return {
    schema: 1,
    phase,
    requestId: request.requestId,
    action: request.action,
    seriesId: request.seriesId,
    versionId: request.versionId,
    contentHash: request.contentHash,
    actorProfileId,
    counterpartyProfileId,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    ...(lineagePreviousEventHash ? { previousEventHash: lineagePreviousEventHash } : {}),
    ...(request.reason ? { reason: request.reason } : {}),
    ...(request.note ? { note: request.note } : {}),
  };
}

function requestsEqual(left: ContractPendingRequest, right: ContractPendingRequest): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function proofsEqual(left: ContractSignatureProof | undefined, right: ContractSignatureProof): boolean {
  return !!left && canonicalJson(left) === canonicalJson(right);
}

async function verifiedEnvelopeEvent(input: {
  envelope: ContractExchangeEnvelope;
  request: ContractPendingRequest;
  type: ContractLifecycleEvent["type"];
  proof: ContractSignatureProof;
  actorProfileId: string;
  counterpartyProfileId: string;
  previousEventHash?: string;
  includeRequestNote: boolean;
  requireSeriesTailMatch?: boolean;
}): Promise<ContractLifecycleEvent | null> {
  const event = lineageEventFromEnvelope(input.envelope);
  if (!event
    || event.type !== input.type
    || event.requestId !== input.request.requestId
    || event.actorProfileId !== input.actorProfileId
    || event.counterpartyProfileId !== input.counterpartyProfileId
    || (event.previousEventHash ?? null) !== (input.previousEventHash ?? null)
    || event.createdAt !== input.proof.signedAt
    || !proofsEqual(event.proof, input.proof)) {
    return null;
  }
  if (input.requireSeriesTailMatch
    && input.envelope.series?.events.at(-1)?.eventHash !== event.eventHash) {
    return null;
  }
  if (input.includeRequestNote
    && ((event.reason ?? null) !== (input.request.reason ?? null)
      || (event.note ?? null) !== (input.request.note ?? null))) {
    return null;
  }
  if (!await verifyContractLineageEvent(event)) return null;
  return event;
}

async function appendEvent(
  series: ContractSeries,
  type: ContractLifecycleEvent["type"],
  actor: Profile,
  counterpartyProfileId: string,
  request: ContractPendingRequest,
  proof: ContractSignatureProof,
): Promise<ContractSeries> {
  const previousEventHash = contractTailHash(series);
  const event = await createContractLineageEvent({
    id: uid(),
    type,
    createdAt: proof.signedAt,
    actorProfileId: actor.id,
    actorName: actor.name,
    counterpartyProfileId,
    ...(request.reason ? { reason: request.reason } : {}),
    ...(request.note ? { note: request.note } : {}),
    proof,
    requestId: request.requestId,
    ...(previousEventHash ? { previousEventHash } : {}),
  });
  return { ...series, events: [...series.events, event], updatedAt: event.createdAt };
}

async function currentVersionIsAuthoritative(series: ContractSeries): Promise<boolean> {
  const version = contractVersionById(series, series.currentVersionId);
  if (!version?.content || version.state !== "signed" || version.legacySnapshotId) return false;
  if (await hashContractContent(version.content) !== version.contentHash) return false;
  if (series.participants.length !== 2) return false;

  for (const participant of series.participants) {
    if (!participant.keyId) return false;
    const proof = version.signatures.find((candidate) => candidate.profileId === participant.profileId);
    if (!proof || proof.keyId !== participant.keyId || !await verifyContractProof(version.content, proof)) {
      return false;
    }
  }
  return true;
}

function canonicalActivationVersion(
  baseSeries: ContractSeries,
  transportSeries: ContractSeries,
  request: ContractPendingRequest,
): ContractVersion {
  const incoming = contractVersionById(transportSeries, request.versionId);
  if (!incoming?.content) throw new Error("De volledige contractversie ontbreekt");
  const initiatorProof = incoming.signatures.find((proof) => proof.profileId === request.actorProfileId);
  if (!initiatorProof) throw new Error("De eerste contracthandtekening ontbreekt");
  const existing = contractVersionById(baseSeries, request.versionId);
  const nextNumber = existing?.number
    ?? Math.max(0, ...baseSeries.versions.map((version) => version.number)) + 1;

  return {
    id: request.versionId,
    number: nextNumber,
    createdAt: existing?.createdAt ?? request.createdAt,
    updatedAt: request.proof.signedAt,
    contentHash: request.contentHash,
    content: structuredClone(incoming.content),
    summary: contractSummaryFromContent(incoming.content),
    ...(existing?.note ? { note: existing.note } : {}),
    state: "pending_signature",
    signatures: [structuredClone(initiatorProof)],
  };
}

function bootstrapParticipants(
  transportSeries: ContractSeries,
  trustedActor: Profile,
  responder: Profile,
): ContractSeries["participants"] {
  const byId = new Map<string, Profile>([
    [trustedActor.id, trustedActor],
    [responder.id, responder],
  ]);
  return transportSeries.participants.map((participant) => {
    const profile = byId.get(participant.profileId);
    if (!profile) throw new Error("Een contractpartij ontbreekt");
    return contractParticipantFromProfile(profile);
  }) as ContractSeries["participants"];
}

function canonicalSeriesForIncomingRequest(input: {
  currentSeries: ContractSeries | null;
  transportSeries: ContractSeries;
  request: ContractPendingRequest;
  requestEvent: ContractLifecycleEvent;
  trustedActor: Profile;
  responder: Profile;
}): ContractSeries {
  const { currentSeries, transportSeries, request, requestEvent, trustedActor, responder } = input;
  let series: ContractSeries;

  if (currentSeries) {
    series = cloneSeries(currentSeries);
  } else {
    series = {
      id: request.seriesId,
      pairKey: contractPairKey(request.actorProfileId, request.counterpartyProfileId),
      participants: bootstrapParticipants(transportSeries, trustedActor, responder),
      status: "draft",
      createdAt: request.createdAt,
      updatedAt: requestEvent.createdAt,
      versions: [],
      events: [],
    };
  }

  if (request.action === "activate") {
    const version = canonicalActivationVersion(series, transportSeries, request);
    series.versions = [version, ...series.versions.filter((item) => item.id !== version.id)];
    series.draftVersionId = version.id;
  }

  series.status = contractStatusAfterRequest(series, request.action);
  series.pendingRequest = structuredClone(request);
  series.events = [...series.events, structuredClone(requestEvent)];
  series.updatedAt = requestEvent.createdAt;
  bindProfileIdentity(series, trustedActor, request.proof);
  bindProfileIdentity(series, responder);
  return series;
}

export async function createContractRequest(input: {
  series: ContractSeries;
  action: ContractAction;
  actor: Profile;
  counterparty: Profile;
  ownerKey: ProfileOwnerKey;
  reason?: "Tijdelijk gepauzeerd" | "Dynamiek beëindigd";
  note?: string;
}): Promise<{ envelope: ContractExchangeEnvelope; series: ContractSeries }> {
  const { action, actor, counterparty, ownerKey } = input;
  if (action === "activate" && !await activationCounterpartyIsAnchored(counterparty)) {
    throw new Error("Bevestig eerst onafhankelijk de identiteit van de andere contractpartij voordat je het contract activeert.");
  }
  const createdAt = Date.now();
  const authorization = authorizeContractRequestCreation({
    series: input.series,
    action,
    actorProfileId: actor.id,
    counterpartyProfileId: counterparty.id,
    now: createdAt,
  });
  if (!authorization.ok) throw new Error(stateMachineError(authorization));
  if ((action === "resume" || action === "reactivate")
    && !await currentVersionIsAuthoritative(input.series)) {
    throw new Error("De actuele contractversie kan niet cryptografisch als authority worden bevestigd.");
  }

  const series = cloneSeries(input.series);
  bindProfileIdentity(series, actor);
  bindProfileIdentity(series, counterparty);
  const versionId = action === "activate" ? series.draftVersionId : series.currentVersionId;
  const version = contractVersionById(series, versionId);
  if (!version || !versionId) throw new Error("De contractversie ontbreekt");
  if (version.content && await hashContractContent(version.content) !== version.contentHash) {
    throw new Error("De contractinhoud is gewijzigd");
  }
  const previousEventHash = contractTailHash(series);
  const unsigned: Omit<ContractPendingRequest, "proof"> = {
    requestId: uid(),
    action,
    seriesId: series.id,
    versionId,
    contentHash: version.contentHash,
    createdAt,
    expiresAt: createdAt + CONTRACT_REQUEST_TTL_MS,
    actorProfileId: actor.id,
    counterpartyProfileId: counterparty.id,
    ...(previousEventHash ? { previousEventHash } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  };
  const proof = await signContractPayload(
    requestPayload({ ...unsigned, proof: {} as ContractSignatureProof }, "request"),
    actor.id,
    ownerKey,
  );
  const request: ContractPendingRequest = { ...unsigned, proof };

  if (action === "activate") {
    if (!version.content) throw new Error("Een historische samenvatting kan niet opnieuw worden ondertekend");
    const versionProof = await signContractPayload(version.content, actor.id, ownerKey);
    version.signatures = [versionProof, ...version.signatures.filter((item) => item.profileId !== actor.id)];
    version.state = "pending_signature";
    version.updatedAt = Date.now();
  }
  series.status = contractStatusAfterRequest(series, action);
  series.pendingRequest = request;
  const withEvent = await appendEvent(
    series,
    contractRequestEventType(action),
    actor,
    counterparty.id,
    request,
    proof,
  );
  const event = withEvent.events.at(-1)!;
  return {
    series: withEvent,
    envelope: { schema: 1, kind: "request", request, series: withEvent, event } as ContractLineageEnvelope,
  };
}

export async function verifyContractRequest(
  envelope: ContractExchangeEnvelope,
  trustedActor?: Profile,
  currentSeries: ContractSeries | null = null,
  now: number = Date.now(),
): Promise<boolean> {
  if (envelope.schema !== 1 || envelope.kind !== "request" || !envelope.series) return false;
  const { request, series } = envelope;
  const authorization = authorizeIncomingContractRequest({
    localSeries: currentSeries,
    transportSeries: series,
    request,
    now,
  });
  if (!authorization.ok) return false;

  const actor = currentSeries?.participants.find((participant) => participant.profileId === request.actorProfileId)
    ?? series.participants.find((participant) => participant.profileId === request.actorProfileId);
  const counterparty = currentSeries?.participants.find((participant) => participant.profileId === request.counterpartyProfileId)
    ?? series.participants.find((participant) => participant.profileId === request.counterpartyProfileId);
  if (!actor || !counterparty) return false;
  if (request.proof.profileId !== actor.profileId) return false;
  if (actor.keyId && actor.keyId !== request.proof.keyId) return false;
  if (trustedActor) {
    if (trustedActor.id !== actor.profileId) return false;
    if (getProfileVerificationCode(trustedActor) !== actor.verificationCode) return false;
    const trustedConsent = await verifyProfileConsent(trustedActor);
    if (trustedConsent.status !== "valid") return false;
    if (trustedConsent.proof.keyId !== request.proof.keyId) return false;
    if (request.action === "activate" && isSharedProfile(trustedActor)) {
      const trust = resolveProfileIdentityTrust(
        trustedActor,
        "valid",
        getPersistedProfileIdentityAnchor(trustedActor.id),
      );
      if (trust.status !== "identity-anchored") return false;
    }
  }
  if (!await verifyContractProof(requestPayload(request, "request"), request.proof)) return false;

  const requestEvent = await verifiedEnvelopeEvent({
    envelope,
    request,
    type: contractRequestEventType(request.action),
    proof: request.proof,
    actorProfileId: request.actorProfileId,
    counterpartyProfileId: request.counterpartyProfileId,
    previousEventHash: request.previousEventHash,
    includeRequestNote: true,
    requireSeriesTailMatch: true,
  });
  if (!requestEvent) return false;

  const version = contractVersionById(series, request.versionId);
  if (!version || version.contentHash !== request.contentHash) return false;
  if (request.action === "activate") {
    if (!version.content || await hashContractContent(version.content) !== version.contentHash) return false;
    const initiatorProof = version.signatures.find((proof) => proof.profileId === request.actorProfileId);
    if (!initiatorProof
      || initiatorProof.keyId !== request.proof.keyId
      || !await verifyContractProof(version.content, initiatorProof)) return false;
  } else if (request.action === "resume" || request.action === "reactivate") {
    if (!currentSeries || !await currentVersionIsAuthoritative(currentSeries)) return false;
  }
  return true;
}

export async function createContractResponse(input: {
  envelope: ContractExchangeEnvelope;
  trustedActor: Profile;
  responder: Profile;
  ownerKey: ProfileOwnerKey;
  currentSeries?: ContractSeries | null;
}): Promise<{ envelope: ContractExchangeEnvelope; series: ContractSeries }> {
  const transportSeries = input.envelope.series;
  const currentSeries = input.currentSeries ?? null;
  if (input.envelope.kind !== "request" || !transportSeries
    || !await verifyContractRequest(input.envelope, input.trustedActor, currentSeries)) {
    throw new Error("Dit verzoek is ongeldig, verlopen of sluit niet aan op de actuele contractgeschiedenis");
  }
  const request = input.envelope.request;
  if (input.responder.id !== request.counterpartyProfileId) {
    throw new Error("Dit verzoek hoort bij een ander profiel");
  }
  const requestEvent = await verifiedEnvelopeEvent({
    envelope: input.envelope,
    request,
    type: contractRequestEventType(request.action),
    proof: request.proof,
    actorProfileId: request.actorProfileId,
    counterpartyProfileId: request.counterpartyProfileId,
    previousEventHash: request.previousEventHash,
    includeRequestNote: true,
    requireSeriesTailMatch: true,
  });
  if (!requestEvent) throw new Error("De contractgeschiedenis in dit verzoek klopt niet");

  let series = canonicalSeriesForIncomingRequest({
    currentSeries,
    transportSeries,
    request,
    requestEvent,
    trustedActor: input.trustedActor,
    responder: input.responder,
  });
  const responseProof = await signContractPayload(
    requestPayload(request, "response", input.responder.id, request.actorProfileId, requestEvent.eventHash),
    input.responder.id,
    input.ownerKey,
  );
  const expectedResponder = series.participants.find((participant) => participant.profileId === input.responder.id);
  if (expectedResponder?.keyId && expectedResponder.keyId !== responseProof.keyId) {
    throw new Error("Deze eigendomssleutel hoort niet bij de eerder bevestigde contractpartij");
  }
  bindProfileIdentity(series, input.responder, responseProof);
  let versionProof: ContractSignatureProof | undefined;

  if (request.action === "activate") {
    const version = contractVersionById(series, request.versionId);
    if (!version?.content) throw new Error("De volledige contractversie ontbreekt");
    versionProof = await signContractPayload(version.content, input.responder.id, input.ownerKey);
    version.signatures = [
      ...version.signatures.filter((proof) => proof.profileId !== input.responder.id),
      versionProof,
    ];
    version.state = "signed";
    version.updatedAt = Date.now();
    series.currentVersionId = version.id;
    series.draftVersionId = undefined;
  }
  series.status = contractStatusAfterResponse(request.action);
  series.pendingRequest = undefined;
  series = await appendEvent(
    series,
    contractResponseEventType(request.action),
    input.responder,
    request.actorProfileId,
    request,
    responseProof,
  );
  const event = series.events.at(-1)!;
  return {
    series,
    envelope: {
      schema: 1,
      kind: "response",
      request,
      series,
      event,
      responderProof: responseProof,
      ...(versionProof ? { versionProof } : {}),
    } as ContractLineageEnvelope,
  };
}

export async function verifyAndApplyContractResponse(input: {
  currentSeries: ContractSeries;
  envelope: ContractExchangeEnvelope;
}): Promise<ContractSeries> {
  const { envelope, currentSeries } = input;
  if (envelope.schema !== 1 || envelope.kind !== "response" || !envelope.responderProof) {
    throw new Error("Geen geldig contractantwoord ontvangen");
  }
  const request = currentSeries.pendingRequest;
  if (!request || !requestsEqual(request, envelope.request)) {
    throw new Error("Dit antwoord hoort niet bij het openstaande verzoek");
  }
  const authorization = authorizeContractResponse({ currentSeries, request });
  if (!authorization.ok) throw new Error(stateMachineError(authorization));
  if (envelope.responderProof.profileId !== request.counterpartyProfileId) {
    throw new Error("De bevestiging komt niet van de verwachte contractpartij");
  }

  const responder = currentSeries.participants.find((participant) =>
    participant.profileId === request.counterpartyProfileId);
  if (!responder) throw new Error("De tweede contractpartij ontbreekt");
  if (responder.keyId && responder.keyId !== envelope.responderProof.keyId) {
    throw new Error("De bevestiging gebruikt een andere eigendomssleutel dan eerder vastgelegd");
  }

  const previousEventHash = contractTailHash(currentSeries);
  const responsePayload = requestPayload(
    request,
    "response",
    request.counterpartyProfileId,
    request.actorProfileId,
    previousEventHash,
  );
  if (!await verifyContractProof(responsePayload, envelope.responderProof)) {
    throw new Error("De bevestiging van de tweede partij klopt niet");
  }

  const responseEvent = await verifiedEnvelopeEvent({
    envelope,
    request,
    type: contractResponseEventType(request.action),
    proof: envelope.responderProof,
    actorProfileId: request.counterpartyProfileId,
    counterpartyProfileId: request.actorProfileId,
    previousEventHash,
    includeRequestNote: true,
  });
  if (!responseEvent) {
    throw new Error("Het antwoord sluit niet aan op de lokale contractgeschiedenis");
  }

  const series = cloneSeries(currentSeries);
  const version = contractVersionById(series, request.versionId);
  if (!version || version.contentHash !== request.contentHash) {
    throw new Error("De bevestiging hoort bij een andere contractversie");
  }
  if (version.content && await hashContractContent(version.content) !== version.contentHash) {
    throw new Error("De lokale contractinhoud is gewijzigd");
  }

  if (request.action === "activate") {
    if (!version.content || !envelope.versionProof) throw new Error("De tweede contracthandtekening ontbreekt");
    if (envelope.versionProof.profileId !== request.counterpartyProfileId
      || envelope.versionProof.keyId !== envelope.responderProof.keyId
      || !await verifyContractProof(version.content, envelope.versionProof)) {
      throw new Error("De tweede contracthandtekening is ongeldig");
    }
    const initiatorProof = version.signatures.find((proof) => proof.profileId === request.actorProfileId);
    if (!initiatorProof || !await verifyContractProof(version.content, initiatorProof)) {
      throw new Error("De eerste contracthandtekening is niet meer geldig");
    }
    version.signatures = [
      ...version.signatures.filter((proof) => proof.profileId !== request.counterpartyProfileId),
      envelope.versionProof,
    ];
    version.state = "signed";
    version.updatedAt = envelope.versionProof.signedAt;
    series.currentVersionId = version.id;
    series.draftVersionId = undefined;
  }

  series.status = contractStatusAfterResponse(request.action);
  bindProofIdentity(series, request.counterpartyProfileId, envelope.responderProof);
  series.pendingRequest = undefined;
  series.events = [...series.events, structuredClone(responseEvent)];
  series.updatedAt = responseEvent.createdAt;
  return series;
}

async function responseProofHash(proof: ContractSignatureProof): Promise<string> {
  return sha256Base64Url(canonicalJson(proof));
}

export async function createContractReceipt(input: {
  series: ContractSeries;
  request: ContractPendingRequest;
  responseProof: ContractSignatureProof;
  actor: Profile;
  ownerKey: ProfileOwnerKey;
}): Promise<{ envelope: ContractExchangeEnvelope; series: ContractSeries }> {
  const { request, responseProof, actor, ownerKey } = input;
  if (request.seriesId !== input.series.id) throw new Error("Dit antwoord hoort bij een ander contract");
  if (actor.id !== request.actorProfileId) throw new Error("Alleen de oorspronkelijke aanvrager kan de ontvangst afronden");
  if (responseProof.profileId !== request.counterpartyProfileId) {
    throw new Error("Het antwoord komt niet van de verwachte contractpartij");
  }

  const series = cloneSeries(input.series);
  const actorParticipant = series.participants.find((participant) => participant.profileId === actor.id);
  const responderParticipant = series.participants.find((participant) => participant.profileId === responseProof.profileId);
  if (!actorParticipant || !responderParticipant) throw new Error("Een contractpartij ontbreekt");
  if (actorParticipant.keyId && actorParticipant.keyId !== ownerKey.keyId) {
    throw new Error("Deze eigendomssleutel hoort niet bij de oorspronkelijke aanvrager");
  }
  if (responderParticipant.keyId && responderParticipant.keyId !== responseProof.keyId) {
    throw new Error("Het antwoord gebruikt een andere eigendomssleutel dan vastgelegd");
  }

  const responseEvent = series.events.at(-1);
  if (!responseEvent
    || responseEvent.type !== contractResponseEventType(request.action)
    || responseEvent.requestId !== request.requestId
    || !proofsEqual(responseEvent.proof, responseProof)
    || !await verifyContractLineageEvent(responseEvent)) {
    throw new Error("De lokale bevestiging van de tweede partij ontbreekt of is verouderd");
  }
  const responsePayload = requestPayload(
    request,
    "response",
    request.counterpartyProfileId,
    request.actorProfileId,
    responseEvent.previousEventHash,
  );
  if (!await verifyContractProof(responsePayload, responseProof)) {
    throw new Error("Het antwoord van de tweede partij is ongeldig");
  }

  const receipt: ContractLineageReceiptPayload = {
    schema: 1,
    requestId: request.requestId,
    seriesId: request.seriesId,
    action: request.action,
    contentHash: request.contentHash,
    actorProfileId: request.actorProfileId,
    counterpartyProfileId: request.counterpartyProfileId,
    responderProofHash: await responseProofHash(responseProof),
    receivedAt: Date.now(),
    previousEventHash: responseEvent.eventHash,
  };
  const receiptProof = await signContractPayload(receipt, actor.id, ownerKey);
  bindProfileIdentity(series, actor, receiptProof);

  if (!series.events.some((event) => event.type === "receipt_confirmed" && event.requestId === request.requestId)) {
    const previousEventHash = contractTailHash(series);
    const event = await createContractLineageEvent({
      id: uid(),
      type: "receipt_confirmed",
      createdAt: receiptProof.signedAt,
      actorProfileId: actor.id,
      actorName: actor.name,
      counterpartyProfileId: request.counterpartyProfileId,
      proof: receiptProof,
      requestId: request.requestId,
      ...(previousEventHash ? { previousEventHash } : {}),
    });
    series.events = [...series.events, event];
    series.updatedAt = event.createdAt;
  }

  const event = series.events.at(-1)!;
  return {
    series,
    envelope: {
      schema: 1,
      kind: "receipt",
      request,
      event,
      receipt,
      receiptProof,
    } as ContractLineageEnvelope,
  };
}

export async function verifyAndApplyContractReceipt(input: {
  currentSeries: ContractSeries;
  envelope: ContractExchangeEnvelope;
}): Promise<ContractSeries> {
  const { envelope, currentSeries } = input;
  if (envelope.schema !== 1 || envelope.kind !== "receipt"
    || !envelope.receipt || !envelope.receiptProof) {
    throw new Error("Geen geldig afrondingsbewijs ontvangen");
  }
  const { request, receipt, receiptProof } = envelope;
  if (request.seriesId !== currentSeries.id || receipt.seriesId !== currentSeries.id) {
    throw new Error("Dit afrondingsbewijs hoort bij een ander contract");
  }
  if (receipt.requestId !== request.requestId
    || receipt.action !== request.action
    || receipt.contentHash !== request.contentHash
    || receipt.actorProfileId !== request.actorProfileId
    || receipt.counterpartyProfileId !== request.counterpartyProfileId) {
    throw new Error("Het afrondingsbewijs hoort bij een andere contractactie");
  }

  const actor = currentSeries.participants.find((participant) => participant.profileId === request.actorProfileId);
  const responder = currentSeries.participants.find((participant) => participant.profileId === request.counterpartyProfileId);
  if (!actor || !responder) throw new Error("Een contractpartij ontbreekt");
  if (request.proof.profileId !== actor.profileId
    || (actor.keyId && actor.keyId !== request.proof.keyId)
    || !await verifyContractProof(requestPayload(request, "request"), request.proof)) {
    throw new Error("Het oorspronkelijke contractverzoek is niet meer geldig");
  }
  const signedReceipt = lineageReceiptPayload(receipt);
  if (!signedReceipt
    || receiptProof.profileId !== actor.profileId
    || (actor.keyId && actor.keyId !== receiptProof.keyId)
    || !await verifyContractProof(signedReceipt, receiptProof)) {
    throw new Error("Het afrondingsbewijs is niet geldig ondertekend");
  }

  const localResponseEvent = currentSeries.events.at(-1);
  if (!localResponseEvent
    || localResponseEvent.type !== contractResponseEventType(request.action)
    || localResponseEvent.requestId !== request.requestId
    || localResponseEvent.actorProfileId !== responder.profileId
    || !localResponseEvent.proof
    || !await verifyContractLineageEvent(localResponseEvent)) {
    const existingReceipt = currentSeries.events.find((event) =>
      event.type === "receipt_confirmed" && event.requestId === request.requestId);
    const incomingReceipt = lineageEventFromEnvelope(envelope);
    if (existingReceipt && incomingReceipt?.eventHash === existingReceipt.eventHash) return cloneSeries(currentSeries);
    throw new Error("De lokale bevestiging van de tweede partij ontbreekt");
  }
  if (responder.keyId && responder.keyId !== localResponseEvent.proof.keyId) {
    throw new Error("De lokale bevestiging gebruikt een andere eigendomssleutel");
  }
  if (await responseProofHash(localResponseEvent.proof) !== receipt.responderProofHash) {
    throw new Error("Het afrondingsbewijs verwijst naar een ander antwoord");
  }
  if (!signedReceipt || signedReceipt.previousEventHash !== localResponseEvent.eventHash) {
    throw new Error("Het afrondingsbewijs sluit niet aan op de lokale contractgeschiedenis");
  }

  const version = contractVersionById(currentSeries, request.versionId);
  if (!version || version.contentHash !== request.contentHash) {
    throw new Error("De lokale contractversie komt niet overeen");
  }

  const receiptEvent = await verifiedEnvelopeEvent({
    envelope,
    request,
    type: "receipt_confirmed",
    proof: receiptProof,
    actorProfileId: actor.profileId,
    counterpartyProfileId: responder.profileId,
    previousEventHash: localResponseEvent.eventHash,
    includeRequestNote: false,
  });
  if (!receiptEvent) throw new Error("Het afrondingsbewijs sluit niet aan op de lokale contractgeschiedenis");

  const series = cloneSeries(currentSeries);
  bindProofIdentity(series, actor.profileId, receiptProof);
  series.events = [...series.events, structuredClone(receiptEvent)];
  series.updatedAt = Math.max(series.updatedAt, receiptEvent.createdAt);
  return series;
}

export function requestInstruction(action: ContractAction): string {
  if (action === "activate") return "Laat de andere persoon deze QR scannen om exact deze contractversie te ondertekenen.";
  if (action === "pause") return "Het contract is onmiddellijk gepauzeerd. Laat de andere persoon deze QR scannen om ontvangst te bevestigen.";
  if (action === "resume") return "Laat de andere persoon deze QR scannen. Het contract wordt pas hervat nadat jullie beiden bevestigen.";
  if (action === "stop") return "Het contract is onmiddellijk stopgezet. Laat de andere persoon deze QR scannen om ontvangst te bevestigen.";
  return "Laat de andere persoon deze QR scannen. Heractiveren vereist toestemming van jullie beiden.";
}
