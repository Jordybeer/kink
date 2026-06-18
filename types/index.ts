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
  desire?: number | null;
  experienced?: boolean | null;
  score?: number | null;        // deprecated — bewaard voor achterwaartse compat
  comment: string;
  tags?: string[];
  usedInScene?: number;
}

export interface SceneItem {
  id: string;
  name: string;
  intensity: "zacht" | "midden" | "intens";
  duration: string;
  note: string;
  fromKink: boolean;
  kinkId?: string;
  /** Tags pulled from both profiles' entries when this kink was added to the scene. Read-only here. */
  tags?: string[];
}

export type SceneStatus = "draft" | "planned" | "completed";

export interface AftercareEntry {
  trafficLight: "green" | "amber" | "red";
  wentWell: string;
  remember: string;
  completedAt: number;
}

export interface SceneRecord {
  id: string;
  title: string;
  profileAId: string;
  profileBId: string;
  profileAName: string;
  profileBName: string;
  items: SceneItem[];
  plannedDate?: string;
  plannedTime?: string;
  safeword?: string;
  status: SceneStatus;
  createdAt: number;
  updatedAt: number;
  aftercare?: AftercareEntry;
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
  safeword?: string;
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
  origin?: "own" | "shared";
  lockedAt?: number;
  experienceLevel: ExperienceLevel;
  customKinks: CustomKink[];
  createdAt: number;
  updatedAt: number;
  entries: Record<string, KinkEntry>;
}
