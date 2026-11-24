"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CaretDown, Check, Eye, EyeSlash, FunnelSimple, LockKey, MagnifyingGlass } from "@phosphor-icons/react";
import { useReducedMotionPreference } from "@/lib/motion";
import PageShell from "@/components/PageShell";
import ProfileTopicRow from "@/components/profile/ProfileTopicRow";
import Accordion from "@/components/ui/Accordion";
import TopicDetailsFields from "@/components/profile/TopicDetailsFields";
import StatusGlyph from "@/components/StatusGlyph";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import { CATEGORIES, KINKS, getKinksByCategory, kinkCategoryLabel } from "@/lib/kinks";
import { searchAllKinks } from "@/lib/questionnaire";
import { STATUS_HINT, STATUS_LABEL, STATUS_ORDER, STATUS_VAR } from "@/lib/statusLabels";
import type { Kink, KinkCategoryId, KinkEntry, KinkStatus } from "@/types";
import { useProfileDraft } from "../ProfileDrafts";
import styles from "./profile.module.css";

type Filter = NonNullable<KinkStatus>;
type Section = "interest" | "boundary" | "catalogue";
interface Editor { id: string; section: Section }
const initial: Record<string, KinkEntry> = {
  praise_kink: { status: "yes", comment: "Vooral als het spontaan is." },
  collar_leash: { status: "yes", comment: "" },
  wax_play: { status: "maybe", comment: "" },
  rope_bondage_give: { status: "willing", comment: "" },
  dominance_submission: { status: "no", comment: "" },
  choking: { status: "hard_no", comment: "" },
  blindfold_give: { status: "maybe", comment: "Alleen als we vooraf afspreken hoe we pauzeren.", privateResponse: true },
};
const unrated: KinkEntry = { status: null, comment: "" };
const navActions: TopNavAction[] = [];

function answerTone(status: Filter): CSSProperties {
  return { "--answer-tone": STATUS_VAR[status] } as CSSProperties;
}

function AnswerChoices({ current, onSelect }: { current: KinkStatus; onSelect: (status: KinkStatus) => void }) {
  return <div role="group" aria-label="Status kiezen" className={styles.choices}>
    {STATUS_ORDER.map(status => <button key={status} type="button" className="focus-ring" style={answerTone(status)}
      aria-pressed={current === status} onClick={() => onSelect(current === status ? null : status)}>
      <StatusGlyph status={status} size={18} />
      <span><strong>{STATUS_LABEL[status]}</strong><small>{STATUS_HINT[status]}</small></span>
      {current === status && <Check size={16} weight="bold" aria-hidden="true" />}
    </button>)}
  </div>;
}

function RevealedAnswer({ entry, onChange }: { entry: KinkEntry; onChange: (patch: Partial<KinkEntry>) => void }) {
  return (
    <div className={styles.openLane}>
      <div className={styles.revealContent}>
        <p className={styles.verdict} style={{ color: entry.status ? STATUS_VAR[entry.status] : "var(--text2)" }}>
          <StatusGlyph status={entry.status} size={15} />{entry.status ? STATUS_LABEL[entry.status] : "Nog niet beoordeeld"}
        </p>
        {entry.comment && <p>{entry.comment}</p>}
      </div>
      <Accordion trigger="Bewerk privéantwoord" className="mt-2" contentClassName="py-2">
        <AnswerChoices current={entry.status} onSelect={status => onChange({ status, desire: null })} />
        <TopicDetailsFields entry={entry} onChange={onChange} />
      </Accordion>
    </div>
  );
}

function PrivateAnswer({ kink, entry, open, toggle, onChange }: {
  kink: Kink; entry: KinkEntry; open: boolean; toggle: () => void; onChange: (change: Partial<KinkEntry>) => void;
}) {
  const id = `studio-private-${kink.id}`;
  return (
    <article className={styles.privateAnswer}>
      <div className={styles.privateHeading}>
        <div><strong>{kink.name}</strong><small>{kinkCategoryLabel(kink.category)}</small></div>
        <button type="button" className={`focus-ring ${styles.action}`} aria-expanded={open} aria-controls={id}
          aria-label={`Privéantwoord voor ${kink.name} ${open ? "verbergen" : "tonen"}`} onClick={toggle}>
          {open ? <Eye size={18} aria-hidden="true" /> : <EyeSlash size={18} aria-hidden="true" />}
          {open ? "Verberg" : "Onthul"}
        </button>
      </div>
      <div id={id} className={styles.privateLane}>
        {open ? <RevealedAnswer entry={entry} onChange={onChange} /> : <span className={styles.sealed}><LockKey size={15} aria-hidden="true" /> Alleen zichtbaar voor jou</span>}
      </div>
    </article>
  );
}

export default function ProfileStudy() {
  useTopNavActions(navActions, "Profiel · Studio", "/hot");
  return <PageShell width="lg" className={styles.study}>
    <header><p className={styles.kicker}>Voorbeeldprofiel</p><h1 className={styles.name}>Alex</h1></header>
    <ProfileInterests profileId="alex" seed={initial} />
  </PageShell>;
}

