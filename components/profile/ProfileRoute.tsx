"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileScreen from "@/components/profile/ProfileScreen";
import ProfileIntroTour from "@/components/tours/ProfileIntroTour";
import type { SpotlightTourExitReason } from "@/components/tours/SpotlightTour";
import PageShell from "@/components/PageShell";
import { useHasHydrated, useStore } from "@/lib/store";
import {
  SPLIT_TOUR_KEYS,
  markSplitTourSeen,
  shouldShowSplitTour,
  useSplitTourHasHydrated,
} from "@/lib/splitTourState";

interface ProfileRouteProps {
  id: string;
}

/**
 * One profile route experience behind both the legacy dynamic URL and the
 * precacheable /profile?id=... shell. Keeping the route wrappers thin prevents
 * offline and online doors from drifting into different product behaviour.
 */
export default function ProfileRoute({ id }: ProfileRouteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useHasHydrated();
  const splitTourHydrated = useSplitTourHasHydrated();
  const profiles = useStore((state) => state.profiles);
  const profileTourComplete = useStore((state) => state.profileTourComplete);
  const completeProfileTour = useStore((state) => state.completeProfileTour);
  const profile = profiles.find((candidate) => candidate.id === id);
  const shared = profile?.origin === "shared" || (!profile?.origin && profile?.isImported === true);
  const focusQuestions = searchParams.get("focus") === "questionnaire";
  const [tourVisible, setTourVisible] = useState(false);
  const params = useMemo(() => Promise.resolve({ id }), [id]);

  useEffect(() => {
    if (!focusQuestions || !id) return;
    router.replace(`/profile/${encodeURIComponent(id)}/questions`);
  }, [focusQuestions, id, router]);

  useEffect(() => {
    if (focusQuestions || !hydrated || !splitTourHydrated || !profile || shared || profileTourComplete) {
      setTourVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setTourVisible(shouldShowSplitTour(profileTourComplete, SPLIT_TOUR_KEYS.profile));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [focusQuestions, hydrated, profile, profileTourComplete, shared, splitTourHydrated]);

  const finishProfileTour = useCallback((reason: SpotlightTourExitReason) => {
    setTourVisible(false);
    if (reason === "abandoned") return;
    if (markSplitTourSeen(SPLIT_TOUR_KEYS.profile)) completeProfileTour();
  }, [completeProfileTour]);

  if (focusQuestions) return <PageShell loading width="2xl" />;

  return (
    <>
      <ProfileScreen params={params} />
      {tourVisible && <ProfileIntroTour onComplete={finishProfileTour} />}
    </>
  );
}
