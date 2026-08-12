"use client";

import { use, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProfileScreen from "@/components/profile/ProfileScreen";
import ProfileIntroTour from "@/components/tours/ProfileIntroTour";
import PageShell from "@/components/PageShell";
import { useHasHydrated, useStore } from "@/lib/store";
import {
  SPLIT_TOUR_KEYS,
  markSplitTourSeen,
  shouldShowSplitTour,
} from "@/lib/splitTourState";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useHasHydrated();
  const { profiles, profileTourComplete, completeProfileTour } = useStore();
  const profile = profiles.find((candidate) => candidate.id === id);
  const shared = profile?.origin === "shared" || (!profile?.origin && profile?.isImported === true);
  const focusQuestions = searchParams.get("focus") === "questionnaire";
  const [tourVisible, setTourVisible] = useState(false);

  useEffect(() => {
    if (!focusQuestions) return;
    router.replace(`${pathname}/questions`);
  }, [focusQuestions, pathname, router]);

  useEffect(() => {
    if (focusQuestions || !hydrated || !profile || shared || profileTourComplete) {
      setTourVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setTourVisible(shouldShowSplitTour(profileTourComplete, SPLIT_TOUR_KEYS.profile));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [focusQuestions, hydrated, profile, profileTourComplete, shared]);

  function finishProfileTour() {
    setTourVisible(false);
    if (markSplitTourSeen(SPLIT_TOUR_KEYS.profile)) completeProfileTour();
  }

  if (focusQuestions) return <PageShell loading width="2xl" />;

  return (
    <>
      <ProfileScreen params={params} />
      {tourVisible && <ProfileIntroTour onComplete={finishProfileTour} />}
    </>
  );
}
