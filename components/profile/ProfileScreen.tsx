"use client";

import { use, useEffect, useRef, useState } from "react";
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
import { STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";
import type { Kink, KinkCategoryId, KinkStatus } from "@/types";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import ProfileHero from "@/components/ProfileHero";
import ProfileSnapshotPanel from "@/components/ProfileSnapshotPanel";
import BdsmtestScores from "@/components/BdsmtestScores";
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
    setProfileAvatar,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const editQueryConsumed = useRef(false);
  const manageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreCatalogFocus = useRef(false);

  useEffect(() => {
    setRevealedPrivateResponses(new Set());
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

  const statusSegments = STATUS_ORDER.map((status) => ({
    status,
    count: KINKS.filter(
      (kink) => currentProfile.entries[kink.id]?.status === status
        && currentProfile.entries[kink.id]?.privateResponse !== true,
    ).length,
  })).filter((segment) => segment.count > 0);
  const ratedByCategory = visibleCategories.map((category) => ({
    category,
    kinks: (CATALOG_KINKS_BY_CATEGORY.get(category) ?? []).filter(
      (kink) => currentProfile.entries[kink.id]?.status,
    ),
  })).filter((section) => section.kinks.length > 0);

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
      {errorMessage && (
        <div
          role="alert"
          className="fixed left-4 right-4 top-4 z-[300] mx-auto max-w-md rounded-xl px-4 py-3 text-sm shadow-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
        >
          {errorMessage}
        </div>
      )}

      <h1 className="sr-only">{currentProfile.name}</h1>

      {!catalogOpen && (
        <div
          data-testid="profile-summary"
          className="mx-[var(--page-gutter)] mb-4 rounded-[24px]"
          style={{
            background: "linear-gradient(145deg, color-mix(in srgb, var(--accent) 6%, var(--surface2)), color-mix(in srgb, var(--surface) 90%, var(--surface2)))",
            border: "1px solid color-mix(in srgb, var(--border-accent) 62%, var(--border))",
            boxShadow: "0 14px 34px color-mix(in srgb, var(--bg) 35%, transparent)",
          }}
        >
          <ProfileHero
            profile={currentProfile}
            onShare={shared ? undefined : () => setShareOpen(true)}
            onEdit={shared ? undefined : () => setEditing(true)}
            onAvatarChange={(dataUrl) => setProfileAvatar(currentProfile.id, dataUrl)}
            onError={(message) => {
              setErrorMessage(message);
              window.setTimeout(() => setErrorMessage(null), 5000);
            }}
            profileType={getProfileType(currentProfile, pinnedProfileId)}
            embedded
          />

          {(currentProfile.bdsmtestScores?.length ?? 0) > 0 && (
            <BdsmtestScores scores={currentProfile.bdsmtestScores!} url={currentProfile.bdsmtestUrl} embedded />
          )}

          {!shared && (
            <Link
              href={`/profile/${currentProfile.id}/questions`}
              className="focus-ring flex min-h-[68px] items-center gap-3 rounded-b-[24px] border-t px-4 py-3"
              style={{
                background: "color-mix(in srgb, var(--accent) 5%, transparent)",
                borderColor: "var(--border)",
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {coverage.complete ? "Verder ontdekken" : totalRated > 0 ? "Verder invullen" : "Start met vragen"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
                  {coverage.complete
                    ? "Je eerste ronde is afgerond. Discover en Deep Dive blijven beschikbaar."
                    : totalRated > 0
                      ? "Ga verder waar je gebleven bent."
                      : "Beantwoord vragen in je eigen tempo."}
                </p>
              </div>
              <ArrowRight size={16} weight="bold" aria-hidden="true" style={{ color: "var(--accent)" }} />
            </Link>
          )}
        </div>
      )}

      {!shared && !catalogOpen && (
        <div className="mx-[var(--page-gutter)] mb-4">
          <button
            ref={manageTriggerRef}
            type="button"
            onClick={() => setCatalogOpen(true)}
            aria-expanded="false"
            aria-controls="profile-catalog-manager"
            className="focus-ring flex min-h-12 w-full items-center gap-3 border-y px-1 text-left"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="min-w-0 flex-1 py-2">
              <span className="block text-sm font-semibold">Onderwerpen beheren</span>
              <span className="mt-0.5 block text-xs" style={{ color: "var(--text2)" }}>
                {catalogRated} van {KINKS.length} beoordeeld
              </span>
            </span>
            <ArrowRight size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />
          </button>
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
              className="focus-ring mt-2 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
              style={catalogCategoryFilter
                ? { background: "color-mix(in srgb, var(--accent) 6%, var(--surface))", color: "var(--text)", border: "1px solid var(--border-accent)" }
                : { background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              <span className="truncate">{catalogCategoryFilterLabel}</span>
              <CaretDown size={11} className="flex-none" aria-hidden="true" />
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
                    onChooseCategory={() => setCategoriesOpen(true)}
                    openByDefault={catalogCategoryFilter === category}
                  />
                );
              })}

              {!catalogCategoryFilter && (
                <section className="mt-3 rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
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
          {totalRated > 0 && statusSegments.length > 0 && (
            <div
              role="img"
              aria-label={statusSegments.map((segment) => `${segment.count} ${STATUS_LABEL[segment.status]}`).join(", ")}
              className="mb-4 flex h-1.5 overflow-hidden rounded-full"
              style={{ background: "var(--surface2)" }}
            >
              {statusSegments.map((segment) => (
                <div
                  key={segment.status}
                  className="h-full"
                  style={{ flex: segment.count, background: STATUS_VAR[segment.status] }}
                />
              ))}
            </div>
          )}

          {totalRated === 0 ? (
            <div className="py-8 text-center">
              <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>Nog niets beoordeeld.</p>
              {!shared && (
                <Link
                  href={`/profile/${currentProfile.id}/questions`}
                  className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold"
                  style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
                >
                  Start met vragen
                </Link>
              )}
            </div>
          ) : (
            ratedByCategory.map(({ category, kinks }) => (
              <section key={category} className="mb-4">
                <h3
                  className="mb-2 text-base italic"
                  style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
                >
                  {kinkCategoryLabel(category)}
                </h3>
                <div className="flex flex-col gap-1.5">
                  {kinks.map((kink) => {
                    const entry = currentProfile.entries[kink.id];
                    const status = entry.status!;
                    const concealed = !!entry.privateResponse && !privateResponseRevealed(kink.id);
                    return (
                      <div
                        key={kink.id}
                        className="rounded-xl px-3 py-2.5"
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderLeft: concealed ? "4px solid transparent" : `4px solid ${STATUS_VAR[status]}`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-sm">{kink.name}</span>
                          {!concealed && entry.curious && <Star aria-hidden="true" size={11} weight="fill" style={{ color: "var(--curious)" }} />}
                          <PrivateResponseStatus
                            status={status}
                            privateResponse={entry.privateResponse === true}
                            concealed={concealed}
                            subject={kink.name}
                            onReveal={() => revealPrivateResponse(kink.id)}
                            onConceal={() => concealPrivateResponse(kink.id)}
                          />
                        </div>
                        {!concealed && entry.comment && (
                          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{entry.comment}</p>
                        )}
                        {!concealed && (entry.tags?.length ?? 0) > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {entry.tags!.map((tag) => (
                              <span key={tag} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--tag-muted)", color: "var(--text2)" }}>
                                {tag === "vraag eerst" ? "Eerst vragen" : tag === "eerste keer" ? "Eerste keer" : tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}

          {shared && (
            <section className="mt-4">
              <label className="mb-1.5 block text-sm italic" style={{ color: "var(--text2)" }}>
                Persoonlijke notitie
              </label>
              <textarea
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
                <label className="mb-2 flex items-center gap-2 text-xs" style={{ color: "var(--text2)" }}>
                  <input
                    type="checkbox"
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

function hasPrivateResponses(entries: Record<string, { status?: KinkStatus | null; privateResponse?: boolean }>) {
  return Object.values(entries).some((entry) => entry.status && entry.privateResponse);
}
