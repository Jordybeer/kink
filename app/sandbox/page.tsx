"use client";

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  Check,
  Clock,
  DotsThree,
  Heart,
  Plus,
  ShieldCheck,
  User,
} from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import Sheet from "@/components/Sheet";
import { useTopNavActions, type TopNavAction } from "@/components/nav/TopNavContext";

type Tab = "planned" | "log";

type Moment = {
  id: string;
  day: string;
  month: string;
  dateLabel: string;
  time: string;
  title: string;
  meta: string;
  note?: string;
};

const PLANNED: Moment[] = [
  {
    id: "date-night",
    day: "30",
    month: "AUG",
    dateLabel: "zondag 30 augustus",
    time: "20:30",
    title: "Date night",
    meta: "Alex · thuis",
  },
  {
    id: "slow-evening",
    day: "07",
    month: "SEP",
    dateLabel: "zondag 7 september",
    time: "21:00",
    title: "Samen vertragen",
    meta: "Alex",
  },
];

const LOGGED: Moment[] = [
  {
    id: "connection",
    day: "23",
    month: "AUG",
    dateLabel: "zondag 23 augustus",
    time: "22:15",
    title: "Intense connectie",
    meta: "Alex · thuis",
    note: "Heerlijk dichtbij geweest.",
  },
  {
    id: "soft-evening",
    day: "16",
    month: "AUG",
    dateLabel: "zondag 16 augustus",
    time: "21:00",
    title: "Zachte avond",
    meta: "Samen ontspannen",
    note: "Fijn om niets te moeten.",
  },
];

