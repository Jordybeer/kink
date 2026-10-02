"use client";

import { use, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CaretDown,
  FileArrowDown,
  FileText,
  Lock,
  Star,
  UserMinus,
} from "@phosphor-icons/react";
import { useStore, useHasHydrated } from "@/lib/store";
import { CATEGORIES, KINKS, LEVEL_MAX, kinkCategoryLabel } from "@/lib/kinks";
import { questionnaireCoverage, searchAllKinks } from "@/lib/questionnaire";
import { getProfileType } from "@/lib/profileType";
import { privateResponseKey } from "@/lib/privateResponses";
import { buildProfileTextExport } from "@/lib/profileTextExport";
import { buildProfilePdf } from "@/lib/profilePdf";
import { buildProfileStatusReadSummary, type ProfileReadItem } from "@/lib/profileReadSummary";
import { useMotionSafe } from "@/lib/motion";
import { STATUS_LABEL, STATUS_VAR } from "@/lib/statusLabels";
import type { Kink, KinkCategoryId, KinkStatus } from "@/types";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import ProfileHero from "@/components/ProfileHero";
import ProfileSnapshotPanel from "@/components/ProfileSnapshotPanel";
import PrivateResponseStatus from "@/components/PrivateResponseStatus";
import CategorySection from "@/components/CategorySection";
import KinkListRow from "@/components/KinkListRow";
import KinkEditSheet from "@/components/KinkEditSheet";
import CategoryFilterSheet from "@/components/profile/CategoryFilterSheet";
import ProfileEditSheet from "@/components/sheets/ProfileEditSheet";
import QRModal from "@/components/QRModal";

interface Props {
  params: Promise<{ id: string }>;
}

const EMPTY_KINKS: Kink[] = [];

