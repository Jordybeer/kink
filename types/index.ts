export type KinkStatus = "yes" | "willing" | "maybe" | "no" | "hard_no" | null;

export interface Kink {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface KinkEntry {
  status: KinkStatus;
  score: number | null; // 1-5
  comment: string;
}

export interface Profile {
  id: string;
  name: string;
  role: string; // e.g. "Dominant", "Submissive", "Switch"
  createdAt: number;
  updatedAt: number;
  entries: Record<string, KinkEntry>; // kinkId -> entry
}
