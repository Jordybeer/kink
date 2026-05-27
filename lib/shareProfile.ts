import type { Profile, KinkEntry } from "@/types";

function compactEntry(entry: KinkEntry): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  if (entry.status != null) out.status = entry.status;
  if (entry.desire != null) out.desire = entry.desire;
  if (entry.experienced != null) out.experienced = entry.experienced;
  if (entry.comment) out.comment = entry.comment;
  if (entry.tags?.length) out.tags = entry.tags;
  // score is deprecated — never encoded
  return Object.keys(out).length > 0 ? out : null;
}

export function encodeProfile(profile: Profile, opts?: { includeFetLife?: boolean }): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { avatarDataUrl, fetLifeUsername, ...rest } = profile;

  const compactedEntries: Record<string, unknown> = {};
  for (const [id, entry] of Object.entries(rest.entries)) {
    const compact = compactEntry(entry);
    if (compact) compactedEntries[id] = compact;
  }

  const payload = {
    ...(opts?.includeFetLife && fetLifeUsername ? { ...rest, fetLifeUsername } : rest),
    entries: compactedEntries,
  };

  const json = JSON.stringify(payload);
  return btoa(
    encodeURIComponent(json).replace(
      /%([0-9A-F]{2})/g,
      (_, p1) => String.fromCharCode(parseInt(p1, 16))
    )
  );
}

export function decodeProfile(encoded: string): Profile {
  const json = decodeURIComponent(
    Array.from(atob(encoded))
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  );
  return JSON.parse(json) as Profile;
}
