import type { Profile, ProfileOwnerKey } from "@/types";
import { canonicalJson, sha256Base64Url, verifyProfileConsent } from "@/lib/consentProof";
import { getProfileVerificationCode } from "@/lib/profileVerification";
import {
  cloneSeries,
  contractParticipantFromProfile,
  contractVersionById,
  createContractEvent,
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
} from "@/lib/contractLifecycle";

const REQUEST_TTL_MS = 15 * 60 * 1000;

function uid(): string {
  return crypto.randomUUID();
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
    ...(request.previousEventHash ? { previousEventHash: request.previousEventHash } : {}),
    ...(request.reason ? { reason: request.reason } : {}),
    ...(request.note ? { note: request.note } : {}),
  };
}

function eventTypeForRequest(action: ContractAction): ContractLifecycleEvent["type"] {
  if (action === "activate") return "signature_added";
  if (action === "pause") return "paused";
  if (action === "resume") return "resume_requested";
  if (action === "stop") return "stopped";
  return "reactivation_requested";
}

function eventTypeForResponse(action: ContractAction): ContractLifecycleEvent["type"] {
  if (action === "activate") return "activated";
  if (action === "pause") return "pause_acknowledged";
  if (action === "resume") return "resumed";
  if (action === "stop") return "stop_acknowledged";
  return "reactivated";
}

