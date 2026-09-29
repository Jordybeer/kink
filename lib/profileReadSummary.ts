import type { Kink, KinkEntry, KinkStatus } from "@/types";

type RatedKink = Pick<Kink, "id" | "name">;
type PublicStatus = NonNullable<KinkStatus>;
type InterestStatus = Extract<PublicStatus, "yes" | "willing">;

export interface ProfileCategoryReadSummary {
  preview: { status: InterestStatus; names: string[]; remaining: number } | null;
  hardLimits: string[];
  context: { text: string; subject: string } | null;
  privateCount: number;
  fallback: { status: PublicStatus; name: string } | null;
}

function clipContext(value: string, max = 110): string {
  const text = value.trim().replace(/\s+/g, " ");
  const characters = Array.from(text);
  return characters.length <= max
    ? text
    : `${characters.slice(0, max - 1).join("").trimEnd()}…`;
}

export function summarizeProfileCategory(
  kinks: RatedKink[],
  entries: Record<string, KinkEntry>,
): ProfileCategoryReadSummary {
  const rated = kinks.flatMap((kink) => {
    const entry = entries[kink.id];
    return entry?.status ? [{ kink, entry: entry as KinkEntry & { status: PublicStatus } }] : [];
  });
  const publicRated = rated.filter(({ entry }) => entry.privateResponse !== true);
  const privateCount = rated.length - publicRated.length;

  const interestStatus: InterestStatus | null = publicRated.some(({ entry }) => entry.status === "yes")
    ? "yes"
    : publicRated.some(({ entry }) => entry.status === "willing")
      ? "willing"
      : null;
  const interestItems = interestStatus
    ? publicRated.filter(({ entry }) => entry.status === interestStatus)
    : [];
  const preview = interestStatus
    ? {
        status: interestStatus,
        names: interestItems.slice(0, 2).map(({ kink }) => kink.name),
        remaining: Math.max(0, interestItems.length - 2),
      }
    : null;

  const hardLimitItems = publicRated.filter(({ entry }) => entry.status === "hard_no");
  const hardLimits = hardLimitItems.map(({ kink }) => kink.name);

  const notes = publicRated.filter(({ entry }) => entry.comment.trim().length > 0);
  const hardLimitNotes = notes.filter(({ entry }) => entry.status === "hard_no");
  const contextSource = notes.length === 1
    ? notes[0]
    : hardLimitNotes.length === 1
      ? hardLimitNotes[0]
      : null;
  const context = contextSource
    ? {
        text: clipContext(contextSource.entry.comment),
        subject: contextSource.kink.name,
      }
    : null;

  const fallbackSource = preview || hardLimits.length > 0 || context
    ? null
    : publicRated[0] ?? null;

  return {
    preview,
    hardLimits,
    context,
    privateCount,
    fallback: fallbackSource
      ? { status: fallbackSource.entry.status, name: fallbackSource.kink.name }
      : null,
  };
}

