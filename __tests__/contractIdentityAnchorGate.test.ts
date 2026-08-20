import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types";
import {
  generateProfileOwnerKey,
  signProfileConsent,
} from "@/lib/consentProof";
import {
  contractPairKey,
  contractParticipantFromProfile,
  contractSummaryFromContent,
  hashContractContent,
  type ContractSeries,
  type ContractVersionContent,
} from "@/lib/contractLifecycle";
import {
  createContractRequest,
  createContractResponse,
  resolveContractCounterpartyIdentityTrust,
  verifyContractRequest,
} from "@/lib/contractProtocol";
import { createProfileIdentityAnchor } from "@/lib/profileIdentityTrust";
import {
  persistProfileIdentityAnchor,
  PROFILE_IDENTITY_ANCHOR_STORAGE_KEY,
  type ProfileIdentityAnchorLock,
} from "@/lib/storeSecurity";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class MemoryLock implements ProfileIdentityAnchorLock {
  async runExclusive<T>(operation: () => T): Promise<T> {
    return operation();
  }
}

function profile(id: string, name: string, origin: "own" | "shared" = "own"): Profile {
  return {
    id,
    verificationCode: id === "phase5-a" ? "KS-7H3P-9Q2M-A4BC" : "KS-8J4R-5T6V-W7XY",
    name,
    role: id === "phase5-a" ? "Dominant" : "Submissive",
    experienceLevel: "ervaren",
    customKinks: [],
    entries: {},
    createdAt: 1,
    updatedAt: 1,
    origin,
    isImported: origin === "shared",
  };
}

async function sealedShared(source: Profile) {
  const key = await generateProfileOwnerKey(source.id);
  const signed = await signProfileConsent({ ...source, origin: "own", isImported: false }, key);
  return {
    profile: { ...source, origin: "shared" as const, isImported: true, consentProof: signed.proof },
    key: signed.ownerKey,
  };
}

