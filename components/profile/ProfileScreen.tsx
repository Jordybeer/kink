"use client";

import { use, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CaretDown,
  FileArrowDown,
  FileText,
  Lock,
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
import { STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";
import type { Kink, KinkCategory, KinkCategoryId, KinkStatus, KinkEntry } from "@/types";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import ProfileHero from "@/components/ProfileHero";
import ProfileSnapshotPanel from "@/components/ProfileSnapshotPanel";
import CategorySection from "@/components/CategorySection";
import ProfileTopicRow from "./ProfileTopicRow";
import { pinnedPublicItems, profileInlineStatus } from "@/lib/profileInline";
import CategoryFilterSheet from "@/components/profile/CategoryFilterSheet";
import ProfileEditSheet from "@/components/sheets/ProfileEditSheet";
import QRModal from "@/components/QRModal";

interface Props {
  params: Promise<{ id: string }>;
}

const EMPTY_KINKS: Kink[] = [];
const PROFILE_READ_CATEGORIES: readonly KinkCategory[] = [...CATEGORIES, "custom"];

function profileReadCategoryLabel(category: KinkCategory): string {
  return category === "custom" ? "Eigen onderwerpen" : kinkCategoryLabel(category);
}

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
  const [editor, setEditor] = useState<{ kink: Kink; open: boolean; publicItems: ProfileReadItem[] } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<NonNullable<KinkStatus> | null>(null);
  const [editing, setEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [includePrivateExports, setIncludePrivateExports] = useState(false);
  const [revealedPrivateResponses, setRevealedPrivateResponses] = useState<Set<string>>(new Set());
  const [privateReadOpen, setPrivateReadOpen] = useState(false);
  const editQueryConsumed = useRef(false);
  const manageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreCatalogFocus = useRef(false);
  const motionSafe = useMotionSafe();
  const interestsParam = searchParams.get("interests");
  useEffect(() => {
    setRevealedPrivateResponses(new Set());
    setPrivateReadOpen(false);
    setIncludePrivateExports(false);
    setEditing(false);
    setEditor(null);
    setSelectedStatus(null);
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

  useEffect(() => {
    setEditor(null);
    setCatalogOpen(false);
    setSelectedStatus(null);
    if (interestsParam === "hard_no") document.getElementById("profile-hard-limits-title")?.focus();
  }, [interestsParam]);

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
  const shared = getProfileType(currentProfile, pinnedProfileId) === "partner";
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
  const matchingCustomKinks = !catalogCategoryFilter && searchTerm
    ? customKinks.filter((custom) => custom.name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()))
      .map((custom) => ({ ...custom, category: "custom" as const, level: 1 as const }))
    : [];
  const searchResults = searchTerm
    ? [...searchAllKinks(searchTerm), ...matchingCustomKinks].filter(
        (kink) => catalogCategoryFilter === null || kink.category === catalogCategoryFilter,
      )
    : [];

  const readSummary = buildProfileStatusReadSummary(
    [
      ...KINKS,
      ...customKinks.map((custom) => ({
        id: custom.id,
        name: custom.name,
        category: "custom" as const,
      })),
    ],
    currentProfile.entries,
  );
  const publicItems = readSummary.groups.flatMap((group) => group.items);
  const activeStatus = profileInlineStatus(STATUS_ORDER.find((status) => status === interestsParam) ?? selectedStatus, publicItems);
  const privateIds = new Set(Object.keys(currentProfile.entries).filter((kinkId) => currentProfile.entries[kinkId].privateResponse));
  // Freeze list membership through edits; current privacy always overrides the snapshot.
  const displayItems = pinnedPublicItems(editor?.open && !catalogOpen ? editor.publicItems : undefined, publicItems, privateIds);
  const interestItems = displayItems.filter((item) => item.status === activeStatus && item.status !== "hard_no");
  const pinnedLimits = displayItems.filter((item) => item.status === "hard_no");
  // New limits are immediately named below the interest editor, without moving it.
  const hardLimits = [...pinnedLimits, ...publicItems.filter((item) =>
    item.status === "hard_no" && !pinnedLimits.some((candidate) => candidate.id === item.id),
  )];
  const allKinks: Kink[] = [...KINKS, ...customKinks.map((custom) => ({ ...custom, category: "custom" as const, level: 1 as const }))];

  const privateKinks = allKinks.filter((kink) => readSummary.privateItems.some((item) => item.id === kink.id)
    || (editor?.open && editor.kink.id === kink.id && privateIds.has(kink.id)));

  function closeEditor() {
    setEditor((current) => current ? { ...current, open: false } : null);
  }
  function selectStatus(status: NonNullable<KinkStatus>) {
    closeEditor();
    setSelectedStatus(status);
    const next = new URLSearchParams(searchParams.toString());
    next.set("id", currentProfile.id);
    next.set("interests", status);
    router.push(`/profile?${next}`, { scroll: false });
  }
  function renderTopic(kink: Kink, editable = !shared) {
    const entry = currentProfile.entries[kink.id] ?? { status: null, comment: "" };
    const selected = editor?.kink.id === kink.id;
    return <ProfileTopicRow kink={kink} entry={entry} editable={editable}
      selected={selected} open={selected && !!editor?.open} concealed={!privateResponseRevealed(kink.id)}
      onToggle={() => {
        const closing = editor?.kink.id === kink.id && editor.open;
        const leavesList = entry.privateResponse ? !entry.status
          : editor?.publicItems.find((item) => item.id === kink.id)?.status !== entry.status;
        if (closing && !catalogOpen && leavesList) {
          document.getElementById(`profile-filter-${activeStatus}`)?.focus({ preventScroll: true });
        }
        setSelectedStatus(activeStatus);
        setEditor((current) => current?.kink.id === kink.id
          ? { ...current, open: !current.open, publicItems: current.open ? current.publicItems : publicItems }
          : { kink, open: true, publicItems });
      }}
      onReveal={() => revealPrivateResponse(kink.id)} onConceal={() => { closeEditor(); concealPrivateResponse(kink.id); }}
      onChange={(partial: Partial<KinkEntry>) => {
        if (shared) return;
        if (partial.privateResponse !== undefined) {
          setEditor(null);
          concealPrivateResponse(kink.id);
          document.getElementById(catalogOpen ? "profile-catalog-search" : `profile-filter-${activeStatus}`)?.focus({ preventScroll: true });
        }
        setEntry(currentProfile.id, kink.id, partial);
      }} />;
  }
  function renderReadItems(items: ProfileReadItem[]) {
    return <div className="grid gap-5 [overflow-wrap:anywhere]">
      {PROFILE_READ_CATEGORIES.map((category) => {
        const grouped = items.filter((item) => item.category === category);
        return grouped.length ? <section key={category} aria-label={profileReadCategoryLabel(category)}>
          <h4 className="mb-1 text-xl font-medium leading-6" style={{ fontFamily: "var(--font-display, Georgia, serif)" }}>{profileReadCategoryLabel(category)}</h4>
          {grouped.map((item) => {
            const kink = allKinks.find((candidate) => candidate.id === item.id)!;
            const duplicateLimit = item.status === "hard_no" && editor?.open && editor.kink.id === item.id
              && editor.publicItems.some((candidate) => candidate.id === item.id && candidate.status !== "hard_no");
            return <div key={item.id}>{renderTopic(kink, !shared && !duplicateLimit)}</div>;
          })}
        </section> : null;
      })}
    </div>;
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

  function addCustom(event: React.FormEvent) {
    event.preventDefault();
    if (!customInput.trim()) return;
    addCustomKink(currentProfile.id, customInput.trim());
    setCustomInput("");
  }

  function closeCatalogManager() {
    setEditor(null);
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
                className="ks-motion-choice focus-ring mt-1 flex min-h-[68px] items-center gap-4 py-2.5"
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
                onClick={() => { setEditor(null); setCatalogOpen(true); }}
                aria-expanded="false"
                aria-controls="profile-catalog-manager"
                className="ks-motion-choice focus-ring inline-flex min-h-11 items-center gap-1.5 text-sm font-medium"
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
              className="ks-motion-choice focus-ring min-h-11 rounded-lg px-2.5 text-sm font-semibold"
              style={{ color: "var(--accent-text)" }}
            >
              Gereed
            </button>
          </div>

          <div className="mb-3 px-[var(--page-gutter)]" data-testid="profile-catalog-controls">
            <input
              id="profile-catalog-search"
              value={search}
              onChange={(event) => { setEditor(null); setSearch(event.target.value); }}
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
              className="ks-motion-choice focus-ring mt-1 flex min-h-11 w-full items-center gap-3 border-b py-2 text-left text-sm"
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
                    renderRow={renderTopic}
                    onToggle={() => setEditor(null)}
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
                        <div key={custom.id} className="flex min-w-0 items-start gap-1">
                          <div className="min-w-0 flex-1">
                            {renderTopic(customAsKink)}
                          </div>
                          <button
                            type="button"
                            onClick={() => { setEditor(null); removeCustomKink(currentProfile.id, custom.id); }}
                            aria-label={`${custom.name} verwijderen`}
                            className="ks-motion-choice focus-ring h-11 w-11 rounded-full"
                            style={{ color: "var(--hard-no)" }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <form onSubmit={addCustom} className="flex min-w-0 flex-wrap gap-2">
                    <input
                      value={customInput}
                      onChange={(event) => setCustomInput(event.target.value)}
                      aria-label="Eigen onderwerp toevoegen"
                      placeholder="Voeg iets eigens toe…"
                      className="focus-ring min-h-11 min-w-0 flex-[1_1_10rem] rounded-xl px-3 text-sm focus:outline-none"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <button
                      type="submit"
                      className="ks-motion-choice focus-ring min-h-11 rounded-xl px-3 text-sm font-semibold"
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
                  <div key={kink.id}>{renderTopic(kink)}</div>
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
            id="profile-interests-title"
            tabIndex={-1}
            className="outline-none scroll-mt-[var(--nav-h)] mb-4 text-2xl italic leading-tight"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
          >
            Interesses &amp; grenzen
          </h2>

          <div data-testid="profile-status-overview">
            <div role="group" aria-label="Antwoordstatus" className="mb-5 grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-1 min-[480px]:grid-cols-2">
              {STATUS_ORDER.map((status) => {
                const count = publicItems.filter((item) => item.status === status).length;
                return <button key={status} id={`profile-filter-${status}`} type="button" onClick={() => selectStatus(status)}
                  data-testid={`profile-read-status-${status}`} aria-pressed={activeStatus === status}
                  aria-label={`${STATUS_LABEL[status]}, ${count} ${count === 1 ? "antwoord" : "antwoorden"}`}
                  className="focus-ring ks-motion-choice flex min-h-11 min-w-0 items-center gap-2 border-b-2 py-2 text-left text-sm"
                  style={{ borderColor: activeStatus === status ? STATUS_VAR[status] : "transparent" }}>
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: STATUS_VAR[status] }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{STATUS_LABEL[status]}</span>
                  <span className="w-10 flex-none text-right tabular-nums" style={{ color: "var(--text2)" }}>{count}</span>
                </button>;
              })}
            </div>
            {activeStatus !== "hard_no" && <section id={`profile-read-status-${activeStatus}-content`} aria-label={STATUS_LABEL[activeStatus]}>
              <h3 className="mb-4 text-base font-semibold">{STATUS_LABEL[activeStatus]}</h3>
              {interestItems.length ? renderReadItems(interestItems) : <p className="py-5 text-sm" style={{ color: "var(--text2)" }}>Nog geen openbare antwoorden met deze status.</p>}
            </section>}
            {(hardLimits.length > 0 || activeStatus === "hard_no") && <section data-testid="profile-read-hard-limits" aria-labelledby="profile-hard-limits-title"
              className="mt-6 border-y py-4 [overflow-wrap:anywhere]" style={{ borderColor: "color-mix(in srgb, var(--hard-no) 24%, var(--border))" }}>
              <h3 id="profile-hard-limits-title" tabIndex={-1} className="mb-3 scroll-mt-[var(--nav-h)] text-base font-semibold outline-none" style={{ color: "var(--hard-no-text)" }}>Harde grenzen</h3>
              {hardLimits.length ? renderReadItems(hardLimits) : <p className="text-sm" style={{ color: "var(--text2)" }}>Nog geen openbare harde grenzen.</p>}
            </section>}

            {!shared && privateKinks.length > 0 && (
              <section className="mt-5 border-y" style={{ borderColor: "color-mix(in srgb, var(--border) 72%, transparent)" }}>
                <h3>
                  <button
                    type="button"
                    data-testid="profile-read-private"
                    onClick={() => { closeEditor(); setPrivateReadOpen((open) => !open); }}
                    aria-expanded={privateReadOpen}
                    aria-controls="profile-read-private-content"
                    className="ks-motion-choice focus-ring flex min-h-11 w-full items-center gap-3 py-3 text-left"
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
                  {privateReadOpen ? privateKinks.map((kink) => {
                    return <div key={kink.id}>{renderTopic(kink)}</div>;
                  }) : null}
                </div>
              </section>
            )}
          </div>

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
                  className="ks-motion-choice focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
                  style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  <FileText aria-hidden="true" size={16} /> Tekst
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  className="ks-motion-choice focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
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
        onSelect={(category) => { setEditor(null); setCatalogCategoryFilter(category); }}
      />
      <ProfileEditSheet open={editing && !shared} profile={currentProfile} onClose={() => setEditing(false)} />
      <QRModal profile={shareOpen && !shared ? currentProfile : null} onClose={() => setShareOpen(false)} />
    </main>
  );
}

function hasPrivateResponses(entries: Record<string, { status?: KinkStatus | null; privateResponse?: boolean }>) {
  return Object.values(entries).some((entry) => entry.status && entry.privateResponse);
}
