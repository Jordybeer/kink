import type { KinkStatus } from "@/types";

export type VisibleCompareStatus = Exclude<KinkStatus, null>;

export const COMPARE_V2 = true;
