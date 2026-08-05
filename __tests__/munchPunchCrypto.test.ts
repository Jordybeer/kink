import { describe, expect, it } from "vitest";
import { createMunchPunchRoom, openMunchPunchRoom } from "@/lib/munchPunch";
import {
  buildMunchPunchJoinUrl,
  decodeMunchPunchJoin,
  decryptMunchPunchResponse,
  encodeMunchPunchJoin,
  encryptMunchPunchResponse,
  generateMunchPunchRoomKeys,
  joinEnvelopeFromRoom,
  newMunchPunchRoomId,
} from "@/lib/munchPunchCrypto";

const NOW = 1_800_000_000_000;

async function setup() {
  const keys = await generateMunchPunchRoomKeys();
  const room = openMunchPunchRoom(createMunchPunchRoom({
    id: newMunchPunchRoomId(),
    title: "Antwerp Munch Punch",
    now: NOW,
    expiresAt: NOW + 60_000,
    promptIds: ["social", "greeting", "photos", "topics", "demo", "pace", "support", "energy"],
    hostPublicKey: keys.publicKey,
  }), NOW);
  return { keys, room, join: joinEnvelopeFromRoom(room) };
}

describe("Munch Punch room-scoped encryption", () => {
  it("round-trips a compact join payload without profiles or owner keys", async () => {
    const { join } = await setup();
    const encoded = encodeMunchPunchJoin(join);
    expect(decodeMunchPunchJoin(encoded)).toEqual(join);
    expect(decodeMunchPunchJoin(buildMunchPunchJoinUrl(join, "https://kinksync.test"))).toEqual(join);
    expect(encoded).not.toMatch(/profile|verification|owner|participant/i);
  });

  it("encrypts answers for the room host and authenticates the room configuration", async () => {
    const { keys, room, join } = await setup();
    const encoded = await encryptMunchPunchResponse(join, [0, 1, 2, 3, 0, 1, 2, 3], NOW + 1);
    expect(encoded).toMatch(/^KSMR1:/);
    expect(encoded).not.toContain("Antwerp Munch Punch");
    expect(encoded).not.toContain("[0,1,2,3");

    const decoded = await decryptMunchPunchResponse(room, keys.privateKey, encoded, NOW + 2);
    expect(decoded.answers).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    expect(decoded.replayHash).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("rejects tampering and a response scanned into another room", async () => {
    const { keys, room, join } = await setup();
    const encoded = await encryptMunchPunchResponse(join, [0, 1, 2, 3, 0, 1, 2, 3], NOW + 1);
    const replacement = encoded.endsWith("A") ? "B" : "A";
    await expect(decryptMunchPunchResponse(room, keys.privateKey, `${encoded.slice(0, -1)}${replacement}`, NOW + 2))
      .rejects.toThrow("geauthenticeerd");

    const other = { ...room, id: newMunchPunchRoomId() };
    await expect(decryptMunchPunchResponse(other, keys.privateKey, encoded, NOW + 2))
      .rejects.toThrow("andere room");
  });

  it("rejects responses after room expiry", async () => {
    const { keys, room, join } = await setup();
    const encoded = await encryptMunchPunchResponse(join, [0, 1, 2, 3, 0, 1, 2, 3], NOW + 1);
    await expect(decryptMunchPunchResponse(room, keys.privateKey, encoded, room.expiresAt))
      .rejects.toThrow("vervallen");
  });
});
