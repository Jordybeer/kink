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
    spanking_hand: { status: "yes", desire: 5, experienced: true, score: 4, comment: "fijn", tags: ["eerste keer"], curious: true, privateResponse: true },
    flogging: { status: "maybe", desire: 3, experienced: null, score: null, comment: "" },
  },
};

describe("encodeProfile / decodeProfile", () => {
  it("round-trips a safe profile share (avatar, FL and private answers stripped by default)", () => {
    const { avatarDataUrl: _av, fetLifeUsername: _fl, ...base } = BASE_PROFILE;
    const expected = {
      ...base,
      entries: {
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

  it("round-trips visible desire and experienced fields", () => {
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE));
    expect(decoded.entries.spanking_hand).toBeUndefined();
    expect(decoded.entries.flogging.desire).toBe(3);
    expect(decoded.entries.flogging.experienced).toBeFalsy();
  });

  it("omits every field of a private house kink by default", () => {
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE));
    expect(decoded.entries.spanking_hand).toBeUndefined();
  });

  it("includes a private answer only after explicit share opt-in", () => {
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE, { includePrivateResponses: true }));
    expect(decoded.entries.spanking_hand).toEqual({
      status: "yes",
      desire: 5,
      experienced: true,
      comment: "fijn",
      tags: ["eerste keer"],
      curious: true,
      privateResponse: true,
    });
  });

  it("omits a private custom kink name and answer by default", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      entries: {
        ...BASE_PROFILE.entries,
        custom_1: { status: "willing", comment: "geheim", privateResponse: true },
      },
    };
    const decoded = decodeProfile(encodeProfile(profile));
    expect(decoded.customKinks).toEqual([]);
    expect(decoded.entries.custom_1).toBeUndefined();
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
    expect(decoded.name).toBe(profile.name);
    expect(decoded.relationshipStatus).toBeUndefined();
    expect(decoded.entries.spanking_hand).toBeUndefined();
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

  it("round-trips all five visible status values", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      entries: {
        spanking_hand:      { status: "yes",     desire: null, experienced: null, score: null, comment: "" },
        flogging:           { status: "willing", desire: null, experienced: null, score: null, comment: "" },
        caning:             { status: "maybe",   desire: null, experienced: null, score: null, comment: "" },
        cropping:           { status: "no",      desire: null, experienced: null, score: null, comment: "" },
        spanking_implement: { status: "hard_no", desire: null, experienced: null, score: null, comment: "" },
      },
    };
    const decoded = decodeProfileCompact(encodeProfileCompact(profile));
    expect(decoded.entries.spanking_hand.status).toBe("yes");
    expect(decoded.entries.flogging.status).toBe("willing");
    expect(decoded.entries.caning.status).toBe("maybe");
    expect(decoded.entries.cropping.status).toBe("no");
    expect(decoded.entries.spanking_implement.status).toBe("hard_no");
  });

  it("omits private house and custom kinks from a normal QR", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      entries: {
        ...BASE_PROFILE.entries,
        custom_1: { status: "willing", comment: "", privateResponse: true },
      },
    };
    const decoded = decodeProfileCompact(encodeProfileCompact(profile));
    expect(decoded.entries.spanking_hand).toBeUndefined();
    expect(decoded.entries.custom_1).toBeUndefined();
    expect(decoded.customKinks).toEqual([]);
  });

  it("round-trips private flags only after explicit QR opt-in", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      entries: {
        ...BASE_PROFILE.entries,
        custom_1: { status: "willing", comment: "", privateResponse: true },
      },
    };
    const decoded = decodeProfileCompact(encodeProfileCompact(profile, { includePrivateResponses: true }));
    expect(decoded.entries.spanking_hand.privateResponse).toBe(true);
    expect(decoded.entries.custom_1.privateResponse).toBe(true);
    expect(decoded.customKinks[0].name).toBe("Eigen ding");
  });

  it("drops desire and experienced to keep QR url short", () => {
    const decoded = decodeProfileCompact(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.entries.spanking_hand).toBeUndefined();
    expect(decoded.entries.flogging.desire).toBeNull();
  });

  it("strips comments and tags from visible QR answers", () => {
    const decoded = decodeProfileCompact(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.entries.flogging.comment).toBe("");
    expect(decoded.entries.flogging.tags).toBeUndefined();
  });

  it("round-trips visible custom kinks with status", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      entries: {
        ...BASE_PROFILE.entries,
        custom_1: { status: "willing", comment: "" },
      },
    };
    const decoded = decodeProfileCompact(encodeProfileCompact(profile));
    expect(decoded.customKinks).toHaveLength(1);
    expect(decoded.customKinks[0].name).toBe("Eigen ding");
    expect(decoded.entries.custom_1.status).toBe("willing");
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
  it("decodes safe v1 profiles without private answers", () => {
    const decoded = decodeAny(encodeProfile(BASE_PROFILE));
    expect(decoded.name).toBe("Jordybeer");
    expect(decoded.entries.spanking_hand).toBeUndefined();
  });

  it("decodes safe v2 compact profiles without private answers", () => {
    const decoded = decodeAny(encodeProfileCompact(BASE_PROFILE));
    expect(decoded.name).toBe("Jordybeer");
    expect(decoded.entries.spanking_hand).toBeUndefined();
    expect(decoded.entries.flogging.status).toBe("maybe");
  });
});

describe("legacy give/receive backward compat", () => {
  it("v2: collapses legacy sg/sr into status (worst-of logic)", () => {
    const legacyPayload = { v: 2, id: "x", n: "n", r: "r", e: "beginner", ca: 0, ua: 0,
      s: " ".repeat(100), sg: "y" + " ".repeat(99), sr: "n" + " ".repeat(99) };
    const encoded = btoa(JSON.stringify(legacyPayload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = decodeProfileCompact(encoded);
    expect(decoded.entries[Object.keys(decoded.entries)[0]]?.status).toBe("no");
  });

  it("v2: omits sg/sr arrays in new encodes", () => {
    const encoded = encodeProfileCompact(BASE_PROFILE);
    const raw = JSON.parse(atob(encoded));
    expect(raw.sg).toBeUndefined();
    expect(raw.sr).toBeUndefined();
    expect(raw.dr).toBeUndefined();
  });
});
