import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SPLIT_TOUR_KEYS = {
  profile: "profile",
  questions: "questions",
} as const;

type SplitTourKey = (typeof SPLIT_TOUR_KEYS)[keyof typeof SPLIT_TOUR_KEYS];

interface SplitTourState {
  profileIntroTourSeen: boolean;
  questionnaireTourSeen: boolean;
  markSeen: (key: SplitTourKey) => boolean;
  reset: () => void;
}

function bothSeen(state: Pick<SplitTourState, "profileIntroTourSeen" | "questionnaireTourSeen">) {
  return state.profileIntroTourSeen && state.questionnaireTourSeen;
}

export const useSplitTourStore = create<SplitTourState>()(
  persist(
    (set) => ({
      profileIntroTourSeen: false,
      questionnaireTourSeen: false,
      markSeen(key) {
        let completed = false;
        set((state) => {
          const next = key === SPLIT_TOUR_KEYS.profile
            ? { ...state, profileIntroTourSeen: true }
            : { ...state, questionnaireTourSeen: true };
          completed = bothSeen(next);
          return next;
        });
        return completed;
      },
      reset() {
        set({ profileIntroTourSeen: false, questionnaireTourSeen: false });
      },
    }),
    {
      name: "kinksync-split-tours-v2",
      partialize: (state) => ({
        profileIntroTourSeen: state.profileIntroTourSeen,
        questionnaireTourSeen: state.questionnaireTourSeen,
      }),
    },
  ),
);

function seenFor(key: SplitTourKey) {
  const state = useSplitTourStore.getState();
  return key === SPLIT_TOUR_KEYS.profile
    ? state.profileIntroTourSeen
    : state.questionnaireTourSeen;
}

export function shouldShowSplitTour(legacyComplete: boolean, key: SplitTourKey): boolean {
  if (legacyComplete) return false;
  return !seenFor(key);
}

export function markSplitTourSeen(key: SplitTourKey): boolean {
  return useSplitTourStore.getState().markSeen(key);
}

export function resetSplitTours() {
  useSplitTourStore.getState().reset();
}

export function useSplitTourHasHydrated() {
  const [hydrated, setHydrated] = useState(useSplitTourStore.persist.hasHydrated());

  useEffect(() => {
    setHydrated(useSplitTourStore.persist.hasHydrated());
    return useSplitTourStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
