"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Compass, Info, ListChecks, Sparkle, UserMinus } from "@phosphor-icons/react";
import { useHasHydrated, useStore } from "@/lib/store";
import { getQuestionnaireRuntime, type QuestionnaireIntent } from "@/lib/questionnaire";
import { defaultQuestionnaireSetup } from "@/lib/questionnaireSetup";
import { updateProfileQuestionnaire } from "@/lib/profilePerspectives";
import type { KinkStatus } from "@/types";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import TriageDeck from "@/components/TriageDeck";
import StatusExplainerSheet from "@/components/sheets/StatusExplainerSheet";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";

interface Props {
  params: Promise<{ id: string }>;
}

type GuidedQuestionnaireIntent = Exclude<QuestionnaireIntent, { kind: "category" }>;
const DYNAMIC_INTENT = { kind: "dynamic" } as const satisfies GuidedQuestionnaireIntent;

export default function QuestionsScreen({ params }: Props) {
  const { id } = use(params);
  const hydrated = useHasHydrated();
  const { profiles, setEntry } = useStore();
  const profile = profiles.find((candidate) => candidate.id === id);
  const storedMode = profile?.questionnaireSetup?.mode;
  const [intent, setIntent] = useState<GuidedQuestionnaireIntent>(DYNAMIC_INTENT);
  const [statusExplainerOpen, setStatusExplainerOpen] = useState(false);
  const seededMode = useRef(false);

  useEffect(() => {
    if (!hydrated || seededMode.current || !profile) return;
    seededMode.current = true;
    setIntent(storedMode === "deepDive" ? { kind: "deepDive" } : DYNAMIC_INTENT);
  }, [hydrated, profile, storedMode]);

  const runtime = useMemo(
    () => profile ? getQuestionnaireRuntime(profile, { intent }) : null,
    [profile, intent],
  );
  const setup = useMemo(
    () => profile?.questionnaireSetup ?? defaultQuestionnaireSetup(),
    [profile?.questionnaireSetup],
  );
  const runtimeKind = runtime?.intent.kind ?? "dynamic";
  const modeLabel = runtimeKind === "deepDive"
    ? "Deep Dive"
    : runtimeKind === "discover"
      ? "Discover"
      : "Dynamic";
  const shared = Boolean(profile && (profile.origin === "shared" || (!profile.origin && profile.isImported === true)));

  const saveMode = useCallback((mode: "dynamic" | "deepDive") => {
    if (!profile) return;
    updateProfileQuestionnaire(profile.id, {
      mode,
      interests: [...setup.interests],
      version: 2,
    });
  }, [profile, setup.interests]);

  const startDynamic = useCallback(() => {
    saveMode("dynamic");
    setIntent(DYNAMIC_INTENT);
  }, [saveMode]);

  const startDiscover = useCallback(() => {
    if (setup.mode === "deepDive") saveMode("dynamic");
    setIntent({ kind: "discover" });
  }, [saveMode, setup.mode]);

  const startDeepDive = useCallback(() => {
    saveMode("deepDive");
    setIntent({ kind: "deepDive" });
  }, [saveMode]);

  const navActions = useMemo<TopNavAction[]>(() => {
    if (!profile || shared) return [];
    return [
      {
        id: "questionnaire-help",
        label: "Uitleg antwoordkeuzes",
        icon: <Info size={18} aria-hidden="true" />,
        onClick: () => setStatusExplainerOpen(true),
        placement: "primary",
      },
      {
        id: "questionnaire-dynamic",
        label: "Dynamic",
        icon: <Sparkle size={17} aria-hidden="true" />,
        onClick: startDynamic,
        placement: "overflow",
        selected: runtimeKind === "dynamic",
      },
      {
        id: "questionnaire-discover",
        label: "Discover",
        icon: <Compass size={17} aria-hidden="true" />,
        onClick: startDiscover,
        placement: "overflow",
        selected: runtimeKind === "discover",
      },
      {
        id: "questionnaire-deep-dive",
        label: "Deep Dive",
        icon: <ListChecks size={17} aria-hidden="true" />,
        onClick: startDeepDive,
        placement: "overflow",
        selected: runtimeKind === "deepDive",
      },
    ];
  }, [profile, runtimeKind, shared, startDeepDive, startDiscover, startDynamic]);
  useTopNavActions(navActions, `Vragenlijst · ${modeLabel}`);

  if (!hydrated) return <PageShell loading width="lg" />;

  if (!profile) {
    return (
      <PageShell width="lg">
        <EmptyState
          icon={UserMinus}
          title="Profiel niet gevonden"
          message="Het is misschien verwijderd of de link is niet meer geldig."
          ctaHref="/"
          ctaLabel="Terug naar start"
        />
      </PageShell>
    );
  }

  const currentProfile = profile;
  if (shared) {
    return (
      <PageShell width="lg">
        <EmptyState
          icon={UserMinus}
          title="Alleen-lezen profiel"
          message="Vragen invullen kan alleen op je eigen profiel. Gedeelde profielen blijven ongewijzigd."
          ctaHref={`/profile/${currentProfile.id}`}
          ctaLabel="Terug naar profiel"
        />
      </PageShell>
    );
  }

  const activeRuntime = runtime!;
  const scopedProgress = activeRuntime.scope;
  const progressPercent = runtimeKind === "dynamic"
    ? activeRuntime.coverage.percent
    : Math.round((scopedProgress.answered / Math.max(1, scopedProgress.total)) * 100);
  const progressLabel = runtimeKind === "discover" || runtimeKind === "deepDive"
    ? `${runtimeKind === "discover" ? "Discover" : "Deep Dive"} · ${scopedProgress.answered} / ${scopedProgress.total}`
    : `Dynamic · ${activeRuntime.coverage.answered} / ${activeRuntime.coverage.total}`;
  const discoverComplete = getQuestionnaireRuntime(currentProfile, {
    intent: { kind: "discover" },
  }).complete;

  function updateStatus(kinkId: string, status: KinkStatus) {
    setEntry(currentProfile.id, kinkId, { status, desire: null });
  }

  return (
    <main
      className="mx-auto flex w-full max-w-lg flex-col overflow-hidden px-4"
      style={{
        height: "calc(var(--visual-viewport-height, 100dvh) - var(--nav-h))",
        paddingTop: "0.5rem",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      data-testid="questions-screen"
    >
      <div
        className="pointer-events-none fixed inset-x-0 z-[41] h-0.5 overflow-hidden"
        style={{ top: "calc(var(--nav-h) - 2px)", background: "var(--surface3)" }}
        role="progressbar"
        aria-label="Voortgang vragenlijst"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        data-testid="questions-top-progress"
      >
        <div
          className="h-full transition-[width]"
          style={{ width: `${progressPercent}%`, background: "var(--accent)" }}
        />
      </div>

      <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2" data-testid="questions-scroll-region">
        {!activeRuntime.complete ? (
          <TriageDeck
            key={runtimeKind}
            kinks={activeRuntime.visibleKinks}
            queueItems={activeRuntime.queue}
            entries={currentProfile.entries}
            focusCategory={null}
            progressLabel={progressLabel}
            onStatusChange={updateStatus}
            onCuriousChange={(kinkId, value) => setEntry(currentProfile.id, kinkId, { curious: value })}
            onPrivateChange={(kinkId, value) => setEntry(currentProfile.id, kinkId, { privateResponse: value })}
            onTagsChange={(kinkId, tags) => setEntry(currentProfile.id, kinkId, { tags })}
          />
        ) : (
          <div
            className="rounded-2xl p-5 text-center ks-fade-in"
            style={{ background: "var(--surface)", border: "1px solid var(--border-accent)" }}
          >
            <span
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--accent) 12%, var(--surface2))", color: "var(--accent)" }}
            >
              <Sparkle size={20} weight="duotone" aria-hidden="true" />
            </span>
            <h2
              className="mt-3 text-xl"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600, color: "var(--text)" }}
            >
              {runtimeKind === "dynamic" ? "Brede profieldekking bereikt." : "Voor nu alles op tafel."}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              {runtimeKind === "dynamic"
                ? "Niets is ingevuld of voorspeld. Je kunt verder ontdekken of bewust de volledige catalogus afwerken."
                : `${activeRuntime.scope.answered} van ${activeRuntime.scope.total} onderwerpen in deze modus zijn expliciet beoordeeld.`}
            </p>
            {runtimeKind === "dynamic" && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startDiscover}
                  disabled={discoverComplete}
                  className="focus-ring min-h-11 rounded-xl px-3 text-xs font-semibold disabled:opacity-40"
                  style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  Discover
                </button>
                <button
                  type="button"
                  onClick={startDeepDive}
                  className="focus-ring min-h-11 rounded-xl px-3 text-xs font-semibold"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  Deep Dive
                </button>
              </div>
            )}
            {runtimeKind === "discover" && (
              <button
                type="button"
                onClick={startDynamic}
                className="focus-ring mt-4 min-h-11 w-full rounded-xl px-3 text-xs font-semibold"
                style={{ border: "1px solid var(--border)", color: "var(--accent-text)" }}
              >
                Genoeg voor nu
              </button>
            )}
            {runtimeKind === "deepDive" && (
              <Link
                href={`/profile/${currentProfile.id}`}
                prefetch={false}
                className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-3 text-xs font-semibold"
                style={{ border: "1px solid var(--border)", color: "var(--accent-text)" }}
              >
                Terug naar profiel
              </Link>
            )}
          </div>
        )}
      </section>

      <StatusExplainerSheet open={statusExplainerOpen} onClose={() => setStatusExplainerOpen(false)} />
    </main>
  );
}
