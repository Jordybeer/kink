import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { ArrowUpRight, CaretLeft, CaretRight, Check, Feather, Plus } from "@phosphor-icons/react";
import type { IntimacyRecord, IntimacyStatus } from "@/lib/intimacyStore";

const monthFormat = new Intl.DateTimeFormat("nl-BE", { month: "long" });
const weekdayFormat = new Intl.DateTimeFormat("nl-BE", { weekday: "short" });
export const fullDay = new Intl.DateTimeFormat("nl-BE", { weekday: "long", day: "numeric", month: "long" });
export const exampleDay = "2026-11-21";

// The studio opens on the same fictional week in every timezone.
export const exampleMoments: IntimacyRecord[] = [
  { id: "studio-breakfast", date: exampleDay, time: "09:30", status: "completed", title: "Een ochtend voor mezelf", note: "De telefoon bleef uit.", createdAt: 0, updatedAt: 0, completedAt: 0 },
  { id: "studio-evening", date: exampleDay, time: "20:00", status: "planned", title: "Tijd voor ons", partnerProfileId: "studio-sam", partnerName: "Sam", createdAt: 0, updatedAt: 0 },
  { id: "studio-talk", date: "2026-11-19", time: "19:30", status: "completed", title: "Bijpraten na een lange dag", partnerProfileId: "studio-sam", partnerName: "Sam", createdAt: 0, updatedAt: 0, completedAt: 0 },
  { id: "studio-sunday", date: "2026-11-22", time: "11:00", status: "planned", title: "Samen uitslapen", partnerProfileId: "studio-noor", partnerName: "Noor", createdAt: 0, updatedAt: 0 },
];

function shiftDay(date: string, offset: number) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + offset);
  return next.toISOString().slice(0, 10);
}

export default function Agenda({ selected, direction, onSelect, moments, onOpen }: {
  selected: string;
  direction: "earlier" | "later" | null;
  onSelect: (date: string) => void;
  moments: IntimacyRecord[];
  onOpen: (status: IntimacyStatus, record?: IntimacyRecord) => void;
}) {
  const date = new Date(`${selected}T12:00:00`);
  const first = shiftDay(selected, -((date.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => shiftDay(first, index));
  const entries = moments.filter(item => item.date === selected)
    .sort((a, b) => (a.time ?? "24:00").localeCompare(b.time ?? "24:00"));
  const weekdays = useRef<HTMLDivElement>(null);

  function changeDay(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const destinations: Record<string, string> = {
      ArrowLeft: shiftDay(day, -1), ArrowRight: shiftDay(day, 1), Home: week[0], End: week[6],
    };
    if (!destinations[event.key]) return;
    event.preventDefault();
    const next = destinations[event.key];
    onSelect(next);
    requestAnimationFrame(() => weekdays.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus());
  }

  return <>
    <section className="os-calendar" aria-label="Weekagenda">
      <div className="os-week-heading">
        <h2><span>{monthFormat.format(date)}</span> <small>{date.getFullYear()}</small></h2>
        <div className="os-week-controls">
          <button type="button" aria-label="Vorige week" onClick={() => onSelect(shiftDay(selected, -7))}><CaretLeft /></button>
          <button type="button" aria-label="Volgende week" onClick={() => onSelect(shiftDay(selected, 7))}><CaretRight /></button>
        </div>
      </div>
      <div className="os-week" ref={weekdays} role="group" aria-label="Kies een dag">
        {week.map(day => {
          const local = new Date(`${day}T12:00:00`);
          const count = moments.filter(item => item.date === day).length;
          return <button type="button" key={day} data-day={day} data-filled={count > 0}
            aria-label={`${fullDay.format(local)}, ${count} ${count === 1 ? "moment" : "momenten"}`}
            aria-pressed={day === selected} onClick={() => onSelect(day)} onKeyDown={event => changeDay(event, day)}>
            <small>{weekdayFormat.format(local).replace(".", "")}</small><span>{local.getDate()}</span>
          </button>;
        })}
      </div>
    </section>
    <section className="os-daybook" aria-label="Momenten op de geselecteerde dag">
      <h2 className="os-dateline" aria-live="polite"><span key={selected} data-direction={direction}>{fullDay.format(date)}</span></h2>
      {entries.length > 0 ? <ul className="os-entries" key={selected} data-direction={direction}>
        {entries.map(item => <li key={item.id}>
          <button type="button" data-moment-id={item.id} className="os-entry" onClick={() => onOpen(item.status, item)}>
            <span className="os-time">{item.time || "Geen tijd"}</span>
            <span className="os-entry-copy"><strong>{item.title || "Privémoment"}</strong>
              <small data-kind={item.status}>{item.status === "planned" ? <span className="os-status-dot"/> : <Check weight="bold"/>}
                {item.status === "planned" ? "Gepland" : "Bijgehouden"}{item.partnerName && <span> · Met {item.partnerName}</span>}
              </small></span>
            <ArrowUpRight aria-hidden="true"/>
          </button>
        </li>)}
      </ul> : <p className="os-empty" key={selected} data-direction={direction}>Deze dag is nog vrij.</p>}
      <div className="os-actions">
        <button className="os-primary" type="button" onClick={() => onOpen("planned")}><Plus weight="bold"/>Moment plannen</button>
        <button className="os-secondary" type="button" onClick={() => onOpen("completed")}><Feather/>Moment bijhouden</button>
      </div>
    </section>
  </>;
}
