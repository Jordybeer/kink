import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";
import {
  contractParticipantFromProfile,
  contractSummaryFromContent,
  contractPairKey,
  hashContractContent,
  type ContractSeries,
  type ContractVersionContent,
} from "@/lib/contractLifecycle";
import {
  createContractReceipt,
  createContractRequest,
  createContractResponse,
  verifyAndApplyContractReceipt,
  verifyAndApplyContractResponse,
  verifyContractRequest,
} from "@/lib/contractProtocol";

function profile(id: string, name: string, origin: "own" | "shared" = "own"): Profile {
  return {
    id,
    verificationCode: `code-${id}`,
    name,
    role: id.includes("dom") ? "Dominant" : "Submissive",
    perspective: id.includes("dom") ? "dominant" : "submissive",
    origin,
    isImported: origin === "shared",
    experienceLevel: "ervaren",
    customKinks: [],
    entries: {},
    createdAt: 1,
    updatedAt: 1,
  };
}

function content(a: Profile, b: Profile, label = "v1"): ContractVersionContent {
  return {
    schema: 1,
    profileA: contractParticipantFromProfile(a),
    profileB: contractParticipantFromProfile(b),
    preamble: `Contract ${label}`,
    createdAt: 100,
    signalsA: { green: "groen", amber: "oranje", red: "rood", black: "zwart" },
    signalsB: { green: "groen", amber: "oranje", red: "rood", black: "zwart" },
    aftercareA: [],
    aftercareB: [],
    shared: [],
    softLimits: [],
    hardLimits: [],
    hardLimitDetails: [],
    discuss: [],
  };
}

async function draftSeries(a: Profile, b: Profile): Promise<ContractSeries> {
  const body = content(a, b);
  return {
    id: "series-1",
    pairKey: contractPairKey(a.id, b.id),
    participants: [contractParticipantFromProfile(a), contractParticipantFromProfile(b)],
    status: "draft",
    createdAt: 100,
    updatedAt: 100,
    draftVersionId: "version-1",
    versions: [{
      id: "version-1",
      number: 1,
      createdAt: 100,
      updatedAt: 100,
      contentHash: await hashContractContent(body),
      content: body,
      summary: contractSummaryFromContent(body),
      state: "draft",
      signatures: [],
    }],
    events: [],
  };
}

async function setup() {
  const a = profile("a-dom", "A");
  const b = profile("b-sub", "B");
  const keyA = await generateProfileOwnerKey(a.id);
  const keyB = await generateProfileOwnerKey(b.id);
  a.consentProof = (await signProfileConsent(a, keyA)).proof;
  const draft = await draftSeries(a, b);
  const request = await createContractRequest({
    series: draft,
    action: "activate",
    actor: a,
    counterparty: b,
    ownerKey: keyA,
  });
  const response = await createContractResponse({
    envelope: request.envelope,
    trustedActor: a,
    responder: b,
    ownerKey: keyB,
  });
  const initiatorActive = await verifyAndApplyContractResponse({
    currentSeries: request.series,
    envelope: response.envelope,
  });
  const receipt = await createContractReceipt({
    series: initiatorActive,
    request: request.series.pendingRequest!,
    responseProof: response.envelope.responderProof!,
    actor: a,
    ownerKey: keyA,
  });
  const responderActive = await verifyAndApplyContractReceipt({
    currentSeries: response.series,
    envelope: receipt.envelope,
  });
  return {
    a, b, keyA, keyB,
    initiator: receipt.series,
    responder: responderActive,
  };
}

async function pauseBoth(pair: Awaited<ReturnType<typeof setup>>) {
  const request = await createContractRequest({
    series: pair.initiator,
    action: "pause",
    actor: pair.a,
    counterparty: pair.b,
    ownerKey: pair.keyA,
    reason: "Tijdelijk gepauzeerd",
  });
  const response = await createContractResponse({
    envelope: request.envelope,
    trustedActor: pair.a,
    responder: pair.b,
    ownerKey: pair.keyB,
    currentSeries: pair.responder,
  });
  const initiatorPaused = await verifyAndApplyContractResponse({ currentSeries: request.series, envelope: response.envelope });
  const receipt = await createContractReceipt({
    series: initiatorPaused,
    request: request.series.pendingRequest!,
    responseProof: response.envelope.responderProof!,
    actor: pair.a,
    ownerKey: pair.keyA,
  });
  const responderPaused = await verifyAndApplyContractReceipt({ currentSeries: response.series, envelope: receipt.envelope });
  return { initiator: receipt.series, responder: responderPaused };
}

