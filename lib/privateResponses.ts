import type { KinkEntry, KinkStatus } from "@/types";

export type PrivateResponseKey = `${string}:${string}`;

export function privateResponseKey(profileId: string, kinkId: string): PrivateResponseKey {
  return `${profileId}:${kinkId}`;
}

export function isPrivateResponse(entry: KinkEntry | undefined): boolean {
  return entry?.privateResponse === true;
}

export function isResponseVisible(entry: KinkEntry | undefined, revealed = false): boolean {
  return !isPrivateResponse(entry) || revealed;
}

export function visibleStatus(entry: KinkEntry | undefined, revealed = false): KinkStatus {
  return isResponseVisible(entry, revealed) ? (entry?.status ?? null) : null;
}

export function visibleUsedInScene(entry: KinkEntry | undefined, revealed = false): number {
  if (!isResponseVisible(entry, revealed)) return 0;
  return entry?.usedInScene ?? 0;
}

/**
 * Returns the only safe comparison shape for a concealed answer. The kink name
 * lives outside KinkEntry and may stay visible; every answer-derived field stays
 * behind the curtain until the viewer deliberately reveals it.
 */
export function comparableEntry(entry: KinkEntry | undefined, revealed = false): KinkEntry {
  if (!entry) return { status: null, comment: "" };
  if (isResponseVisible(entry, revealed)) return entry;
  return {
    status: null,
    comment: "",
    privateResponse: true,
  };
}

export type ProfileExportResponse =
  | {
      kind: "visible";
      status: KinkStatus;
      comment: string;
      tags: string[];
    }
  | {
      kind: "omitted";
    };

/**
 * Profile shares and downloads are disclosure boundaries, not merely alternate
 * views. A concealed answer is omitted completely unless the owner explicitly
 * opts in for that export operation.
 */
export function profileExportResponse(
  entry: KinkEntry,
  includePrivateResponses = false,
): ProfileExportResponse {
  if (entry.privateResponse && !includePrivateResponses) {
    return { kind: "omitted" };
  }
  return {
    kind: "visible",
    status: entry.status,
    comment: entry.comment,
    tags: entry.tags ?? [],
  };
}
