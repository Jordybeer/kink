import { describe, it, expect } from "vitest";
import { encodeProfile, decodeProfile, decodeProfileCompact, decodeAny } from "@/lib/shareProfile";
import { LEGACY_COMPACT_KINK_IDS_V2 } from "@/lib/legacyCompactCatalog";
import type { KinkEntry, Profile } from "@/types";

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
    latex_rubber: { status: "yes", desire: 5, experienced: true, score: 4, comment: "fijn", tags: ["eerste keer"], curious: true, privateResponse: true },
    lingerie: { status: "maybe", desire: 3, experienced: null, score: null, comment: "" },
  },
};

const LEGACY_STATUS_ENC: Record<NonNullable<KinkEntry["status"]>, string> = {
  yes: "y",
  willing: "g",
  maybe: "m",
  no: "n",
  hard_no: "H",
};

function legacyV2Fixture(
  profile: Profile,
  options: { includePrivateResponses?: boolean; includeFetLife?: boolean } = {},
): string {
  const mayShare = (entry: KinkEntry | undefined) =>
    options.includePrivateResponses === true || entry?.privateResponse !== true;
  const statusChars = LEGACY_COMPACT_KINK_IDS_V2.map((id) => {
    const entry = profile.entries[id];
    return mayShare(entry) && entry?.status ? LEGACY_STATUS_ENC[entry.status] : " ";
  }).join("");
  const privateChars = options.includePrivateResponses
    ? LEGACY_COMPACT_KINK_IDS_V2.map((id) => profile.entries[id]?.privateResponse ? "1" : " ").join("")
    : "";
  const customKinks = (profile.customKinks ?? []).filter((kink) => mayShare(profile.entries[kink.id]));
  const payload: Record<string, unknown> = {
    v: 2,
    id: profile.id,
    n: profile.name,
    r: profile.role,
    e: profile.experienceLevel,
    ca: profile.createdAt,
    ua: profile.updatedAt,
    s: statusChars,
  };
  if (privateChars.includes("1")) payload.p = privateChars;
  if (profile.relationshipStatus) payload.rs = profile.relationshipStatus;
  if (options.includeFetLife && profile.fetLifeUsername) payload.fl = profile.fetLifeUsername;
  if (customKinks.length) {
    payload.ck = customKinks.map((kink) => {
      const status = profile.entries[kink.id]?.status;
      return [kink.id, kink.name, status ? LEGACY_STATUS_ENC[status] : " "];
    });
  }
  if (options.includePrivateResponses) {
    const privateCustomIds = customKinks
      .filter((kink) => profile.entries[kink.id]?.privateResponse)
      .map((kink) => kink.id);
    if (privateCustomIds.length) payload.pk = privateCustomIds;
  }
  return btoa(JSON.stringify(payload));
}

describe("encodeProfile / decodeProfile", () => {
  it("round-trips a safe profile share (avatar, FL and private answers stripped by default)", () => {
    const { avatarDataUrl: _av, fetLifeUsername: _fl, ...base } = BASE_PROFILE;
    const expected = {
      ...base,
      entries: {
        lingerie: { status: "maybe", desire: 3 },
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
    expect(decoded.entries.latex_rubber).toBeUndefined();
    expect(decoded.entries.lingerie.desire).toBe(3);
    expect(decoded.entries.lingerie.experienced).toBeFalsy();
  });

  it("omits every field of a private house kink by default", () => {
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE));
    expect(decoded.entries.latex_rubber).toBeUndefined();
  });

  it("includes a private answer only after explicit share opt-in", () => {
    const decoded = decodeProfile(encodeProfile(BASE_PROFILE, { includePrivateResponses: true }));
    expect(decoded.entries.latex_rubber).toEqual({
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
    expect(decoded.entries.latex_rubber).toBeUndefined();
    expect(decoded.entries.lingerie.status).toBe("maybe");
  });
});

describe("legacy v2 compact decoder", () => {
  it("round-trips name, role, and experienceLevel", () => {
    const decoded = decodeProfileCompact(legacyV2Fixture(BASE_PROFILE));
    expect(decoded.name).toBe("Jordybeer");
    expect(decoded.role).toBe("Switch");
    expect(decoded.experienceLevel).toBe("gevorderd");
  });

  it("round-trips all five visible status values", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      entries: {
        latex_rubber: { status: "yes",     desire: null, experienced: null, score: null, comment: "" },
        lingerie:     { status: "willing", desire: null, experienced: null, score: null, comment: "" },
        uniforms:     { status: "maybe",   desire: null, experienced: null, score: null, comment: "" },
        feet:         { status: "no",      desire: null, experienced: null, score: null, comment: "" },
        leather:      { status: "hard_no", desire: null, experienced: null, score: null, comment: "" },
      },
    };
    const decoded = decodeProfileCompact(legacyV2Fixture(profile));
    expect(decoded.entries.latex_rubber.status).toBe("yes");
    expect(decoded.entries.lingerie.status).toBe("willing");
    expect(decoded.entries.uniforms.status).toBe("maybe");
    expect(decoded.entries.feet.status).toBe("no");
    expect(decoded.entries.leather.status).toBe("hard_no");
  });

  it("omits private house and custom kinks from a normal QR", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      entries: {
        ...BASE_PROFILE.entries,
        custom_1: { status: "willing", comment: "", privateResponse: true },
      },
    };
    const decoded = decodeProfileCompact(legacyV2Fixture(profile));
    expect(decoded.entries.latex_rubber).toBeUndefined();
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
    const decoded = decodeProfileCompact(legacyV2Fixture(profile, { includePrivateResponses: true }));
    expect(decoded.entries.latex_rubber.privateResponse).toBe(true);
    expect(decoded.entries.custom_1.privateResponse).toBe(true);
    expect(decoded.customKinks[0].name).toBe("Eigen ding");
  });

  it("drops desire and experienced to keep QR url short", () => {
    const decoded = decodeProfileCompact(legacyV2Fixture(BASE_PROFILE));
    expect(decoded.entries.latex_rubber).toBeUndefined();
    expect(decoded.entries.lingerie.desire).toBeNull();
  });

  it("strips comments and tags from visible QR answers", () => {
    const decoded = decodeProfileCompact(legacyV2Fixture(BASE_PROFILE));
    expect(decoded.entries.lingerie.comment).toBe("");
    expect(decoded.entries.lingerie.tags).toBeUndefined();
  });

  it("round-trips visible custom kinks with status", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      entries: {
        ...BASE_PROFILE.entries,
        custom_1: { status: "willing", comment: "" },
      },
    };
    const decoded = decodeProfileCompact(legacyV2Fixture(profile));
    expect(decoded.customKinks).toHaveLength(1);
    expect(decoded.customKinks[0].name).toBe("Eigen ding");
    expect(decoded.entries.custom_1.status).toBe("willing");
  });

  it("marks decoded profile as imported", () => {
    const decoded = decodeProfileCompact(legacyV2Fixture(BASE_PROFILE));
    expect(decoded.isImported).toBe(true);
  });

  it("includes fetLifeUsername when includeFetLife is true", () => {
    const decoded = decodeProfileCompact(legacyV2Fixture(BASE_PROFILE, { includeFetLife: true }));
    expect(decoded.fetLifeUsername).toBe("jordybeer");
  });

  it("strips fetLifeUsername by default", () => {
    const decoded = decodeProfileCompact(legacyV2Fixture(BASE_PROFILE));
    expect(decoded.fetLifeUsername).toBeUndefined();
  });

  it("preserves null statuses as absent entries", () => {
    const profile: Profile = { ...BASE_PROFILE, entries: {} };
    const decoded = decodeProfileCompact(legacyV2Fixture(profile));
    expect(Object.keys(decoded.entries)).toHaveLength(0);
  });
});

