import { describe, it, expect } from "vitest";
import { hashPin } from "@/lib/crypto";

// hashPin is used by AppLock (changed in this PR from verifyPin to hash comparison).
// These tests verify that the function produces stable, correctly-formatted output
// so that the PIN-comparison logic in AppLock is trustworthy.

describe("hashPin", () => {
  it("returns a 64-character hex string (SHA-256 output)", async () => {
    const result = await hashPin("1234");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same PIN always produces the same hash", async () => {
    const a = await hashPin("0000");
    const b = await hashPin("0000");
    expect(a).toBe(b);
  });

  it("produces different hashes for different PINs", async () => {
    const h1 = await hashPin("1234");
    const h2 = await hashPin("4321");
    expect(h1).not.toBe(h2);
  });

  it("handles all-zero PIN", async () => {
    const result = await hashPin("0000");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles single-digit PIN", async () => {
    const result = await hashPin("5");
    expect(result).toHaveLength(64);
  });

  it("handles numeric string with leading zero", async () => {
    const h1 = await hashPin("0123");
    const h2 = await hashPin("123");
    // "0123" and "123" are different strings — must produce different hashes.
    expect(h1).not.toBe(h2);
  });

  it("known SHA-256 vector: empty string", async () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const result = await hashPin("");
    expect(result).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("AppLock scenario: hash of entered PIN matches stored hash", async () => {
    // Simulate the flow: user sets a PIN → hash is stored → user enters same PIN → hashes match.
    const pin = "7391";
    const storedHash = await hashPin(pin);
    const enteredHash = await hashPin(pin);
    expect(enteredHash).toBe(storedHash);
  });

  it("AppLock scenario: hash of wrong PIN does NOT match stored hash", async () => {
    const correctPin = "7391";
    const wrongPin = "1234";
    const storedHash = await hashPin(correctPin);
    const enteredHash = await hashPin(wrongPin);
    expect(enteredHash).not.toBe(storedHash);
  });
});