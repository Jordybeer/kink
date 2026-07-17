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

export function comparableEntry(entry: KinkEntry | undefined, revealed = false): KinkEntry {
  if (!entry) return { status: null, comment: "" };
  if (isResponseVisible(entry, revealed)) return entry;
  return {
    status: null,
    comment: "",
    curious: entry.curious,
    tags: entry.tags,
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
      kind: "private";
      tags: string[];
    };

export function profileExportResponse(
  entry: KinkEntry,
  includePrivateResponses = false,
): ProfileExportResponse {
  const tags = entry.tags ?? [];
  if (entry.privateResponse && !includePrivateResponses) {
    return { kind: "private", tags };
  }
  return {
    kind: "visible",
    status: entry.status,
    comment: entry.comment,
    tags,
  };
}
