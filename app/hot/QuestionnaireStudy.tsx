"use client";

import { useMemo, useState } from "react";
import { ArrowsClockwise, Columns } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import TriageDeck from "@/components/TriageDeck";
import { useTopNavActions } from "@/components/nav/TopNavContext";
import { getQuestionnaireRuntime } from "@/lib/questionnaire";
import { getDynamicFirstRound } from "@/lib/questionnaireFirstRound";
import type { KinkEntry, Profile } from "@/types";

const sample: Profile = {
  id: "questionnaire-study", name: "Studio", role: "Switch", experienceLevel: "beginner",
  entries: {}, customKinks: [], createdAt: 0, updatedAt: 0,
};

export default function QuestionnaireStudy() {
  const [folio, setFolio] = useState(true);
  const [session, setSession] = useState(0);
  const [entries, setEntries] = useState<Profile["entries"]>({});
  const round = useMemo(() => {
    const profile = { ...sample, entries };
    return getDynamicFirstRound(profile, getQuestionnaireRuntime(profile));
  }, [entries]);

  function update(id: string, patch: Partial<KinkEntry>) {
    setEntries(previous => ({
      ...previous,
      [id]: { ...(previous[id] ?? { status: null, comment: "" }), ...patch },
    }));
  }

  const actions = useMemo(() => [
    { id: "compare-layout", label: folio ? "Bekijk origineel" : "Bekijk prototype",
      icon: <Columns size={19} />, placement: "primary" as const, onClick: () => setFolio(value => !value) },
    { id: "restart", label: "Opnieuw beginnen", icon: <ArrowsClockwise size={19} />,
      onClick: () => { setEntries({}); setSession(value => value + 1); } },
  ], [folio]);
  useTopNavActions(actions, folio ? "Vragenlijst · Prototype" : "Vragenlijst · Origineel", "/hot");

  return (
    <PageShell width="lg" flush className="questionnaire-study">
      <h1 className="sr-only">Vragenlijst uitproberen</h1>
      {folio && round.coverage.total > 0 && <progress className="folio-round-progress" aria-label="Beoordeelde onderwerpen"
        value={round.coverage.answered} max={round.coverage.total} />}
      <TriageDeck key={session} presentationStyle={folio ? "folio" : "classic"} standalone
        kinks={round.visibleKinks} queueItems={round.queue} entries={entries}
        progressLabel={folio ? `${round.coverage.answered} / ${round.coverage.total}` : `Dynamic · ${round.coverage.answered} / ${round.coverage.total}`}
        onStatusChange={(id, status) => update(id, { status, desire: null })}
        onCuriousChange={(id, curious) => update(id, { curious })}
        onPrivateChange={(id, privateResponse) => update(id, { privateResponse })}
        onTagsChange={(id, tags) => update(id, { tags })}
      />
    </PageShell>
  );
}
