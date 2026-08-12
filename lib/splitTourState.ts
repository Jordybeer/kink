export const SPLIT_TOUR_KEYS = {
  profile: "ks-tour-profile-intro-v2",
  questions: "ks-tour-questionnaire-v2",
} as const;

type SplitTourKey = (typeof SPLIT_TOUR_KEYS)[keyof typeof SPLIT_TOUR_KEYS];

function readSeen(key: SplitTourKey): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function shouldShowSplitTour(legacyComplete: boolean, key: SplitTourKey): boolean {
  if (legacyComplete || typeof window === "undefined") return false;
  return !readSeen(key);
}

export function markSplitTourSeen(key: SplitTourKey): boolean {
  try {
    window.localStorage.setItem(key, "1");
    return readSeen(SPLIT_TOUR_KEYS.profile) && readSeen(SPLIT_TOUR_KEYS.questions);
  } catch {
    return false;
  }
}
