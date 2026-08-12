"use client";

import { use, useCallback, useEffect, useState } from "react";
import QuestionsScreen from "@/components/profile/QuestionsScreen";
import QuestionnaireTour from "@/components/tours/QuestionnaireTour";
import type { SpotlightTourExitReason } from "@/components/tours/SpotlightTour";
import { useHasHydrated, useStore } from "@/lib/store";
import {
  SPLIT_TOUR_KEYS,
  markSplitTourSeen,
  shouldShowSplitTour,
  useSplitTourHasHydrated,
} from "@/lib/splitTourState";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfileQuestionsPage({ params }: Props) {
  const { id } = use(params);
  const hydrated = useHasHydrated();
  const splitTourHydrated = useSplitTourHasHydrated();
  const profiles = useStore((state) => state.profiles);
  const profileTourComplete = useStore((state) => state.profileTourComplete);
  const completeProfileTour = useStore((state) => state.completeProfileTour);
  const profile = profiles.find((candidate) => candidate.id === id);
  const shared = profile?.origin === "shared" || (!profile?.origin && profile?.isImported === true);
  const [tourVisible, setTourVisible] = useState(false);

  useEffect(() => {
    if (!hydrated || !splitTourHydrated || !profile || shared || profileTourComplete) {
      setTourVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setTourVisible(shouldShowSplitTour(profileTourComplete, SPLIT_TOUR_KEYS.questions));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [hydrated, profile, profileTourComplete, shared, splitTourHydrated]);

  const finishQuestionnaireTour = useCallback((reason: SpotlightTourExitReason) => {
    setTourVisible(false);
    if (reason === "abandoned") return;
    if (markSplitTourSeen(SPLIT_TOUR_KEYS.questions)) completeProfileTour();
  }, [completeProfileTour]);

  return (
    <>
      <QuestionsScreen params={params} />
      {tourVisible && <QuestionnaireTour onComplete={finishQuestionnaireTour} />}
    </>
  );
}
