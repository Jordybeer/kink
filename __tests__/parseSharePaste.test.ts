import { describe, it, expect } from "vitest";
import { parseSharePaste } from "@/lib/parseSharePaste";
import { buildProfileQrSet } from "@/lib/profileQr";

describe("parseSharePaste", () => {
  it("accepts the raw KINKSYNC session token", () => {
    expect(parseSharePaste("KINKSYNC:ABC234")).toEqual({ kind: "session", code: "ABC234" });
  });

  it("rejects a lowercase session token (regex stays strict)", () => {
    expect(parseSharePaste("kinksync:abc234")).toEqual({ kind: "invalid" });
  });

  it("extracts ?join=CODE from a /session URL", () => {
    expect(parseSharePaste("https://kink.example/session?join=ABC234"))
      .toEqual({ kind: "session", code: "ABC234" });
  });

  it("rejects a /session URL with a malformed join code", () => {
    expect(parseSharePaste("https://kink.example/session?join=abc"))
      .toEqual({ kind: "invalid" });
  });

  it("extracts legacy ?p=PAYLOAD from a share URL", () => {
    expect(parseSharePaste("https://kink.example/?p=eyJ2IjoyfQ"))
      .toEqual({ kind: "profile", encoded: "eyJ2IjoyfQ" });
  });

  it("extracts lossless v3 from the URL fragment", () => {
    expect(parseSharePaste("https://kink.example/#p3=3r.example"))
      .toEqual({ kind: "profile", encoded: "3r.example" });
  });

  it("recognises multipart profile QR fragments", () => {
    const set = buildProfileQrSet("https://kink.example", "3r." + "x".repeat(2000));
    expect(parseSharePaste(set.qrValues[0]).kind).toBe("profilePart");
  });

  it("accepts a bare 6-char session code", () => {
    expect(parseSharePaste("XYZ789")).toEqual({ kind: "session", code: "XYZ789" });
  });

  it("accepts a bare base64url-shaped payload", () => {
    const payload = "eyJ2IjoyLCJpZCI6ImFiYyJ9".repeat(2);
    expect(parseSharePaste(payload)).toEqual({ kind: "profile", encoded: payload });
  });

  it("accepts a bare v3 payload", () => {
    expect(parseSharePaste("3r.example")).toEqual({ kind: "profile", encoded: "3r.example" });
  });

  it("rejects empty input", () => {
    expect(parseSharePaste("")).toEqual({ kind: "invalid" });
    expect(parseSharePaste("   ")).toEqual({ kind: "invalid" });
  });

  it("rejects foreign URLs without join or profile payload", () => {
    expect(parseSharePaste("https://example.com/foo"))
      .toEqual({ kind: "invalid" });
  });

  it("rejects short garbage that isn't a session code", () => {
    expect(parseSharePaste("hi")).toEqual({ kind: "invalid" });
    expect(parseSharePaste("hello world!")).toEqual({ kind: "invalid" });
  });

  it("trims surrounding whitespace before matching", () => {
    expect(parseSharePaste("  KINKSYNC:ABC234  "))
      .toEqual({ kind: "session", code: "ABC234" });
  });
});
