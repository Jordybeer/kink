import { describe, expect, it } from "vitest";
import { parseSharePaste } from "@/lib/parseSharePaste";
import { buildProfileQrSet } from "@/lib/profileQr";
import { PROFILE_SHARE_INPUT_MAX_CHARS } from "@/lib/importLimits";

describe("parseSharePaste", () => {
  it("weigert een profiel dat in de querystring wil reizen", () => {
    // ?p= gaat wel degelijk naar de server. Het fragment niet. Alleen de tweede
    // vorm heeft KinkSync ooit gemaakt, dus alleen die komt binnen.
    expect(parseSharePaste("https://kink.example/?p=eyJ2IjoyfQ"))
      .toEqual({ kind: "invalid" });
  });

  it("laat de losse code van zo'n oude link wel gewoon toe", () => {
    expect(parseSharePaste("eyJ2IjoyfQeyJ2IjoyfQeyJ2IjoyfQ"))
      .toEqual({ kind: "profile", encoded: "eyJ2IjoyfQeyJ2IjoyfQeyJ2IjoyfQ" });
  });

  it("extracts lossless v3 from the URL fragment", () => {
    expect(parseSharePaste("https://kink.example/#p3=3r.example"))
      .toEqual({ kind: "profile", encoded: "3r.example" });
  });

  it("recognises multipart profile QR fragments", () => {
    const set = buildProfileQrSet("https://kink.example", "3r." + "x".repeat(2000));
    expect(parseSharePaste(set.qrValues[0]).kind).toBe("profilePart");
  });

  it("accepts a bare base64url-shaped profile payload", () => {
    const payload = "eyJ2IjoyLCJpZCI6ImFiYyJ9".repeat(2);
    expect(parseSharePaste(payload)).toEqual({ kind: "profile", encoded: payload });
  });

  it("accepts a bare v3 profile payload and trims whitespace", () => {
    expect(parseSharePaste("  3r.example  "))
      .toEqual({ kind: "profile", encoded: "3r.example" });
  });

  it("rejects removed Live Session tokens and join links", () => {
    expect(parseSharePaste("KINKSYNC:ABC234")).toEqual({ kind: "invalid" });
    expect(parseSharePaste("ABC234")).toEqual({ kind: "invalid" });
    expect(parseSharePaste("https://kink.example/session?join=ABC234"))
      .toEqual({ kind: "invalid" });
  });

  it("rejects empty input, foreign URLs and short garbage", () => {
    expect(parseSharePaste("")).toEqual({ kind: "invalid" });
    expect(parseSharePaste("https://example.com/foo")).toEqual({ kind: "invalid" });
    expect(parseSharePaste("hello world!")).toEqual({ kind: "invalid" });
  });

  it("rejects multi-megabyte pasted payloads before URL or profile decoding", () => {
    expect(parseSharePaste(`3r.${"A".repeat(PROFILE_SHARE_INPUT_MAX_CHARS)}`)).toEqual({ kind: "invalid" });
  });
});
