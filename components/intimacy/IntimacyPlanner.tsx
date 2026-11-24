"use client";

import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Bell,
  CalendarPlus,
  CaretDown,
  Check,
  DotsThree,
  Heart,
  LockSimple,
  PencilSimple,
  Plus,
  ShieldCheck,
  Trash,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import ProfileSelect from "@/components/ProfileSelect";
import Sheet, { SheetContent } from "@/components/Sheet";
import ContextMenu from "@/components/ui/ContextMenu";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import { useStore, useHasHydrated } from "@/lib/store";
import { useReducedMotionPreference } from "@/lib/motion";
import { readPartnerProfileId } from "@/lib/partnerPreference";
import MomentWritingScreen, { carryMomentIdentity } from "./MomentWritingScreen";
import journal from "./MomentJournal.module.css";
import {
  useIntimacyStore,
  useIntimacyHasHydrated,
  type IntimacyRecord,
  type IntimacyStatus,
} from "@/lib/intimacyStore";
import { buildIntimacyCalendarFile } from "@/lib/intimacyCalendar";
import {
  formatIntimacyReminderLead,
  getIntimacyNotificationPermission,
  intimacyCountdownLabel,
  MAX_INTIMACY_REMINDER_DAYS,
  MIN_INTIMACY_REMINDER_DAYS,
  requestIntimacyNotificationPermission,
  type IntimacyNotificationPermission,
} from "@/lib/intimacyReminder";

type ComposerMode = IntimacyStatus;

const AGENDA_TABS = [
  ["planned", "Gepland"],
  ["completed", "Logboek"],
] as const;

function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function entrySortKey(entry: IntimacyRecord): string {
  return `${entry.date}T${entry.time || "23:59"}`;
}

function downloadCalendar(entry: IntimacyRecord, includeDetails: boolean) {
  const contents = buildIntimacyCalendarFile(entry, { includeDetails });
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kinksync-${entry.date}.ics`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function reminderPermissionCopy(permission: IntimacyNotificationPermission | null): string {
  if (permission === "granted") {
    return "KinkSync geeft een discreet seintje zodra de app actief wordt binnen dit venster. Agenda-export neemt dezelfde termijn mee.";
  }
  if (permission === "denied") {
    return "Systeemmeldingen zijn geblokkeerd. Agenda-export neemt deze herinnering wel mee.";
  }
  if (permission === "unsupported") {
    return "Dit toestel ondersteunt geen KinkSync-meldingen. Agenda-export neemt de herinnering wel mee.";
  }
  return "Toestemming voor systeemmeldingen is nog niet gegeven. Agenda-export neemt de herinnering wel mee.";
}

function findMomentCard(id: string) {
  return document.querySelector<HTMLElement>(`[data-intimacy-card="${CSS.escape(id)}"]`);
}

function IntimacyCard({
  entry,
  onLog,
  onEdit,
  onCalendar,
  onDelete,
  composer,
}: {
  entry: IntimacyRecord;
  onLog: () => void;
  onEdit: () => void;
  onCalendar: () => void;
  onDelete: () => void;
  composer?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const titleId = useId();
  const planned = entry.status === "planned";
  const countdown = planned ? intimacyCountdownLabel(entry.date) : null;

  return (
    <article
      className={`rounded-2xl p-4 ${journal.entry}`}
      data-intimacy-card={entry.id}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl"
          style={{
            background: planned
              ? "color-mix(in srgb, var(--accent) 10%, transparent)"
              : "color-mix(in srgb, var(--yes) 10%, transparent)",
            color: planned ? "var(--accent)" : "var(--yes)",
          }}
          aria-hidden="true"
        >
          {planned ? <CalendarPlus size={21} /> : <Heart size={21} weight="fill" />}
        </div>

        <div className="min-w-0 flex-1">
          <div data-moment-identity>
            <p id={titleId} className={journal.entryTitle}>
              {entry.title?.trim() || "Privé moment"}
            </p>
            <p className={journal.entryDate}>
              {displayDate(entry.date)}
              {entry.time ? ` · ${entry.time}` : ""}
              {entry.partnerName ? ` · ${entry.partnerName}` : ""}
            </p>
          </div>
          {countdown && (
            <p className="mt-1 text-xs font-medium" style={{ color: "var(--accent)" }}>
              {countdown}
              {entry.reminderDaysBefore
                ? ` · herinnering ${formatIntimacyReminderLead(entry.reminderDaysBefore)}`
                : ""}
            </p>
          )}
        </div>

        <div className={`flex-none ${composer ? "invisible" : ""}`}>
          <ContextMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={[
              {
                label: "Bewerken",
                icon: <PencilSimple size={16} aria-hidden="true" />,
                onClick: onEdit,
              },
              {
                label: "Verwijderen",
                icon: <Trash size={16} aria-hidden="true" />,
                danger: true,
                onClick: onDelete,
              },
            ]}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={`Meer acties voor ${entry.title?.trim() || "privé moment"}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="ks-motion-choice focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-xl"
              style={{ color: "var(--text2)" }}
            >
              <DotsThree size={20} weight="bold" aria-hidden="true" />
            </button>
          </ContextMenu>
        </div>
      </div>

      <div className={journal.entryBody}>
        {!composer && entry.note && (
          <p className={planned ? "mt-3 line-clamp-3 text-sm leading-6 text-[var(--text2)]" : journal.entryNote}>
            {entry.note}
          </p>
        )}

        {planned && (
          <div className={composer ? "hidden" : "mt-4 flex gap-2"}>
            <button
              type="button"
              onClick={onLog}
              className="ks-motion-choice focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              <Check size={15} weight="bold" aria-hidden="true" />
              Bijhouden
            </button>
            <button
              type="button"
              onClick={onCalendar}
              disabled={!entry.time}
              className="ks-motion-choice focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold disabled:opacity-35"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <CalendarPlus size={15} aria-hidden="true" />
              Naar agenda
            </button>
          </div>
        )}
        {composer}
      </div>
    </article>
  );
}

