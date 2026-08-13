"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowsLeftRight, FileText } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import CompareProfileHeader from "@/components/compare/CompareProfileHeader";
import CompareResults from "@/components/compare/CompareResults";
import CompareScoreSummary from "@/components/compare/CompareScoreSummary";
import CompareToolbar from "@/components/compare/CompareToolbar";
import ProfileSelectorSheet from "@/components/compare/ProfileSelectorSheet";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import useCompareProfiles from "@/hooks/useCompareProfiles";
import {
  buildCompareModel,
  cleanCompareParam,
  type CompareFilterMode,
} from "@/lib/compare";
import { useHasHydrated, useStore } from "@/lib/store";

function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profiles, setEntry, pinnedProfileId } = useStore();
  const hasHydrated = useHasHydrated();
  const {
    aId,
    bId,
    profileA,
    profileB,
    samePairError,
    hasPair,
    setAId,
    setBId,
    swapProfiles,
  } = useCompareProfiles({
    profiles,
    pinnedProfileId,
    hasHydrated,
    initialAId: cleanCompareParam(searchParams.get("a")),
    initialBId: cleanCompareParam(searchParams.get("b")),
  });

  const [filterMode, setFilterMode] = useState<CompareFilterMode>("all");
  const [discussed, setDiscussed] = useState<Set<string>>(new Set());
  const [hideDiscussed, setHideDiscussed] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState<null | "a" | "b">(null);
  const model = useMemo(
    () => buildCompareModel(profileA, profileB),
    [profileA, profileB],
  );

  const navActions = useMemo<TopNavAction[]>(() => [
    {
      id: "swap-profiles",
      label: "Wissel profielen",
      icon: <ArrowsLeftRight size={18} aria-hidden="true" />,
      onClick: swapProfiles,
      placement: "primary",
      disabled: !hasPair,
    },
    {
      id: "create-contract",
      label: "Contract opstellen",
      icon: <FileText size={18} aria-hidden="true" />,
      onClick: () => router.push(`/contract?a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`),
      placement: "secondary",
      disabled: !hasPair,
    },
  ], [aId, bId, hasPair, router, swapProfiles]);
  useTopNavActions(navActions);

  const toggleDiscussed = useCallback((id: string) => {
    setDiscussed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateComment = useCallback((profileId: string, itemId: string, comment: string) => {
    setEntry(profileId, itemId, { comment });
  }, [setEntry]);

  if (!hasHydrated) return <PageShell loading width="5xl" />;

  return (
    <PageShell width="5xl">
      <h1 className="sr-only">Profielen vergelijken</h1>

      <CompareProfileHeader
        profileA={profileA}
        profileB={profileB}
        samePairError={samePairError}
        onOpenA={() => setSelectorOpen("a")}
        onOpenB={() => setSelectorOpen("b")}
      />

      {hasPair && (
        <>
          <CompareScoreSummary summary={model.summary} />
          <CompareToolbar
            categoryScores={model.categories}
            filterMode={filterMode}
            summary={model.summary}
            discussedCount={discussed.size}
            hideDiscussed={hideDiscussed}
            onFilterChange={setFilterMode}
            onToggleHideDiscussed={() => setHideDiscussed((value) => !value)}
          />
        </>
      )}

      <CompareResults
        profileA={profileA}
        profileB={profileB}
        samePairError={samePairError}
        model={model}
        filterMode={filterMode}
        discussed={discussed}
        hideDiscussed={hideDiscussed}
        onToggleDiscussed={toggleDiscussed}
        onComment={updateComment}
      />

      <ProfileSelectorSheet
        open={selectorOpen === "a"}
        onClose={() => setSelectorOpen(null)}
        slot="A"
        profiles={profiles}
        selectedId={aId}
        otherSelectedId={bId}
        pinnedProfileId={pinnedProfileId}
        onSelect={setAId}
      />
      <ProfileSelectorSheet
        open={selectorOpen === "b"}
        onClose={() => setSelectorOpen(null)}
        slot="B"
        profiles={profiles}
        selectedId={bId}
        otherSelectedId={aId}
        pinnedProfileId={pinnedProfileId}
        onSelect={setBId}
      />
    </PageShell>
  );
}

export default function CompareSuspense() {
  return (
    <Suspense
      fallback={(
        <div className="p-10 text-center text-sm" style={{ color: "var(--text2)" }}>
          Laden…
        </div>
      )}
    >
      <ComparePage />
    </Suspense>
  );
}