function MomentRow({ moment, planned }: { moment: Moment; planned: boolean }) {
  return (
    <article className="grid grid-cols-[52px_1fr] gap-3 py-5 first:pt-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="pt-0.5 text-center" aria-label={moment.dateLabel}>
        <p className="text-lg font-semibold leading-none" style={{ color: "var(--text)" }}>{moment.day}</p>
        <p className="mt-1 text-xs font-semibold tracking-[0.12em]" style={{ color: "var(--text2)" }}>{moment.month}</p>
      </div>

      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--text2)" }}>{moment.time}</p>
            <h2 className="mt-1 truncate text-base font-semibold" style={{ color: "var(--text)" }}>{moment.title}</h2>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm" style={{ color: "var(--text2)" }}>
              <User size={14} aria-hidden="true" />
              <span className="truncate">{moment.meta}</span>
            </div>
          </div>

          <button
            type="button"
            className="focus-ring flex h-11 w-11 flex-none items-center justify-center rounded-full"
            style={{ color: "var(--text2)" }}
            aria-label={`Meer acties voor ${moment.title}`}
          >
            <DotsThree size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {moment.note && (
          <p className="mt-2 text-base leading-6" style={{ color: "var(--text2)" }}>{moment.note}</p>
        )}

        {planned && (
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              <Check size={14} weight="bold" aria-hidden="true" />
              Bijhouden
            </button>
            <span aria-hidden="true" className="h-4 w-px" style={{ background: "var(--border)" }} />
            <button
              type="button"
              className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-medium"
              style={{ color: "var(--text2)" }}
            >
              <CalendarPlus size={14} aria-hidden="true" />
              Agenda
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function SandboxPage() {
  const [tab, setTab] = useState<Tab>("planned");
  const [composerOpen, setComposerOpen] = useState(false);

  const navActions = useMemo<TopNavAction[]>(() => [
    {
      id: "sandbox-plan",
      label: "Moment plannen",
      icon: <Plus size={19} aria-hidden="true" />,
      onClick: () => setComposerOpen(true),
      placement: "primary",
    },
  ], []);
  useTopNavActions(navActions);

  const moments = tab === "planned" ? PLANNED : LOGGED;

  return (
    <>
      <PageShell width="2xl" className="max-w-xl">
        <section className="pt-1">
          <p
            className="text-[22px] leading-tight"
            style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", color: "var(--text)" }}
          >
            Ruimte voor elkaar, wanneer het past.
          </p>
          <p className="mt-2 max-w-md text-base leading-6" style={{ color: "var(--text2)" }}>
            Plan bewust tijd. Hou alleen bij wat voor jou betekenis heeft.
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm leading-5" style={{ color: "var(--text2)" }}>
            <ShieldCheck size={15} aria-hidden="true" style={{ color: "var(--accent)" }} />
            <span>Planning is geen toestemming. Alles blijft lokaal.</span>
          </div>
        </section>

        <div
          className="mt-7 flex items-end gap-7"
          role="tablist"
          aria-label="Intimiteit sandbox"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {([
            ["planned", `Gepland ${PLANNED.length}`],
            ["log", "Logboek"],
          ] as const).map(([value, label]) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(value)}
                className="focus-ring relative min-h-11 px-0.5 pb-3 text-sm font-semibold"
                style={{ color: active ? "var(--text)" : "var(--text2)" }}
              >
                {label}
                {active && (
                  <span
                    className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, var(--accent), var(--accent2))" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <section className="mt-6" aria-live="polite">
          <div className="mb-1 flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text2)" }}>
              {tab === "planned" ? "Komende momenten" : "Recent bijgehouden"}
            </p>
            {tab === "planned" && (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold"
                style={{ color: "var(--accent)" }}
              >
                <Plus size={14} weight="bold" aria-hidden="true" />
                Moment toevoegen
              </button>
            )}
          </div>

          <div>
            {moments.map((moment) => (
              <MomentRow key={moment.id} moment={moment} planned={tab === "planned"} />
            ))}
          </div>
        </section>

        <p className="mt-5 text-xs leading-5" style={{ color: "var(--text2)" }}>
          Sandbox: alleen een visuele UX-proef. Er wordt niets opgeslagen of geëxporteerd.
        </p>
      </PageShell>

      <Sheet
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Moment plannen"
        aria-label="Sandbox moment plannen"
        scrollable
      >
        <div className="space-y-6 px-1">
          <p className="text-base leading-6" style={{ color: "var(--text2)" }}>
            Maak ruimte zonder druk. Je kunt dit later altijd aanpassen of verwijderen.
          </p>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text2)" }}>Wanneer</p>
            <div className="grid grid-cols-[1fr_120px] gap-2 rounded-2xl p-2" style={{ background: "var(--surface2)" }}>
              <label className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface)" }}>
                <span className="block text-sm" style={{ color: "var(--text2)" }}>Datum</span>
                <span className="mt-1 flex items-center gap-2 text-base font-medium">
                  <CalendarPlus size={15} aria-hidden="true" style={{ color: "var(--accent)" }} />
                  30 aug 2026
                </span>
              </label>
              <label className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface)" }}>
                <span className="block text-sm" style={{ color: "var(--text2)" }}>Tijd</span>
                <span className="mt-1 flex items-center gap-2 text-base font-medium">
                  <Clock size={15} aria-hidden="true" style={{ color: "var(--text2)" }} />
                  20:30
                </span>
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold" style={{ color: "var(--text2)" }}>Titel</span>
              <input
                defaultValue="Date night"
                className="mt-1.5 min-h-12 w-full border-0 border-b bg-transparent px-0 text-base outline-none"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold" style={{ color: "var(--text2)" }}>Met wie</span>
              <div className="mt-1.5 flex min-h-12 items-center gap-2 border-b" style={{ borderColor: "var(--border)" }}>
                <User size={16} aria-hidden="true" style={{ color: "var(--text2)" }} />
                <span className="text-base">Alex</span>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-semibold" style={{ color: "var(--text2)" }}>Privénotitie</span>
              <textarea
                defaultValue="Samen koken en daarna niets moeten."
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl p-3 text-base leading-6 outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </label>
          </section>

          <div className="flex items-start gap-2 text-sm leading-5" style={{ color: "var(--text2)" }}>
            <Heart size={14} aria-hidden="true" style={{ color: "var(--accent2)" }} />
            <span>Apple Agenda blijft een aparte, optionele stap nadat je het moment hebt gepland.</span>
          </div>

          <button
            type="button"
            onClick={() => setComposerOpen(false)}
            className="focus-ring min-h-12 w-full rounded-xl px-4 text-sm font-bold"
            style={{ background: "var(--accent-fill)", color: "var(--on-accent-fill)" }}
          >
            Plan moment
          </button>
        </div>
      </Sheet>
    </>
  );
}