const CATALOG_KINKS_BY_CATEGORY = new Map<KinkCategoryId, Kink[]>();
for (const kink of KINKS) {
  const categoryKinks = CATALOG_KINKS_BY_CATEGORY.get(kink.category) ?? [];
  categoryKinks.push(kink);
  CATALOG_KINKS_BY_CATEGORY.set(kink.category, categoryKinks);
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useHasHydrated();
  const {
    profiles,
    setEntry,
    addCustomKink,
    removeCustomKink,
    updatePrivateNote,
    pinnedProfileId,
    profileSnapshots,
    saveProfileSnapshot,
  } = useStore();
  const profile = profiles.find((candidate) => candidate.id === id);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<KinkCategoryId | null>(null);
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [editKink, setEditKink] = useState<Kink | null>(null);
  const [editing, setEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [includePrivateExports, setIncludePrivateExports] = useState(false);
  const [revealedPrivateResponses, setRevealedPrivateResponses] = useState<Set<string>>(new Set());
  const [expandedReadStatuses, setExpandedReadStatuses] = useState<Set<NonNullable<KinkStatus>>>(new Set());
  const [privateReadOpen, setPrivateReadOpen] = useState(false);
  const editQueryConsumed = useRef(false);
  const manageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreCatalogFocus = useRef(false);
  const motionSafe = useMotionSafe();

  useEffect(() => {
    setRevealedPrivateResponses(new Set());
    setExpandedReadStatuses(new Set());
    setPrivateReadOpen(false);
    setIncludePrivateExports(false);
    setEditing(false);
    setCatalogOpen(false);
    setCategoriesOpen(false);
    setCatalogCategoryFilter(null);
    setSearch("");
    editQueryConsumed.current = false;
    restoreCatalogFocus.current = false;
  }, [id]);

  useEffect(() => {
    if (catalogOpen || !restoreCatalogFocus.current) return;
    restoreCatalogFocus.current = false;
    manageTriggerRef.current?.focus();
  }, [catalogOpen]);

  useEffect(() => {
    if (!hydrated || !profile || profile.origin === "shared" || profile.isImported) return;
    if (editQueryConsumed.current || searchParams.get("edit") !== "1") return;

    editQueryConsumed.current = true;
    setEditing(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("edit");
    const query = nextParams.toString();
    router.replace(`/profile/${profile.id}${query ? `?${query}` : ""}`, { scroll: false });
  }, [hydrated, profile, router, searchParams]);

  if (!hydrated) return <PageShell loading width="2xl" />;

  if (!profile) {
    return (
      <PageShell width="2xl">
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
  const coverage = questionnaireCoverage(currentProfile);
  const shared = currentProfile.origin === "shared" || (!currentProfile.origin && currentProfile.isImported === true);
  const visibleCategories = CATEGORIES;
  const exportMaxLevel = LEVEL_MAX.diepgaand;
  const searchTerm = search.trim();
  const customKinks = currentProfile.customKinks ?? [];
  const catalogRated = KINKS.filter((kink) => currentProfile.entries[kink.id]?.status != null).length;
  const totalRated = catalogRated;
  const catalogCategoryFilterLabel = catalogCategoryFilter
    ? kinkCategoryLabel(catalogCategoryFilter)
    : "Alle categorieën";
  const catalogCategories = catalogCategoryFilter ? [catalogCategoryFilter] : visibleCategories;
  const categoryFilterOptions = visibleCategories.map((category) => {
    const categoryKinks = CATALOG_KINKS_BY_CATEGORY.get(category) ?? EMPTY_KINKS;
    return {
      id: category,
      label: kinkCategoryLabel(category),
      rated: categoryKinks.filter((kink) => currentProfile.entries[kink.id]?.status != null).length,
      total: categoryKinks.length,
    };
  });
  const searchResults = searchTerm
    ? searchAllKinks(searchTerm).filter(
        (kink) => catalogCategoryFilter === null || kink.category === catalogCategoryFilter,
      )
    : [];

  const readSummary = buildProfileStatusReadSummary(KINKS, currentProfile.entries);
  const hardLimitGroup = readSummary.groups.find((group) => group.status === "hard_no") ?? null;
  const interestGroups = readSummary.groups.filter((group) => group.status !== "hard_no");


  function updateStatus(kinkId: string, status: KinkStatus) {
    setEntry(currentProfile.id, kinkId, { status, desire: null });
  }

  function privateResponseRevealed(kinkId: string): boolean {
    return revealedPrivateResponses.has(privateResponseKey(currentProfile.id, kinkId));
  }

  function revealPrivateResponse(kinkId: string) {
    const key = privateResponseKey(currentProfile.id, kinkId);
    setRevealedPrivateResponses((current) => new Set(current).add(key));
  }

  function concealPrivateResponse(kinkId: string) {
    const key = privateResponseKey(currentProfile.id, kinkId);
    setRevealedPrivateResponses((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  function toggleReadStatus(status: NonNullable<KinkStatus>) {
    setExpandedReadStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }


  function addCustom(event: React.FormEvent) {
    event.preventDefault();
    if (!customInput.trim()) return;
    addCustomKink(currentProfile.id, customInput.trim());
    setCustomInput("");
  }

  function closeCatalogManager() {
    restoreCatalogFocus.current = true;
    setCatalogOpen(false);
    setCategoriesOpen(false);
    setSearch("");
    setCatalogCategoryFilter(null);
  }

  function downloadText() {
    const text = buildProfileTextExport(currentProfile, exportMaxLevel, {
      includePrivateResponses: includePrivateExports,
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${currentProfile.name}-kinks.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    const { doc, filename } = await buildProfilePdf(currentProfile, exportMaxLevel, {
      includePrivateResponses: includePrivateExports,
    });
    doc.save(filename);
  }

  return (
    <main className="mx-auto w-full max-w-3xl pt-6">
      <h1 className="sr-only">{currentProfile.name}</h1>

      {!catalogOpen && (
        <div data-testid="profile-summary" className="mx-[var(--page-gutter)] mb-6">
          <ProfileHero
            profile={currentProfile}
            onShare={shared ? undefined : () => setShareOpen(true)}
            onEdit={shared ? undefined : () => setEditing(true)}
            profileType={getProfileType(currentProfile, pinnedProfileId)}
            embedded
          />

          {!shared && (
            <section
              className="mt-6 border-t pt-4"
              style={{ borderColor: "var(--border)" }}
              aria-labelledby="profile-questionnaire-title"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id="profile-questionnaire-title" className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                  Vragenlijst
                </h2>
                <span className="text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                  {catalogRated} van {KINKS.length} beoordeeld
                </span>
              </div>

              <Link
                href={`/profile/${currentProfile.id}/questions`}
                className="focus-ring mt-1 flex min-h-[68px] items-center gap-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold" style={{ color: "var(--text)" }}>
                    {coverage.complete ? "Verder ontdekken" : totalRated > 0 ? "Verder invullen" : "Start met vragen"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                    {coverage.complete
                      ? "Je eerste ronde is afgerond. Discover en Deep Dive blijven beschikbaar."
                      : totalRated > 0
                        ? "Ga verder waar je gebleven bent."
                        : "Beantwoord vragen in je eigen tempo."}
                  </p>
                </div>
                <ArrowRight size={16} weight="regular" aria-hidden="true" style={{ color: "var(--text2)" }} />
              </Link>

              <button
                ref={manageTriggerRef}
                type="button"
                onClick={() => setCatalogOpen(true)}
                aria-expanded="false"
                aria-controls="profile-catalog-manager"
                className="focus-ring inline-flex min-h-11 items-center gap-1.5 text-sm font-medium"
                style={{ color: "var(--text2)" }}
              >
                Onderwerpen beheren
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </section>
          )}
        </div>
      )}

      {catalogOpen && !shared ? (
        <section id="profile-catalog-manager" className="pb-5" aria-label="Onderwerpen beheren">
          <div
            data-testid="profile-catalog-manager-header"
            className="mb-3 flex items-center gap-3 border-b px-[var(--page-gutter)] pb-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">Onderwerpen beheren</h2>
              <p className="mt-0.5 text-xs tabular-nums" style={{ color: "var(--text2)" }}>
                {catalogRated} van {KINKS.length} beoordeeld
              </p>
            </div>
            <button
              type="button"
              onClick={closeCatalogManager}
              className="focus-ring min-h-11 rounded-lg px-2.5 text-sm font-semibold"
              style={{ color: "var(--accent-text)" }}
            >
              Gereed
            </button>
          </div>

          <div className="mb-3 px-[var(--page-gutter)]" data-testid="profile-catalog-controls">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Volledige catalogus doorzoeken"
              placeholder={catalogCategoryFilter ? `Zoek in ${catalogCategoryFilterLabel}…` : "Zoek in de volledige catalogus…"}
              className="focus-ring min-h-11 w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            />

            <button
              type="button"
              onClick={() => setCategoriesOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={categoriesOpen}
              aria-label={`Categorie, ${catalogCategoryFilterLabel}`}
              className="focus-ring mt-1 flex min-h-11 w-full items-center gap-3 border-b py-2 text-left text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              <span className="flex-none" style={{ color: "var(--text2)" }}>Categorie</span>
              <span className="ml-auto min-w-0 truncate font-semibold">{catalogCategoryFilterLabel}</span>
              <CaretDown size={13} className="flex-none" aria-hidden="true" style={{ color: "var(--text2)" }} />
            </button>
          </div>

          {!searchTerm ? (
            <div className="px-[var(--page-gutter)]">
              {catalogCategories.map((category) => {
                const kinks = CATALOG_KINKS_BY_CATEGORY.get(category) ?? [];
                if (!kinks.length) return null;
                return (
                  <CategorySection
                    key={category}
                    category={category}
                    kinks={kinks}
                    entries={currentProfile.entries}
                    onEdit={setEditKink}
                    openByDefault={catalogCategoryFilter === category}
                  />
                );
              })}

              {!catalogCategoryFilter && (
                <section className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <h3 className="mb-2 text-sm font-semibold">Eigen onderwerpen</h3>
                  <div className="mb-3 flex flex-col gap-1">
                    {customKinks.map((custom) => {
                      const customAsKink: Kink = {
                        id: custom.id,
                        name: custom.name,
                        category: "custom",
                        level: 1,
                      };
                      return (
                        <div key={custom.id} className="flex items-center gap-1">
                          <div className="flex-1">
                            <KinkListRow
                              kink={customAsKink}
                              entry={currentProfile.entries[custom.id] ?? { status: null, comment: "" }}
                              onOpen={() => setEditKink(customAsKink)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomKink(currentProfile.id, custom.id)}
                            aria-label={`${custom.name} verwijderen`}
                            className="focus-ring h-11 w-11 rounded-full"
                            style={{ color: "var(--hard-no)" }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={addCustom} className="flex gap-2">
                    <input
                      value={customInput}
                      onChange={(event) => setCustomInput(event.target.value)}
                      aria-label="Eigen onderwerp toevoegen"
                      placeholder="Voeg iets eigens toe…"
                      className="focus-ring min-h-11 flex-1 rounded-xl px-3 text-sm focus:outline-none"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <button
                      type="submit"
                      className="focus-ring min-h-11 rounded-xl px-3 text-sm font-semibold"
                      style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
                    >
                      Toevoegen
                    </button>
                  </form>
                </section>
              )}
            </div>
          ) : (
            <div className="px-[var(--page-gutter)]">
              <div className="flex flex-col">
                {searchResults.map((kink) => (
                  <KinkListRow
                    key={kink.id}
                    kink={kink}
                    entry={currentProfile.entries[kink.id] ?? { status: null, comment: "" }}
                    onOpen={() => setEditKink(kink)}
                  />
                ))}
              </div>
              {searchResults.length === 0 && (
                <p className="py-8 text-center text-sm" style={{ color: "var(--text2)" }}>
                  Geen onderwerpen gevonden.
                </p>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="px-[var(--page-gutter)] pb-5" aria-label="Profieloverzicht">
          <h2
            className="mb-4 text-xl italic leading-tight"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
          >
            Interesses &amp; grenzen
          </h2>

          {totalRated === 0 ? (
            <p className="py-5 text-sm" style={{ color: "var(--text2)" }}>
              Nog geen onderwerpen beoordeeld.
            </p>
          ) : (
            <div data-testid="profile-status-overview">
              {hardLimitGroup && (
                <section
                  data-testid="profile-read-hard-limits"
                  className="rounded-xl px-3.5 py-3.5 [overflow-wrap:anywhere]"
                  style={{ background: "color-mix(in srgb, var(--hard-no) 5%, var(--surface))" }}
                  aria-labelledby="profile-hard-limits-title"
                >
                  <div className="mb-2.5 flex items-baseline gap-3">
                    <h3
                      id="profile-hard-limits-title"
                      className="min-w-0 flex-1 text-base font-semibold leading-6"
                      style={{ color: "var(--hard-no-text)" }}
                    >
                      Harde grenzen
                    </h3>
                    <span className="flex-none text-sm tabular-nums" style={{ color: "color-mix(in srgb, var(--hard-no) 24%, var(--text2))" }}>
                      {hardLimitGroup.items.length}
                    </span>
                  </div>
                  <ProfileReadItemsByCategory items={hardLimitGroup.items} showContext />
                </section>
              )}

              {interestGroups.length > 0 && (
                <section className={hardLimitGroup ? "mt-6" : ""} aria-labelledby="profile-interests-title">
                  <h3 id="profile-interests-title" className="mb-2 text-sm font-semibold" style={{ color: "var(--text2)" }}>
                    Interesses
                  </h3>

                  <div className="grid gap-3">
                    {interestGroups.map((group) => {
                      const expanded = expandedReadStatuses.has(group.status);
                      const contentId = `profile-read-status-${group.status}-content`;
                      const summaryId = `profile-read-status-${group.status}-summary`;
                      const preview = group.items.slice(0, 3);
                      const remaining = Math.max(0, group.items.length - preview.length);
                      const answerCountLabel = group.items.length === 1
                        ? "1 antwoord"
                        : `${group.items.length} antwoorden`;

                      return (
                        <motion.section
                          key={group.status}
                          layout={motionSafe.reduced ? false : "position"}
                          transition={motionSafe.disclosure}
                          className="[overflow-wrap:anywhere]"
                        >
                          <h4>
                            <button
                              type="button"
                              data-testid={`profile-read-status-${group.status}`}
                              onClick={() => toggleReadStatus(group.status)}
                              aria-expanded={expanded}
                              aria-controls={contentId}
                              aria-describedby={!expanded ? summaryId : undefined}
                              aria-label={`${STATUS_LABEL[group.status]}, ${answerCountLabel}. ${expanded ? "Details verbergen" : "Details tonen"}`}
                              className="focus-ring flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 motion-reduce:transition-none"
                              style={{
                                background: `color-mix(in srgb, ${STATUS_VAR[group.status]} ${expanded ? 9 : 5}%, var(--surface))`,
                              }}
                            >
                              <span
                                className="h-2 w-2 flex-none rounded-full"
                                style={{ background: STATUS_VAR[group.status] }}
                                aria-hidden="true"
                              />
                              <span className="min-w-0 flex-1 text-base font-semibold leading-6">
                                {STATUS_LABEL[group.status]}
                              </span>
                              <span
                                className="flex-none text-sm tabular-nums"
                                style={{ color: `color-mix(in srgb, ${STATUS_VAR[group.status]} 22%, var(--text2))` }}
                              >
                                {group.items.length}
                              </span>
                              <motion.span
                                className="flex flex-none"
                                animate={{ rotate: expanded ? 180 : 0 }}
                                transition={motionSafe.state}
                                aria-hidden="true"
                                style={{ color: `color-mix(in srgb, ${STATUS_VAR[group.status]} 22%, var(--text2))` }}
                              >
                                <CaretDown size={15} />
                              </motion.span>
                            </button>
                          </h4>

                          <div id={contentId} className="overflow-hidden">
                            <AnimatePresence initial={false} mode="sync">
                              {expanded ? (
                                <motion.div
                                  key="detail"
                                  initial={motionSafe.reduced ? { opacity: 0 } : { opacity: 0, y: 5, clipPath: "inset(0 0 8% 0)" }}
                                  animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
                                  exit={motionSafe.reduced ? { opacity: 0 } : { opacity: 0, y: -2, clipPath: "inset(0 0 4% 0)" }}
                                  transition={motionSafe.disclosure}
                                  className="px-4 pb-1 pt-2"
                                >
                                  <ProfileReadItemsByCategory items={group.items} showContext />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="summary"
                                  id={summaryId}
                                  data-testid={`profile-read-status-${group.status}-summary`}
                                  initial={motionSafe.reduced ? { opacity: 0 } : { opacity: 0, y: -2 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={motionSafe.reduced ? { opacity: 0 } : { opacity: 0, y: -2 }}
                                  transition={motionSafe.state}
                                  className="grid gap-0.5 px-4 pb-1 pt-2 text-base leading-6"
                                >
                                  {preview.map((item) => <span key={item.id}>{item.name}</span>)}
                                  {remaining > 0 && (
                                    <>
                                      <span
                                        className="mt-1 text-sm font-medium leading-5"
                                        style={{ color: STATUS_VAR[group.status] }}
                                        aria-hidden="true"
                                      >
                                        +{remaining} meer
                                      </span>
                                      <span className="sr-only">
                                        en {remaining} meer met status {STATUS_LABEL[group.status]}
                                      </span>
                                    </>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.section>
                      );
                    })}
                  </div>
                </section>
              )}

              {!shared && readSummary.privateItems.length > 0 && (
                <section className="mt-5 border-y" style={{ borderColor: "color-mix(in srgb, var(--border) 72%, transparent)" }}>
                  <h3>
                    <button
                      type="button"
                      data-testid="profile-read-private"
                      onClick={() => setPrivateReadOpen((open) => !open)}
                      aria-expanded={privateReadOpen}
                      aria-controls="profile-read-private-content"
                      className="focus-ring flex min-h-11 w-full items-center gap-3 py-3 text-left"
                    >
                      <Lock size={14} aria-hidden="true" className="flex-none" style={{ color: "var(--text2)" }} />
                      <span className="min-w-0 flex-1 text-sm font-semibold">Privéantwoorden</span>
                      <span className="flex-none text-sm tabular-nums" style={{ color: "var(--text2)" }}>
                        {readSummary.privateItems.length}
                      </span>
                      <motion.span
                        className="flex flex-none"
                        animate={{ rotate: privateReadOpen ? 180 : 0 }}
                        transition={motionSafe.state}
                        aria-hidden="true"
                        style={{ color: "var(--text2)" }}
                      >
                        <CaretDown size={15} />
                      </motion.span>
                    </button>
                  </h3>

                  <div id="profile-read-private-content" hidden={!privateReadOpen} className="pb-1">
                    {privateReadOpen ? readSummary.privateItems.map((item, index) => {
                      const entry = currentProfile.entries[item.id]!;
                      const concealed = !privateResponseRevealed(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex min-h-11 items-start gap-3 py-2.5 [overflow-wrap:anywhere]"
                          style={index > 0
                            ? { borderTop: "1px solid color-mix(in srgb, var(--border) 46%, transparent)" }
                            : undefined}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-5">{item.name}</p>
                            <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--text2)" }}>
                              {kinkCategoryLabel(item.category)}
                            </p>
                            {!concealed && entry.comment && (
                              <p className="mt-1 text-xs leading-5 [overflow-wrap:anywhere]" style={{ color: "var(--text2)" }}>
                                {entry.comment}
                              </p>
                            )}
                          </div>
                          <PrivateResponseStatus
                            status={entry.status}
                            privateResponse
                            concealed={concealed}
                            subject={item.name}
                            onReveal={() => revealPrivateResponse(item.id)}
                            onConceal={() => concealPrivateResponse(item.id)}
                            plain
                          />
                        </div>
                      );
                    }) : null}
                  </div>
                </section>
              )}
            </div>
          )}

          {shared && (
            <section className="mt-4">
              <label htmlFor="profile-private-note" className="mb-1.5 block text-sm italic" style={{ color: "var(--text2)" }}>
                Persoonlijke notitie
              </label>
              <textarea
                id="profile-private-note"
                value={currentProfile.privateNote ?? ""}
                onChange={(event) => updatePrivateNote(currentProfile.id, event.target.value)}
                rows={3}
                placeholder="Wanneer ontmoet, indrukken…"
                className="focus-ring w-full resize-none rounded-xl px-3 py-2.5 text-sm"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--text2)" }}>
                <Lock size={12} aria-hidden="true" /> Gedeeld profiel. Bewerken en opnieuw delen zijn uitgeschakeld.
              </p>
            </section>
          )}

          {!shared && totalRated > 0 && (
            <ProfileSnapshotPanel
              profileId={currentProfile.id}
              snapshots={profileSnapshots}
              currentEntries={currentProfile.entries}
              onSave={saveProfileSnapshot}
            />
          )}

          {!shared && totalRated > 0 && (
            <section className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>Download dit profiel</h3>
              <p className="mb-2 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                Tekst is screenreader-vriendelijk; PDF is opgemaakt voor scherm en A4-print.
              </p>
              {hasPrivateResponses(currentProfile.entries) && (
                <label className="mb-2 flex min-h-11 items-center gap-2 text-sm" style={{ color: "var(--text2)" }}>
                  <input
                    type="checkbox"
                    className="h-5 w-5 flex-none"
                    checked={includePrivateExports}
                    onChange={(event) => setIncludePrivateExports(event.target.checked)}
                  />
                  Privé antwoorden meenemen
                </label>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={downloadText}
                  aria-label="Download toegankelijke tekstexport"
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
                  style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <FileText aria-hidden="true" size={16} /> Tekst
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
                >
                  <FileArrowDown aria-hidden="true" size={16} /> PDF
                </button>
              </div>
            </section>
          )}
        </section>
      )}

      <CategoryFilterSheet
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        selected={catalogCategoryFilter}
        categories={categoryFilterOptions}
        totalRated={catalogRated}
        totalCount={KINKS.length}
        onSelect={setCatalogCategoryFilter}
      />
      <KinkEditSheet
        kink={editKink}
        entry={editKink ? (currentProfile.entries[editKink.id] ?? { status: null, comment: "" }) : { status: null, comment: "" }}
        onClose={() => setEditKink(null)}
        onStatusChange={(status) => { if (editKink) updateStatus(editKink.id, status); }}
        onTagsChange={(tags) => { if (editKink) setEntry(currentProfile.id, editKink.id, { tags }); }}
        onCuriousChange={(value) => { if (editKink) setEntry(currentProfile.id, editKink.id, { curious: value }); }}
        onPrivateChange={(value) => { if (editKink) setEntry(currentProfile.id, editKink.id, { privateResponse: value }); }}
      />
      <ProfileEditSheet open={editing && !shared} profile={currentProfile} onClose={() => setEditing(false)} />
      <QRModal profile={shareOpen && !shared ? currentProfile : null} onClose={() => setShareOpen(false)} />
    </main>
  );
}

function ProfileReadItemsByCategory({
  items,
  showContext,
}: {
  items: ProfileReadItem[];
  showContext?: boolean;
}) {
  const groups = CATEGORIES
    .map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="grid gap-4 [overflow-wrap:anywhere]">
      {groups.map((group) => (
        <div key={group.category}>
          <p className="mb-1.5 text-xs font-semibold leading-5" style={{ color: "var(--text2)" }}>
            {kinkCategoryLabel(group.category)}
          </p>
          <div className="grid gap-1">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="py-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <p className="min-w-0 text-base leading-6">{item.name}</p>
                  {item.curious && (
                    <Star aria-hidden="true" size={11} weight="fill" style={{ color: "var(--curious)" }} />
                  )}
                </div>
                {showContext && item.comment && (
                  <p className="mt-0.5 text-sm leading-5 [overflow-wrap:anywhere]" style={{ color: "var(--text2)" }}>
                    {item.comment}
                  </p>
                )}
                {showContext && item.tags.length > 0 && (
                  <p className="mt-0.5 text-xs leading-5" style={{ color: "var(--text2)" }}>
                    {item.tags.map((tag) => tag === "vraag eerst" ? "Eerst vragen" : tag === "eerste keer" ? "Eerste keer" : tag).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function hasPrivateResponses(entries: Record<string, { status?: KinkStatus | null; privateResponse?: boolean }>) {
  return Object.values(entries).some((entry) => entry.status && entry.privateResponse);
}