async function appendEvent(
  series: ContractSeries,
  type: ContractLifecycleEvent["type"],
  actor: Profile,
  counterpartyProfileId: string,
  request: ContractPendingRequest,
  proof: ContractSignatureProof,
): Promise<ContractSeries> {
  const previousEventHash = series.events.at(-1)?.eventHash;
  const event = await createContractEvent({
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
  const series = cloneSeries(input.series);
  bindProfileIdentity(series, actor);
  bindProfileIdentity(series, counterparty);
  const versionId = action === "activate"
    ? series.draftVersionId
    : series.currentVersionId;
  const version = contractVersionById(series, versionId);
  if (!version || !versionId) throw new Error("De contractversie ontbreekt");
  if (version.content && await hashContractContent(version.content) !== version.contentHash) {
    throw new Error("De contractinhoud is gewijzigd");
  }
  const createdAt = Date.now();
  const previousEventHash = series.events.at(-1)?.eventHash;
  const unsigned: Omit<ContractPendingRequest, "proof"> = {
    requestId: uid(),
    action,
    seriesId: series.id,
    versionId,
    contentHash: version.contentHash,
    createdAt,
    expiresAt: createdAt + REQUEST_TTL_MS,
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
    if (!series.currentVersionId) series.status = "pending_signature";
  } else if (action === "pause") {
    series.status = "paused";
  } else if (action === "resume") {
    series.status = "resume_pending";
  } else if (action === "stop") {
    series.status = "stopped";
  }
  series.pendingRequest = request;
  const withEvent = await appendEvent(
    series,
    eventTypeForRequest(action),
    actor,
    counterparty.id,
    request,
    proof,
  );
  return {
    series: withEvent,
    envelope: { schema: 1, kind: "request", request, series: withEvent },
  };
}

export async function verifyContractRequest(
  envelope: ContractExchangeEnvelope,
  trustedActor?: Profile,
): Promise<boolean> {
  if (envelope.schema !== 1 || envelope.kind !== "request" || !envelope.series) return false;
  const { request, series } = envelope;
  if (request.seriesId !== series.id) return false;
  if (request.expiresAt < Date.now()) return false;
  const actor = series.participants.find((participant) => participant.profileId === request.actorProfileId);
  const counterparty = series.participants.find((participant) => participant.profileId === request.counterpartyProfileId);
  if (!actor || !counterparty) return false;
  if (request.proof.profileId !== actor.profileId) return false;
  if (actor.keyId && actor.keyId !== request.proof.keyId) return false;
  if (trustedActor) {
    if (trustedActor.id !== actor.profileId) return false;
    if (getProfileVerificationCode(trustedActor) !== actor.verificationCode) return false;
    const trustedConsent = await verifyProfileConsent(trustedActor);
    if (trustedConsent.status !== "valid") return false;
    if (trustedConsent.proof.keyId !== request.proof.keyId) return false;
  }
  if (!await verifyContractProof(requestPayload(request, "request"), request.proof)) return false;
  const version = contractVersionById(series, request.versionId);
  if (!version || version.contentHash !== request.contentHash) return false;
  if (version.content && await hashContractContent(version.content) !== version.contentHash) return false;
  if (request.action === "activate") {
    if (!version.content) return false;
    const initiatorProof = version.signatures.find((proof) => proof.profileId === request.actorProfileId);
    if (!initiatorProof || !await verifyContractProof(version.content, initiatorProof)) return false;
  }
  return true;
}

export async function createContractResponse(input: {
  envelope: ContractExchangeEnvelope;
  trustedActor: Profile;
  responder: Profile;
  ownerKey: ProfileOwnerKey;
}): Promise<{ envelope: ContractExchangeEnvelope; series: ContractSeries }> {
  const sourceSeries = input.envelope.series;
  if (input.envelope.kind !== "request" || !sourceSeries
    || !await verifyContractRequest(input.envelope, input.trustedActor)) {
    throw new Error("Dit verzoek is ongeldig of verlopen");
  }
  const request = input.envelope.request;
  if (input.responder.id !== request.counterpartyProfileId) {
    throw new Error("Dit verzoek hoort bij een ander profiel");
  }
  let series = cloneSeries(sourceSeries);
  const responseProof = await signContractPayload(
    requestPayload(request, "response", input.responder.id, request.actorProfileId),
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
    series.status = "active";
  } else if (request.action === "pause") {
    series.status = "paused";
  } else if (request.action === "resume" || request.action === "reactivate") {
    series.status = "active";
  } else if (request.action === "stop") {
    series.status = "stopped";
  }
  series.pendingRequest = undefined;
  series = await appendEvent(
    series,
    eventTypeForResponse(request.action),
    input.responder,
    request.actorProfileId,
    request,
    responseProof,
  );
  return {
    series,
    envelope: {
      schema: 1,
      kind: "response",
      request,
      series,
      responderProof: responseProof,
      ...(versionProof ? { versionProof } : {}),
    },
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
  if (!request || request.requestId !== envelope.request.requestId) {
    throw new Error("Dit antwoord hoort niet bij het openstaande verzoek");
  }
  if (request.expiresAt < Date.now()) throw new Error("De QR-sessie is verlopen");
  if (request.seriesId !== currentSeries.id) throw new Error("Het openstaande verzoek hoort bij een ander contract");
  if (envelope.responderProof.profileId !== request.counterpartyProfileId) {
    throw new Error("De bevestiging komt niet van de verwachte contractpartij");
  }

  const responder = currentSeries.participants.find((participant) =>
    participant.profileId === request.counterpartyProfileId);
  if (!responder) throw new Error("De tweede contractpartij ontbreekt");
  if (responder.keyId && responder.keyId !== envelope.responderProof.keyId) {
    throw new Error("De bevestiging gebruikt een andere eigendomssleutel dan eerder vastgelegd");
  }

  const responsePayload = requestPayload(
    request,
    "response",
    request.counterpartyProfileId,
    request.actorProfileId,
  );
  if (!await verifyContractProof(responsePayload, envelope.responderProof)) {
    throw new Error("De bevestiging van de tweede partij klopt niet");
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
    series.status = "active";
  } else if (request.action === "pause") {
    series.status = "paused";
  } else if (request.action === "resume" || request.action === "reactivate") {
    series.status = "active";
  } else if (request.action === "stop") {
    series.status = "stopped";
  }

  bindProofIdentity(series, request.counterpartyProfileId, envelope.responderProof);
  series.pendingRequest = undefined;
  const previousEventHash = series.events.at(-1)?.eventHash;
  const event = await createContractEvent({
    id: uid(),
    type: eventTypeForResponse(request.action),
    createdAt: envelope.responderProof.signedAt,
    actorProfileId: responder.profileId,
    actorName: responder.profileName,
    counterpartyProfileId: request.actorProfileId,
    ...(request.reason ? { reason: request.reason } : {}),
    ...(request.note ? { note: request.note } : {}),
    proof: envelope.responderProof,
    requestId: request.requestId,
    ...(previousEventHash ? { previousEventHash } : {}),
  });
  series.events = [...series.events, event];
  series.updatedAt = event.createdAt;
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

  const responsePayload = requestPayload(
    request,
    "response",
    request.counterpartyProfileId,
    request.actorProfileId,
  );
  if (!await verifyContractProof(responsePayload, responseProof)) {
    throw new Error("Het antwoord van de tweede partij is ongeldig");
  }

  const receipt: ContractReceiptPayload = {
    schema: 1,
    requestId: request.requestId,
    seriesId: request.seriesId,
    action: request.action,
    contentHash: request.contentHash,
    actorProfileId: request.actorProfileId,
    counterpartyProfileId: request.counterpartyProfileId,
    responderProofHash: await responseProofHash(responseProof),
    receivedAt: Date.now(),
  };
  const receiptProof = await signContractPayload(receipt, actor.id, ownerKey);
  bindProfileIdentity(series, actor, receiptProof);

  if (!series.events.some((event) => event.type === "receipt_confirmed" && event.requestId === request.requestId)) {
    const previousEventHash = series.events.at(-1)?.eventHash;
    const event = await createContractEvent({
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

  return {
    series,
    envelope: {
      schema: 1,
      kind: "receipt",
      request,
      receipt,
      receiptProof,
    },
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
  if (receiptProof.profileId !== actor.profileId
    || (actor.keyId && actor.keyId !== receiptProof.keyId)
    || !await verifyContractProof(receipt, receiptProof)) {
    throw new Error("Het afrondingsbewijs is niet geldig ondertekend");
  }

  const expectedResponseType = eventTypeForResponse(request.action);
  const responseEvent = [...currentSeries.events].reverse().find((event) =>
    event.type === expectedResponseType
      && event.requestId === request.requestId
      && event.actorProfileId === responder.profileId
      && event.proof);
  if (!responseEvent?.proof) throw new Error("De lokale bevestiging van de tweede partij ontbreekt");
  if (responder.keyId && responder.keyId !== responseEvent.proof.keyId) {
    throw new Error("De lokale bevestiging gebruikt een andere eigendomssleutel");
  }
  if (await responseProofHash(responseEvent.proof) !== receipt.responderProofHash) {
    throw new Error("Het afrondingsbewijs verwijst naar een ander antwoord");
  }

  const version = contractVersionById(currentSeries, request.versionId);
  if (!version || version.contentHash !== request.contentHash) {
    throw new Error("De lokale contractversie komt niet overeen");
  }

  const series = cloneSeries(currentSeries);
  if (series.events.some((event) => event.type === "receipt_confirmed" && event.requestId === request.requestId)) {
    return series;
  }
  bindProofIdentity(series, actor.profileId, receiptProof);
  const previousEventHash = series.events.at(-1)?.eventHash;
  const event = await createContractEvent({
    id: uid(),
    type: "receipt_confirmed",
    createdAt: receiptProof.signedAt,
    actorProfileId: actor.profileId,
    actorName: actor.profileName,
    counterpartyProfileId: responder.profileId,
    proof: receiptProof,
    requestId: request.requestId,
    ...(previousEventHash ? { previousEventHash } : {}),
  });
  series.events = [...series.events, event];
  series.updatedAt = Math.max(series.updatedAt, event.createdAt);
  return series;
}

export function requestInstruction(action: ContractAction): string {
  if (action === "activate") return "Laat de andere persoon deze QR scannen om exact deze contractversie te ondertekenen.";
  if (action === "pause") return "Het contract is onmiddellijk gepauzeerd. Laat de andere persoon deze QR scannen om ontvangst te bevestigen.";
  if (action === "resume") return "Laat de andere persoon deze QR scannen. Het contract wordt pas hervat nadat jullie beiden bevestigen.";
  if (action === "stop") return "Het contract is onmiddellijk stopgezet. Laat de andere persoon deze QR scannen om ontvangst te bevestigen.";
  return "Laat de andere persoon deze QR scannen. Heractiveren vereist toestemming van jullie beiden.";
}
