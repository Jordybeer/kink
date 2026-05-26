export type KinkStatus = "yes" | "willing" | "maybe" | "no" | "hard_no" | null;

export type ExperienceLevel = "beginner" | "gevorderd" | "ervaren" | "diepgaand";

export interface CustomKink {
  id: string;
  name: string;
}

export interface Kink {
  id: string;
  name: string;
  category: string;
  level: 1 | 2 | 3 | 4;
  description?: string;
}

export interface KinkEntry {
  status: KinkStatus;
  score: number | null; // 1-5 ervaring
  comment: string;
  tags?: string[];
}

export interface ContractSnapshot {
  id: string;
  date: number;
  profileAName: string;
  profileBName: string;
  matchCount: number;
  hardLimitCount: number;
  softLimitCount: number;
  discussCount: number;
}

export interface Profile {
  id: string;
  name: string;
  role: string;
  relationshipStatus?: string;
  experienceLevel: ExperienceLevel;
  customKinks: CustomKink[];
  createdAt: number;
  updatedAt: number;
  entries: Record<string, KinkEntry>;
}