export function ProfileInterests({ profileId, seed }: { profileId: string; seed: Record<string, KinkEntry> }) {
  const { entries, updateEntry } = useProfileDraft(profileId, seed);
  const [soft, setSoft] = useState(false);
  const [filter, setFilter] = useState<Filter>(() => STATUS_ORDER.find(status =>
    Object.values(entries).some(entry => !entry.privateResponse && entry.status === status)) ?? "yes");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<KinkCategoryId | "">("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const searchOrigin = useRef<{ scrollY: number; changedTopic?: string } | null>(null);
  const activeFilter = useRef<HTMLButtonElement>(null);
  const resultList = useRef<HTMLDivElement>(null);
  const boundaryList = useRef<HTMLElement>(null);
  const lastSelection = useRef({ searchOpen, category, filter });
  const reduced = useReducedMotionPreference();

  useLayoutEffect(() => {
    const previous = lastSelection.current;
    lastSelection.current = { searchOpen, category, filter };
    if (reduced || previous.searchOpen !== searchOpen || (searchOpen ? previous.category === category : previous.filter === filter)) return;
    const list = !searchOpen && filter === "hard_no" ? boundaryList.current : resultList.current;
    if (!list || typeof list.animate !== "function") return;

    // Animate only the first few pieces of incoming text. Hit areas and the
    // rest of a long catalogue are already in their final, readable positions.
    const parts = Array.from(list.querySelectorAll<HTMLElement>("[data-answer-subject], [data-answer-verdict], [data-empty-result]")).slice(0, 6);
    const animations = parts.map((part, i) => part.animate([
      { transform: "translateY(5px)", opacity: 0.78 },
      { transform: "translateY(0)", opacity: 1 },
    ], { duration: 210, delay: i * 11, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "backwards" }));
    return () => animations.forEach(animation => animation.cancel());
  }, [searchOpen, category, filter, reduced, query]);

  useLayoutEffect(() => {
    if (searchOpen) {
      input.current?.focus({ preventScroll: true });
      return;
    }
    const origin = searchOrigin.current;
    if (!origin) return;
    searchOrigin.current = null;
    window.scrollTo({ top: origin.scrollY, behavior: "instant" });
    const selector = origin.changedTopic && `[data-kink-id="${CSS.escape(origin.changedTopic)}"] button[data-answer-summary]`;
    const row = selector && (resultList.current?.querySelector<HTMLButtonElement>(selector)
      ?? boundaryList.current?.querySelector<HTMLButtonElement>(selector));
    if (!row) {
      launch.current?.focus({ preventScroll: true });
      return;
    }
    row.focus({ preventScroll: true });
    row.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [searchOpen]);
  useEffect(() => {
    const hide = () => setRevealed(null);
    const onVisibility = () => { if (document.hidden) hide(); };
    window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", hide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function closeSearch() {
    const origin = searchOrigin.current;
    if (origin?.changedTopic) {
      const entry = entries[origin.changedTopic];
      if (entry?.status && !entry.privateResponse) setFilter(entry.status);
      else delete origin.changedTopic;
    }
    setSearchOpen(false);
    setQuery("");
    setCategory("");
    setEditor(null);
  }
  function patch(id: string, change: Partial<KinkEntry>) {
    if (editor?.id === id && searchOrigin.current) searchOrigin.current.changedTopic = id;
    updateEntry(id, change);
    if (change.privateResponse !== undefined) {
      setEditor(null);
      setRevealed(null);
      (searchOpen ? input.current : activeFilter.current)?.focus({ preventScroll: true });
    }
  }
  const owned = KINKS.filter(kink => entries[kink.id]);
  const publicEntries = owned.filter(kink => !entries[kink.id].privateResponse);
  const privateEntries = owned.filter(kink => entries[kink.id].privateResponse);
  const boundaries = publicEntries.filter(kink => entries[kink.id].status === "hard_no"
    || (editor?.id === kink.id && editor.section === "boundary"));
  const interests = publicEntries.filter(kink => editor?.id === kink.id
    ? editor.section === "interest"
    : entries[kink.id].status === filter);
  const searching = Boolean(query.trim());
  const catalogue = !searchOpen ? [] : searching ? searchAllKinks(query) : category ? getKinksByCategory(category) : publicEntries.filter(kink => entries[kink.id].status || (editor?.section === "catalogue" && editor.id === kink.id));
  const results = catalogue.filter(kink => (!category || kink.category === category) && !entries[kink.id]?.privateResponse);
  const showResults = searching || Boolean(category);

  function rows(items: Kink[], section: Section) {
    return items.map(kink => {
      const active = editor?.id === kink.id && editor.section === section;
      const pinnedBoundary = section === "boundary" && editor?.id === kink.id && !active;
      const entry = entries[kink.id] ?? unrated;
      return <ProfileTopicRow key={kink.id} kink={kink} entry={entry} showCategory
        answerChoices={active && <AnswerChoices current={entry.status} onSelect={status => patch(kink.id, { status, desire: null })} />}
        completion={section === "catalogue" ? { label: "Terug naar profiel", onClick: closeSearch } : undefined}
        editable={!pinnedBoundary} selected={active} open={active} concealed={false}
        onToggle={() => {
          setRevealed(null);
          setEditor(active ? null : { id: kink.id, section });
          if (active && section === "catalogue" && !showResults && !entry.status) input.current?.focus({ preventScroll: true });
          if (active && section !== "catalogue" && entries[kink.id]?.status !== (section === "boundary" ? "hard_no" : filter)) {
            activeFilter.current?.focus({ preventScroll: true });
          }
        }}
        onChange={change => patch(kink.id, change)} onReveal={() => setRevealed(kink.id)} onConceal={() => setRevealed(null)} />;
    });
  }

  return (
    <div className={styles.study}>
      <section aria-labelledby="studio-interests">
        <h2 id="studio-interests" className={styles.sectionTitle}>Interesses &amp; grenzen</h2>
        {searchOpen ? <section id="studio-search" aria-label="Catalogus" onKeyDown={event => {
          if (event.key === "Escape" && !event.nativeEvent.isComposing && !event.defaultPrevented) {
            event.preventDefault();
            closeSearch();
          }
        }}>
          <div className={styles.searchField}>
            <MagnifyingGlass size={18} aria-hidden="true" />
            <input ref={input} type="search" value={query} aria-label="Volledige catalogus doorzoeken"
              placeholder="Zoek in catalogus…" onChange={event => { setEditor(null); setQuery(event.target.value); }} />
            <button type="button" className="focus-ring" aria-label="Sluit catalogus" onClick={closeSearch}>Sluit</button>
          </div>
          <label className={styles.categoryPicker}>
            <FunnelSimple size={16} aria-hidden="true" />
            <strong aria-hidden="true">{category ? kinkCategoryLabel(category) : "Alle categorieën"}</strong>
            <CaretDown size={15} aria-hidden="true" />
            <select aria-label="Categorie" value={category} onChange={event => {
              setEditor(null); setRevealed(null); setCategory(event.target.value as KinkCategoryId | "");
            }}>
              <option value="">Alle categorieën</option>
              {CATEGORIES.map(id => <option key={id} value={id}>{kinkCategoryLabel(id)}</option>)}
            </select>
          </label>
          <p role="status" className={styles.hint}>{showResults
            ? results.length ? `${results.length} ${results.length === 1 ? "resultaat" : "resultaten"}` : "Geen onderwerpen gevonden. Probeer een andere naam of categorie."
            : results.length ? "Al beoordeeld in dit profiel" : "Zoek een onderwerp of kies een categorie."}</p>
          <div ref={resultList}>{rows(results, "catalogue")}</div>
        </section> : <>
          <button className={`focus-ring ${styles.action}`} type="button" ref={launch} onClick={() => {
            searchOrigin.current = { scrollY: window.scrollY };
            setEditor(null);
            setRevealed(null);
            setSearchOpen(true);
          }}><MagnifyingGlass size={18} aria-hidden="true" /> Zoek in catalogus</button>
          <div className={styles.filters} role="group" aria-label="Antwoordstatus">
            {STATUS_ORDER.map(status => <button key={status} type="button" className="focus-ring"
              ref={filter === status ? activeFilter : undefined} aria-pressed={filter === status} style={answerTone(status)}
              aria-controls={status === "hard_no" ? "studio-boundaries" : "studio-filter-results"}
              onClick={() => { setFilter(status); setEditor(null); setRevealed(null); }}>
              <span className={styles.filterMark}><StatusGlyph status={status} size={16} />
                <small>{publicEntries.filter(kink => entries[kink.id].status === status).length}</small></span>
              {STATUS_LABEL[status]}
            </button>)}
          </div>
          <div id="studio-filter-results" ref={resultList}>
            {filter !== "hard_no" && <section aria-label={STATUS_LABEL[filter]}>{rows(interests, "interest")}
              {!interests.length && <p data-empty-result className={styles.hint}>Geen openbare antwoorden met deze status.</p>}
            </section>}
          </div>
        </>}
      </section>
      <section id="studio-boundaries" ref={boundaryList} hidden={!boundaries.length && (searchOpen || filter !== "hard_no")} className={styles.boundaries}>
        <h2>Harde grenzen</h2>{rows(boundaries, "boundary")}
        {!boundaries.length && <p data-empty-result className={styles.hint}>Geen openbare antwoorden met deze status.</p>}
      </section>
      {privateEntries.length > 0 && <section className={styles.privateSection} data-reveal={soft ? "soft" : "aperture"}>
        <h2><LockKey size={19} aria-hidden="true" /> Privéantwoorden</h2>
        {privateEntries.map(kink => <PrivateAnswer key={kink.id} kink={kink} entry={entries[kink.id]} open={revealed === kink.id}
          onChange={change => patch(kink.id, change)} toggle={() => { setEditor(null); setRevealed(previous => previous === kink.id ? null : kink.id); }} />)}
        <details className={styles.compare}><summary>Onthulling vergelijken</summary>
          <label><input type="checkbox" checked={soft} onChange={e => { setRevealed(null); setSoft(e.target.checked); }} /> Alleen vervagen</label>
        </details>
      </section>}
    </div>
  );
}
