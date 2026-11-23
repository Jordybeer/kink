"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowsClockwise, Columns } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import TriageDeck from "@/components/TriageDeck";
import EditorialHeading from "@/components/ui/EditorialHeading";
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
        name: "Aanspreektitels",
        description: "En hoe sta je tegenover afgesproken titels, zoals Sir of Meesteres? Spreek samen af welke titel past, wie die gebruikt en wanneer die geldt.",
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
  const restart = useCallback(() => {
    setEntries({});
    setSession(value => value + 1);
  }, []);

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
      shortLabel: followUpStudy ? "Vergelijk" : undefined,
      icon: <Columns size={19} />, placement: "primary" as const, onClick: () => setFolio(value => !value) },
    { id: "restart", label: "Opnieuw beginnen", icon: <ArrowsClockwise size={19} />,
      onClick: restart },
  ], [folio, followUpStudy, restart]);
  useTopNavActions(actions, followUpStudy ? "Vragenlijst · Proef" : folio ? "Vragenlijst · Prototype" : "Vragenlijst · Origineel", "/hot");

  return (
    <PageShell width="lg" flush className="questionnaire-study">
      <h1 className="sr-only">Vragenlijst uitproberen</h1>
      {!followUpStudy && folio && round.coverage.total > 0 && <progress className="folio-round-progress" aria-label="Beoordeelde onderwerpen"
        value={round.coverage.answered} max={round.coverage.total} />}
      <TriageDeck key={session} presentationStyle={folio || followUpStudy ? "folio" : "classic"} standalone
        kinks={visibleKinks} queueItems={queue} entries={entries}
        showConversationCues={followUpStudy}
        completedContent={followUpStudy ? (
          <section className="mx-auto max-w-sm pt-10 text-center">
            <EditorialHeading title="Proef afgerond" level={2} size="compact" />
            <p className="mt-2 text-sm text-[var(--text2)]">
              {answered} {answered === 1 ? "vraag" : "vragen"} beantwoord.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5">
              <button type="button" onClick={restart} className="focus-ring ks-motion-choice min-h-11 rounded-md font-semibold text-[var(--accent-text)]">
                Opnieuw proberen
              </button>
              <Link href="/hot" className="focus-ring ks-motion-choice inline-flex min-h-11 items-center rounded-md text-[var(--text2)]">
                Terug naar de studio
              </Link>
            </div>
          </section>
        ) : undefined}
        progressLabel={followUpStudy ? `${answered} beantwoord` : folio ? `${round.coverage.answered} / ${round.coverage.total}` : `Dynamic · ${round.coverage.answered} / ${round.coverage.total}`}
        onStatusChange={(id, status) => update(id, { status, desire: null })}
        onCuriousChange={(id, curious) => update(id, { curious })}
        onPrivateChange={(id, privateResponse) => update(id, { privateResponse })}
        onTagsChange={(id, tags) => update(id, { tags })}
      />
    </PageShell>
  );
}
