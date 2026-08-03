"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChatCircle,
  FileArrowDown,
  FileText,
  Info,
  Lock,
  Star,
  UserMinus,
} from "@phosphor-icons/react";
import { useStore, useHasHydrated } from "@/lib/store";
import { CATEGORIES, LEVEL_MAX } from "@/lib/kinks";
import { getQuestionnaireKinks, searchAllKinks } from "@/lib/questionnaire";
import { useMotionSafe } from "@/lib/motion";
import { getProfileType } from "@/lib/profileType";
import { privateResponseKey } from "@/lib/privateResponses";
import { buildProfileTextExport } from "@/lib/profileTextExport";
import { buildProfilePdf } from "@/lib/profilePdf";
import { STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";
import type { Kink, KinkStatus } from "@/types";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";
import ProfileHero from "@/components/ProfileHero";
import ProfileTour from "@/components/ProfileTour";
import ProfileSnapshotPanel from "@/components/ProfileSnapshotPanel";
import BdsmtestScores from "@/components/BdsmtestScores";
import PrivateResponseStatus from "@/components/PrivateResponseStatus";
import SegmentedPill from "@/components/ui/SegmentedPill";
import TriageDeck from "@/components/TriageDeck";
import CategorySection from "@/components/CategorySection";
import KinkListRow from "@/components/KinkListRow";
import KinkEditSheet from "@/components/KinkEditSheet";
import StatusExplainerSheet from "@/components/sheets/StatusExplainerSheet";
import ProfileEditSheet from "@/components/sheets/ProfileEditSheet";
import QRModal from "@/components/QRModal";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProfilePage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const transition = useMotionSafe();
  const hydrated = useHasHydrated();
  const {
    profiles,
    setEntry,
    addCustomKink,
    removeCustomKink,
    setProfileAvatar,
    updatePrivateNote,
    profileTourComplete,
    completeProfileTour,
    pinnedProfileId,
    profileSnapshots,
    saveProfileSnapshot,
  } = useStore();
  const profile = profiles.find((candidate) => candidate.id === id);

  const [activeTab, setActiveTab] = useState<"overzicht" | "bewerken" | null>(null);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [search, setSearch] = useState("");
  const [deckFocus, setDeckFocus] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [editKink, setEditKink] = useState<Kink | null>(null);
  const [editing, setEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [statusExplainerOpen, setStatusExplainerOpen] = useState(false);
  const [tourVisible, setTourVisible] = useState(false);
  const [showOverviewComments, setShowOverviewComments] = useState(true);
  const [includePrivateExports, setIncludePrivateExports] = useState(false);
  const [revealedPrivateResponses, setRevealedPrivateResponses] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initializedProfileId = useRef<string | null>(null);
  const editQueryConsumed = useRef(false);
  const deckRef = useRef<HTMLDivElement>(null);

  const visibleKinks = useMemo(
    () => profile ? getQuestionnaireKinks(profile) : [],
    [profile],
  );
  const kinksByCategory = useMemo(() => {
    const groups = new Map<string, Kink[]>();
    for (const kink of visibleKinks) {
      const group = groups.get(kink.category) ?? [];
      group.push(kink);
      groups.set(kink.category, group);
    }
    return groups;
  }, [visibleKinks]);

  useEffect(() => {
    setRevealedPrivateResponses(new Set());
    setIncludePrivateExports(false);
    setEditing(false);
    initializedProfileId.current = null;
    editQueryConsumed.current = false;
  }, [id]);

  useEffect(() => {
    if (!hydrated || !profile || initializedProfileId.current === profile.id) return;
    initializedProfileId.current = profile.id;
    const hasRatings = Object.values(profile.entries).some((entry) => entry.status);
    setActiveTab(hasRatings ? "overzicht" : "bewerken");
  }, [hydrated, profile]);

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
    const sharedProfile = profile?.origin === "shared" || profile?.isImported === true;
    if (profileTourComplete || activeTab !== "bewerken" || sharedProfile) {
      setTourVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setTourVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, [profileTourComplete, activeTab, profile]);

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
  const shared = currentProfile.origin === "shared" || (!currentProfile.origin && currentProfile.isImported === true);
  const effectiveTab = shared ? "overzicht" : activeTab;
  const visibleCategories = CATEGORIES.filter((category) => kinksByCategory.has(category));
  const maxLevel = LEVEL_MAX[currentProfile.experienceLevel ?? "beginner"];
  const searchTerm = search.trim();
  const searchResults = searchTerm ? searchAllKinks(searchTerm) : [];
  const customKinks = currentProfile.customKinks ?? [];
  const totalRated = visibleKinks.filter((kink) => currentProfile.entries[kink.id]?.status).length;
  const hasPrivateResponses = Object.values(currentProfile.entries).some(
    (entry) => entry.status && entry.privateResponse,
  );

  const statusSegments = STATUS_ORDER.map((status) => ({
    status,
    count: visibleKinks.filter(
      (kink) => currentProfile.entries[kink.id]?.status === status
        && currentProfile.entries[kink.id]?.privateResponse !== true,
    ).length,
  })).filter((segment) => segment.count > 0);

  const ratedByCategory = visibleCategories.map((category) => ({
    category,
    kinks: (kinksByCategory.get(category) ?? []).filter(
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

  function downloadText() {
    const text = buildProfileTextExport(currentProfile, maxLevel, {
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
    const { doc, filename } = await buildProfilePdf(currentProfile, maxLevel, {
      includePrivateResponses: includePrivateExports,
    });
    doc.save(filename);
  }

  return (
    <main className="max-w-3xl mx-auto w-full pt-6">
      {tourVisible && <ProfileTour onComplete={completeProfileTour} />}

      {errorMessage && (
        <div
          role="alert"
          className="fixed top-4 left-4 right-4 mx-auto max-w-md z-[300] px-4 py-3 rounded-xl text-sm shadow-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
        >
          {errorMessage}
        </div>
      )}

      <h1 className="sr-only">{currentProfile.name}</h1>
      <div style={{ opacity: effectiveTab === "bewerken" ? 0.72 : 1 }}>
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
        />
      </div>

      {(currentProfile.bdsmtestScores?.length ?? 0) > 0 && (
        <BdsmtestScores scores={currentProfile.bdsmtestScores!} url={currentProfile.bdsmtestUrl} />
      )}

      {!shared && activeTab && (
        <div className="mx-4 mb-3">
          <SegmentedPill
            segments={[
              { value: "overzicht", label: "Overzicht" },
              { value: "bewerken", label: "Bewerken" },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {effectiveTab === "bewerken" && (
          <motion.section
            key="edit"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={transition.fast}
            className="pb-5"
          >
            <button
              type="button"
              onClick={() => setStatusExplainerOpen(true)}
              className="focus-ring flex items-center gap-2 px-3 py-2 mx-4 mb-3 text-xs rounded-lg"
              style={{ color: "var(--text2)", border: "1px solid var(--border)", background: "var(--surface2)" }}
            >
              <Info size={14} aria-hidden="true" />
              Wat betekenen deze keuzes?
            </button>

            <div className="px-4 mb-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Zoek in de volledige catalogus…"
                className="focus-ring w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              {currentProfile.questionnaireSetup && !searchTerm && (
                <p className="text-xs mt-1.5" style={{ color: "var(--text2)" }}>
                  {visibleKinks.length} onderwerpen in je startselectie. Zoeken toont altijd alles.
                </p>
              )}
            </div>

            {!searchTerm ? (
              <>
                <div className="px-4 mb-3">
                  <div
                    role="img"
                    aria-label={statusSegments.length
                      ? statusSegments.map((segment) => `${segment.count} ${STATUS_LABEL[segment.status]}`).join(", ")
                      : "Nog niets beoordeeld"}
                    className="h-1.5 rounded-full overflow-hidden flex mb-2"
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
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                    {visibleCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setActiveCategory(category);
                          setDeckFocus(category);
                          deckRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="focus-ring flex-none px-3 min-h-9 rounded-full text-xs font-semibold"
                        style={activeCategory === category
                          ? { background: "var(--accent)", color: "var(--on-accent)" }
                          : { border: "1px solid var(--border)", color: "var(--text2)" }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div ref={deckRef} className="px-4 mb-4" style={{ scrollMarginTop: "calc(var(--nav-h) + 12px)" }}>
                  <TriageDeck
                    kinks={visibleKinks}
                    entries={currentProfile.entries}
                    focusCategory={deckFocus}
                    onStatusChange={updateStatus}
                    onCuriousChange={(kinkId, value) => setEntry(currentProfile.id, kinkId, { curious: value })}
                    onPrivateChange={(kinkId, value) => setEntry(currentProfile.id, kinkId, { privateResponse: value })}
                    onTagsChange={(kinkId, tags) => setEntry(currentProfile.id, kinkId, { tags })}
                  />
                </div>

                <div className="px-4">
                  {visibleCategories.map((category) => {
                    const kinks = kinksByCategory.get(category) ?? [];
                    if (!kinks.length) return null;
                    return (
                      <CategorySection
                        key={category}
                        category={category}
                        kinks={kinks}
                        entries={currentProfile.entries}
                        onEdit={setEditKink}
                        onTriage={() => {
                          setDeckFocus(category);
                          deckRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        onBulkSkip={() => {
                          for (const kink of kinks) setEntry(currentProfile.id, kink.id, { status: "no" });
                        }}
                        onBulkRestore={(snapshot) => {
                          for (const [kinkId, entry] of Object.entries(snapshot)) {
                            setEntry(currentProfile.id, kinkId, entry);
                          }
                        }}
                      />
                    );
                  })}

                  <section className="rounded-xl mt-3 p-3" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <h3 className="text-sm font-semibold mb-2">Eigen onderwerpen</h3>
                    <div className="flex flex-col gap-1 mb-3">
                      {customKinks.map((custom) => {
                        const customAsKink: Kink = {
                          id: custom.id,
                          name: custom.name,
                          category: "Meer",
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
                              className="focus-ring w-10 h-10 rounded-full"
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
                        className="focus-ring flex-1 min-h-11 rounded-xl px-3 text-sm focus:outline-none"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                      />
                      <button
                        type="submit"
                        className="focus-ring min-h-11 px-3 rounded-xl text-sm font-semibold"
                        style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                      >
                        Toevoegen
                      </button>
                    </form>
                  </section>
                </div>
              </>
            ) : (
              <div className="px-4">
                <p className="text-xs mb-2" style={{ color: "var(--text2)" }}>
                  {searchResults.length} resultaten in de volledige catalogus
                </p>
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
                  <p className="text-center text-sm py-8" style={{ color: "var(--text2)" }}>
                    Geen onderwerpen gevonden.
                  </p>
                )}
              </div>
            )}
          </motion.section>
        )}

        {effectiveTab === "overzicht" && (
          <motion.section
            key="overview"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={transition.fast}
            className="px-4 pt-3 pb-5"
          >
            {totalRated === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm mb-3" style={{ color: "var(--text2)" }}>Nog niets beoordeeld.</p>
                {!shared && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("bewerken")}
                    className="focus-ring min-h-11 px-4 rounded-xl text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    Begin met beoordelen
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                    {totalRated} beoordeeld
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOverviewComments((value) => !value)}
                    aria-label={showOverviewComments ? "Verberg notities" : "Toon notities"}
                    className="focus-ring w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ color: showOverviewComments ? "var(--accent)" : "var(--text2)", border: "1px solid var(--border)" }}
                  >
                    <ChatCircle size={15} />
                  </button>
                </div>

                {ratedByCategory.map(({ category, kinks }) => (
                  <section key={category} className="mb-4">
                    <h3
                      className="text-base italic mb-2"
                      style={{ fontFamily: "var(--font-display, Georgia, serif)", fontWeight: 500 }}
                    >
                      {category}
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
                              <span className="text-sm flex-1">{kink.name}</span>
                              {!concealed && entry.curious && <Star size={11} weight="fill" style={{ color: "var(--curious)" }} />}
                              <PrivateResponseStatus
                                status={status}
                                privateResponse={entry.privateResponse === true}
                                concealed={concealed}
                                subject={kink.name}
                                onReveal={() => revealPrivateResponse(kink.id)}
                                onConceal={() => concealPrivateResponse(kink.id)}
                              />
                            </div>
                            {!concealed && showOverviewComments && entry.comment && (
                              <p className="text-xs mt-1" style={{ color: "var(--text2)" }}>{entry.comment}</p>
                            )}
                            {!concealed && (entry.tags?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {entry.tags!.map((tag) => (
                                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--tag-muted)", color: "var(--text2)" }}>
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
                ))}
              </>
            )}

            {shared && (
              <section className="mt-4">
                <label className="block text-sm italic mb-1.5" style={{ color: "var(--text2)" }}>
                  Persoonlijke notitie
                </label>
                <textarea
                  value={currentProfile.privateNote ?? ""}
                  onChange={(event) => updatePrivateNote(currentProfile.id, event.target.value)}
                  rows={3}
                  placeholder="Wanneer ontmoet, indrukken…"
                  className="focus-ring w-full rounded-xl px-3 py-2.5 text-sm resize-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <p className="text-xs mt-2 flex items-center justify-center gap-1.5" style={{ color: "var(--text2)" }}>
                  <Lock size={12} aria-hidden="true" /> Gedeeld profiel — bewerken en opnieuw delen zijn uitgeschakeld
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
                <h3 className="text-sm italic mb-2" style={{ color: "var(--text2)" }}>Download dit profiel</h3>
                {hasPrivateResponses && (
                  <label className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--text2)" }}>
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
                    className="focus-ring min-h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
                    style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    <FileText size={16} /> Tekst
                  </button>
                  <button
                    type="button"
                    onClick={downloadPdf}
                    className="focus-ring min-h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    <FileArrowDown size={16} /> PDF
                  </button>
                </div>
              </section>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <StatusExplainerSheet open={statusExplainerOpen} onClose={() => setStatusExplainerOpen(false)} />
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
