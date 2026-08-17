import { beforeEach, describe, expect, it } from "vitest";
import { prepareBackupRestore } from "@/lib/backupRestore";
import { useContractStore } from "@/lib/contractStore";
import type { Profile } from "@/types";
import { generateProfileOwnerKey } from "@/lib/consentProof";
import {
  contractPairKey,
  contractParticipantFromProfile,
  contractSummaryFromContent,
  hashContractContent,
  signContractPayload,
  type ContractSeries,
  type ContractVersionContent,
} from "@/lib/contractLifecycle";

function series(updatedAt = 100): ContractSeries {
  return {
    id: "series-1",
    pairKey: "a|b",
    participants: [
      { profileId: "a", profileName: "A", role: "Dominant", verificationCode: "code-a" },
      { profileId: "b", profileName: "B", role: "Submissive", verificationCode: "code-b" },
    ],
    status: "active",
    createdAt: 50,
    updatedAt,
    currentVersionId: "version-1",
    versions: [{
      id: "version-1",
      number: 1,
      createdAt: 50,
      updatedAt,
      contentHash: "legacy:test",
      summary: { matchCount: 2, hardLimitCount: 1, softLimitCount: 1, discussCount: 0 },
      state: "signed",
      signatures: [],
      legacySnapshotId: "test",
    }],
    events: [],
  };
}

function profile(id: string, name: string): Profile {
  return {
    id,
    verificationCode: `code-${id}`,
    name,
    role: id === "a" ? "Dominant" : "Submissive",
    experienceLevel: "ervaren",
    customKinks: [],
    entries: {},
    createdAt: 1,
    updatedAt: 1,
  };
}

function contractContent(a: Profile, b: Profile): ContractVersionContent {
  return {
    schema: 1,
    profileA: contractParticipantFromProfile(a),
    profileB: contractParticipantFromProfile(b),
    preamble: "Ondertekende backup-test",
    createdAt: 50,
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

async function signedSeries(): Promise<ContractSeries> {
  const a = profile("a", "A");
  const b = profile("b", "B");
  const content = contractContent(a, b);
  const keyA = await generateProfileOwnerKey(a.id);
  const keyB = await generateProfileOwnerKey(b.id);
  const signatures = [
    await signContractPayload(content, a.id, keyA),
    await signContractPayload(content, b.id, keyB),
  ];
  const participants = [a, b].map((candidate) => {
    const participant = contractParticipantFromProfile(candidate);
    const proof = signatures.find((item) => item.profileId === candidate.id)!;
    return { ...participant, keyId: proof.keyId, publicKeyJwk: proof.publicKeyJwk };
  }) as ContractSeries["participants"];

  return {
    id: "modern-series",
    pairKey: contractPairKey(a.id, b.id),
    participants,
    status: "active",
    createdAt: 50,
    updatedAt: 100,
    currentVersionId: "modern-version",
    versions: [{
      id: "modern-version",
      number: 1,
      createdAt: 50,
      updatedAt: 100,
      contentHash: await hashContractContent(content),
      content,
      summary: contractSummaryFromContent(content),
      state: "signed",
      signatures,
    }],
    events: [],
  };
}

beforeEach(() => {
  useContractStore.setState({ series: [], migratedLegacySnapshotIds: [] });
});

describe("contract-series backup restore", () => {
  it("rejects a signed contract whose backed-up content was changed after signing", async () => {
    const valid = await signedSeries();
    const tampered = structuredClone(valid);
    tampered.updatedAt = 999;
    tampered.versions[0].updatedAt = 999;
    tampered.versions[0].content!.preamble = "Aangepast na ondertekening";

    const prepared = await prepareBackupRestore({
      version: 3,
      source: "backup",
      profiles: [],
      contracts: [],
      profileOwnerKeys: [],
      contractSeries: [tampered],
    });

    expect(prepared.contractSeries).toHaveLength(0);
  });

  it("rejects forged signatures and a broken event-hash chain", async () => {
    const forgedSignature = await signedSeries();
    forgedSignature.versions[0].signatures[1].signature = "not-the-partner-signature";

    const malformedKey = await signedSeries();
    malformedKey.versions[0].signatures[1].publicKeyJwk = { kty: "definitely-not-a-key" };

    const brokenHistory = await signedSeries();
    brokenHistory.events = [{
      id: "event-1",
      type: "draft_created",
      createdAt: 60,
      actorProfileId: "a",
      actorName: "A",
      eventHash: "made-up-event-hash",
    }];

    for (const candidate of [forgedSignature, malformedKey, brokenHistory]) {
      const prepared = await prepareBackupRestore({
        version: 3,
        source: "backup",
        profiles: [],
        contracts: [],
        profileOwnerKeys: [],
        contractSeries: [candidate],
      });
      expect(prepared.contractSeries).toHaveLength(0);
    }
  });

  it("never turns restored active consent back on without a fresh local confirmation", async () => {
    const active = await signedSeries();
    expect(useContractStore.getState().restoreSeries([active])).toEqual({ added: 1, updated: 0, unchanged: 0 });
    expect(useContractStore.getState().series[0].status).toBe("paused");
  });

  it("sanitizes and returns contract series from an encrypted backup payload", async () => {
    const prepared = await prepareBackupRestore({
      version: 3,
      source: "backup",
      profiles: [],
      contracts: [],
      profileOwnerKeys: [],
      contractSeries: [series(), { id: "broken" }],
    });

    expect(prepared.contractSeries).toHaveLength(1);
    expect(prepared.contractSeries[0].id).toBe("series-1");
  });

  it("adds missing series, keeps newer local history and accepts a newer backup", () => {
    const restore = useContractStore.getState().restoreSeries;
    expect(restore([series(100)])).toEqual({ added: 1, updated: 0, unchanged: 0 });
    expect(restore([series(90)])).toEqual({ added: 0, updated: 0, unchanged: 1 });

    const newer = { ...series(150), status: "paused" as const };
    expect(restore([newer])).toEqual({ added: 0, updated: 1, unchanged: 0 });
    expect(useContractStore.getState().series[0].status).toBe("paused");
  });
});
