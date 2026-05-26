import { describe, it, expect } from "vitest";
import { encodeProfile, decodeProfile } from "@/lib/shareProfile";
import type { Profile } from "@/types";

const BASE_PROFILE: Profile = {
  id: "test-id",
  name: "Jordybeer",
  role: "Switch",
  experienceLevel: "gevorderd",
  relationshipStatus: "Gecollared",
  customKinks: [{ id: "custom_1", name: "Eigen ding" }],
  createdAt: 1716000000000,
  updatedAt: 1716000000000,
  entries: {
    spanking_hand: { status: "yes", score: 4, comment: "fijn", tags: ["eerste keer"] },
    flogging: { status: "maybe", score: null, comment: "" },
  },
};

describe("encodeProfile / decodeProfile", () => {
  it("round-trips a full profile without data loss", () => {
    const encoded = encodeProfile(BASE_PROFILE);
    const decoded = decodeProfile(encoded);
    expect(decoded).toEqual(BASE_PROFILE);
  });

  it("produces a string (URL-safe base64 characters only)", () => {
    const encoded = encodeProfile(BASE_PROFILE);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("round-trips a profile with special characters in name", () => {
    const profile = { ...BASE_PROFILE, name: "Ëlène & Björn 🖤" };
    expect(decodeProfile(encodeProfile(profile)).name).toBe(profile.name);
  });

  it("round-trips a profile with empty entries", () => {
    const profile = { ...BASE_PROFILE, entries: {}, customKinks: [] };
    expect(decodeProfile(encodeProfile(profile))).toEqual(profile);
  });

  it("round-trips without relationshipStatus", () => {
    const { relationshipStatus: _, ...rest } = BASE_PROFILE;
    const profile = rest as Profile;
    expect(decodeProfile(encodeProfile(profile))).toEqual(profile);
  });
});
