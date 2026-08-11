"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CaretDown, Check, Info, Sparkle, UserMinus } from "@phosphor-icons/react";
import { useHasHydrated, useStore } from "@/lib/store";
import { CATEGORIES, KINKS, kinkCategoryLabel } from "@/lib/kinks";
import { getQuestionnaireRuntime, type QuestionnaireIntent } from "@/lib/questionnaire";
import { defaultQuestionnaireSetup } from "@/lib/questionnaireSetup";
import { updateProfileQuestionnaire } from "@/lib/profilePerspectives";
import type { KinkCategoryId, KinkStatus } from "@/types";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import TriageDeck from "@/components/TriageDeck";
import StatusExplainerSheet from "@/components/sheets/StatusExplainerSheet";

interface Props {
  params: Promise<{ id: string }>;
}

const DYNAMIC_INTENT = { kind: "dynamic" } as const satisfies QuestionnaireIntent;
type GlobalQuestionnaireIntent = Exclude<QuestionnaireIntent, { kind: "category" }>;

const CATALOG_IDS_BY_CATEGORY = new Map<KinkCategoryId, string[]>();
for (const kink of KINKS) {
  const ids = CATALOG_IDS_BY_CATEGORY.get(kink.category) ?? [];
  ids.push(kink.id);
  CATALOG_IDS_BY_CATEGORY.set(kink.category, ids);
}

