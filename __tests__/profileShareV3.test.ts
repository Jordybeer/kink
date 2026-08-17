import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { encodeProfile } from "@/lib/shareProfile";
import { deriveProfileVerificationCode } from "@/lib/profileVerification";
import {
  decodeProfileV3,
  decodeSharedProfile,
  encodeProfileV3,
  isProfileV3,
  MAX_PROFILE_SHARE_INFLATED_BYTES,
} from "@/lib/profileShareV3";

const profile: Profile = {
  id: "profile-1",
  verificationCode: "KS-7H3P-9Q2M-A4BC",
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

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function compressRawJson(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream("deflate"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return "3d." + bytesToBase64Url(compressed);
}

describe("lossless profile share v3", () => {
  it("round-trips every shareable field and excludes private/local-only data", async () => {
    const encoded = await encodeProfileV3(profile, { includeFetLife: true });
    expect(isProfileV3(encoded)).toBe(true);
    const decoded = await decodeSharedProfile(encoded);

    expect(decoded.name).toBe(profile.name);
    expect(decoded.verificationCode).toBe(profile.verificationCode);
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

  it("cannot export private answers even when an untyped caller asks for them", async () => {
    const opts = {
      includeFetLife: true,
      includePrivateResponses: true,
    } as Parameters<typeof encodeProfileV3>[1];
    const encoded = await encodeProfileV3(profile, opts);
    const decoded = await decodeSharedProfile(encoded);
    expect(decoded.entries.hidden).toBeUndefined();
    expect(decoded.entries["custom-private"]).toBeUndefined();
    expect(decoded.customKinks.some((kink) => kink.id === "custom-private")).toBe(false);
  });

  it("keeps FetLife opt-in", async () => {
    const encoded = await encodeProfileV3(profile);
    const decoded = await decodeSharedProfile(encoded);
    expect(decoded.fetLifeUsername).toBeUndefined();
  });

  it("round-trips retired split answers by id without inventing replacement answers", async () => {
    const beforeSplit: Profile = {
      ...profile,
      id: "pre-split-profile",
      customKinks: [],
      entries: {
        breeding_creampie: { status: "yes", comment: "oud gecombineerd antwoord" },
        luiers_gebruik: { status: "hard_no", comment: "oude samengestelde grens" },
      },
    };
    const decoded = await decodeSharedProfile(await encodeProfileV3(beforeSplit));

    expect(decoded.entries.breeding_creampie?.status).toBe("yes");
    expect(decoded.entries.luiers_gebruik?.status).toBe("hard_no");
    for (const inferredId of [
      "breeding_fantasy", "creampie", "diaper_wetting", "diaper_messing", "diaper_changing",
    ]) {
      expect(decoded.entries[inferredId]).toBeUndefined();
    }
  });

  it("rejects a compressed profile before inflation exceeds the mobile memory boundary", async () => {
    const encoded = await compressRawJson(JSON.stringify({
      v: 3,
      padding: "x".repeat(MAX_PROFILE_SHARE_INFLATED_BYTES + 1),
    }));
    await expect(decodeProfileV3(encoded)).rejects.toThrow("Profielcode is te groot");
  });

  it("still decodes legacy v1 links and deterministically backfills their code", async () => {
    const { verificationCode: _verificationCode, ...withoutCode } = profile;
    const legacy = encodeProfile(withoutCode as Profile, { includeFetLife: true });
    const decoded = await decodeSharedProfile(legacy);
    expect(decoded.name).toBe("Alex");
    expect(decoded.entries.rope.status).toBe("yes");
    expect(decoded.verificationCode).toBe(deriveProfileVerificationCode(profile.id));
  });
});
