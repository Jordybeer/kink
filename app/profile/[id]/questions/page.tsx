"use client";

import { use, useEffect, useState } from "react";
import QuestionsScreen from "@/components/profile/QuestionsScreen";
import QuestionnaireTour from "@/components/tours/QuestionnaireTour";
import { useHasHydrated, useStore } from "@/lib/store";
import {
  SPLIT_TOUR_KEYS,
  markSplitTourSeen,
  shouldShowSplitTour,
} from "@/lib/splitTourState";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfileQuestionsPage({ params }: Props) {
  const { id } = use(params);
  const hydrated = useHasHydrated();
  const { profiles, profileTourComplete, completeProfileTour } = useStore();
  const profile = profiles.find((candidate) => candidate.id === id);
  const shared = profile?.origin === "shared" || (!profile?.origin && profile?.isImported === true);
  const [tourVisible, setTourVisible] = useState(false);

  useEffect(() => {
    if (!hydrated || !profile || shared || profileTourComplete) {
      setTourVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setTourVisible(shouldShowSplitTour(profileTourComplete, SPLIT_TOUR_KEYS.questions));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [hydrated, profile, profileTourComplete, shared]);

  function finishQuestionnaireTour() {
    setTourVisible(false);
    if (markSplitTourSeen(SPLIT_TOUR_KEYS.questions)) completeProfileTour();
  }

  return (
    <>
      <QuestionsScreen params={params} />
      {tourVisible && <QuestionnaireTour onComplete={finishQuestionnaireTour} />}
    </>
  );
}