function content(a: Profile, b: Profile): ContractVersionContent {
  const base: ContractVersionContent = {
    schema: 1,
    profileA: contractParticipantFromProfile(a),
    profileB: contractParticipantFromProfile(b),
    preamble: "Consent blijft doorlopend.",
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
  return {
    ...base,
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
  } as ContractVersionContent;
}

async function draftSeries(a: Profile, b: Profile): Promise<ContractSeries> {
  const body = content(a, b);
  const versionId = "phase5-version";
  return {
    id: "phase5-series",
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

function installStorage(storage: MemoryStorage): void {
  vi.stubGlobal("window", { localStorage: storage });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("contract first-activation identity anchor gate", () => {
  it("allows first activation to start only after the shared counterparty is identity-anchored", async () => {
    const storage = new MemoryStorage();
    installStorage(storage);
    const actor = profile("phase5-a", "Alex");
    const actorKey = await generateProfileOwnerKey(actor.id);
    const remote = await sealedShared(profile("phase5-b", "Sam", "shared"));
    const draft = await draftSeries(actor, remote.profile);

    await expect(createContractRequest({
      series: draft,
      action: "activate",
      actor,
      counterparty: remote.profile,
      ownerKey: actorKey,
    })).rejects.toThrow(/onafhankelijk de identiteit/i);

    const anchor = createProfileIdentityAnchor(
      remote.profile,
      remote.profile.consentProof!,
      1234,
      "source-device-fingerprint",
    );
    expect(await persistProfileIdentityAnchor(anchor, storage, new MemoryLock())).toBe(true);
    expect((await resolveContractCounterpartyIdentityTrust(remote.profile)).status).toBe("identity-anchored");

    const result = await createContractRequest({
      series: await draftSeries(actor, remote.profile),
      action: "activate",
      actor,
      counterparty: remote.profile,
      ownerKey: actorKey,
    });
    expect(result.envelope.request.action).toBe("activate");
  });

  it("blocks a signed-unanchored remote actor from first activation response with no bypass", async () => {
    const storage = new MemoryStorage();
    installStorage(storage);
    const actorSource = profile("phase5-a", "Alex");
    const actorKey = await generateProfileOwnerKey(actorSource.id);
    const signedActor = await signProfileConsent(actorSource, actorKey);
    const actor = { ...actorSource, consentProof: signedActor.proof };
    const trustedActor = { ...actor, origin: "shared" as const, isImported: true };
    const responder = profile("phase5-b", "Sam");
    const responderKey = await generateProfileOwnerKey(responder.id);
    const request = await createContractRequest({
      series: await draftSeries(actor, responder),
      action: "activate",
      actor,
      counterparty: responder,
      ownerKey: actorKey,
    });

    expect((await resolveContractCounterpartyIdentityTrust(trustedActor)).status).toBe("signed-unanchored");
    expect(await verifyContractRequest(request.envelope, trustedActor)).toBe(false);
    await expect(createContractResponse({
      envelope: request.envelope,
      trustedActor,
      responder,
      ownerKey: responderKey,
    })).rejects.toThrow(/ongeldig|contractgeschiedenis/i);
    expect(storage.getItem(PROFILE_IDENTITY_ANCHOR_STORAGE_KEY)).toBeNull();
  });

  it("allows the existing response flow after the remote actor is explicitly anchored", async () => {
    const storage = new MemoryStorage();
    installStorage(storage);
    const actorSource = profile("phase5-a", "Alex");
    const actorKey = await generateProfileOwnerKey(actorSource.id);
    const signedActor = await signProfileConsent(actorSource, actorKey);
    const actor = { ...actorSource, consentProof: signedActor.proof };
    const trustedActor = { ...actor, origin: "shared" as const, isImported: true };
    const anchor = createProfileIdentityAnchor(
      trustedActor,
      trustedActor.consentProof!,
      2345,
      "independent-channel-fingerprint",
    );
    expect(await persistProfileIdentityAnchor(anchor, storage, new MemoryLock())).toBe(true);
    const responder = profile("phase5-b", "Sam");
    const responderKey = await generateProfileOwnerKey(responder.id);
    const request = await createContractRequest({
      series: await draftSeries(actor, responder),
      action: "activate",
      actor,
      counterparty: responder,
      ownerKey: actorKey,
    });

    expect(await verifyContractRequest(request.envelope, trustedActor)).toBe(true);
    const response = await createContractResponse({
      envelope: request.envelope,
      trustedActor,
      responder,
      ownerKey: responderKey,
    });
    expect(response.series.status).toBe("active");
  });

  it("fails closed on identity-conflict even when the incoming actor is otherwise correctly signed", async () => {
    const storage = new MemoryStorage();
    installStorage(storage);
    const legitimateSource = profile("phase5-a", "Alex");
    const legitimateKey = await generateProfileOwnerKey(legitimateSource.id);
    const legitimateSigned = await signProfileConsent(legitimateSource, legitimateKey);
    const legitimateShared = {
      ...legitimateSource,
      origin: "shared" as const,
      isImported: true,
      consentProof: legitimateSigned.proof,
    };
    const anchor = createProfileIdentityAnchor(
      legitimateShared,
      legitimateShared.consentProof!,
      3456,
      "source-device-fingerprint",
    );
    expect(await persistProfileIdentityAnchor(anchor, storage, new MemoryLock())).toBe(true);

    const attackerKey = await generateProfileOwnerKey(legitimateSource.id);
    const attackerSigned = await signProfileConsent(legitimateSource, attackerKey);
    const attacker = { ...legitimateSource, consentProof: attackerSigned.proof };
    const attackerShared = { ...attacker, origin: "shared" as const, isImported: true };
    const responder = profile("phase5-b", "Sam");
    const request = await createContractRequest({
      series: await draftSeries(attacker, responder),
      action: "activate",
      actor: attacker,
      counterparty: responder,
      ownerKey: attackerKey,
    });

    expect((await resolveContractCounterpartyIdentityTrust(attackerShared)).status).toBe("identity-conflict");
    expect(await verifyContractRequest(request.envelope, attackerShared)).toBe(false);
  });
});
