"use client";

import { useMemo, useState } from "react";
import { ArrowsClockwise, Columns } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import TriageDeck from "@/components/TriageDeck";
import { useTopNavActions } from "@/components/nav/TopNavContext";
import { getQuestionnaireRuntime } from "@/lib/questionnaire";
import { getDynamicFirstRound } from "@/lib/questionnaireFirstRound";
import { questionnaireCanonicalProbeTarget } from "@/lib/questionnaireMetadata";
import type { KinkEntry, Profile } from "@/types";

const sample: Profile = {
  id: "questionnaire-study", name: "Studio", role: "Switch", experienceLevel: "beginner",
  entries: {}, customKinks: [], createdAt: 0, updatedAt: 0,
};

const FIRST_TOPIC = "dominance_submission";
const FOLLOW_UP = questionnaireCanonicalProbeTarget(FIRST_TOPIC);
const NEXT_TOPIC = "aftercare_physical";
const FOLLOW_UP_STUDY_ORDER = [FIRST_TOPIC, FOLLOW_UP, NEXT_TOPIC];

export default function QuestionnaireStudy({ followUpStudy = false }: { followUpStudy?: boolean }) {
  const [folio, setFolio] = useState(true);
  const [session, setSession] = useState(0);
  const [entries, setEntries] = useState<Profile["entries"]>({});
  const round = useMemo(() => {
    const profile = { ...sample, entries };
    return getDynamicFirstRound(profile, getQuestionnaireRuntime(profile));
  }, [entries]);
  const visibleKinks = useMemo(() => {
    if (!followUpStudy) return round.visibleKinks;
    return round.visibleKinks
      .filter(kink => FOLLOW_UP_STUDY_ORDER.includes(kink.id))
      .map(kink => kink.id === FOLLOW_UP && folio ? {
        ...kink,
        name: "Elkaar met een titel aanspreken",
        description: "Spreekt het je aan om binnen een D/s-dynamiek een afgesproken titel te gebruiken, zoals Sir, Meesteres of prinses? Spreek samen af welke titel past, wie die gebruikt en wanneer die geldt.",
      } : kink);
  }, [folio, followUpStudy, round.visibleKinks]);
  const queue = useMemo(() => {
    if (!followUpStudy) return round.queue;
    return FOLLOW_UP_STUDY_ORDER.flatMap(id => {
      const item = round.queue.find(candidate => candidate.kink.id === id);
      const kink = visibleKinks.find(candidate => candidate.id === id);
      return item && kink ? [{ ...item, kink }] : [];
    });
  }, [followUpStudy, round.queue, visibleKinks]);
  const answered = visibleKinks.filter(kink => entries[kink.id]?.status != null).length;

  function update(id: string, patch: Partial<KinkEntry>) {
    setEntries(previous => ({
      ...previous,
      [id]: { ...(previous[id] ?? { status: null, comment: "" }), ...patch },
    }));
  }

  const actions = useMemo(() => [
    { id: "compare-layout", label: followUpStudy
        ? (folio ? "Toon oorspronkelijke tekst" : "Toon nieuwe tekst")
        : (folio ? "Bekijk origineel" : "Bekijk prototype"),
      icon: <Columns size={19} />, placement: "primary" as const, onClick: () => setFolio(value => !value) },
    { id: "restart", label: "Opnieuw beginnen", icon: <ArrowsClockwise size={19} />,
      onClick: () => { setEntries({}); setSession(value => value + 1); } },
  ], [folio, followUpStudy]);
  useTopNavActions(actions, followUpStudy ? "Vervolgvraag" : folio ? "Vragenlijst · Prototype" : "Vragenlijst · Origineel", "/hot");

  return (
    <PageShell width="lg" flush className="questionnaire-study">
      <h1 className="sr-only">Vragenlijst uitproberen</h1>
      {!followUpStudy && folio && round.coverage.total > 0 && <progress className="folio-round-progress" aria-label="Beoordeelde onderwerpen"
        value={round.coverage.answered} max={round.coverage.total} />}
      <TriageDeck key={session} presentationStyle={folio || followUpStudy ? "folio" : "classic"} standalone
        kinks={visibleKinks} queueItems={queue} entries={entries}
        progressLabel={followUpStudy ? `${answered} beantwoord` : folio ? `${round.coverage.answered} / ${round.coverage.total}` : `Dynamic · ${round.coverage.answered} / ${round.coverage.total}`}
        onStatusChange={(id, status) => update(id, { status, desire: null })}
        onCuriousChange={(id, curious) => update(id, { curious })}
        onPrivateChange={(id, privateResponse) => update(id, { privateResponse })}
        onTagsChange={(id, tags) => update(id, { tags })}
      />
    </PageShell>
  );
}
