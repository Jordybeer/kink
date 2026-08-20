import { describe, expect, it } from "vitest";
import type { Profile, ProfileConsentPayload, ProfileConsentProof } from "@/types";
import { encodeProfile } from "@/lib/shareProfile";
import { deriveProfileVerificationCode } from "@/lib/profileVerification";
import {
  canonicalJson,
  generateProfileOwnerKey,
  sha256Base64Url,
  signProfileConsent,
  verifyProfileConsent,
} from "@/lib/consentProof";
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
  bdsmtestUrl: "https://bdsmtest.org/r/example",
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

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function compressRawJson(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream("deflate"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return "3d." + bytesToBase64Url(compressed);
}

async function payloadFromV3(encoded: string): Promise<Record<string, unknown>> {
  const bytes = base64UrlToBytes(encoded.slice(3));
  if (encoded.startsWith("3r.")) {
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  }
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream("deflate"));
  return JSON.parse(new TextDecoder().decode(await new Response(stream).arrayBuffer())) as Record<string, unknown>;
}

function encodeRawPayload(payload: unknown): string {
  return "3r." + bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

async function sealed(source: Profile) {
  const key = await generateProfileOwnerKey(source.id);
  const signed = await signProfileConsent(source, key);
  return {
    profile: { ...source, consentProof: signed.proof },
    key: signed.ownerKey,
  };
}

async function legacySealed(source: Profile): Promise<Profile> {
  const ownerKey = await generateProfileOwnerKey(source.id);
  const payload: ProfileConsentPayload = {
    schema: 1,
    profileId: source.id,
    verificationCode: source.verificationCode!,
    name: source.name,
    role: source.role,
    experienceLevel: source.experienceLevel,
    ...(source.relationshipStatus ? { relationshipStatus: source.relationshipStatus } : {}),
    ...(source.bdsmtestUrl ? { bdsmtestUrl: source.bdsmtestUrl } : {}),
    ...(source.bdsmtestScores?.length ? { bdsmtestScores: source.bdsmtestScores } : {}),
    customKinks: [],
    entries: {},
  };
  const unsigned = {
    schema: 1 as const,
    algorithm: "ECDSA-P256-SHA256" as const,
    keyId: ownerKey.keyId,
    publicKeyJwk: ownerKey.publicKeyJwk,
    version: 1,
    signedAt: 123456789,
    payloadHash: await sha256Base64Url(canonicalJson(payload)),
  };
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    ownerKey.privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = bytesToBase64Url(new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(canonicalJson(unsigned)),
  )));
  const proofHash = await sha256Base64Url(canonicalJson({ ...unsigned, signature }));
  const proof: ProfileConsentProof = { ...unsigned, signature, proofHash };
  return { ...source, consentProof: proof };
}

describe("lossless profile share v3", () => {
  it("round-trips core shareable fields while external enrichments stay local by default", async () => {
    const encoded = await encodeProfileV3(profile, { includeFetLife: true });
    expect(isProfileV3(encoded)).toBe(true);
    const decoded = await decodeSharedProfile(encoded);

    expect(decoded.name).toBe(profile.name);
    expect(decoded.verificationCode).toBe(profile.verificationCode);
    expect(decoded.role).toBe(profile.role);
    expect(decoded.relationshipStatus).toBe(profile.relationshipStatus);
    expect(decoded.fetLifeUsername).toBe(profile.fetLifeUsername);
    expect(decoded.bdsmtestUrl).toBeUndefined();
    expect(decoded.bdsmtestScores).toBeUndefined();
    expect(decoded.entries.rope).toEqual(profile.entries.rope);
    expect(decoded.entries["custom-public"]).toEqual(profile.entries["custom-public"]);
    expect(decoded.entries.hidden).toBeUndefined();
    expect(decoded.entries["custom-private"]).toBeUndefined();
    expect(decoded.customKinks).toEqual([{ id: "custom-public", name: "Publieke eigen kink" }]);
    expect(decoded.privateNote).toBeUndefined();
    expect(decoded.avatarDataUrl).toBeUndefined();
    expect(decoded.isImported).toBe(true);
  });

  it("redacts BDSMTest from an already sealed profile without invalidating the transported core proof", async () => {
    const signed = await sealed(profile);
    const encoded = await encodeProfileV3(signed.profile, { profileOwnerKey: signed.key });
    const decoded = await decodeSharedProfile(encoded);

    expect(decoded.bdsmtestUrl).toBeUndefined();
    expect(decoded.bdsmtestScores).toBeUndefined();
    expect((await verifyProfileConsent(decoded)).status).toBe("valid");
  });

  it("shares BDSMTest only after explicit opt-in with a separate owner-key disclosure", async () => {
    const signed = await sealed(profile);
    const encoded = await encodeProfileV3(signed.profile, {
      includeBdsmtest: true,
      profileOwnerKey: signed.key,
    });
    const decoded = await decodeSharedProfile(encoded);

    expect(decoded.bdsmtestUrl).toBe("https://bdsmtest.org/r/example");
    expect(decoded.bdsmtestScores).toEqual([{ role: "Switch", pct: 88 }]);
    expect((await verifyProfileConsent(decoded)).status).toBe("valid");

    const payload = await payloadFromV3(encoded);
    expect(payload.bd).toMatchObject({
      schema: 1,
      profileId: profile.id,
      keyId: signed.profile.consentProof!.keyId,
      profileProofHash: signed.profile.consentProof!.proofHash,
    });
  });

  it("refuses explicit BDSMTest sharing when no owner key can sign the disclosure", async () => {
    await expect(encodeProfileV3(profile, { includeBdsmtest: true }))
      .rejects.toThrow(/bevestigde optionele openbaarmaking/i);
  });

  it("fails closed when the signed BDSMTest disclosure is changed", async () => {
    const signed = await sealed(profile);
    const encoded = await encodeProfileV3(signed.profile, {
      includeBdsmtest: true,
      profileOwnerKey: signed.key,
    });
    const payload = await payloadFromV3(encoded);
    const disclosure = payload.bd as { scores: Array<{ role: string; pct: number }> };
    disclosure.scores[0].pct = 87;

    await expect(decodeProfileV3(encodeRawPayload(payload)))
      .rejects.toThrow(/BDSMTest-openbaarmaking/i);
  });

  it("still accepts a legacy v3 proof that bound BDSMTest directly into the core profile", async () => {
    const legacy: Profile = {
      ...profile,
      id: "legacy-profile",
      verificationCode: "KS-LEGACY-0001",
      customKinks: [],
      entries: {},
      privateNote: undefined,
      avatarDataUrl: undefined,
      fetLifeUsername: undefined,
    };
    const signedLegacy = await legacySealed(legacy);
    const legacyPayload = {
      v: 3,
      i: legacy.id,
      n: legacy.name,
      r: legacy.role,
      l: legacy.experienceLevel,
      c: legacy.createdAt,
      u: legacy.updatedAt,
      vc: legacy.verificationCode,
      rs: legacy.relationshipStatus,
      bu: legacy.bdsmtestUrl,
      bs: legacy.bdsmtestScores,
      cp: signedLegacy.consentProof,
    };
    const decoded = await decodeProfileV3(encodeRawPayload(legacyPayload));
    expect(decoded.bdsmtestScores).toEqual(legacy.bdsmtestScores);
    expect((await verifyProfileConsent(decoded)).status).toBe("valid");
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