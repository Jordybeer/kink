import { describe, expect, it } from "vitest";
import {
  addProfileQrPart,
  buildProfileQrSet,
  nextProfileQrIndex,
  parseProfileQrPart,
  PROFILE_QR_AUTO_INTERVAL_MS,
  PROFILE_QR_CHUNK_SIZE,
  PROFILE_QR_MAX_PARTS,
  PROFILE_QR_SLOW_INTERVAL_MS,
  type ProfileQrAssembly,
} from "@/lib/profileQr";
import { parseSharePaste } from "@/lib/parseSharePaste";

describe("profile QR splitting", () => {
  it("keeps a short payload in one QR and one full link", () => {
    const set = buildProfileQrSet("https://kink.example", "3r.short");
    expect(set.qrValues).toEqual([set.shareUrl]);
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
    expect(parseSharePaste("https://kink.example/#p3m=bad")).toEqual({ kind: "invalid" });
  });
});
