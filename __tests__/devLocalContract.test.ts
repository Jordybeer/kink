import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";
import {
  activeSignedContractForPair,
  contractPairKey,
  contractParticipantFromProfile,
  contractSummaryFromContent,
  hashContractContent,
  type ContractSeries,
} from "@/lib/contractLifecycle";
import type { ContractContentWithHandwriting } from "@/lib/contractHandwriting";
import {
  activateLocalDevContract,
  canSelfSignLocalDevContract,
  completeLocalDevContractAction,
} from "@/lib/devLocalContract";

function localProfile(id: string, name: string, role: string): Profile {
  return {
    id,
    verificationCode: `dev-${id}`,
    name,
    role,
    origin: "own",
    experienceLevel: "ervaren",
    customKinks: [],
    entries: {},
    createdAt: 1,
    updatedAt: 1,
  };
}

function content(profileA: Profile, profileB: Profile): ContractContentWithHandwriting {
  return {
    schema: 1,
    profileA: contractParticipantFromProfile(profileA),
    profileB: contractParticipantFromProfile(profileB),
    preamble: "Lokale dev-test met dezelfde contractinhoud.",
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
    handwrittenSignatures: {
      profileA: {
        schema: 1,
        width: 240,
        height: 80,
        bitmap: Buffer.alloc(2400, 0xaa).toString("base64url"),
        capturedAt: 100,
      },
      profileB: {
        schema: 1,
        width: 240,
        height: 80,
        bitmap: Buffer.alloc(2400, 0x55).toString("base64url"),
        capturedAt: 101,
      },
    },
  };
}

async function draftSeries(profileA: Profile, profileB: Profile): Promise<ContractSeries> {
  const body = content(profileA, profileB);
  return {
    id: "dev-series",
    pairKey: contractPairKey(profileA.id, profileB.id),
    participants: [
      contractParticipantFromProfile(profileA),
      contractParticipantFromProfile(profileB),
    ],
    status: "draft",
    createdAt: 100,
    updatedAt: 100,
    draftVersionId: "dev-version",
    versions: [{
      id: "dev-version",
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

describe("local dev contract signing", () => {
  it("runs the real activation, pause and resume protocol for two local profiles", async () => {
    const actor = localProfile("dev-a", "Alex", "Dominant");
    const responder = localProfile("dev-b", "Sam", "Submissive");
    const actorKey = await generateProfileOwnerKey(actor.id);
    const responderKey = await generateProfileOwnerKey(responder.id);
    actor.consentProof = (await signProfileConsent(actor, actorKey)).proof;
    responder.consentProof = (await signProfileConsent(responder, responderKey)).proof;

    expect(canSelfSignLocalDevContract(actor, responder)).toBe(true);
    const activated = await activateLocalDevContract({
      series: await draftSeries(actor, responder),
      actor,
      responder,
      actorKey,
      responderKey,
    });

    expect(activated.versionId).toBe("dev-version");
    expect(activated.series.status).toBe("active");
    expect(activated.series.pendingRequest).toBeUndefined();
    expect(activated.series.events.at(-1)?.type).toBe("receipt_confirmed");
    expect(activated.series.versions[0].state).toBe("signed");
    expect(activated.series.versions[0].signatures.map((proof) => proof.profileId).sort())
      .toEqual([actor.id, responder.id].sort());
    expect(activeSignedContractForPair([activated.series], actor.id, responder.id)?.id)
      .toBe(activated.series.id);

    const paused = await completeLocalDevContractAction({
      series: activated.series,
      action: "pause",
      actor,
      responder,
      actorKey,
      responderKey,
      reason: "Tijdelijk gepauzeerd",
      note: "Dev pauzetest",
    });
    expect(paused.series.status).toBe("paused");
    expect(paused.series.pendingRequest).toBeUndefined();
    expect(paused.series.events.at(-1)?.type).toBe("receipt_confirmed");

    const resumed = await completeLocalDevContractAction({
      series: paused.series,
      action: "resume",
      actor,
      responder,
      actorKey,
      responderKey,
    });
    expect(resumed.series.status).toBe("active");
    expect(resumed.series.pendingRequest).toBeUndefined();
    expect(resumed.series.events.at(-1)?.type).toBe("receipt_confirmed");
  });

  it("never treats an imported profile as locally self-signable", () => {
    const actor = localProfile("dev-a", "Alex", "Dominant");
    const responder = { ...localProfile("dev-b", "Sam", "Submissive"), origin: "shared" as const, isImported: true };
    expect(canSelfSignLocalDevContract(actor, responder)).toBe(false);
  });
});
