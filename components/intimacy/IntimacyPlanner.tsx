"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CalendarPlus,
  Check,
  Clock,
  DotsThree,
  Heart,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import ProfileSelect from "@/components/ProfileSelect";
import Sheet, { SheetContent } from "@/components/Sheet";
import ContextMenu from "@/components/ui/ContextMenu";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";
import { useStore, useHasHydrated } from "@/lib/store";
import {
  useIntimacyStore,
  useIntimacyHasHydrated,
  type IntimacyRecord,
  type IntimacyStatus,
} from "@/lib/intimacyStore";
import { buildIntimacyCalendarFile } from "@/lib/intimacyCalendar";

type ComposerMode = IntimacyStatus;

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
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function IntimacyCard({
  entry,
  onComplete,
  onCalendar,
  onDelete,
}: {
  entry: IntimacyRecord;
  onComplete: () => void;
  onCalendar: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const planned = entry.status === "planned";

  return (
    <article
      className="rounded-2xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
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
          <p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
            {entry.title?.trim() || "Privé moment"}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
            {displayDate(entry.date)}
            {entry.time ? ` · ${entry.time}` : ""}
            {entry.partnerName ? ` · ${entry.partnerName}` : ""}
          </p>
        </div>

        <ContextMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={[
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
            className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-xl"
            style={{ color: "var(--text2)" }}
          >
            <DotsThree size={20} weight="bold" aria-hidden="true" />
          </button>
        </ContextMenu>
      </div>

      {entry.note && (
        <p className="mt-3 line-clamp-3 text-sm leading-6" style={{ color: "var(--text2)" }}>
          {entry.note}
        </p>
      )}

      {planned && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onComplete}
            className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            <Check size={15} weight="bold" aria-hidden="true" />
            Gebeurd
          </button>
          <button
            type="button"
            onClick={onCalendar}
            disabled={!entry.time}
            className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold disabled:opacity-35"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <CalendarPlus size={15} aria-hidden="true" />
            Apple Agenda
          </button>
        </div>
      )}
    </article>
  );
}

export default function IntimacyPlanner() {
  const profiles = useStore((state) => state.profiles);
  const mainHydrated = useHasHydrated();
  const { entries, addEntry, completeEntry, deleteEntry } = useIntimacyStore();
  const intimacyHydrated = useIntimacyHasHydrated();

  const [tab, setTab] = useState<"planned" | "completed">("planned");
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const [calendarTarget, setCalendarTarget] = useState<IntimacyRecord | null>(null);
  const [includeCalendarDetails, setIncludeCalendarDetails] = useState(false);
  const [date, setDate] = useState(localDateInputValue());
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

  const thisMonth = localDateInputValue().slice(0, 7);
  const completedThisMonth = completed.filter((entry) => entry.date.startsWith(thisMonth)).length;

  const openComposer = useCallback((mode: ComposerMode) => {
    setComposerMode(mode);
    setDate(localDateInputValue());
    setTime("");
    setTitle("");
    setPartnerId("");
    setNote("");
    setFormError(null);
  }, []);

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

  function saveEntry() {
    if (!composerMode) return;
    if (!date) {
      setFormError("Kies een datum.");
      return;
    }
    if (composerMode === "planned" && !time) {
      setFormError("Kies een tijd om dit moment te plannen.");
      return;
    }

    const partner = profiles.find((profile) => profile.id === partnerId);
    addEntry({
      status: composerMode,
      date,
      time: time || undefined,
      title: title.trim() || undefined,
      partnerProfileId: partner?.id,
      partnerName: partner?.name,
      note: note.trim() || undefined,
      ...(composerMode === "completed" ? { completedAt: Date.now() } : {}),
    });
    setComposerMode(null);
    setTab(composerMode);
  }

  const visible = tab === "planned" ? planned : completed;

  return (
    <PageShell width="2xl">
      <h1 className="sr-only">Intimiteit</h1>

      <section
        className="mb-5 rounded-2xl p-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-display, Georgia, serif)",
            fontStyle: "italic",
            color: "var(--text)",
          }}
        >
          Ruimte maken voor intimiteit
        </p>
        <p className="mt-1 text-sm leading-6" style={{ color: "var(--text2)" }}>
          Plan seks of een intiem moment zonder er een contract van te maken. Wat je bijhoudt blijft lokaal op dit toestel.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
            <p className="text-lg font-semibold" style={{ color: "var(--text)" }}>{planned.length}</p>
            <p className="text-xs" style={{ color: "var(--text2)" }}>gepland</p>
          </div>
          <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
            <p className="text-lg font-semibold" style={{ color: "var(--text)" }}>{completedThisMonth}</p>
            <p className="text-xs" style={{ color: "var(--text2)" }}>deze maand</p>
          </div>
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Intimiteitsagenda"
        className="mb-4 grid grid-cols-2 rounded-xl p-1"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        {([
          ["planned", "Gepland"],
          ["completed", "Logboek"],
        ] as const).map(([value, label]) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(value)}
              className="focus-ring min-h-11 rounded-lg px-3 text-sm font-semibold"
              style={{
                background: active ? "var(--surface)" : "transparent",
                color: active ? "var(--text)" : "var(--text2)",
                boxShadow: active ? "0 1px 0 rgba(255,255,255,0.04)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
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
            className="focus-ring mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold"
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
              onComplete={() => {
                completeEntry(entry.id);
                setTab("completed");
              }}
              onCalendar={() => {
                setIncludeCalendarDetails(false);
                setCalendarTarget(entry);
              }}
              onDelete={() => deleteEntry(entry.id)}
            />
          ))}
        </div>
      )}

      <Sheet
        open={composerMode !== null}
        onClose={() => setComposerMode(null)}
        aria-label={composerMode === "planned" ? "Intiem moment plannen" : "Intiem moment bijhouden"}
        scrollable
      >
        <SheetContent className="max-h-[82dvh] overflow-y-auto px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
          <div className="mb-5 flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}
              aria-hidden="true"
            >
              {composerMode === "planned" ? <CalendarPlus size={21} /> : <Heart size={21} weight="fill" />}
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                {composerMode === "planned" ? "Moment plannen" : "Moment bijhouden"}
              </h2>
              <p className="text-xs" style={{ color: "var(--text2)" }}>
                Privé en alleen lokaal opgeslagen
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                Datum
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="focus-ring mt-1.5 h-11 w-full rounded-xl px-3 text-sm focus:outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", colorScheme: "dark" }}
                />
              </label>
              <label className="text-xs font-medium" style={{ color: "var(--text2)" }}>
                Tijd {composerMode === "completed" ? "(optioneel)" : ""}
                <div className="relative mt-1.5">
                  <Clock size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text2)" }} />
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="focus-ring h-11 w-full rounded-xl pl-9 pr-2 text-sm focus:outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", colorScheme: "dark" }}
                  />
                </div>
              </label>
            </div>

            {profiles.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--text2)" }}>Met wie? (optioneel)</p>
                <ProfileSelect
                  profiles={profiles}
                  value={partnerId}
                  onChange={setPartnerId}
                  placeholder="Geen partner gekozen"
                />
              </div>
            )}

            <label className="block text-xs font-medium" style={{ color: "var(--text2)" }}>
              Titel (optioneel)
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Bijv. date night"
                className="focus-ring mt-1.5 h-11 w-full rounded-xl px-3 text-sm focus:outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </label>

            <label className="block text-xs font-medium" style={{ color: "var(--text2)" }}>
              Privé notitie (optioneel)
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder={composerMode === "planned" ? "Waar hebben jullie zin in?" : "Wat wil je onthouden?"}
                className="focus-ring mt-1.5 w-full resize-none rounded-xl px-3 py-2.5 text-sm leading-6 focus:outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </label>
          </div>

          {formError && (
            <p role="alert" className="mt-3 text-xs" style={{ color: "var(--hard-no)" }}>{formError}</p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setComposerMode(null)}
              className="focus-ring min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              Annuleer
            </button>
            <button
              type="button"
              onClick={saveEntry}
              className="focus-ring min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold"
              style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
            >
              {composerMode === "planned" ? "Plan moment" : "Bewaar"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={calendarTarget !== null}
        onClose={() => setCalendarTarget(null)}
        aria-label="Naar Apple Agenda"
      >
        <SheetContent className="px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>Naar Apple Agenda</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text2)" }}>
            Standaard exporteert KinkSync alleen “Privé moment”. Apple Agenda valt buiten KinkSync en kan via iCloud synchroniseren.
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
              <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--text2)" }}>
                Titel, partnernaam en privé notitie komen dan ook in het agenda-item.
              </span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => {
              if (!calendarTarget) return;
              downloadCalendar(calendarTarget, includeCalendarDetails);
              setCalendarTarget(null);
            }}
            className="focus-ring mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            <CalendarPlus size={17} aria-hidden="true" />
            Voeg toe aan Apple Agenda
          </button>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
