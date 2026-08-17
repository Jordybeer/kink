import { beforeEach, describe, expect, it } from "vitest";
import {
  SPLIT_TOUR_KEYS,
  markSplitTourSeen,
  resetSplitTours,
  shouldShowSplitTour,
  useSplitTourStore,
} from "@/lib/splitTourState";

beforeEach(() => {
  useSplitTourStore.setState({
    profileIntroTourSeen: false,
    questionnaireTourSeen: false,
  });
});

describe("gesplitste tourstate", () => {
  it("houdt beide tourdelen onafhankelijk zichtbaar tot ze gezien zijn", () => {
    expect(shouldShowSplitTour(false, SPLIT_TOUR_KEYS.profile)).toBe(true);
    expect(shouldShowSplitTour(false, SPLIT_TOUR_KEYS.questions)).toBe(true);

    expect(markSplitTourSeen(SPLIT_TOUR_KEYS.profile)).toBe(false);
    expect(shouldShowSplitTour(false, SPLIT_TOUR_KEYS.profile)).toBe(false);
    expect(shouldShowSplitTour(false, SPLIT_TOUR_KEYS.questions)).toBe(true);

    expect(markSplitTourSeen(SPLIT_TOUR_KEYS.questions)).toBe(true);
    expect(shouldShowSplitTour(false, SPLIT_TOUR_KEYS.questions)).toBe(false);
  });

  it("respecteert een reeds voltooide legacy-rondleiding", () => {
    expect(shouldShowSplitTour(true, SPLIT_TOUR_KEYS.profile)).toBe(false);
    expect(shouldShowSplitTour(true, SPLIT_TOUR_KEYS.questions)).toBe(false);
  });

  it("kan beide delen samen resetten", () => {
    markSplitTourSeen(SPLIT_TOUR_KEYS.profile);
    markSplitTourSeen(SPLIT_TOUR_KEYS.questions);

    resetSplitTours();

    expect(useSplitTourStore.getState().profileIntroTourSeen).toBe(false);
    expect(useSplitTourStore.getState().questionnaireTourSeen).toBe(false);
  });
});
