import { beforeEach, describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { useStore } from "@/lib/store";
import { generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";

function ownProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "restore-owner",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Owner",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 10,
    entries: {
      rope: { status: "yes", comment: "rustig" },
    },
    origin: "own",
    isImported: false,
    ...overrides,
  };
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe("backup ownership restoration", () => {
  it("restores editability without rolling a newer imported copy back", async () => {
    const raw = ownProfile();
    const key = await generateProfileOwnerKey(raw.id);
    const signed = await signProfileConsent(raw, key);
    const backup = { ...raw, consentProof: signed.proof };
    const newerImported: Profile = {
      ...backup,
      updatedAt: 20,
      privateNote: "Nieuwere lokale context blijft bewaard",
      origin: "shared",
      isImported: true,
      lockedAt: 20,
    };
    useStore.setState({ profiles: [newerImported], profileOwnerKeys: [] });

    const result = useStore.getState().restoreBackupProfiles([backup], [signed.ownerKey]);
    const restored = useStore.getState().profiles[0];

    expect(result.updated).toBe(1);
    expect(result.ownerKeysAdded).toBe(1);
    expect(restored.updatedAt).toBe(20);
    expect(restored.privateNote).toBe("Nieuwere lokale context blijft bewaard");
    expect(restored.origin).toBe("own");
    expect(restored.isImported).toBe(false);
    expect(restored.lockedAt).toBeUndefined();
    expect(useStore.getState().profileOwnerKeys).toEqual([signed.ownerKey]);

    useStore.getState().renameProfile(restored.id, "Bewerkbaar", restored.role, restored.experienceLevel);
    expect(useStore.getState().profiles[0].name).toBe("Bewerkbaar");
  });

  it("keeps supporting unsigned legacy owner backups", () => {
    const legacy = ownProfile({ id: "legacy-owner", consentProof: undefined });

    const result = useStore.getState().restoreBackupProfiles([legacy], []);

    expect(result.added).toBe(1);
    expect(result.conflicts).toBe(0);
    expect(useStore.getState().profiles[0].origin).toBe("own");
    useStore.getState().renameProfile(legacy.id, "Legacy bewerkbaar", legacy.role, legacy.experienceLevel);
    expect(useStore.getState().profiles[0].name).toBe("Legacy bewerkbaar");
  });

  it("rejects a signed owner backup when the supplied private key belongs to another source", async () => {
    const raw = ownProfile();
    const correctKey = await generateProfileOwnerKey(raw.id);
    const signed = await signProfileConsent(raw, correctKey);
    const wrongKey = await generateProfileOwnerKey(raw.id);

    const result = useStore.getState().restoreBackupProfiles(
      [{ ...raw, consentProof: signed.proof }],
      [wrongKey],
    );

    expect(result.conflicts).toBe(1);
    expect(useStore.getState().profiles).toEqual([]);
    expect(useStore.getState().profileOwnerKeys).toEqual([]);
  });
});
