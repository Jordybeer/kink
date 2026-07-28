import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { encodeProfile } from "@/lib/shareProfile";
import {
  decodeSharedProfile,
  encodeProfileV3,
  isProfileV3,
} from "@/lib/profileShareV3";

const profile: Profile = {
  id: "profile-1",
  name: "Alex",
  role: "Switch",
  relationshipStatus: "Open relatie",
  fetLifeUsername: "alex",
  bdsmtestUrl: "https://bdsmtest.org/result/example",
  bdsmtestScores: [{ role: "Switch", pct: 88 }],
  privateNote: "alleen lokaal",
  avatarDataUrl: "data:image/png;base64,AAAA",
  experienceLevel: "ervaren",
  customKinks: [
    { id: "custom-public", name: "Publieke eigen kink" },
    { id: "custom-private", name: "Geheime eigen kink" },
  ],
  createdAt: 100,
  updatedAt: 200,
  entries: {
    rope: {
      status: "yes",
      desire: 5,
      experienced: true,
      comment: "Alles wat deelbaar is",
      tags: ["vraag eerst", "langzaam"],
      curious: true,
    },
    hidden: {
      status: "hard_no",
      desire: 1,
      experienced: false,
      comment: "mag niet reizen",
      tags: ["privé"],
      curious: true,
      privateResponse: true,
    },
    "custom-public": {
      status: "maybe",
      desire: 3,
      experienced: false,
      comment: "eigen notitie",
      tags: ["bespreken"],
    },
    "custom-private": {
      status: "yes",
      comment: "geheime naam en status",
      privateResponse: true,
    },
  },
};

describe("lossless profile share v3", () => {
  it("round-trips every shareable field and excludes private/local-only data", async () => {
    const encoded = await encodeProfileV3(profile, { includeFetLife: true });
    expect(isProfileV3(encoded)).toBe(true);
    const decoded = await decodeSharedProfile(encoded);

    expect(decoded.name).toBe(profile.name);
    expect(decoded.role).toBe(profile.role);
    expect(decoded.relationshipStatus).toBe(profile.relationshipStatus);
    expect(decoded.fetLifeUsername).toBe(profile.fetLifeUsername);
    expect(decoded.bdsmtestUrl).toBe(profile.bdsmtestUrl);
    expect(decoded.bdsmtestScores).toEqual(profile.bdsmtestScores);
    expect(decoded.entries.rope).toEqual(profile.entries.rope);
    expect(decoded.entries["custom-public"]).toEqual(profile.entries["custom-public"]);
    expect(decoded.entries.hidden).toBeUndefined();
    expect(decoded.entries["custom-private"]).toBeUndefined();
    expect(decoded.customKinks).toEqual([{ id: "custom-public", name: "Publieke eigen kink" }]);
    expect(decoded.privateNote).toBeUndefined();
    expect(decoded.avatarDataUrl).toBeUndefined();
    expect(decoded.isImported).toBe(true);
  });

  it("keeps FetLife opt-in", async () => {
    const encoded = await encodeProfileV3(profile);
    const decoded = await decodeSharedProfile(encoded);
    expect(decoded.fetLifeUsername).toBeUndefined();
  });

  it("still decodes legacy v1 links", async () => {
    const legacy = encodeProfile(profile, { includeFetLife: true });
    const decoded = await decodeSharedProfile(legacy);
    expect(decoded.name).toBe("Alex");
    expect(decoded.entries.rope.status).toBe("yes");
  });
});