export default function QuestionsScreen({ params }: Props) {
  const { id } = use(params);
  const hydrated = useHasHydrated();
  const { profiles, setEntry } = useStore();
  const profile = profiles.find((candidate) => candidate.id === id);
  const storedMode = profile?.questionnaireSetup?.mode;
  const [intent, setIntent] = useState<QuestionnaireIntent>(
    storedMode === "deepDive" ? { kind: "deepDive" } : DYNAMIC_INTENT,
  );
  const [categoryReturnIntent, setCategoryReturnIntent] = useState<GlobalQuestionnaireIntent>(
    storedMode === "deepDive" ? { kind: "deepDive" } : DYNAMIC_INTENT,
  );
  const [statusExplainerOpen, setStatusExplainerOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    const openStatusExplainer = () => setStatusExplainerOpen(true);
    window.addEventListener("ks:open-status-explainer", openStatusExplainer);
    return () => window.removeEventListener("ks:open-status-explainer", openStatusExplainer);
  }, []);

  const runtime = useMemo(
    () => profile ? getQuestionnaireRuntime(profile, { intent }) : null,
    [profile, intent],
  );

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
  const shared = currentProfile.origin === "shared" || (!currentProfile.origin && currentProfile.isImported === true);
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
  const setup = currentProfile.questionnaireSetup ?? defaultQuestionnaireSetup();
  const runtimeKind = activeRuntime.intent.kind;
  const catalogRated = KINKS.filter((kink) => currentProfile.entries[kink.id]?.status != null).length;
  const activeCategory = runtimeKind === "category" ? activeRuntime.intent.category : null;
  const activeCategoryIds = activeCategory ? CATALOG_IDS_BY_CATEGORY.get(activeCategory) ?? [] : [];
  const activeCategoryRated = activeCategoryIds.filter((kinkId) => currentProfile.entries[kinkId]?.status != null).length;
  const catalogProgress = runtimeKind === "discover" || runtimeKind === "deepDive";
  const progressPercent = activeCategory
    ? Math.round((activeCategoryRated / Math.max(1, activeCategoryIds.length)) * 100)
    : catalogProgress
      ? Math.round((catalogRated / KINKS.length) * 100)
      : activeRuntime.coverage.percent;
  const progressLabel = activeCategory
    ? `${kinkCategoryLabel(activeCategory)} · ${activeCategoryRated} / ${activeCategoryIds.length}`
    : catalogProgress
      ? `${runtimeKind === "discover" ? "Discover" : "Deep Dive"} · ${catalogRated} / ${KINKS.length}`
      : `Dynamic · ${activeRuntime.coverage.answered} / ${activeRuntime.coverage.total}`;
  const returnLabel = categoryReturnIntent.kind === "discover"
    ? "Discover"
    : categoryReturnIntent.kind === "deepDive"
      ? "Deep Dive"
      : "Dynamic";

  function saveMode(mode: "dynamic" | "deepDive") {
    updateProfileQuestionnaire(currentProfile.id, {
      mode,
      interests: [...setup.interests],
      version: 2,
    });
  }

  function startDynamic() {
    saveMode("dynamic");
    setIntent(DYNAMIC_INTENT);
    setCategoryReturnIntent(DYNAMIC_INTENT);
  }

  function startDiscover() {
    if (setup.mode === "deepDive") saveMode("dynamic");
    const next = { kind: "discover" } as const;
    setIntent(next);
    setCategoryReturnIntent(next);
  }

  function startDeepDive() {
    saveMode("deepDive");
    const next = { kind: "deepDive" } as const;
    setIntent(next);
    setCategoryReturnIntent(next);
  }

  function startCategory(category: KinkCategoryId) {
    if (runtimeKind !== "category") {
      setCategoryReturnIntent(activeRuntime.intent as GlobalQuestionnaireIntent);
    }
    setIntent({ kind: "category", category });
    setCategoriesOpen(false);
  }

  function leaveTemporaryIntent() {
    if (runtimeKind === "category") {
      setIntent(categoryReturnIntent);
      return;
    }
    startDynamic();
  }

  function updateStatus(kinkId: string, status: KinkStatus) {
    setEntry(currentProfile.id, kinkId, { status, desire: null });
  }

  return (
    <main
      className="mx-auto flex w-full max-w-lg flex-col overflow-hidden px-4"
      style={{
        height: "calc(100dvh - var(--nav-h))",
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

      <header className="flex-none pb-2">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar" aria-label="Vraagmodus">
          {([
            ["dynamic", "Dynamic", startDynamic],
            ["discover", "Discover", startDiscover],
            ["deepDive", "Deep Dive", startDeepDive],
          ] as const).map(([kind, label, action]) => {
            const active = runtimeKind === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={action}
                aria-pressed={active}
                className="focus-ring min-h-9 flex-none rounded-full px-3 text-xs font-semibold"
                style={active
                  ? { background: "var(--accent)", color: "var(--on-accent)", border: "1px solid var(--accent)" }
                  : { background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCategoriesOpen((open) => !open)}
            aria-expanded={categoriesOpen}
            className="focus-ring min-h-9 flex-none rounded-full px-3 text-xs font-semibold inline-flex items-center gap-1"
            style={activeCategory
              ? { background: "var(--surface3)", color: "var(--text)", border: "1px solid var(--border-accent)" }
              : { background: "var(--surface2)", color: "var(--text2)", border: "1px solid var(--border)" }}
          >
            {activeCategory ? kinkCategoryLabel(activeCategory) : "Categorie"}
            <CaretDown size={11} aria-hidden="true" />
          </button>
        </div>

        {categoriesOpen && (
          <div
            className="mt-2 grid max-h-[35dvh] grid-cols-2 gap-1.5 overflow-y-auto rounded-2xl p-2 ks-fade-in"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => startCategory(category)}
                className="focus-ring min-h-10 rounded-xl px-2 text-left text-xs"
                style={activeCategory === category
                  ? { color: "var(--accent-text)", background: "color-mix(in srgb, var(--accent) 10%, var(--surface2))" }
                  : { color: "var(--text2)" }}
              >
                {kinkCategoryLabel(category)}
              </button>
            ))}
          </div>
        )}

        {runtimeKind === "category" && (
          <div
            className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--text2)" }}>
              Alleen {kinkCategoryLabel(activeRuntime.intent.category)}
            </span>
            <button
              type="button"
              onClick={leaveTemporaryIntent}
              className="focus-ring min-h-9 flex-none rounded-lg px-2 text-xs font-semibold"
              style={{ color: "var(--accent-text)" }}
            >
              Terug naar {returnLabel}
            </button>
          </div>
        )}
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2" data-testid="questions-scroll-region">
        {!activeRuntime.complete ? (
          <TriageDeck
            key={runtimeKind === "category" ? `category:${activeRuntime.intent.category}` : runtimeKind}
            kinks={activeRuntime.visibleKinks}
            queueItems={activeRuntime.queue}
            entries={currentProfile.entries}
            focusCategory={runtimeKind === "category" ? activeRuntime.intent.category : null}
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
              {runtimeKind === "category" ? <Check size={20} weight="bold" aria-hidden="true" /> : <Sparkle size={20} weight="duotone" aria-hidden="true" />}
            </span>
            <h2
              className="mt-3 text-xl"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600, color: "var(--text)" }}
            >
              {runtimeKind === "category"
                ? `${kinkCategoryLabel(activeRuntime.intent.category)} is rond.`
                : runtimeKind === "dynamic"
                  ? "Brede profieldekking bereikt."
                  : "Voor nu alles op tafel."}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              {runtimeKind === "dynamic"
                ? "Niets is ingevuld of voorspeld. Je kunt verder ontdekken of bewust de volledige catalogus afwerken."
                : runtimeKind === "category"
                  ? "Alle onderwerpen in deze categorie hebben een expliciet antwoord."
                  : `${catalogRated} van ${KINKS.length} onderwerpen zijn expliciet beoordeeld.`}
            </p>
            {runtimeKind === "dynamic" && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startDiscover}
                  disabled={catalogRated === KINKS.length}
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
            {(runtimeKind === "discover" || runtimeKind === "category") && (
              <button
                type="button"
                onClick={leaveTemporaryIntent}
                className="focus-ring mt-4 min-h-11 w-full rounded-xl px-3 text-xs font-semibold"
                style={{ border: "1px solid var(--border)", color: "var(--accent-text)" }}
              >
                {runtimeKind === "category" ? `Terug naar ${returnLabel}` : "Genoeg voor nu"}
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
