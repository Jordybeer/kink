import {
  getMunchPunchPrompt,
  isMunchPunchPromptId,
  type MunchPunchPromptId,
} from "./munchPunchCatalog";

export const MUNCH_PUNCH_RESULTS_THRESHOLD = 5;
export const MUNCH_PUNCH_SMALL_CELL_THRESHOLD = 3;
export const MUNCH_PUNCH_MAX_RESPONSES = 30;
export const MUNCH_PUNCH_DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;
export const MUNCH_PUNCH_CLEANUP_GRACE_MS = 24 * 60 * 60 * 1000;

export type MunchPunchRoomStatus = "draft" | "open" | "closed" | "expired";

export interface MunchPunchRoom {
  id: string;
  title: string;
  status: MunchPunchRoomStatus;
  createdAt: number;
  openedAt?: number;
  closedAt?: number;
  expiresAt: number;
  promptIds: MunchPunchPromptId[];
  hostPublicKey: string;
  responseCount: number;
  aggregates: Record<string, number[]>;
  replayHashes: string[];
}

export interface MunchPunchVisibleBucket {
  key: string;
  label: string;
  count: number;
  merged: boolean;
}

export interface MunchPunchPromptResult {
  promptId: MunchPunchPromptId;
  question: string;
  buckets: MunchPunchVisibleBucket[];
  hiddenCount: number;
}

export interface MunchPunchRecordResult {
  room: MunchPunchRoom;
  status: "accepted" | "replay" | "full" | "closed";
}

function makeAggregate(promptId: MunchPunchPromptId): number[] {
  return getMunchPunchPrompt(promptId).options.map(() => 0);
}

export function createMunchPunchRoom(input: {
  id: string;
  title?: string;
  now: number;
  expiresAt?: number;
  promptIds: readonly MunchPunchPromptId[];
  hostPublicKey: string;
}): MunchPunchRoom {
  if (!/^[A-Za-z0-9_-]{12,32}$/.test(input.id)) throw new Error("De room heeft geen geldige lokale code");
  const promptIds = [...new Set(input.promptIds)];
  if (promptIds.length < 1 || promptIds.length > 8) throw new Error("Kies tussen één en acht vragen");
  if (!promptIds.every(isMunchPunchPromptId)) throw new Error("De room bevat een onbekende vraag");
  const expiresAt = input.expiresAt ?? input.now + MUNCH_PUNCH_DEFAULT_DURATION_MS;
  if (!Number.isFinite(expiresAt) || expiresAt <= input.now) throw new Error("De vervaltijd moet in de toekomst liggen");
  const aggregates: Record<string, number[]> = {};
  for (const promptId of promptIds) aggregates[promptId] = makeAggregate(promptId);
  return {
    id: input.id,
    title: input.title?.trim().slice(0, 48) || "Munch Punch",
    status: "draft",
    createdAt: input.now,
    expiresAt,
    promptIds,
    hostPublicKey: input.hostPublicKey,
    responseCount: 0,
    aggregates,
    replayHashes: [],
  };
}

export function roomStatusAt(room: MunchPunchRoom, now: number): MunchPunchRoomStatus {
  if (room.status !== "expired" && now >= room.expiresAt) return "expired";
  return room.status;
}

export function openMunchPunchRoom(room: MunchPunchRoom, now: number): MunchPunchRoom {
  if (roomStatusAt(room, now) === "expired") return { ...room, status: "expired" };
  if (room.status !== "draft") return room;
  return { ...room, status: "open", openedAt: now };
}

export function closeMunchPunchRoom(room: MunchPunchRoom, now: number): MunchPunchRoom {
  const status = roomStatusAt(room, now);
  if (status === "expired") return { ...room, status: "expired" };
  if (status === "closed") return room;
  return { ...room, status: "closed", closedAt: now };
}

export function expireMunchPunchRoom(room: MunchPunchRoom, now: number): MunchPunchRoom {
  return roomStatusAt(room, now) === "expired" ? { ...room, status: "expired" } : room;
}

export function validateMunchPunchAnswers(room: MunchPunchRoom, answers: readonly number[]): number[] {
  if (answers.length !== room.promptIds.length) throw new Error("Het antwoordpakket past niet bij deze room");
  return answers.map((answer, index) => {
    const prompt = getMunchPunchPrompt(room.promptIds[index]);
    if (!Number.isInteger(answer) || answer < 0 || answer >= prompt.options.length) {
      throw new Error("Het antwoordpakket bevat een ongeldige keuze");
    }
    return answer;
  });
}

export function recordMunchPunchResponse(
  room: MunchPunchRoom,
  answers: readonly number[],
  replayHash: string,
  now: number,
): MunchPunchRecordResult {
  const status = roomStatusAt(room, now);
  if (status !== "open") return { room: status === "expired" ? { ...room, status } : room, status: "closed" };
  if (room.replayHashes.includes(replayHash)) return { room, status: "replay" };
  if (room.responseCount >= MUNCH_PUNCH_MAX_RESPONSES) return { room, status: "full" };
  const safeAnswers = validateMunchPunchAnswers(room, answers);
  const aggregates = Object.fromEntries(
    Object.entries(room.aggregates).map(([key, value]) => [key, [...value]]),
  );
  safeAnswers.forEach((answer, index) => {
    const promptId = room.promptIds[index];
    const counts = aggregates[promptId] ?? makeAggregate(promptId);
    counts[answer] = (counts[answer] ?? 0) + 1;
    aggregates[promptId] = counts;
  });
  return {
    status: "accepted",
    room: {
      ...room,
      aggregates,
      responseCount: room.responseCount + 1,
      replayHashes: [...room.replayHashes, replayHash],
    },
  };
}

export function resultsUnlocked(room: MunchPunchRoom): boolean {
  return room.responseCount >= MUNCH_PUNCH_RESULTS_THRESHOLD;
}

export function visibleMunchPunchResults(room: MunchPunchRoom): MunchPunchPromptResult[] {
  if (!resultsUnlocked(room)) return [];
  return room.promptIds.map((promptId) => {
    const prompt = getMunchPunchPrompt(promptId);
    const counts = room.aggregates[promptId] ?? makeAggregate(promptId);
    const buckets: MunchPunchVisibleBucket[] = [];
    let smallTotal = 0;
    counts.forEach((count, index) => {
      if (count <= 0) return;
      if (count < MUNCH_PUNCH_SMALL_CELL_THRESHOLD) {
        smallTotal += count;
        return;
      }
      buckets.push({
        key: `${promptId}:${index}`,
        label: prompt.options[index]?.label ?? "Onbekend antwoord",
        count,
        merged: false,
      });
    });

    if (smallTotal > 0 && smallTotal < MUNCH_PUNCH_SMALL_CELL_THRESHOLD) {
      return {
        promptId,
        question: prompt.question,
        buckets: [],
        hiddenCount: room.responseCount,
      };
    }

    if (smallTotal >= MUNCH_PUNCH_SMALL_CELL_THRESHOLD) {
      buckets.push({ key: `${promptId}:other`, label: "Overige antwoorden", count: smallTotal, merged: true });
    }
    return { promptId, question: prompt.question, buckets, hiddenCount: 0 };
  });
}

export function cleanupMunchPunchRooms(rooms: readonly MunchPunchRoom[], now: number): MunchPunchRoom[] {
  return rooms
    .map((room) => expireMunchPunchRoom(room, now))
    .filter((room) => room.status !== "expired" || now - room.expiresAt < MUNCH_PUNCH_CLEANUP_GRACE_MS);
}
