"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveCompareProfileIds } from "@/lib/compare";
import type { Profile } from "@/types";

interface UseCompareProfilesOptions {
  profiles: Profile[];
  pinnedProfileId: string | null;
  hasHydrated: boolean;
  initialAId: string;
  initialBId: string;
}

export default function useCompareProfiles({
  profiles,
  pinnedProfileId,
  hasHydrated,
  initialAId,
  initialBId,
}: UseCompareProfilesOptions) {
  const [aId, setAId] = useState(initialAId);
  const [bId, setBId] = useState(initialBId);

  const profileA = useMemo(
    () => profiles.find((profile) => profile.id === aId),
    [aId, profiles],
  );
  const profileB = useMemo(
    () => profiles.find((profile) => profile.id === bId),
    [bId, profiles],
  );

  useEffect(() => {
    if (!hasHydrated || profiles.length < 2) return;

    const resolved = resolveCompareProfileIds({ profiles, aId, bId, pinnedProfileId });
    if (resolved.aId !== aId) setAId(resolved.aId);
    if (resolved.bId !== bId) setBId(resolved.bId);
  }, [aId, bId, hasHydrated, pinnedProfileId, profiles]);

  const swapProfiles = useCallback(() => {
    setAId(bId);
    setBId(aId);
  }, [aId, bId]);

  const samePairError = Boolean(aId && bId && aId === bId);
  const hasPair = Boolean(profileA && profileB && !samePairError);

  return {
    aId,
    bId,
    profileA,
    profileB,
    samePairError,
    hasPair,
    setAId,
    setBId,
    swapProfiles,
  };
}
