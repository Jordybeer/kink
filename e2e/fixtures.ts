import type { Page } from "@playwright/test";
import type { Profile } from "@/types";

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
    spanking_hand:       { status: "yes",     score: null, comment: "Klassiek en heerlijk" },
    blindfold:           { status: "yes",     score: null, comment: "" },
    collar_leash:        { status: "willing", score: null, comment: "" },
    praise_kink:         { status: "yes",     score: null, comment: "" },
    rope_bondage:        { status: "yes",     score: null, comment: "Shibari ook" },
    // Soft conflict
    flogging:            { status: "willing", score: null, comment: "Lichte sessies" },
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
    spanking_hand:        { status: "yes",     score: null, comment: "" },
    blindfold:            { status: "yes",     score: null, comment: "Vertrouwen opbouwen" },
    collar_leash:         { status: "yes",     score: null, comment: "Droom hiervan" },
    praise_kink:          { status: "yes",     score: null, comment: "" },
    rope_bondage:         { status: "willing", score: null, comment: "" },
    // Soft conflict
    flogging:             { status: "maybe",   score: null, comment: "Nog nooit geprobeerd" },
    // Hard limit — Alex has "no", Sam has "hard_no" → triggers harde grenzen section
    humiliation_verbal:   { status: "hard_no", score: null, comment: "Absoluut niet" },
    // Discussion
    wax_play:             { status: "maybe",   score: null, comment: "" },
    dominance_submission: { status: "yes",     score: null, comment: "" },
  },
};

export function buildStore(profiles: Profile[], extras: Partial<{
  onboardingComplete: boolean;
  profileTourComplete: boolean;
  pinnedProfileId: string | null;
}> = {}) {
  return {
    state: {
      profiles,
      contracts: [],
      onboardingComplete: extras.onboardingComplete ?? true,
      profileTourComplete: extras.profileTourComplete ?? true,
      installPromptDismissed: true,
      theme: "midnight",
      pinnedProfileId: extras.pinnedProfileId ?? null,
    },
    version: 8,
  };
}

export async function seedProfiles(page: Page, profiles: Profile[], extras?: Parameters<typeof buildStore>[1]) {
  await page.goto("/");
  await page.evaluate((store) => {
    localStorage.setItem("kink-profiles", JSON.stringify(store));
  }, buildStore(profiles, extras));
  await page.reload();
  await page.waitForLoadState("networkidle");
}

export async function seedAndGo(page: Page, url: string, profiles: Profile[], extras?: Parameters<typeof buildStore>[1]) {
  await page.goto("/");
  await page.evaluate((store) => {
    localStorage.setItem("kink-profiles", JSON.stringify(store));
  }, buildStore(profiles, extras));
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}
