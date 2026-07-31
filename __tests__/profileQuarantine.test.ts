import { beforeEach, describe, expect, it } from "vitest";
import type { Profile, SceneRecord } from "@/types";
import { generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";
import { useStore } from "@/lib/store";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "shared-profile",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 2,
    entries: {
      rope: { status: "yes", comment: "langzaam" },
    },
    origin: "own",
    ...overrides,
  };
}

async function signedSharedProfile(): Promise<Profile> {
  const original = profile();
  const ownerKey = await generateProfileOwnerKey(original.id);
  const signed = await signProfileConsent(original, ownerKey);
  return {
    ...original,
    consentProof: signed.proof,
    origin: "shared",
    isImported: true,
    lockedAt: 3,
  };
}

beforeEach(() => {
  useStore.setState({
    ...useStore.getInitialState(),
    profiles: [],
    quarantinedProfiles: [],
    profileIntegrityStatus: "idle",
    scenes: [],
    pinnedProfileId: null,
  });
});

describe("imported profile quarantine", () => {
  it("keeps a valid signed imported profile active", async () => {
    const shared = await signedSharedProfile();
    useStore.setState({ profiles: [shared] });

    const result = await useStore.getState().verifyImportedProfiles();

    expect(result.quarantined).toBe(0);
    expect(useStore.getState().profiles).toEqual([shared]);
    expect(useStore.getState().quarantinedProfiles).toEqual([]);
  });

  it("moves a manipulated imported profile out of every active workflow", async () => {
    const shared = await signedSharedProfile();
    const tampered: Profile = {
      ...shared,
      entries: {
        rope: { status: "hard_no", comment: "gewijzigd zonder sleutel" },
      },
    };
    const scene: SceneRecord = {
      id: "sealed-scene",
      title: "Bestaande afspraak",
      profileAId: tampered.id,
      profileBId: "other",
      profileAName: tampered.name,
      profileBName: "Partner",
      items: [],
      status: "planned",
      createdAt: 1,
      updatedAt: 1,
    };
    useStore.setState({ profiles: [tampered], scenes: [scene], pinnedProfileId: tampered.id });

    const result = await useStore.getState().verifyImportedProfiles();

    expect(result.quarantined).toBe(1);
    expect(useStore.getState().profiles).toEqual([]);
    expect(useStore.getState().quarantinedProfiles[0].profile.id).toBe(tampered.id);
    expect(useStore.getState().pinnedProfileId).toBeNull();
    expect(useStore.getState().scenes).toEqual([scene]);
  });

  it("keeps unsigned legacy imports active instead of pretending they were verified", async () => {
    const legacy = profile({ origin: "shared", isImported: true, consentProof: undefined });
    useStore.setState({ profiles: [legacy] });

    await useStore.getState().verifyImportedProfiles();

    expect(useStore.getState().profiles).toEqual([legacy]);
    expect(useStore.getState().quarantinedProfiles).toEqual([]);
  });

  it("restores a quarantined profile only from the same signed source", async () => {
    const shared = await signedSharedProfile();
    const tampered: Profile = {
      ...shared,
      entries: { rope: { status: "hard_no", comment: "tampered" } },
    };
    useStore.setState({ profiles: [tampered] });
    await useStore.getState().verifyImportedProfiles();
    expect(useStore.getState().quarantinedProfiles).toHaveLength(1);

    useStore.getState().importProfiles([shared]);
    await useStore.getState().verifyImportedProfiles();

    expect(useStore.getState().profiles).toHaveLength(1);
    expect(useStore.getState().profiles[0].entries.rope.status).toBe("yes");
    expect(useStore.getState().quarantinedProfiles).toEqual([]);
  });

  it("does not let a new key claim a quarantined profile identity", async () => {
    const shared = await signedSharedProfile();
    const tampered: Profile = {
      ...shared,
      entries: { rope: { status: "hard_no", comment: "tampered" } },
    };
    useStore.setState({ profiles: [tampered] });
    await useStore.getState().verifyImportedProfiles();

    const forgedBase = profile();
    const forgedKey = await generateProfileOwnerKey(forgedBase.id);
    const forged = await signProfileConsent(forgedBase, forgedKey);
    useStore.getState().importProfiles([{
      ...forgedBase,
      consentProof: forged.proof,
      origin: "shared",
      isImported: true,
    }]);
    await useStore.getState().verifyImportedProfiles();

    expect(useStore.getState().profiles).toEqual([]);
    expect(useStore.getState().quarantinedProfiles).toHaveLength(1);
  });
});
