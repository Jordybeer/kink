import { STATUS_LABEL } from "@/lib/statusLabels";
import type { Kink, KinkEntry, KinkStatus } from "@/types";

type RatedKink = Pick<Kink, "id" | "name">;
type PublicStatus = NonNullable<KinkStatus>;

export interface ProfileReadInterest {
  name: string;
  status: Extract<PublicStatus, "yes" | "willing">;
}

export interface ProfileReadContext {
  subject: string;
  text: string;
}

export interface ProfileReadFallback {
  name: string;
  status: PublicStatus;
}

export interface ProfileCategoryReadSummary {
  strongest: ProfileReadInterest[];
  hardLimits: string[];
  context: ProfileReadContext | null;
  privateCount: number;
  fallback: ProfileReadFallback | null;
}

const INTEREST_RANK: Record<ProfileReadInterest["status"], number> = {
  yes: 0,
  willing: 1,
};

function entryFor(
  kink: RatedKink,
  entries: Record<string, KinkEntry>,
): KinkEntry | null {
  const entry = entries[kink.id];
  return entry?.status ? entry : null;
}

function clippedContext(value: string, max = 110): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function summarizeProfileCategory(
  kinks: RatedKink[],
  entries: Record<string, KinkEntry>,
): ProfileCategoryReadSummary {
  const rated = kinks
    .map((kink) => ({ kink, entry: entryFor(kink, entries) }))
    .filter((item): item is { kink: RatedKink; entry: KinkEntry & { status: PublicStatus } } =>
      Boolean(item.entry?.status));

  const publicRated = rated.filter(({ entry }) => entry.privateResponse !== true);
  const privateCount = rated.length - publicRated.length;

  const strongest = publicRated
    .filter(({ entry }) => entry.status === "yes" || entry.status === "willing")
    .sort((left, right) =>
      INTEREST_RANK[left.entry.status as ProfileReadInterest["status"]]
      - INTEREST_RANK[right.entry.status as ProfileReadInterest["status"]])
    .slice(0, 2)
    .map(({ kink, entry }) => ({
      name: kink.name,
      status: entry.status as ProfileReadInterest["status"],
    }));

  const hardLimits = publicRated
    .filter(({ entry }) => entry.status === "hard_no")
    .map(({ kink }) => kink.name);

  const preferredContextIds = new Set([
    ...strongest.map((item) => publicRated.find(({ kink }) => kink.name === item.name)?.kink.id).filter(Boolean),
    ...publicRated.filter(({ entry }) => entry.status === "hard_no").map(({ kink }) => kink.id),
  ]);

  const contextSource = publicRated.find(
    ({ kink, entry }) => preferredContextIds.has(kink.id) && entry.comment.trim().length > 0,
  ) ?? publicRated.find(({ entry }) => entry.comment.trim().length > 0);

  const context = contextSource
    ? {
        subject: contextSource.kink.name,
        text: clippedContext(contextSource.entry.comment),
      }
    : null;

  const fallbackSource = strongest.length === 0 && hardLimits.length === 0 && context === null
    ? publicRated[0]
    : null;

  return {
    strongest,
    hardLimits,
    context,
    privateCount,
    fallback: fallbackSource
      ? { name: fallbackSource.kink.name, status: fallbackSource.entry.status }
      : null,
  };
}

export function profileReadStatusLabel(status: PublicStatus): string {
  return STATUS_LABEL[status];
}
