"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CaretDown,
  Check,
  Info,
  Sparkle,
  UserMinus,
} from "@phosphor-icons/react";
import { useHasHydrated, useStore } from "@/lib/store";
import { CATEGORIES, KINKS, kinkCategoryLabel } from "@/lib/kinks";
import {
  getQuestionnaireRuntime,
  type QuestionnaireIntent,
} from "@/lib/questionnaire";
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

  const shared = profile.origin === "shared" || (!profile.origin && profile.isImported === true);
  if (shared) {
    return (
      <PageShell width="lg">
        <EmptyState
          icon={UserMinus}
          title="Alleen-lezen profiel"
          message="Vragen invullen kan alleen op je eigen profiel. Gedeelde profielen blijven ongewijzigd."
          ctaHref={`/profile/${profile.id}`}
          ctaLabel="Terug naar profiel"
        />
      </PageShell>
    );
  }

  const activeRuntime = runtime!;
  const setup = profile.questionnaireSetup ?? defaultQuestionnaireSetup();
  const runtimeKind = activeRuntime.intent.kind;
  const catalogRated = KINKS.filter((kink) => profile.entries[kink.id]?.status != null).length;
  const activeCategory = runtimeKind === "category" ? activeRuntime.intent.category : null;
  const activeCategoryIds = activeCategory ? CATALOG_IDS_BY_CATEGORY.get(activeCategory) ?? [] : [];
  const activeCategoryRated = activeCategoryIds.filter((kinkId) => profile.entries[kinkId]?.status != null).length;
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
    updateProfileQuestionnaire(profile.id, {
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
    setEntry(profile.id, kinkId, { status, desire: null });
  }

  return (
    <main
      className="mx-auto flex w-full max-w-lg flex-col px-4"
      style={{
        minHeight: "calc(100dvh - var(--nav-h))",
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      data-testid="questions-screen"
    >
      <header className="flex-none pb-3">
        <div className="flex min-h-11 items-center gap-2">
          <Link
            href={`/profile/${profile.id}`}
            prefetch={false}
            aria-label="Terug naar profiel"
            className="focus-ring -ml-1 flex h-11 w-11 flex-none items-center justify-center rounded-xl"
            style={{ color: "var(--text2)" }}
          >
            <ArrowLeft size={19} aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--text2)" }}>
              Voorkeuren
            </p>
            <h1
              className="truncate text-xl leading-tight"
              style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 600, color: "var(--text)" }}
            >
              {profile.name}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setStatusExplainerOpen(true)}
            aria-label="Uitleg over antwoordkeuzes"
            className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-xl"
            style={{ color: "var(--text2)" }}
          >
            <Info size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full"
            role="progressbar"
            aria-label="Voortgang vragenlijst"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            style={{ background: "var(--surface3)" }}
          >
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${progressPercent}%`, background: "var(--accent)" }}
            />
          </div>
          <span className="flex-none text-[11px] tabular-nums" style={{ color: "var(--text2)" }}>
            {progressPercent}%
          </span>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar" aria-label="Vraagmodus">
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
            className="mt-2 grid grid-cols-2 gap-1.5 rounded-2xl p-2 ks-fade-in"
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
            entries={profile.entries}
            focusCategory={runtimeKind === "category" ? activeRuntime.intent.category : null}
            progressLabel={progressLabel}
            onStatusChange={updateStatus}
            onCuriousChange={(kinkId, value) => setEntry(profile.id, kinkId, { curious: value })}
            onPrivateChange={(kinkId, value) => setEntry(profile.id, kinkId, { privateResponse: value })}
            onTagsChange={(kinkId, tags) => setEntry(profile.id, kinkId, { tags })}
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
                href={`/profile/${profile.id}`}
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
