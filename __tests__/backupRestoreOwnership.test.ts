import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { prepareBackupRestore } from "@/lib/backupRestore";
import { generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "owner",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: { rope: { status: "yes", comment: "" } },
    origin: "own",
    ...overrides,
  };
}

describe("encrypted backup ownership", () => {
  it("restores a signed profile as editable only with its matching private key", async () => {
    const original = profile();
    const key = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, key);
    const sealed = { ...original, consentProof: signed.proof };

    const owned = await prepareBackupRestore({
      source: "backup",
      profiles: [sealed],
      profileOwnerKeys: [signed.ownerKey],
    });
    expect(owned.profiles[0].origin).toBe("own");
    expect(owned.profiles[0].isImported).toBe(false);
    expect(owned.ownerKeys).toHaveLength(1);

    const withoutKey = await prepareBackupRestore({
      source: "backup",
      profiles: [sealed],
      profileOwnerKeys: [],
    });
    expect(withoutKey.profiles[0].origin).toBe("shared");
    expect(withoutKey.profiles[0].isImported).toBe(true);
  });

  it("keeps unsigned legacy own backups editable", async () => {
    const restored = await prepareBackupRestore({
      source: "backup",
      profiles: [profile()],
      profileOwnerKeys: [],
    });
    expect(restored.profiles[0].origin).toBe("own");
    expect(restored.profiles[0].isImported).toBe(false);
  });

  it("does not accept a private key belonging to another profile", async () => {
    const original = profile();
    const ownerKey = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, ownerKey);
    const wrongKey = await generateProfileOwnerKey("someone-else");

    const restored = await prepareBackupRestore({
      source: "backup",
      profiles: [{ ...original, consentProof: signed.proof }],
      profileOwnerKeys: [wrongKey],
    });
    expect(restored.profiles[0].origin).toBe("shared");
  });

  it("rejects a different keyId even when the profileId is identical", async () => {
    const original = profile();
    const ownerKey = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, ownerKey);
    const sameIdWrongKey = await generateProfileOwnerKey(original.id);

    const restored = await prepareBackupRestore({
      source: "backup",
      profiles: [{ ...original, consentProof: signed.proof }],
      profileOwnerKeys: [sameIdWrongKey],
    });
    expect(restored.profiles[0].origin).toBe("shared");
    expect(restored.ownerKeys).toEqual([]);
  });

  it("drops a signed profile whose answers were changed after signing", async () => {
    const original = profile({ origin: "shared", isImported: true });
    const key = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, key);
    const tampered: Profile = {
      ...original,
      consentProof: signed.proof,
      entries: { rope: { status: "hard_no", comment: "" } },
    };

    const restored = await prepareBackupRestore({
      source: "backup",
      profiles: [tampered],
      profileOwnerKeys: [],
    });
    expect(restored.profiles).toEqual([]);
  });
});
