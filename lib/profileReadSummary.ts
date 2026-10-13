import type { Kink, KinkCategory, KinkEntry, KinkStatus } from "@/types";

export const PROFILE_READ_STATUS_ORDER = [
  "hard_no",
  "yes",
  "willing",
  "maybe",
  "no",
] as const satisfies readonly NonNullable<KinkStatus>[];

export interface ProfileReadItem {
  id: string;
  name: string;
  category: KinkCategory;
  status: NonNullable<KinkStatus>;
  comment: string;
  tags: string[];
  curious: boolean;
}

export function buildProfileStatusReadSummary(
  kinks: Pick<Kink, "id" | "name" | "category">[],
  entries: Record<string, KinkEntry>,
) {
  const publicItems: ProfileReadItem[] = [];
  const privateItems: ProfileReadItem[] = [];

  for (const kink of kinks) {
    const entry = entries[kink.id];
    if (!entry?.status) continue;

    const item: ProfileReadItem = {
      id: kink.id,
      name: kink.name,
      category: kink.category,
      status: entry.status,
      comment: entry.comment?.trim() ?? "",
      tags: entry.tags ?? [],
      curious: entry.curious === true,
    };

    if (entry.privateResponse === true) privateItems.push(item);
    else publicItems.push(item);
  }

  const groups = PROFILE_READ_STATUS_ORDER
    .map((status) => ({
      status,
      items: publicItems.filter((item) => item.status === status),
    }))
    .filter((group) => group.items.length > 0);

  return { groups, privateItems, publicCount: publicItems.length };
}
