export type KinkStatus = "yes" | "willing" | "maybe" | "no" | "hard_no" | null;

export type ExperienceLevel = "beginner" | "gevorderd" | "ervaren" | "diepgaand";

export type ProfilePerspective = "dominant" | "submissive";
export type QuestionnaireMode = "dynamic" | "deepDive";
export type QuestionnaireInterest =
  | "power"
  | "impact"
  | "bondage"
  | "sensation"
  | "humiliation"
  | "sexual_social";

export type KinkCategoryId =
  | "impact"
  | "bondage"
  | "power"
  | "rituals"
  | "discipline"
  | "roleplay"
  | "sensation"
  | "exhibition"
  | "media"
  | "group_partner"
  | "body_focus"
  | "materials_scent"
  | "pet_play"
  | "fluids"
  | "toys"
  | "penetration"
  | "aftercare"
  | "appearance"
  | "adult_ageplay";

export type KinkCategory = KinkCategoryId | "custom";

export interface QuestionnaireSetup {
  mode: QuestionnaireMode;
  interests: QuestionnaireInterest[];
  version: 2;
}

export interface CustomKink {
  id: string;
  name: string;
}

export interface Kink {
  id: string;
  name: string;
  aliases?: readonly string[];
  category: KinkCategory;
  level: 1 | 2 | 3 | 4;
  description?: string;
  safetyNote?: string;
}

export interface CatalogKink extends Kink {
  category: KinkCategoryId;
}

export interface KinkEntry {
  status: KinkStatus;
  desire?: number | null;
  experienced?: boolean | null;
  score?: number | null;        // deprecated — bewaard voor achterwaartse compat
  comment: string;
  tags?: string[];
  usedInScene?: number;
  curious?: boolean;
  /** Verbergt het persoonlijke antwoord standaard; de kinknaam blijft zichtbaar. */
  privateResponse?: boolean;
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

export type ConsentProofAlgorithm = "ECDSA-P256-SHA256";

export interface ProfileConsentPayload {
  schema: 1;
  profileId: string;
  verificationCode: string;
  name: string;
  role: string;
  experienceLevel: ExperienceLevel;
  relationshipStatus?: string;
  bdsmtestUrl?: string;
  bdsmtestScores?: BdsmtestScore[];
  customKinks: CustomKink[];
  entries: Record<string, KinkEntry>;
}

export interface ProfileConsentProof {
  schema: 1;
  algorithm: ConsentProofAlgorithm;
  keyId: string;
  publicKeyJwk: JsonWebKey;
  version: number;
  signedAt: number;
  previousProofHash?: string;
  payloadHash: string;
  signature: string;
  proofHash: string;
}

export interface ProfileOwnerKey {
  profileId: string;
  keyId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  createdAt: number;
  version: number;
  lastProofHash?: string;
}

export interface ConsentSnapshot {
  profileId: string;
  profileName: string;
  verificationCode: string;
  alias: string;
  capturedAt: number;
  payload: ProfileConsentPayload;
  proof: ProfileConsentProof;
}

export type ConsentLedgerEventType = "locked" | "changed" | "withdrawn";

export interface ConsentLedgerEvent {
  id: string;
  sceneId: string;
  type: ConsentLedgerEventType;
  createdAt: number;
  profileId?: string;
  profileName?: string;
  note?: string;
  snapshot?: ConsentSnapshot;
  agreement?: SceneConsentAgreement;
  previousEventHash?: string;
  keyId?: string;
  publicKeyJwk?: JsonWebKey;
  signature?: string;
  eventHash: string;
}

export interface SceneConsentSnapshots {
  profileA: ConsentSnapshot;
  profileB: ConsentSnapshot;
}

export interface SceneConsentAgreement {
  schema: 1;
  sceneId: string;
  title: string;
  profileAId: string;
  profileBId: string;
  profileAProofHash: string;
  profileBProofHash: string;
  plannedDate?: string;
  plannedTime?: string;
  safeword?: string;
  items: SceneItem[];
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
  consentLockedAt?: number;
  consentSnapshots?: SceneConsentSnapshots;
  consentAgreement?: SceneConsentAgreement;
  consentLedger?: ConsentLedgerEvent[];
}

export interface ProfileSnapshot {
  id: string;
  profileId: string;
  date: number;
  entries: Record<string, KinkEntry>;
  customKinks: CustomKink[];
  counts: {
    yes: number;
    willing: number;
    maybe: number;
    no: number;
    hard_no: number;
  };
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

export interface BdsmtestScore {
  role: string;
  pct: number;
}

export interface Profile {
  id: string;
  /** Immutable technical lineage marker shared with the profile. */
  verificationCode?: string;
  /** Digital seal over the current shareable consent data. */
  consentProof?: ProfileConsentProof;
  name: string;
  role: string;
  /** Specialist role that existed before a primary perspective was chosen. */
  legacyRole?: string;
  /** Local grouping for two perspectives belonging to the same person. */
  personGroupId?: string;
  /** Primary perspective represented by this answer set. */
  perspective?: ProfilePerspective;
  /** Local questionnaire selection. Missing pre-launch data defaults to Dynamic. */
  questionnaireSetup?: QuestionnaireSetup;
  relationshipStatus?: string;
  fetLifeUsername?: string;
  bdsmtestUrl?: string;
  bdsmtestScores?: BdsmtestScore[];
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