describe("contract anti-replay lineage", () => {
  it("rejects an old resume after a newer stop has advanced the local tail", async () => {
    const pair = await setup();
    const paused = await pauseBoth(pair);

    const oldResume = await createContractRequest({
      series: paused.initiator,
      action: "resume",
      actor: pair.a,
      counterparty: pair.b,
      ownerKey: pair.keyA,
    });
    const newerStop = await createContractRequest({
      series: paused.initiator,
      action: "stop",
      actor: pair.a,
      counterparty: pair.b,
      ownerKey: pair.keyA,
      reason: "Dynamiek beëindigd",
    });
    const stopAck = await createContractResponse({
      envelope: newerStop.envelope,
      trustedActor: pair.a,
      responder: pair.b,
      ownerKey: pair.keyB,
      currentSeries: paused.responder,
    });

    expect(await verifyContractRequest(oldResume.envelope, pair.a, stopAck.series)).toBe(false);
    await expect(createContractResponse({
      envelope: oldResume.envelope,
      trustedActor: pair.a,
      responder: pair.b,
      ownerKey: pair.keyB,
      currentSeries: stopAck.series,
    })).rejects.toThrow(/actuele contractgeschiedenis|verouderd|status/i);
  });

  it("rejects a forked duplicate request after the responder has already accepted one branch", async () => {
    const pair = await setup();
    const first = await createContractRequest({
      series: pair.initiator,
      action: "pause",
      actor: pair.a,
      counterparty: pair.b,
      ownerKey: pair.keyA,
      reason: "Tijdelijk gepauzeerd",
    });
    const fork = await createContractRequest({
      series: pair.initiator,
      action: "stop",
      actor: pair.a,
      counterparty: pair.b,
      ownerKey: pair.keyA,
      reason: "Dynamiek beëindigd",
    });
    const accepted = await createContractResponse({
      envelope: first.envelope,
      trustedActor: pair.a,
      responder: pair.b,
      ownerKey: pair.keyB,
      currentSeries: pair.responder,
    });

    expect(await verifyContractRequest(first.envelope, pair.a, accepted.series)).toBe(false);
    expect(await verifyContractRequest(fork.envelope, pair.a, accepted.series)).toBe(false);
  });

  it("rejects an old activate request after another lifecycle branch advanced the pair", async () => {
    const pair = await setup();
    const withDraft = structuredClone(pair.initiator);
    const body = content(pair.a, pair.b, "v2");
    withDraft.draftVersionId = "version-2";
    withDraft.versions.unshift({
      id: "version-2",
      number: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      contentHash: await hashContractContent(body),
      content: body,
      summary: contractSummaryFromContent(body),
      state: "draft",
      signatures: [],
    });
    const oldActivate = await createContractRequest({
      series: withDraft,
      action: "activate",
      actor: pair.a,
      counterparty: pair.b,
      ownerKey: pair.keyA,
    });
    const stop = await createContractRequest({
      series: pair.initiator,
      action: "stop",
      actor: pair.a,
      counterparty: pair.b,
      ownerKey: pair.keyA,
      reason: "Dynamiek beëindigd",
    });
    const stopAck = await createContractResponse({
      envelope: stop.envelope,
      trustedActor: pair.a,
      responder: pair.b,
      ownerKey: pair.keyB,
      currentSeries: pair.responder,
    });

    expect(await verifyContractRequest(oldActivate.envelope, pair.a, stopAck.series)).toBe(false);
  });

  it("binds the response signature to the exact request-event tail", async () => {
    const pair = await setup();
    const pause = await createContractRequest({
      series: pair.initiator,
      action: "pause",
      actor: pair.a,
      counterparty: pair.b,
      ownerKey: pair.keyA,
      reason: "Tijdelijk gepauzeerd",
    });
    const response = await createContractResponse({
      envelope: pause.envelope,
      trustedActor: pair.a,
      responder: pair.b,
      ownerKey: pair.keyB,
      currentSeries: pair.responder,
    });

    const forkedLocal = structuredClone(pause.series);
    forkedLocal.events[forkedLocal.events.length - 1].eventHash = "rewired-request-tail";
    await expect(verifyAndApplyContractResponse({
      currentSeries: forkedLocal,
      envelope: response.envelope,
    })).rejects.toThrow(/bevestiging|contractgeschiedenis/i);
  });

  it("binds the receipt signature to the exact response-event tail", async () => {
    const pair = await setup();
    const pause = await createContractRequest({
      series: pair.initiator,
      action: "pause",
      actor: pair.a,
      counterparty: pair.b,
      ownerKey: pair.keyA,
      reason: "Tijdelijk gepauzeerd",
    });
    const response = await createContractResponse({
      envelope: pause.envelope,
      trustedActor: pair.a,
      responder: pair.b,
      ownerKey: pair.keyB,
      currentSeries: pair.responder,
    });
    const initiatorPaused = await verifyAndApplyContractResponse({
      currentSeries: pause.series,
      envelope: response.envelope,
    });
    const receipt = await createContractReceipt({
      series: initiatorPaused,
      request: pause.series.pendingRequest!,
      responseProof: response.envelope.responderProof!,
      actor: pair.a,
      ownerKey: pair.keyA,
    });

    const forkedResponder = structuredClone(response.series);
    forkedResponder.events[forkedResponder.events.length - 1].eventHash = "rewired-response-tail";
    await expect(verifyAndApplyContractReceipt({
      currentSeries: forkedResponder,
      envelope: receipt.envelope,
    })).rejects.toThrow(/afrondingsbewijs|contractgeschiedenis/i);
  });

  it("does not let forged outer series status replace the responder's local authority", async () => {
    const pair = await setup();
    const pause = await createContractRequest({
      series: pair.initiator,
      action: "pause",
      actor: pair.a,
      counterparty: pair.b,
      ownerKey: pair.keyA,
      reason: "Tijdelijk gepauzeerd",
    });
    const tampered = structuredClone(pause.envelope);
    tampered.series!.status = "active";
    tampered.series!.updatedAt = Number.MAX_SAFE_INTEGER;

    expect(await verifyContractRequest(tampered, pair.a, pair.responder)).toBe(true);
    const response = await createContractResponse({
      envelope: tampered,
      trustedActor: pair.a,
      responder: pair.b,
      ownerKey: pair.keyB,
      currentSeries: pair.responder,
    });
    expect(response.series.status).toBe("paused");
    expect(response.series.updatedAt).not.toBe(Number.MAX_SAFE_INTEGER);
  });
});
