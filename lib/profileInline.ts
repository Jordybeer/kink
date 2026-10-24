import type { KinkStatus } from "@/types";
import type { ProfileReadItem } from "./profileReadSummary";
import { STATUS_ORDER } from "./statusLabels";

export function profileInlineStatus(value: string | null, items: ProfileReadItem[]): NonNullable<KinkStatus> {
  if (STATUS_ORDER.some((status) => status === value)) return value as NonNullable<KinkStatus>;
  return STATUS_ORDER.find((status) => status !== "hard_no" && items.some((item) => item.status === status)) ?? "yes";
}

/** Keep the editing list's order, but never retain a newly private answer. */
export function pinnedPublicItems(snapshot: ProfileReadItem[] | undefined, live: ProfileReadItem[], privateIds: Set<string>) {
  return (snapshot ?? live).filter((item) => !privateIds.has(item.id));
}
