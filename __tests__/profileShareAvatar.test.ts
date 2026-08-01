import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import {
  decodeSharedProfile,
  encodeProfileShareTransport,
  isProfileShareBundle,
} from "@/lib/profileShareV3";
import {
  generateProfileOwnerKey,
  signProfileConsent,
} from "@/lib/consentProof";
import { checksumProfilePayload } from "@/lib/profileQr";

const AVATAR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=";

function profile(): Profile {
  return {
    id: "profile-avatar-test",
    verificationCode: "KS-TEST-AVATAR",
    name: "Avatar Test",
    role: "Switch",
    experienceLevel: "gevorderd",
    customKinks: [],
    createdAt: 1,
    updatedAt: 2,
    entries: {
      bondage: { status: "yes", comment: "" },
    },
    avatarDataUrl: AVATAR,
    origin: "own",
  };
}

async function signedProfile() {
  const original = profile();
  const ownerKey = await generateProfileOwnerKey(original.id);
  const signed = await signProfileConsent(original, ownerKey);
  return {
    profile: { ...original, consentProof: signed.proof },
    ownerKey: signed.ownerKey,
  };
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  return new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)));
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

describe("shared profile avatar bundle", () => {
  it("restores an avatar signed by the same owner key as the profile", async () => {
    const signed = await signedProfile();
    const transport = await encodeProfileShareTransport(signed.profile, {
      includeAvatar: true,
      avatarOwnerKey: signed.ownerKey,
    });
    expect(transport.avatarPayload).toMatch(/^a1\./);
    expect(isProfileShareBundle(transport.encoded)).toBe(true);

    const decoded = await decodeSharedProfile(transport.encoded);
    expect(decoded.avatarDataUrl).toBe(AVATAR);
    expect(decoded.name).toBe("Avatar Test");
  });

  it("keeps the profile-only format when photo sharing is disabled", async () => {
    const signed = await signedProfile();
    const transport = await encodeProfileShareTransport(signed.profile, {
      includeAvatar: false,
      avatarOwnerKey: signed.ownerKey,
    });
    expect(transport.avatarPayload).toBeUndefined();
    expect(isProfileShareBundle(transport.encoded)).toBe(false);

    const decoded = await decodeSharedProfile(transport.encoded);
    expect(decoded.avatarDataUrl).toBeUndefined();
  });

  it("does not emit an unsigned avatar when the owner key is unavailable", async () => {
    const signed = await signedProfile();
    const transport = await encodeProfileShareTransport(signed.profile, {
      includeAvatar: true,
    });
    expect(transport.avatarPayload).toBeUndefined();
    expect(isProfileShareBundle(transport.encoded)).toBe(false);
  });

  it("rejects an owner key that belongs to another profile", async () => {
    const signed = await signedProfile();
    const wrongKey = await generateProfileOwnerKey("another-profile");
    await expect(encodeProfileShareTransport(signed.profile, {
      includeAvatar: true,
      avatarOwnerKey: wrongKey,
    })).rejects.toThrow("eigendomssleutel");
  });

  it("rejects a substituted photo even when the transport checksum is recomputed", async () => {
    const signed = await signedProfile();
    const transport = await encodeProfileShareTransport(signed.profile, {
      includeAvatar: true,
      avatarOwnerKey: signed.ownerKey,
    });
    const outer = JSON.parse(decodeBase64Url(transport.encoded.slice(3))) as {
      v: number;
      p: string;
      x: string;
      h: string;
    };
    const avatarEnvelope = JSON.parse(decodeBase64Url(outer.x.slice(3))) as {
      v: number;
      a: string;
      ap: Record<string, unknown>;
    };
    avatarEnvelope.a = avatarEnvelope.a.replace("iVBOR", "jVBOR");
    outer.x = "a1." + encodeBase64Url(JSON.stringify(avatarEnvelope));
    outer.h = checksumProfilePayload(outer.x);
    const tampered = "4r." + encodeBase64Url(JSON.stringify(outer));

    await expect(decodeSharedProfile(tampered)).rejects.toThrow(
      "De profielfoto hoort niet bij dit bevestigde profiel",
    );
  });
});
