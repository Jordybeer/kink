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

export type KinkDirection = "give" | "receive" | "both" | null;

export interface KinkEntry {
  status: KinkStatus;
  statusGive?: KinkStatus;
  statusReceive?: KinkStatus;
  direction?: KinkDirection;
  desire?: number | null;       // 1–5 verlangen (vervangt pills visueel)
  experienced?: boolean | null; // ja/nee ervaring checkbox
  score: number | null;         // deprecated — bewaard voor achterwaartse compat
  comment: string;
  tags?: string[];
}

export interface ContractSnapshot {
  id: string;
  date: number;
  profileAId?: string;
  profileBId?: string;
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
  fetLifeUsername?: string;
  bdsmtestUrl?: string;
  privateNote?: string;
  avatarDataUrl?: string;
  isImported?: boolean;
  experienceLevel: ExperienceLevel;
  customKinks: CustomKink[];
  createdAt: number;
  updatedAt: number;
  entries: Record<string, KinkEntry>;
}
