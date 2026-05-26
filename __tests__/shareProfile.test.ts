import { describe, it, expect } from "vitest";
import { encodeProfile, decodeProfile } from "@/lib/shareProfile";
import type { Profile } from "@/types";

const BASE_PROFILE: Profile = {
  id: "test-id",
  name: "Jordybeer",
  role: "Switch",
  experienceLevel: "gevorderd",
  relationshipStatus: "Gecollared",
  fetLifeUsername: "jordybeer",
  avatarDataUrl: "data:image/jpeg;base64,/9j/fake",
  customKinks: [{ id: "custom_1", name: "Eigen ding" }],
  createdAt: 1716000000000,
  updatedAt: 1716000000000,
  entries: {
    spanking_hand: { status: "yes", desire: 5, experienced: true, score: 4, comment: "fijn", tags: ["eerste keer"] },
    flogging: { status: "maybe", desire: 3, experienced: null, score: null, comment: "" },
  },
};

describe("encodeProfile / decodeProfile", () => {
  it("round-trips a full profile without data loss (avatar + FL stripped by default)", () => {
    const { avatarDataUrl: _av, fetLifeUsername: _fl, ...expected } = BASE_PROFILE;
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE));
    expect(decoded).toEqual(expected);
  });

  it("always strips avatarDataUrl from encoded output", () => {
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE));
    expect((decoded as Profile & { avatarDataUrl?: string }).avatarDataUrl).toBeUndefined();
  });

  it("strips fetLifeUsername by default", () => {
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE));
    expect(decoded.fetLifeUsername).toBeUndefined();
  });

  it("includes fetLifeUsername when includeFetLife is true", () => {
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE, { includeFetLife: true }));
    expect(decoded.fetLifeUsername).toBe("jordybeer");
  });

  it("produces a string", () => {
    const encoded = encodeProfile(BASE_PROFILE);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("round-trips desire and experienced fields", () => {
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE));
    expect(decoded.entries.spanking_hand.desire).toBe(5);
    expect(decoded.entries.spanking_hand.experienced).toBe(true);
    expect(decoded.entries.flogging.desire).toBe(3);
    expect(decoded.entries.flogging.experienced).toBeNull();
  });

  it("round-trips a profile with special characters in name", () => {
    const profile = { ...BASE_PROFILE, name: "Ëlène & Björn 🖤" };
    expect(decodeProfile(encodeProfile(profile)).name).toBe(profile.name);
  });

  it("round-trips a profile with empty entries", () => {
    const { avatarDataUrl: _av, fetLifeUsername: _fl, ...base } = BASE_PROFILE;
    const profile = { ...base, entries: {}, customKinks: [] };
    expect(decodeProfile(encodeProfile(profile))).toEqual(profile);
  });

  it("round-trips without relationshipStatus", () => {
    const { relationshipStatus: _rs, avatarDataUrl: _av, fetLifeUsername: _fl, ...rest } = BASE_PROFILE;
    const profile = rest as Profile;
    expect(decodeProfile(encodeProfile(profile))).toEqual(profile);
  });
});
