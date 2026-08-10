import type { Page } from "@playwright/test";
import type { ContractSnapshot, Profile } from "@/types";
import type { ContractSeries } from "@/lib/contractLifecycle";

const STORE_KEY = "kink-profiles";
const CONTRACT_STORE_KEY = "kink-contract-series";
const SEED_GUARD = "kinksync-e2e-store-seeded";

// Realistic test profiles with entries covering all match types
export const PROFILE_ALEX: Profile = {
  id: "pw-alex-001",
  name: "Alex",
  role: "Dominant",
  experienceLevel: "gevorderd",
  relationshipStatus: "Single",
  customKinks: [{ id: "custom_pw001", name: "Kaarsvet druppels" }],
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  entries: {
    // Matches with Sam
    spanking_hand_give:       { status: "yes",     score: null, comment: "Klassiek en heerlijk" },
    blindfold_give:           { status: "yes",     score: null, comment: "" },
    collar_leash:        { status: "willing", score: null, comment: "" },
    praise_kink:         { status: "yes",     score: null, comment: "" },
    rope_bondage_give:        { status: "yes",     score: null, comment: "Shibari ook" },
    // Soft conflict
    flogging_give:            { status: "willing", score: null, comment: "Lichte sessies" },
    humiliation_verbal:  { status: "no",      score: null, comment: "Niet mijn stijl" },
    // Hard limit
    breath_play:         { status: "hard_no", score: null, comment: "" },
    // Discussion (one has yes, other has maybe)
    wax_play:            { status: "yes",     score: null, comment: "" },
    dominance_submission:{ status: "yes",     score: null, comment: "" },
  },
};

export const PROFILE_SAM: Profile = {
  id: "pw-sam-002",
  name: "Sam",
  role: "Submissive",
  experienceLevel: "gevorderd",
  relationshipStatus: "Gecollared",
  customKinks: [],
  createdAt: 1700000001000,
  updatedAt: 1700000001000,
  entries: {
    // Matches with Alex
    spanking_hand_receive:        { status: "yes",     score: null, comment: "" },
    blindfold_receive:             { status: "yes",     score: null, comment: "Vertrouwen opbouwen" },
    collar_leash:          { status: "yes",     score: null, comment: "Droom hiervan" },
    praise_kink:           { status: "yes",     score: null, comment: "" },
    rope_bondage_receive:          { status: "willing", score: null, comment: "" },
    // Soft conflict
    flogging_receive:              { status: "maybe",   score: null, comment: "Nog nooit geprobeerd" },
    // Hard limit — Alex has "no", Sam has "hard_no" → triggers harde grenzen section
    humiliation_verbal:   { status: "hard_no", score: null, comment: "Absoluut niet" },
    // Discussion
    wax_play:              { status: "maybe",   score: null, comment: "" },
    dominance_submission: { status: "yes",     score: null, comment: "" },
  },
};

export const CONTRACT_ALEX_SAM: ContractSnapshot = {
  id: "pw-contract-alex-sam",
  date: 1700000002000,
  profileAId: PROFILE_ALEX.id,
  profileBId: PROFILE_SAM.id,
  profileAName: PROFILE_ALEX.name,
  profileBName: PROFILE_SAM.name,
  matchCount: 5,
  hardLimitCount: 1,
  softLimitCount: 1,
  discussCount: 2,
  safeword: "Rood",
};

const ALEX_PARTICIPANT = {
  profileId: PROFILE_ALEX.id,
  profileName: PROFILE_ALEX.name,
  role: PROFILE_ALEX.role,
  verificationCode: "e2e-alex-verification",
  keyId: "e2e-key-alex",
};

const SAM_PARTICIPANT = {
  profileId: PROFILE_SAM.id,
  profileName: PROFILE_SAM.name,
  role: PROFILE_SAM.role,
  verificationCode: "e2e-sam-verification",
  keyId: "e2e-key-sam",
};