describe("decodeAny", () => {
  it("decodes safe v1 profiles without private answers", () => {
    const decoded = decodeAny(encodeProfile(BASE_PROFILE));
    expect(decoded.name).toBe("Jordybeer");
    expect(decoded.entries.latex_rubber).toBeUndefined();
  });

  it("decodes safe v2 compact profiles without private answers", () => {
    const decoded = decodeAny(legacyV2Fixture(BASE_PROFILE));
    expect(decoded.name).toBe("Jordybeer");
    expect(decoded.entries.latex_rubber).toBeUndefined();
    expect(decoded.entries.lingerie.status).toBe("maybe");
  });

  it("keeps additive v2 questionnaire metadata compatible with a full own-profile round trip", () => {
    const profile: Profile = {
      ...BASE_PROFILE,
      origin: "own",
      perspective: "dominant",
      questionnaireSetup: { mode: "dynamic", interests: ["bondage"], version: 2 },
    };
    const decoded = decodeAny(encodeProfile(profile, { includePrivateResponses: true }));
    expect(decoded.questionnaireSetup).toEqual({ mode: "dynamic", interests: ["bondage"], version: 2 });
    expect(decoded.entries.latex_rubber.status).toBe("yes");
    expect(decoded.isImported).toBe(true);
  });
});

describe("legacy give/receive backward compat", () => {
  it("v2: collapses legacy sg/sr into status (worst-of logic) on an active historical ID", () => {
    const historicalId = "latex_rubber";
    const index = LEGACY_COMPACT_KINK_IDS_V2.indexOf(historicalId);
    const at = (char: string) => " ".repeat(index) + char;
    const legacyPayload = { v: 2, id: "x", n: "n", r: "r", e: "beginner", ca: 0, ua: 0,
      s: " ".repeat(index + 1), sg: at("y"), sr: at("n") };
    const encoded = btoa(JSON.stringify(legacyPayload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = decodeProfileCompact(encoded);
    expect(decoded.entries[historicalId]?.status).toBe("no");
  });

  it("pins historic positions without consulting the active catalog", () => {
    expect(LEGACY_COMPACT_KINK_IDS_V2).toHaveLength(266);
    expect(new Set(LEGACY_COMPACT_KINK_IDS_V2).size).toBe(266);
    expect(LEGACY_COMPACT_KINK_IDS_V2[0]).toBe("spanking_hand");
    expect(LEGACY_COMPACT_KINK_IDS_V2.at(-1)).toBe("orgasme_op_commando");

    const historicalId = "filmen_prive";
    const index = LEGACY_COMPACT_KINK_IDS_V2.indexOf(historicalId);
    const statuses = `${" ".repeat(index)}H`;
    const encoded = btoa(JSON.stringify({
      v: 2, id: "historic", n: "Archive", r: "", e: "beginner", ca: 0, ua: 0, s: statuses,
    }));
    expect(decodeProfileCompact(encoded).entries[historicalId]?.status).toBe("hard_no");
  });
});
