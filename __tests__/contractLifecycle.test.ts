import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";
import {
  contractBucket,
  activeSignedContractForPair,
  contractParticipantFromProfile,
  contractSummaryFromContent,
  contractPairKey,
  countCurrentContractsForProfile,
  hashContractContent,
  signContractPayload,
  verifyContractProof,
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
import {
  addContractQrPart,
  buildContractQrFrames,
  decodeContractEnvelope,
  encodeContractEnvelope,
  parseContractQrValue,
} from "@/lib/contractQr";

function profile(id: string, name: string, origin: "own" | "shared" = "own", personGroupId?: string): Profile {
  return {
    id,
    verificationCode: `code-${id}`,
    name,
    role: id.includes("dom") ? "Dominant" : "Submissive",
    ...(personGroupId ? { personGroupId } : {}),
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

function content(a: Profile, b: Profile): ContractVersionContent {
  return {
    schema: 1,
    profileA: contractParticipantFromProfile(a),
    profileB: contractParticipantFromProfile(b),
    preamble: "Wij bevestigen dat consent doorlopend blijft.",
    createdAt: 100,
    signalsA: { green: "groen", amber: "oranje", red: "rood", black: "zwart" },
    signalsB: { green: "groen", amber: "oranje", red: "rood", black: "zwart" },
    aftercareA: ["Knuffelen"],
    aftercareB: ["Water"],
    shared: [{ name: "Bondage", statusA: "yes", statusB: "willing" }],
    softLimits: [],
    hardLimits: [{ name: "Needles", who: b.name }],
    hardLimitDetails: [{ name: "Needles", statusA: "no", statusB: "hard_no" }],
    discuss: [{ name: "Blindfold", statusA: "maybe", statusB: "yes" }],
  };
}

async function draftSeries(a: Profile, b: Profile): Promise<ContractSeries> {
  const body = content(a, b);
  const versionId = "version-1";
  return {
    id: "series-1",
    pairKey: contractPairKey(a.id, b.id),
    participants: [contractParticipantFromProfile(a), contractParticipantFromProfile(b)],
    status: "draft",
    createdAt: 100,
    updatedAt: 100,
    draftVersionId: versionId,
    versions: [{
      id: versionId,
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

describe("contract lifecycle", () => {
  it("only lets a current mutually signed active series satisfy a pair gate", async () => {
    const a = profile("a-dom", "A");
    const b = profile("b-sub", "B");
    const keyA = await generateProfileOwnerKey(a.id);
    const keyB = await generateProfileOwnerKey(b.id);
    const active = await draftSeries(a, b);
    const version = active.versions[0];
    version.state = "signed";
    version.signatures = [
      await signContractPayload(version.content!, a.id, keyA),
      await signContractPayload(version.content!, b.id, keyB),
    ];
    active.participants = active.participants.map((participant) => {
      const proof = version.signatures.find((signature) => signature.profileId === participant.profileId)!;
      return { ...participant, keyId: proof.keyId, publicKeyJwk: proof.publicKeyJwk };
    }) as ContractSeries["participants"];
    active.status = "active";
    active.currentVersionId = version.id;
    active.draftVersionId = undefined;

    expect(activeSignedContractForPair([active], a.id, b.id)?.id).toBe(active.id);
    expect(activeSignedContractForPair([{ ...active, status: "stopped" }], a.id, b.id)).toBeUndefined();

    const legacy = structuredClone(active);
    legacy.versions[0].content = undefined;
    legacy.versions[0].signatures = [];
    legacy.versions[0].legacySnapshotId = "legacy-snapshot";
    expect(activeSignedContractForPair([legacy], a.id, b.id)).toBeUndefined();
  });

  it("groups role profiles as one person for the profile badge while keeping exact pair series separate", async () => {
    const me = profile("me-dom", "Jordy");
    const partnerDom = profile("noiva-dom", "Noiva", "shared", "noiva");
    const partnerSub = profile("noiva-sub", "Noiva", "shared", "noiva");
    const first = await draftSeries(me, partnerDom);
    const second = { ...(await draftSeries(me, partnerSub)), id: "series-2", pairKey: contractPairKey(me.id, partnerSub.id) };
    first.status = "active";
    first.currentVersionId = first.draftVersionId;
    first.draftVersionId = undefined;
    second.status = "paused";
    second.currentVersionId = second.draftVersionId;
    second.draftVersionId = undefined;

    expect(countCurrentContractsForProfile([first, second], partnerDom, [me, partnerDom, partnerSub])).toBe(2);
    expect(first.pairKey).not.toBe(second.pairKey);
  });

  it("archives a series when a participant profile disappears", async () => {
    const a = profile("a-dom", "A");
    const b = profile("b-sub", "B", "shared");
    const series = await draftSeries(a, b);
    series.status = "active";
    series.currentVersionId = series.draftVersionId;
    series.draftVersionId = undefined;
    expect(contractBucket(series, [a, b])).toBe("active");
    expect(contractBucket(series, [a])).toBe("archive");
  });

  it("binds the timestamp and profile identity into a contract proof", async () => {
    const a = profile("a-dom", "A");
    const key = await generateProfileOwnerKey(a.id);
    const body = content(a, profile("b-sub", "B"));
    const proof = await signContractPayload(body, a.id, key);
    expect(await verifyContractProof(body, proof)).toBe(true);
    expect(await verifyContractProof({ ...body, preamble: "gewijzigd" }, proof)).toBe(false);
    expect(await verifyContractProof(body, { ...proof, signedAt: proof.signedAt + 1 })).toBe(false);
  });

  it("rejects a request that claims a known profile id with an unrelated signing key", async () => {
    const trustedActor = profile("a-dom", "A", "shared");
    const trustedKey = await generateProfileOwnerKey(trustedActor.id);
    trustedActor.consentProof = (await signProfileConsent(trustedActor, trustedKey)).proof;

    const impersonator = profile("a-dom", "A");
    const rogueKey = await generateProfileOwnerKey(impersonator.id);
    const responder = profile("b-sub", "B");
    const responderKey = await generateProfileOwnerKey(responder.id);
    const draft = await draftSeries(impersonator, responder);
    const request = await createContractRequest({
      series: draft,
      action: "activate",
      actor: impersonator,
      counterparty: responder,
      ownerKey: rogueKey,
    });

    expect(await verifyContractRequest(request.envelope, trustedActor)).toBe(false);
    await expect(createContractResponse({
      envelope: request.envelope,
      trustedActor,
      responder,
      ownerKey: responderKey,
    })).rejects.toThrow("ongeldig of verlopen");
  });

  it("completes activation, pause acknowledgement and mutual resume through two-device proofs", async () => {
    const a = profile("a-dom", "A");
    const b = profile("b-sub", "B");
    const keyA = await generateProfileOwnerKey(a.id);
    const keyB = await generateProfileOwnerKey(b.id);
    a.consentProof = (await signProfileConsent(a, keyA)).proof;
    const draft = await draftSeries(a, b);

    const signing = await createContractRequest({ series: draft, action: "activate", actor: a, counterparty: b, ownerKey: keyA });
    expect(await verifyContractRequest(signing.envelope)).toBe(true);
    const signed = await createContractResponse({ envelope: signing.envelope, trustedActor: a, responder: b, ownerKey: keyB });
    const responderSeries = structuredClone(signed.series);
    signed.envelope.series!.status = "stopped";
    signed.envelope.series!.events = [];
    signed.envelope.series!.versions[0].summary.matchCount = 999;
    const active = await verifyAndApplyContractResponse({ currentSeries: signing.series, envelope: signed.envelope });
    expect(active.status).toBe("active");
    expect(active.events).toHaveLength(2);
    expect(active.versions[0].summary.matchCount).toBe(1);
    expect(active.versions[0].signatures).toHaveLength(2);

    const receipt = await createContractReceipt({
      series: active,
      request: signing.series.pendingRequest!,
      responseProof: signed.envelope.responderProof!,
      actor: a,
      ownerKey: keyA,
    });
    const finalizedResponder = await verifyAndApplyContractReceipt({
      currentSeries: responderSeries,
      envelope: receipt.envelope,
    });
    expect(receipt.series.events.at(-1)?.type).toBe("receipt_confirmed");
    expect(finalizedResponder.events.at(-1)?.type).toBe("receipt_confirmed");

    const pausing = await createContractRequest({
      series: active,
      action: "pause",
      actor: a,
      counterparty: b,
      ownerKey: keyA,
      reason: "Tijdelijk gepauzeerd",
      note: "Eerst opnieuw bespreken.",
    });
    expect(pausing.series.status).toBe("paused");
    const pauseAck = await createContractResponse({ envelope: pausing.envelope, trustedActor: a, responder: b, ownerKey: keyB });
    const paused = await verifyAndApplyContractResponse({ currentSeries: pausing.series, envelope: pauseAck.envelope });
    expect(paused.status).toBe("paused");
    expect(paused.events.some((event) => event.type === "pause_acknowledged")).toBe(true);

    const resuming = await createContractRequest({ series: paused, action: "resume", actor: a, counterparty: b, ownerKey: keyA });
    expect(resuming.series.status).toBe("resume_pending");
    const resumeAck = await createContractResponse({ envelope: resuming.envelope, trustedActor: a, responder: b, ownerKey: keyB });
    const resumed = await verifyAndApplyContractResponse({ currentSeries: resuming.series, envelope: resumeAck.envelope });
    expect(resumed.status).toBe("active");
    expect(resumed.events.at(-1)?.type).toBe("resumed");
  });

  it("rejects a receipt that points at a different response proof", async () => {
    const a = profile("a-dom", "A");
    const b = profile("b-sub", "B");
    const keyA = await generateProfileOwnerKey(a.id);
    const keyB = await generateProfileOwnerKey(b.id);
    a.consentProof = (await signProfileConsent(a, keyA)).proof;
    const draft = await draftSeries(a, b);
    const signing = await createContractRequest({ series: draft, action: "activate", actor: a, counterparty: b, ownerKey: keyA });
    const signed = await createContractResponse({ envelope: signing.envelope, trustedActor: a, responder: b, ownerKey: keyB });
    const active = await verifyAndApplyContractResponse({ currentSeries: signing.series, envelope: signed.envelope });
    const receipt = await createContractReceipt({
      series: active,
      request: signing.series.pendingRequest!,
      responseProof: signed.envelope.responderProof!,
      actor: a,
      ownerKey: keyA,
    });
    receipt.envelope.receipt = { ...receipt.envelope.receipt!, responderProofHash: "tampered" };

    await expect(verifyAndApplyContractReceipt({
      currentSeries: signed.series,
      envelope: receipt.envelope,
    })).rejects.toThrow("niet geldig ondertekend");
  });

  it("rejects a different responder key after that contract identity was pinned", async () => {
    const a = profile("a-dom", "A");
    const b = profile("b-sub", "B");
    const keyA = await generateProfileOwnerKey(a.id);
    const keyB = await generateProfileOwnerKey(b.id);
    const rogueKeyB = await generateProfileOwnerKey(b.id);
    a.consentProof = (await signProfileConsent(a, keyA)).proof;
    const draft = await draftSeries(a, b);
    const signing = await createContractRequest({ series: draft, action: "activate", actor: a, counterparty: b, ownerKey: keyA });
    const signed = await createContractResponse({ envelope: signing.envelope, trustedActor: a, responder: b, ownerKey: keyB });
    const active = await verifyAndApplyContractResponse({ currentSeries: signing.series, envelope: signed.envelope });
    const pausing = await createContractRequest({ series: active, action: "pause", actor: a, counterparty: b, ownerKey: keyA });

    await expect(createContractResponse({
      envelope: pausing.envelope,
      trustedActor: a,
      responder: b,
      ownerKey: rogueKeyB,
    })).rejects.toThrow("eerder bevestigde contractpartij");
  });

  it("round-trips large contract envelopes through multi-QR frames in any order", async () => {
    const a = profile("a-dom", "A");
    const b = profile("b-sub", "B");
    const key = await generateProfileOwnerKey(a.id);
    const draft = await draftSeries(a, b);
    draft.versions[0].content!.preamble = "x".repeat(5000);
    draft.versions[0].contentHash = await hashContractContent(draft.versions[0].content!);
    const request = await createContractRequest({ series: draft, action: "activate", actor: a, counterparty: b, ownerKey: key });
    const encoded = encodeContractEnvelope(request.envelope);
    const frames = buildContractQrFrames(encoded);
    expect(frames.length).toBeGreaterThan(1);

    let assembly = null;
    let completed = "";
    for (const frame of [...frames].reverse()) {
      const parsed = parseContractQrValue(frame.value);
      expect(parsed?.kind).toBe("part");
      if (!parsed || parsed.kind !== "part") continue;
      const result = addContractQrPart(assembly, parsed);
      if (result.status === "progress") assembly = result.assembly;
      if (result.status === "complete") completed = result.encoded;
    }
    expect(decodeContractEnvelope(completed).request.requestId).toBe(request.envelope.request.requestId);
  });

  it("rejects oversized single-frame and multipart contract input before assembly", () => {
    expect(parseContractQrValue(`KSC1:${"A".repeat(100_000)}`)).toBeNull();
    expect(parseContractQrValue(`KSC1P:abcdefgh.1.2.abcdefg.${"A".repeat(5_000)}`)).toBeNull();
  });
});
