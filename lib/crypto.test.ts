import { describe, expect, it } from "vitest";
import { decryptBackup, encryptBackup } from "@/lib/crypto";

describe("backup crypto", () => {
  it("versleutelt en ontsleutelt ook een grote backup zonder argumentlimiet te raken", async () => {
    const plain = JSON.stringify({
      version: 5,
      source: "backup",
      // Ruim boven de grootte waarbij één grote String.fromCharCode(...bytes)
      // op browsers kan omvallen door de maximale functie-argumentlimiet.
      payload: "x".repeat(512 * 1024),
    });
    const password = "correct horse battery staple";

    const encrypted = await encryptBackup(plain, password);

    expect(encrypted.encrypted).toBe(true);
    expect(encrypted.ciphertext.length).toBeGreaterThan(plain.length);
    await expect(decryptBackup(encrypted, password)).resolves.toBe(plain);
  });
});
