import { describe, expect, it } from "vitest";
import type { Profile, ProfileOwnerKey } from "@/types";
import { generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";
import { decodeSwitchProfileShare, encodeSwitchProfileShareTransport } from "@/lib/profileSwitchShare";

function profile(
  id: string,
  role: "Dominant" | "Submissive",
  perspective: "dominant" | "submissive",
  bdsmtestUrl?: string,
): Profile {
  return {
    id,
    verificationCode: perspective === "dominant" ? "KS-SWITCH-DOM-01" : "KS-SWITCH-SUB-02",
    name: "Alex",
    role,
    personGroupId: "local-switch",
    perspective,
    origin: "own",
    experienceLevel: "gevorderd",
    customKinks: [],
    createdAt: 100,
    updatedAt: 200,
    entries: {},
    ...(bdsmtestUrl ? {
      bdsmtestUrl,
      bdsmtestScores: [{ role: perspective === "dominant" ? "Rigger" : "Rope bunny", pct: 91 }],
    } : {}),
  };
}

async function seal(source: Profile): Promise<{ profile: Profile; key: ProfileOwnerKey }> {
  const key = await generateProfileOwnerKey(source.id);
  const signed = await signProfileConsent(source, key);
  return { profile: { ...source, consentProof: signed.proof }, key: signed.ownerKey };
}

async function sourceSwitch() {
  const dominant = await seal(profile("switch-dom", "Dominant", "dominant", "https://bdsmtest.org/r/dom-result"));
  const submissive = await seal(profile("switch-sub", "Submissive", "submissive", "https://bdsmtest.org/r/sub-result"));
  return {
    dominant: dominant.profile,
    submissive: submissive.profile,
    ownerKeys: [dominant.key, submissive.key],
  };
}

describe("Switch optional BDSMTest disclosure", () => {
  it("redacts both perspectives by default even though both source profiles contain scores", async () => {
    const source = await sourceSwitch();
    const transport = await encodeSwitchProfileShareTransport(source.dominant, source.submissive, {
      ownerKeys: source.ownerKeys,
    });
    const decoded = await decodeSwitchProfileShare(transport.encoded);

    expect(decoded[0].bdsmtestUrl).toBeUndefined();
    expect(decoded[0].bdsmtestScores).toBeUndefined();
    expect(decoded[1].bdsmtestUrl).toBeUndefined();
    expect(decoded[1].bdsmtestScores).toBeUndefined();
  });

  it("shares each perspective's own result only after explicit opt-in", async () => {
    const source = await sourceSwitch();
    const transport = await encodeSwitchProfileShareTransport(source.dominant, source.submissive, {
      ownerKeys: source.ownerKeys,
      includeBdsmtest: true,
    });
    const decoded = await decodeSwitchProfileShare(transport.encoded);

    expect(decoded[0].perspective).toBe("dominant");
    expect(decoded[0].bdsmtestUrl).toBe("https://bdsmtest.org/r/dom-result");
    expect(decoded[0].bdsmtestScores).toEqual([{ role: "Rigger", pct: 91 }]);
    expect(decoded[1].perspective).toBe("submissive");
    expect(decoded[1].bdsmtestUrl).toBe("https://bdsmtest.org/r/sub-result");
    expect(decoded[1].bdsmtestScores).toEqual([{ role: "Rope bunny", pct: 91 }]);
  });
});
