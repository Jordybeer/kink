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
  cleanCompareParam,
  getCompareCategoryScores,
  getCompareSummary,
  type CompareResultFilter,
} from "@/lib/compare";
import { useHasHydrated, useStore } from "@/lib/store";
import type { KinkCategoryId } from "@/types";

function toggleSetValue<T>(current: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

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

  const [selectedResults, setSelectedResults] = useState<Set<CompareResultFilter>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<KinkCategoryId>>(new Set());
  const [discussed, setDiscussed] = useState<Set<string>>(new Set());
  const [hideDiscussed, setHideDiscussed] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState<null | "a" | "b">(null);
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
    setDiscussed((previous) => toggleSetValue(previous, id));
  }, []);

  const updateComment = useCallback((profileId: string, kinkId: string, comment: string) => {
    setEntry(profileId, kinkId, { comment });
  }, [setEntry]);

  const summary = getCompareSummary(profileA, profileB);
  const categoryScores = getCompareCategoryScores(profileA, profileB);

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
          <CompareScoreSummary {...summary} categoryScores={categoryScores} />
          <CompareToolbar
            categoryScores={categoryScores}
            selectedResults={selectedResults}
            selectedCategories={selectedCategories}
            discussedCount={discussed.size}
            hideDiscussed={hideDiscussed}
            onToggleResult={(filter) => setSelectedResults((current) => toggleSetValue(current, filter))}
            onClearResults={() => setSelectedResults(new Set())}
            onToggleCategory={(category) => setSelectedCategories((current) => toggleSetValue(current, category))}
            onClearCategories={() => setSelectedCategories(new Set())}
            onToggleHideDiscussed={() => setHideDiscussed((value) => !value)}
          />
        </>
      )}

      <CompareResults
        profileA={profileA}
        profileB={profileB}
        samePairError={samePairError}
        selectedResults={selectedResults}
        selectedCategories={selectedCategories}
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