export const CONTRACT_SERIES_ALEX_SAM: ContractSeries = {
  id: "pw-contract-series-alex-sam",
  pairKey: [PROFILE_ALEX.id, PROFILE_SAM.id].sort().join("|"),
  participants: [ALEX_PARTICIPANT, SAM_PARTICIPANT],
  status: "active",
  createdAt: 1700000002000,
  updatedAt: 1700000002000,
  currentVersionId: "pw-contract-version-alex-sam",
  versions: [{
    id: "pw-contract-version-alex-sam",
    number: 1,
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
    contentHash: "e2e-contract-content-hash",
    content: {
      schema: 1,
      profileA: ALEX_PARTICIPANT,
      profileB: SAM_PARTICIPANT,
      preamble: "E2E verbond",
      createdAt: 1700000002000,
      signalsA: { green: "Groen", amber: "Oranje", red: "Rood", black: "Zwart" },
      signalsB: { green: "Groen", amber: "Oranje", red: "Rood", black: "Zwart" },
      aftercareA: [],
      aftercareB: [],
      shared: [],
      softLimits: [],
      hardLimits: [],
      hardLimitDetails: [],
      discuss: [],
    },
    summary: {
      matchCount: 5,
      hardLimitCount: 1,
      softLimitCount: 1,
      discussCount: 2,
      safeword: "Rood",
    },
    state: "signed",
    signatures: [
      {
        profileId: PROFILE_ALEX.id,
        keyId: ALEX_PARTICIPANT.keyId,
        publicKeyJwk: { kty: "EC", crv: "P-256", x: "e2e-x-alex", y: "e2e-y-alex", ext: true },
        signedAt: 1700000002000,
        payloadHash: "e2e-alex-payload-hash",
        signature: "e2e-alex-signature",
      },
      {
        profileId: PROFILE_SAM.id,
        keyId: SAM_PARTICIPANT.keyId,
        publicKeyJwk: { kty: "EC", crv: "P-256", x: "e2e-x-sam", y: "e2e-y-sam", ext: true },
        signedAt: 1700000002000,
        payloadHash: "e2e-sam-payload-hash",
        signature: "e2e-sam-signature",
      },
    ],
  }],
  events: [],
};

export function buildStore(profiles: Profile[], extras: Partial<{
  contracts: ContractSnapshot[];
  contractSeries: ContractSeries[];
  onboardingComplete: boolean;
  profileTourComplete: boolean;
  pinnedProfileId: string | null;
  theme: "midnight" | "red" | "forest" | "mono" | "ledger";
}> = {}) {
  return {
    state: {
      profiles,
      contracts: extras.contracts ?? [],
      onboardingComplete: extras.onboardingComplete ?? true,
      profileTourComplete: extras.profileTourComplete ?? true,
      installPromptDismissed: true,
      theme: extras.theme ?? "midnight",
      pinnedProfileId: extras.pinnedProfileId ?? null,
    },
    version: 20,
  };
}

async function installStoreSeed(
  page: Page,
  profiles: Profile[],
  extras?: Parameters<typeof buildStore>[1],
) {
  const serialized = JSON.stringify(buildStore(profiles, extras));
  const serializedContractStore = JSON.stringify({
    state: {
      series: extras?.contractSeries ?? [],
      migratedLegacySnapshotIds: [],
    },
    version: 1,
  });
  await page.addInitScript(
    ({ storeKey, contractStoreKey, seedGuard, value, contractStoreValue }) => {
      if (sessionStorage.getItem(seedGuard) === "1") return;
      localStorage.setItem(storeKey, value);
      localStorage.setItem(contractStoreKey, contractStoreValue);
      sessionStorage.setItem(seedGuard, "1");
    },
    {
      storeKey: STORE_KEY,
      contractStoreKey: CONTRACT_STORE_KEY,
      seedGuard: SEED_GUARD,
      value: serialized,
      contractStoreValue: serializedContractStore,
    },
  );
}

export async function seedProfiles(page: Page, profiles: Profile[], extras?: Parameters<typeof buildStore>[1]) {
  await installStoreSeed(page, profiles, extras);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

export async function seedAndGo(page: Page, url: string, profiles: Profile[], extras?: Parameters<typeof buildStore>[1]) {
  await installStoreSeed(page, profiles, extras);
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}
