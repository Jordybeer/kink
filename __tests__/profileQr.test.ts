import { describe, expect, it } from "vitest";
import {
  addProfileQrBundlePart,
  addProfileQrPart,
  buildProfileQrBundleSet,
  buildProfileQrSet,
  nextProfileQrIndex,
  parseProfileQrBundlePart,
  parseProfileQrPart,
  PROFILE_QR_AUTO_INTERVAL_MS,
  PROFILE_QR_CHUNK_SIZE,
  PROFILE_QR_MAX_PARTS,
  PROFILE_QR_SLOW_INTERVAL_MS,
  type ProfileQrAssembly,
  type ProfileQrBundleAssembly,
} from "@/lib/profileQr";
import { parseSharePaste } from "@/lib/parseSharePaste";

describe("profile QR splitting", () => {
  it("keeps a short payload in one QR and one full link", () => {
    const set = buildProfileQrSet("https://kink.example", "3r.short");
    expect(set.qrValues).toEqual([set.shareUrl]);
    expect(set.frames).toEqual([
      { value: set.shareUrl, phase: "profile", index: 1, total: 1 },
    ]);
    expect(parseSharePaste(set.shareUrl)).toEqual({ kind: "profile", encoded: "3r.short" });
  });

  it("reassembles multipart QR values out of order and ignores duplicates", () => {
    const payload = "3r." + "abcdef0123456789".repeat(180);
    const set = buildProfileQrSet("https://kink.example", payload);
    expect(set.qrValues.length).toBeGreaterThan(1);

    const parts = set.qrValues.map((value) => {
      const parsed = parseSharePaste(value);
      expect(parsed.kind).toBe("profilePart");
      if (parsed.kind !== "profilePart") throw new Error("part expected");
      return parsed.part;
    });

    let assembly: ProfileQrAssembly | null = null;
    for (const part of [parts[1], parts[1], parts[0], ...parts.slice(2)]) {
      const result = addProfileQrPart(assembly, part);
      if (result.status === "progress") assembly = result.assembly;
      if (result.status === "complete") {
        expect(result.payload).toBe(payload);
        return;
      }
    }
    throw new Error("multipart payload did not complete");
  });

  it("collects profile and avatar phases out of order", () => {
    const profilePayload = "3r." + "profile-data-".repeat(180);
    const avatarPayload = "data:image/jpeg;base64," + "A".repeat(4_000);
    const fullPayload = "4r.full-profile-bundle";
    const set = buildProfileQrBundleSet(
      "https://kink.example",
      profilePayload,
      fullPayload,
      avatarPayload,
    );

    expect(set.hasAvatar).toBe(true);
    expect(set.frames.some((frame) => frame.phase === "profile")).toBe(true);
    expect(set.frames.some((frame) => frame.phase === "avatar")).toBe(true);
    expect(parseSharePaste(set.shareUrl)).toEqual({ kind: "profile", encoded: fullPayload });

    const parts = set.qrValues.map((value) => {
      const parsed = parseSharePaste(value);
      expect(parsed.kind).toBe("profileBundlePart");
      if (parsed.kind !== "profileBundlePart") throw new Error("bundle part expected");
      return parsed.part;
    });
    const profileParts = parts.filter((part) => part.phase === "profile");
    const avatarParts = parts.filter((part) => part.phase === "avatar");

    let assembly: ProfileQrBundleAssembly | null = null;
    let sawProfileComplete = false;
    for (const part of [
      avatarParts[0],
      ...profileParts,
      avatarParts[0],
      ...avatarParts.slice(1),
    ]) {
      const result = addProfileQrBundlePart(assembly, part);
      if (result.status === "progress") {
        assembly = result.assembly;
        if (result.profileComplete) sawProfileComplete = true;
      }
      if (result.status === "complete") {
        expect(sawProfileComplete).toBe(true);
        expect(result.profilePayload).toBe(profilePayload);
        expect(result.avatarPayload).toBe(avatarPayload);
        return;
      }
    }
    throw new Error("profile bundle did not complete");
  });

  it("loops animated QR indexes without leaving the set", () => {
    expect(nextProfileQrIndex(0, 3)).toBe(1);
    expect(nextProfileQrIndex(1, 3)).toBe(2);
    expect(nextProfileQrIndex(2, 3)).toBe(0);
    expect(nextProfileQrIndex(9, 1)).toBe(0);
    expect(PROFILE_QR_AUTO_INTERVAL_MS).toBeGreaterThanOrEqual(500);
    expect(PROFILE_QR_SLOW_INTERVAL_MS).toBeGreaterThan(PROFILE_QR_AUTO_INTERVAL_MS);
  });

  it("keeps the complete link when a profile is too large for a practical QR set", () => {
    const payload = "3r." + "x".repeat(PROFILE_QR_CHUNK_SIZE * (PROFILE_QR_MAX_PARTS + 1));
    const set = buildProfileQrSet("https://kink.example", payload);
    expect(set.qrTooLarge).toBe(true);
    expect(set.qrValues).toEqual([]);
    expect(parseSharePaste(set.shareUrl)).toEqual({ kind: "profile", encoded: payload });
  });

  it("rejects malformed part headers", () => {
    expect(parseProfileQrPart("bad")).toBeNull();
    expect(parseProfileQrBundlePart("bad")).toBeNull();
    expect(parseSharePaste("https://kink.example/#p3m=bad")).toEqual({ kind: "invalid" });
    expect(parseSharePaste("https://kink.example/#p3b=bad")).toEqual({ kind: "invalid" });
  });
});
