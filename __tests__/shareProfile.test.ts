import { describe, it, expect } from "vitest";
import { encodeProfile, decodeProfile, encodeProfileCompact, decodeProfileCompact, decodeAny } from "@/lib/shareProfile";
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
    const { avatarDataUrl: _av, fetLifeUsername: _fl, ...base } = BASE_PROFILE;
    // score is deprecated and not encoded; null fields are stripped from entries
    const expected = {
      ...base,
      entries: {
        spanking_hand: { status: "yes", desire: 5, experienced: true, comment: "fijn", tags: ["eerste keer"] },
        flogging: { status: "maybe", desire: 3 },
      },
    };
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
    // null experienced is stripped from encoding; decodes as undefined (falsy)
    expect(decoded.entries.flogging.experienced).toBeFalsy();
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
    const decoded = decodeProfile(encodeProfile(profile));
    // score is deprecated and stripped; null fields are omitted from encoding
    expect(decoded.name).toBe(profile.name);
    expect(decoded.relationshipStatus).toBeUndefined();
    expect(decoded.entries.spanking_hand.status).toBe("yes");
    expect(decoded.entries.flogging.status).toBe("maybe");
  });
});

describe("encodeProfileCompact / decodeProfileCompact", () => {
  it("round-trips name, role, and experienceLevel", () => {
    const decoded = decodeProfileCompact(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.name).toBe("Jordybeer");
    expect(decoded.role).toBe("Switch");
    expect(decoded.experienceLevel).toBe("gevorderd");
  });

  it("round-trips all six status values", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      entries: {
        spanking_hand:     { status: "yes",     desire: null, experienced: null, score: null, comment: "" },
        flogging:          { status: "willing",  desire: null, experienced: null, score: null, comment: "" },
        caning:            { status: "maybe",    desire: null, experienced: null, score: null, comment: "" },
        cropping:          { status: "no",       desire: null, experienced: null, score: null, comment: "" },
        spanking_implement:{ status: "hard_no",  desire: null, experienced: null, score: null, comment: "" },
      },
    };
    const decoded = decodeProfileCompact(encodeProfileCompact(profile));
    expect(decoded.entries.spanking_hand.status).toBe("yes");
    expect(decoded.entries.flogging.status).toBe("willing");
    expect(decoded.entries.caning.status).toBe("maybe");
    expect(decoded.entries.cropping.status).toBe("no");
    expect(decoded.entries.spanking_implement.status).toBe("hard_no");
  });

  it("drops desire and experienced to keep QR url short", () => {
    const decoded = decodeProfileCompact(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.entries.spanking_hand.desire).toBeNull();
    expect(decoded.entries.spanking_hand.experienced).toBeNull();
    expect(decoded.entries.flogging.desire).toBeNull();
  });

  it("strips comments and tags (text doesn't travel via QR)", () => {
    const decoded = decodeProfileCompact(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.entries.spanking_hand.comment).toBe("");
    expect(decoded.entries.spanking_hand.tags).toBeUndefined();
  });

  it("round-trips custom kinks with status", () => {
    const decoded = decodeProfileCompact(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.customKinks).toHaveLength(1);
    expect(decoded.customKinks[0].name).toBe("Eigen ding");
  });

  it("marks decoded profile as imported", () => {
    const decoded = decodeProfileCompact(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.isImported).toBe(true);
  });

  it("includes fetLifeUsername when includeFetLife is true", () => {
    const decoded = decodeProfileCompact(encodeProfileCompact(BASE_PROFILE, { includeFetLife: true }));
    expect(decoded.fetLifeUsername).toBe("jordybeer");
  });

  it("strips fetLifeUsername by default", () => {
    const decoded = decodeProfileCompact(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.fetLifeUsername).toBeUndefined();
  });

  it("preserves null statuses as absent entries", () => {
    const profile: Profile = { ...BASE_PROFILE, entries: {} };
    const decoded = decodeProfileCompact(encodeProfileCompact(profile));
    expect(Object.keys(decoded.entries)).toHaveLength(0);
  });
});

describe("decodeAny", () => {
  it("decodes v1 profiles", () => {
    const decoded = decodeAny(encodeProfile(BASE_PROFILE));
    expect(decoded.name).toBe("Jordybeer");
  });

  it("decodes v2 compact profiles", () => {
    const decoded = decodeAny(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.name).toBe("Jordybeer");
    expect(decoded.entries.spanking_hand.status).toBe("yes");
  });
});
