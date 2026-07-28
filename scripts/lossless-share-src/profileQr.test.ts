import { describe, expect, it } from "vitest";
import {
  addProfileQrPart,
  buildProfileQrSet,
  parseProfileQrPart,
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

  it("rejects malformed part headers", () => {
    expect(parseProfileQrPart("bad")).toBeNull();
    expect(parseSharePaste("https://kink.example/#p3m=bad")).toEqual({ kind: "invalid" });
  });
});
