import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import {
  decodeSharedProfile,
  encodeProfileShareTransport,
  isProfileShareBundle,
} from "@/lib/profileShareV3";

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
  it("includes the avatar by default when requested and restores it on decode", async () => {
    const transport = await encodeProfileShareTransport(profile(), { includeAvatar: true });
    expect(transport.avatarPayload).toBe(AVATAR);
    expect(isProfileShareBundle(transport.encoded)).toBe(true);

    const decoded = await decodeSharedProfile(transport.encoded);
    expect(decoded.avatarDataUrl).toBe(AVATAR);
    expect(decoded.name).toBe("Avatar Test");
  });

  it("keeps the old profile-only format when photo sharing is disabled", async () => {
    const transport = await encodeProfileShareTransport(profile(), { includeAvatar: false });
    expect(transport.avatarPayload).toBeUndefined();
    expect(isProfileShareBundle(transport.encoded)).toBe(false);

    const decoded = await decodeSharedProfile(transport.encoded);
    expect(decoded.avatarDataUrl).toBeUndefined();
  });

  it("rejects a photo changed after the bundle checksum was created", async () => {
    const transport = await encodeProfileShareTransport(profile(), { includeAvatar: true });
    const parsed = JSON.parse(decodeBase64Url(transport.encoded.slice(3))) as {
      v: number;
      p: string;
      a: string;
      h: string;
    };
    parsed.a = parsed.a.replace("iVBOR", "jVBOR");
    const tampered = "4r." + encodeBase64Url(JSON.stringify(parsed));
    await expect(decodeSharedProfile(tampered)).rejects.toThrow("Profielfoto is beschadigd");
  });
});
