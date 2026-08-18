import { describe, expect, it } from "vitest";
import type {
  ContractPendingRequest,
  ContractSeries,
  ContractSignatureProof,
  ContractVersionContent,
} from "@/lib/contractLifecycle";
import {
  CONTRACT_REQUEST_TTL_MS,
  authorizeContractRequestCreation,
  authorizeIncomingContractRequest,
} from "@/lib/contractStateMachine";

const PROOF = {
  profileId: "a",
  keyId: "key-a",
  publicKeyJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
  signedAt: 1,
  payloadHash: "hash",
  signature: "sig",
} as ContractSignatureProof;

function versionContent(profileAId: string, profileBId: string): ContractVersionContent {
  const participant = (profileId: string) => ({
    profileId,
    profileName: profileId,
    role: "role",
    verificationCode: profileId,
  });
  return {
    schema: 1,
    profileA: participant(profileAId),
    profileB: participant(profileBId),
    preamble: "p",
    createdAt: 1,
    signalsA: { green: "g", amber: "a", red: "r", black: "b" },
    signalsB: { green: "g", amber: "a", red: "r", black: "b" },
    aftercareA: [],
    aftercareB: [],
    shared: [],
    softLimits: [],
    hardLimits: [],
    hardLimitDetails: [],
    discuss: [],
  };
}

function draft(content: ContractVersionContent): ContractSeries {
  return {
    id: "series-1",
    pairKey: "a|b",
    participants: [
      { profileId: "a", profileName: "A", role: "Dominant", verificationCode: "a" },
      { profileId: "b", profileName: "B", role: "Submissive", verificationCode: "b" },
    ],
    status: "draft",
    createdAt: 1,
    updatedAt: 1,
    draftVersionId: "v2",
    versions: [{
      id: "v2",
      number: 2,
      createdAt: 1,
      updatedAt: 1,
      contentHash: "hash-v2",
      content,
      summary: { matchCount: 0, hardLimitCount: 0, softLimitCount: 0, discussCount: 0 },
      state: "draft",
      signatures: [],
    }],
    events: [],
  };
}

function request(now: number): ContractPendingRequest {
  return {
    requestId: "req",
    action: "activate",
    seriesId: "series-1",
    versionId: "v2",
    contentHash: "hash-v2",
    createdAt: now,
    expiresAt: now + CONTRACT_REQUEST_TTL_MS,
    actorProfileId: "a",
    counterpartyProfileId: "b",
    proof: PROOF,
  };
}

describe("contract participant lineage", () => {
  it("refuses to create an activation when signed-version participants are not the exact contract pair", () => {
    const series = draft(versionContent("a", "mallory"));
    expect(authorizeContractRequestCreation({
      series,
      action: "activate",
      actorProfileId: "a",
      counterpartyProfileId: "b",
      now: 1_000,
    })).toEqual({ ok: false, reason: "invalid_version" });
  });

  it("refuses a bootstrap activation whose transport version names a different participant", () => {
    const now = 1_000;
    const req = request(now);
    const transport = draft(versionContent("a", "mallory"));
    transport.status = "pending_signature";
    transport.pendingRequest = req;
    transport.versions[0].state = "pending_signature";
    transport.versions[0].signatures = [PROOF];
    transport.events = [{
      id: "request-event",
      type: "signature_added",
      createdAt: now,
      actorProfileId: "a",
      actorName: "A",
      counterpartyProfileId: "b",
      requestId: req.requestId,
      eventHash: "request-tail",
    }];

    expect(authorizeIncomingContractRequest({
      localSeries: null,
      transportSeries: transport,
      request: req,
      now,
    })).toEqual({ ok: false, reason: "invalid_version" });
  });
});