export default function IntimacyPlanner() {
  const profiles = useStore((state) => state.profiles);
  const mainHydrated = useHasHydrated();
  const { entries, addEntry, updateEntry, deleteEntry } = useIntimacyStore();
  const intimacyHydrated = useIntimacyHasHydrated();

  const [tab, setTab] = useState<"planned" | "completed">("planned");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calendarTarget, setCalendarTarget] = useState<IntimacyRecord | null>(null);
  const [includeCalendarDetails, setIncludeCalendarDetails] = useState(false);
  const [date, setDate] = useState(localDateInputValue());
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [note, setNote] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(2);
  const [notificationPermission, setNotificationPermission] = useState<IntimacyNotificationPermission | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const [writingDetails, setWritingDetails] = useState(false);
  const [writingOrigin, setWritingOrigin] = useState<DOMRect | null>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const timeInput = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const focusPending = useRef(false);
  const pendingReturn = useRef<{ id: string; source: DOMRect | null; saved: boolean } | null>(null);
  const reducedMotion = useReducedMotionPreference();
  const editingEntry = editingId ? entries.find((entry) => entry.id === editingId) : undefined;
  const composerTab = editingEntry?.status ?? composerMode;

  const planned = useMemo(
    () => entries
      .filter((entry) => entry.status === "planned")
      .sort((a, b) => entrySortKey(a).localeCompare(entrySortKey(b))),
    [entries],
  );
  const completed = useMemo(
    () => entries
      .filter((entry) => entry.status === "completed")
      .sort((a, b) => (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt)),
    [entries],
  );

  const closeComposer = useCallback(() => {
    setComposerMode(null);
    setEditingId(null);
    setFormError(null);
    setWritingDetails(false);
    setWritingOrigin(null);
  }, []);

  function cancelComposer(source: DOMRect | null = null) {
    if (composerMode === "completed" && editingId) {
      pendingReturn.current = { id: editingId, source, saved: false };
    }
    const trigger = opener.current;
    opener.current = null;
    closeComposer();
    requestAnimationFrame(() => {
      const fallback = tabRefs.current[tab === "planned" ? 0 : 1];
      const visibleTrigger = trigger?.isConnected && trigger.getClientRects().length;
      (visibleTrigger ? trigger : fallback)?.focus({ preventScroll: true });
    });
  }

  const focusEditor = useCallback(() => {
    editorHeading.current?.focus({ preventScroll: true });
    editorHeading.current?.scrollIntoView({ block: "nearest" });
  }, []);

  useLayoutEffect(() => {
    if (focusPending.current && composerMode && composerTab === tab && editorHeading.current) {
      focusPending.current = false;
      focusEditor();
    }
  }, [composerMode, composerTab, tab, mainHydrated, intimacyHydrated, focusEditor]);

  useLayoutEffect(() => {
    const result = pendingReturn.current;
    if (!result || composerMode) return;
    pendingReturn.current = null;

    const card = findMomentCard(result.id);
    if (result.saved) {
      card?.focus({ preventScroll: true });
      card?.scrollIntoView({ block: "nearest" });
    }
    if (reducedMotion) return;
    const animation = carryMomentIdentity(card?.querySelector<HTMLElement>("[data-moment-identity]"), result.source);
    return () => animation?.cancel();
  }, [composerMode, tab, reducedMotion]);

  const openComposer = useCallback((mode: ComposerMode, entry?: IntimacyRecord) => {
    if (composerTab) {
      if (tab === composerTab) focusEditor();
      else {
        focusPending.current = true;
        setTab(composerTab);
      }
      return;
    }
    if (mode === "completed" && entry) {
      setWritingOrigin(findMomentCard(entry.id)?.querySelector("[data-moment-identity]")?.getBoundingClientRect() ?? null);
    }
    const active = document.activeElement;
    focusPending.current = mode === "planned";
    if (active instanceof HTMLElement && active !== document.body) {
      opener.current = active.getAttribute("role") === "menuitem"
        ? active.closest("[data-intimacy-card]")?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]') ?? null
        : active;
    }
    setComposerMode(mode);
    setTab(entry?.status ?? mode);
    setEditingId(entry?.id ?? null);
    setDate(entry?.date ?? localDateInputValue());
    setTime(entry?.time ?? "");
    setTitle(entry?.title ?? "");
    setPartnerId(entry ? entry.partnerProfileId ?? "" : mode === "completed" ? readPartnerProfileId() ?? "" : "");
    setNote(entry?.note ?? "");
    setReminderEnabled(mode === "planned" && entry?.reminderDaysBefore !== undefined);
    setReminderDays(entry?.reminderDaysBefore ?? 2);
    setNotificationPermission(getIntimacyNotificationPermission());
    setFormError(null);
  }, [composerTab, tab, focusEditor]);

  const navActions = useMemo<TopNavAction[]>(() => [
    {
      id: "plan-intimacy",
      label: "Moment plannen",
      icon: <CalendarPlus size={19} aria-hidden="true" />,
      onClick: () => openComposer("planned"),
      placement: "primary",
    },
    {
      id: "log-intimacy",
      label: "Moment bijhouden",
      icon: <Plus size={19} aria-hidden="true" />,
      onClick: () => openComposer("completed"),
      placement: "secondary",
    },
  ], [openComposer]);
  useTopNavActions(navActions);

  if (!mainHydrated || !intimacyHydrated) return <PageShell loading />;

  const loggingPlannedMoment = editingEntry?.status === "planned" && composerMode === "completed";
  const composerTitle = composerMode === "planned"
    ? editingId ? "Plan aanpassen" : "Moment plannen"
    : loggingPlannedMoment
      ? "Moment bijhouden"
      : editingId ? "Logboek aanpassen" : "Moment bijhouden";
  const saveLabel = loggingPlannedMoment
    ? "Bewaar in logboek"
    : editingId
      ? "Wijzigingen bewaren"
      : composerMode === "planned" ? "Plan moment" : "Bewaar in logboek";

  async function setReminder(enabled: boolean) {
    setReminderEnabled(enabled);
    if (!enabled) return;
    const permission = await requestIntimacyNotificationPermission();
    setNotificationPermission(permission);
  }

  function saveEntry(source: DOMRect | null = null) {
    if (!composerMode) return;
    if (!date) {
      setFormError("Kies een datum.");
      if (composerMode === "completed" && !writingDetails) {
        setWritingDetails(true);
        requestAnimationFrame(() => dateInput.current?.focus());
      } else dateInput.current?.focus();
      return;
    }
    if (composerMode === "planned" && !time) {
      setFormError("Kies een tijd om dit moment te plannen.");
      timeInput.current?.focus();
      return;
    }

    const partner = profiles.find((profile) => profile.id === partnerId);
    const common = {
      date,
      time: time || undefined,
      title: title.trim() || undefined,
      partnerProfileId: partner?.id,
      partnerName: partner?.name,
      note: note.trim() || undefined,
      reminderDaysBefore: composerMode === "planned" && reminderEnabled ? reminderDays : undefined,
    };

    let savedId: string;
    if (editingId) {
      const existing = entries.find((entry) => entry.id === editingId);
      if (!existing) {
        setFormError("Dit moment bestaat niet meer.");
        return;
      }
      updateEntry(editingId, {
        ...common,
        status: composerMode,
        completedAt: composerMode === "completed" ? existing.completedAt ?? Date.now() : undefined,
      });
      savedId = editingId;
    } else {
      savedId = addEntry({
        ...common,
        status: composerMode,
        ...(composerMode === "completed" ? { completedAt: Date.now() } : {}),
      });
    }

    pendingReturn.current = { id: savedId, source, saved: true };
    setTab(composerMode);
    opener.current = null;
    closeComposer();
  }

  const visible = tab === "planned" ? planned : completed;

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case "ArrowLeft":
        nextIndex = (index - 1 + AGENDA_TABS.length) % AGENDA_TABS.length;
        break;
      case "ArrowRight":
        nextIndex = (index + 1) % AGENDA_TABS.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = AGENDA_TABS.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setTab(AGENDA_TABS[nextIndex][0]);
    tabRefs.current[nextIndex]?.focus();
  }

  const isPlanning = composerMode === "planned";
  const when = (
    <div className={journal.when} data-testid="planner-date-time">
      <label>
        Datum
        <input ref={dateInput} type="date" value={date} required aria-invalid={Boolean(formError && !date)}
          onChange={(event) => { setDate(event.target.value); setFormError(null); }} />
      </label>
      <label>
        {isPlanning ? "Tijd" : "Tijd (optioneel)"}
        <input ref={timeInput} type="time" value={time} required={isPlanning} aria-invalid={Boolean(formError && isPlanning && !time)}
          onChange={(event) => { setTime(event.target.value); setFormError(null); }} />
      </label>
    </div>
  );
  const noteField = (
    <label className={isPlanning ? journal.note : journal.writingField}>
      <span className="inline-flex items-center gap-1.5"><LockSimple size={14} aria-hidden="true" /> Privénotitie</span>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={isPlanning ? 2 : 3}
        placeholder={isPlanning ? "Waar wil je ruimte voor maken?" : "Wat wil je onthouden?"}
      />
    </label>
  );
  const momentDetails = (
    <>
      <label className={journal.titleField}>
        Titel (optioneel)
        <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Geef dit moment een naam" />
      </label>
      {profiles.length > 0 && (
        <div>
          <p id="moment-partner-label" className="mb-1.5 text-sm text-[var(--text2)]">Met wie? (optioneel)</p>
          <ProfileSelect profiles={profiles} value={partnerId} onChange={setPartnerId}
            placeholder="Geen partner gekozen" emptyOption={isPlanning ? undefined : "Geen partner gekozen"}
            labelledBy="moment-partner-label" />
        </div>
      )}
    </>
  );

  const editor = isPlanning && (
    <section className={journal.editor} aria-labelledby="moment-journal-heading"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          cancelComposer();
        }
      }}>
      <h2 id="moment-journal-heading" ref={editorHeading} tabIndex={-1} className={journal.heading}>{composerTitle}</h2>
      <form className={journal.form} noValidate onSubmit={(event) => { event.preventDefault(); saveEntry(); }}>
        {when}
        <details className={journal.options}>
          <summary className={journal.summary}>
            <span>Meer opties</span>
            <span className={journal.summaryAction}>
              {profiles.find((profile) => profile.id === partnerId)?.name}
              <CaretDown size={14} aria-hidden="true" />
            </span>
          </summary>
          <div className={journal.optionalFields}>
            {momentDetails}
            {noteField}
            {composerMode === "planned" && (
              <div className={journal.reminder}>
                <label className="flex min-h-11 items-center justify-between gap-4">
                  <span className="flex min-w-0 gap-2.5">
                    <Bell size={18} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: "var(--accent)" }} />
                    <span>
                      <span className="block text-sm font-medium" style={{ color: "var(--text)" }}>Herinner mij</span>
                      <span className="mt-0.5 block text-sm leading-5" style={{ color: "var(--text2)" }}>
                        Krijg een discreet seintje wanneer het moment dichterbij komt.
                      </span>
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label="Herinnering inschakelen"
                    checked={reminderEnabled}
                    onChange={(event) => void setReminder(event.target.checked)}
                    className="mt-0.5 h-5 w-5 flex-none"
                  />
                </label>

                {reminderEnabled && (
                  <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="intimacy-reminder-days" className="text-sm font-medium" style={{ color: "var(--text2)" }}>
                        Wanneer?
                      </label>
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {formatIntimacyReminderLead(reminderDays)}
                      </span>
                    </div>
                    <input
                      id="intimacy-reminder-days"
                      type="range"
                      min={MIN_INTIMACY_REMINDER_DAYS}
                      max={MAX_INTIMACY_REMINDER_DAYS}
                      step={1}
                      value={reminderDays}
                      onChange={(event) => setReminderDays(Number(event.target.value))}
                      aria-label="Dagen vooraf"
                      aria-valuetext={formatIntimacyReminderLead(reminderDays)}
                      className="focus-ring mt-3 h-6 w-full"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <div className="mt-1 flex justify-between text-xs" style={{ color: "var(--text2)" }}>
                      <span>1 dag</span>
                      <span>14 dagen</span>
                    </div>
                    <p className="mt-2 text-xs leading-5" style={{ color: "var(--text2)" }}>
                      {reminderPermissionCopy(notificationPermission)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </details>
        {formError && <p role="alert" className="text-sm text-[var(--hard-no-text)]">{formError}</p>}
        <div className={journal.actions}>
          <button type="button" className={`focus-ring ks-motion-choice ${journal.cancel}`} onClick={() => cancelComposer()}>Annuleer</button>
          <button type="submit" className={`focus-ring ks-motion-choice ${journal.save}`}>{saveLabel}</button>
        </div>
      </form>
    </section>
  );

  return (
    <PageShell width="2xl">
      <h1 className="sr-only">Intimiteit</h1>

      <section className="mb-5 px-1">
        <p
          className="text-lg"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontStyle: "italic",
            color: "var(--text)",
          }}
        >
          Ruimte maken voor intimiteit
        </p>
        <p className="mt-1 text-sm leading-6" style={{ color: "var(--text2)" }}>
          Plan seks of een intiem moment als uitnodiging om bewust tijd voor elkaar vrij te maken. Een gepland moment is geen toestemming.
        </p>
        <div className="mt-2 flex items-start gap-2 text-sm leading-5" style={{ color: "var(--text2)" }}>
          <ShieldCheck size={15} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: "var(--accent)" }} />
          <span>Je planning en logboek blijven lokaal op dit toestel.</span>
        </div>
        <p className="mt-3 text-xs italic tracking-wide" style={{ color: "var(--text2)" }}>
          “Dominant on the streets. Submissive in the sheets.”
        </p>
      </section>

      <div
        role="tablist"
        aria-label="Intimiteitsagenda"
        className="mb-4 grid grid-cols-2 rounded-xl p-1"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        {AGENDA_TABS.map(([value, label], index) => {
          const active = tab === value;
          return (
            <button
              key={value}
              ref={(node) => { tabRefs.current[index] = node; }}
              id={`intimacy-tab-${value}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`intimacy-panel-${value}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(value)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className="ks-motion-choice focus-ring min-h-11 rounded-lg px-3 text-sm font-semibold"
              style={{
                background: active ? "var(--surface)" : "transparent",
                color: active ? "var(--text)" : "var(--text2)",
                boxShadow: active ? "0 1px 0 var(--inset-highlight)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {AGENDA_TABS.map(([value]) => (
      <div
        key={value}
        id={`intimacy-panel-${value}`}
        role="tabpanel"
        aria-labelledby={`intimacy-tab-${value}`}
        hidden={tab !== value}
        tabIndex={0}
        className="focus-ring"
      >
        {tab === value && composerTab === value && !editingEntry && editor}
        {tab === value && (visible.length === 0 ? (
          isPlanning && composerTab === value ? null :
          <div className="py-12 text-center">
            <Heart size={38} weight="duotone" aria-hidden="true" className="mx-auto mb-3" style={{ color: "var(--accent)", opacity: 0.7 }} />
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              {tab === "planned" ? "Nog niets gepland" : "Nog niets bijgehouden"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6" style={{ color: "var(--text2)" }}>
              {tab === "planned"
                ? "Kies een moment wanneer jullie er bewust ruimte voor willen maken."
                : "Bewaar alleen wat voor jou nuttig voelt. Geen scorebord nodig."}
            </p>
            <button
              type="button"
              onClick={() => openComposer(tab)}
              className="ks-motion-choice focus-ring mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              {tab === "planned" ? <CalendarPlus size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {tab === "planned" ? "Moment plannen" : "Moment bijhouden"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((entry) => (
              <IntimacyCard
                key={entry.id}
                entry={entry}
                composer={composerTab === value && editingId === entry.id ? editor : undefined}
                onLog={() => openComposer("completed", entry)}
                onEdit={() => openComposer(entry.status, entry)}
                onCalendar={() => {
                  setIncludeCalendarDetails(false);
                  setCalendarTarget(entry);
                }}
                onDelete={() => deleteEntry(entry.id)}
              />
            ))}
          </div>
        ))}
      </div>
      ))}

      {composerMode === "completed" && (
        <MomentWritingScreen
          name={composerTitle}
          title={title.trim() || (editingEntry ? "Privémoment" : composerTitle)}
          context={[date ? displayDate(date) : "Kies een datum", time, profiles.find((profile) => profile.id === partnerId)?.name]
            .filter(Boolean).join(" · ")}
          origin={writingOrigin}
          details={writingDetails}
          onDetailsChange={setWritingDetails}
          onDismiss={cancelComposer}
          onSave={saveEntry}
          saveLabel={saveLabel}
        >
          {writingDetails ? <div className={journal.writingDetails}>{when}{momentDetails}</div> : noteField}
          {formError && <p role="alert" className="text-sm text-[var(--hard-no-text)]">{formError}</p>}
        </MomentWritingScreen>
      )}

      <Sheet
        open={calendarTarget !== null}
        onClose={() => setCalendarTarget(null)}
        aria-label="Naar agenda"
      >
        <SheetContent className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Naar agenda</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text2)" }}>
            KinkSync maakt een eenmalig agenda-item. Standaard staat er alleen “Privé moment”. Op iPhone kun je het daarna in Apple Agenda openen en zelf bevestigen.
          </p>

          <label
            className="mt-4 flex min-h-12 items-start gap-3 rounded-xl p-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <input
              type="checkbox"
              checked={includeCalendarDetails}
              onChange={(event) => setIncludeCalendarDetails(event.target.checked)}
              className="mt-0.5 h-5 w-5"
            />
            <span>
              <span className="block text-sm font-medium" style={{ color: "var(--text)" }}>Details meenemen</span>
              <span className="mt-0.5 block text-sm leading-5" style={{ color: "var(--text2)" }}>
                Titel, partnernaam en privé notitie komen dan ook in het agenda-item.
              </span>
            </span>
          </label>

          {calendarTarget?.reminderDaysBefore && (
            <div className="mt-3 flex items-start gap-2 text-sm leading-5" style={{ color: "var(--text2)" }}>
              <Bell size={15} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: "var(--accent)" }} />
              <span>Je herinnering {formatIntimacyReminderLead(calendarTarget.reminderDaysBefore)} gaat mee in het agenda-item.</span>
            </div>
          )}

          <div className="mt-3 flex items-start gap-2 text-sm leading-5" style={{ color: "var(--text2)" }}>
            <ShieldCheck size={15} className="mt-0.5 flex-none" aria-hidden="true" style={{ color: "var(--accent)" }} />
            <span>Agenda-apps kunnen buiten KinkSync synchroniseren. Wijzigingen in KinkSync werken dit geëxporteerde item niet automatisch bij.</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!calendarTarget) return;
              downloadCalendar(calendarTarget, includeCalendarDetails);
              setCalendarTarget(null);
            }}
            className="ks-motion-choice focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            <CalendarPlus size={17} aria-hidden="true" />
            Open agenda-item
          </button>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
