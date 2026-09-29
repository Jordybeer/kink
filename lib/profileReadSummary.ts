import type { Kink, KinkEntry } from "@/types";

function clipContext(value: string, max = 110): string {
  const text = value.trim().replace(/\s+/g, " ");
  const characters = Array.from(text);
  return characters.length <= max
    ? text
    : `${characters.slice(0, max - 1).join("").trimEnd()}…`;
}

export function summarizeProfileCategory(
  kinks: Pick<Kink, "id" | "name">[],
  entries: Record<string, KinkEntry>,
) {
  let privateCount = 0;
  const publicRated = kinks.flatMap((kink) => {
    const entry = entries[kink.id];
    if (!entry?.status) return [];
    if (entry.privateResponse === true) {
      privateCount++;
      return [];
    }
    return [{ name: kink.name, status: entry.status, comment: entry.comment }];
  });

  // Status is explicit; ties retain catalogue order and are only a partial preview.
  const interestStatus = publicRated.some(({ status }) => status === "yes") ? "yes" : "willing";
  const interestItems = publicRated.filter(({ status }) => status === interestStatus);
  const preview = interestItems.length > 0
    ? {
        status: interestItems[0].status,
        names: interestItems.slice(0, 2).map(({ name }) => name),
        remaining: Math.max(0, interestItems.length - 2),
      }
    : null;

  const hardLimits = publicRated.filter(({ status }) => status === "hard_no").map(({ name }) => name);
  const notes = publicRated.filter(({ comment }) => comment.trim());
  // Never pick a favourite note. Every named boundary may carry its own context.
  const context = (notes.length === 1 ? notes : notes.filter(({ status }) => status === "hard_no"))
    .map(({ name, comment }) => ({ subject: name, text: clipContext(comment) }));
  const fallback = !preview && !hardLimits.length && !context.length ? publicRated[0] : null;

  return {
    preview,
    hardLimits,
    context,
    privateCount,
    fallback: fallback ? { status: fallback.status, name: fallback.name } : null,
  };
}
