import { describe, expect, it } from "vitest";
import {
  MUNCH_PUNCH_MAX_RESPONSES,
  cleanupMunchPunchRooms,
  closeMunchPunchRoom,
  createMunchPunchRoom,
  openMunchPunchRoom,
  recordMunchPunchResponse,
  resultsUnlocked,
  roomStatusAt,
  visibleMunchPunchResults,
} from "@/lib/munchPunch";

const NOW = 1_800_000_000_000;

function room() {
  return openMunchPunchRoom(createMunchPunchRoom({
    id: "abcdefghijklmnop",
    title: "Antwerp munch",
    now: NOW,
    expiresAt: NOW + 60_000,
    promptIds: ["social", "greeting"],
    hostPublicKey: "public-key",
  }), NOW);
}

describe("Munch Punch room privacy model", () => {
  it("moves through draft, open, closed and expired without participant identity", () => {
    const draft = createMunchPunchRoom({
      id: "abcdefghijklmnop",
      now: NOW,
      expiresAt: NOW + 60_000,
      promptIds: ["social"],
      hostPublicKey: "public-key",
    });
    expect(draft.status).toBe("draft");
    expect(openMunchPunchRoom(draft, NOW + 1).status).toBe("open");
    const closed = closeMunchPunchRoom(openMunchPunchRoom(draft, NOW + 1), NOW + 2);
    expect(closed.status).toBe("closed");
    expect(roomStatusAt(draft, NOW + 60_000)).toBe("expired");
    expect(roomStatusAt(closed, NOW + 60_000)).toBe("expired");
    expect(JSON.stringify(draft)).not.toMatch(/profile|participant|verification|owner/i);
  });

  it("persists only aggregates, a count and exact replay hashes", () => {
    const first = recordMunchPunchResponse(room(), [1, 2], "hash-1", NOW + 10);
    expect(first.status).toBe("accepted");
    expect(first.room.responseCount).toBe(1);
    expect(first.room.aggregates.social).toEqual([0, 1, 0, 0]);
    expect(first.room.replayHashes).toEqual(["hash-1"]);
    expect(JSON.stringify(first.room)).not.toContain('"answers"');

    const replay = recordMunchPunchResponse(first.room, [3, 3], "hash-1", NOW + 11);
    expect(replay.status).toBe("replay");
    expect(replay.room).toEqual(first.room);
  });

  it("keeps results locked until five accepted responses", () => {
    let current = room();
    for (let index = 0; index < 4; index += 1) {
      current = recordMunchPunchResponse(current, [0, 0], `hash-${index}`, NOW + index + 1).room;
    }
    expect(resultsUnlocked(current)).toBe(false);
    expect(visibleMunchPunchResults(current)).toEqual([]);
    current = recordMunchPunchResponse(current, [0, 0], "hash-4", NOW + 5).room;
    expect(resultsUnlocked(current)).toBe(true);
  });

  it("suppresses cells below three and merges them only when the pool is large enough", () => {
    let current = room();
    const answers = [
      [0, 0], [0, 0], [0, 0],
      [1, 1], [1, 1],
      [2, 2],
    ] as const;
    answers.forEach((value, index) => {
      current = recordMunchPunchResponse(current, value, `hash-${index}`, NOW + index + 1).room;
    });
    const social = visibleMunchPunchResults(current).find((result) => result.promptId === "social");
    expect(social?.buckets).toEqual([
      expect.objectContaining({ label: "Liever observeren", count: 3, merged: false }),
      expect.objectContaining({ label: "Overige antwoorden", count: 3, merged: true }),
    ]);
    expect(social?.hiddenCount).toBe(0);

    let hidden = room();
    [[0, 0], [0, 0], [0, 0], [1, 1], [1, 1]].forEach((value, index) => {
      hidden = recordMunchPunchResponse(hidden, value, `other-${index}`, NOW + index + 1).room;
    });
    const hiddenSocial = visibleMunchPunchResults(hidden).find((result) => result.promptId === "social");
    expect(hiddenSocial?.buckets).toHaveLength(1);
    expect(hiddenSocial?.hiddenCount).toBe(2);
  });

  it("caps a room at thirty accepted responses", () => {
    let current = room();
    for (let index = 0; index < MUNCH_PUNCH_MAX_RESPONSES; index += 1) {
      current = recordMunchPunchResponse(current, [0, 0], `hash-${index}`, NOW + index + 1).room;
    }
    const overflow = recordMunchPunchResponse(current, [1, 1], "hash-overflow", NOW + 40);
    expect(overflow.status).toBe("full");
    expect(overflow.room.responseCount).toBe(MUNCH_PUNCH_MAX_RESPONSES);
  });

  it("expires closed rooms and removes them after the cleanup grace", () => {
    const closed = closeMunchPunchRoom(room(), NOW + 10);
    expect(cleanupMunchPunchRooms([closed], closed.expiresAt)).toHaveLength(1);
    expect(cleanupMunchPunchRooms([closed], closed.expiresAt)[0]?.status).toBe("expired");
    expect(cleanupMunchPunchRooms([closed], closed.expiresAt + 24 * 60 * 60 * 1000)).toEqual([]);
  });
});
