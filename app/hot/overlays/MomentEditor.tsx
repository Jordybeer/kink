"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import Sheet from "@/components/Sheet";
import ProfileSelect from "@/components/ProfileSelect";
import type { IntimacyRecord, IntimacyStatus } from "@/lib/intimacyStore";

const partners = [{ id: "studio-sam", name: "Sam" }, { id: "studio-noor", name: "Noor" }];
const dayFormat = new Intl.DateTimeFormat("nl-BE", { weekday: "long", day: "numeric", month: "long" });

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function MomentEditor({ open, mode, record, onClose, onSave }: {
  open: boolean;
  mode: IntimacyStatus;
  record?: IntimacyRecord;
  onClose: () => void;
  onSave: (record: IntimacyRecord) => void;
}) {
  const planned = mode === "planned";
  const id = useId();
  const [date, setDate] = useState(() => record?.date ?? today());
  const [time, setTime] = useState(record?.time ?? "");
  const [title, setTitle] = useState(record?.title ?? "");
  const [note, setNote] = useState(record?.note ?? "");
  const [partner, setPartner] = useState(record?.partnerProfileId ?? "");
  const [reminder, setReminder] = useState(record?.reminderDaysBefore !== undefined);
  const [days, setDays] = useState(record?.reminderDaysBefore ?? 2);
  const [invalid, setInvalid] = useState<"date" | "time" | null>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const timeInput = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!date || (planned && !time)) {
      const field = !date ? "date" : "time";
      setInvalid(field);
      (field === "date" ? dateInput : timeInput).current?.focus();
      return;
    }
    const now = Date.now();
    onSave({
      id: record?.id ?? crypto.randomUUID(), status: mode, createdAt: record?.createdAt ?? now, updatedAt: now,
      completedAt: planned ? undefined : record?.completedAt ?? now, title: title.trim() || undefined,
      note: note.trim() || undefined, time: time || undefined, date, partnerProfileId: partner || undefined,
      partnerName: partners.find(item => item.id === partner)?.name, reminderDaysBefore: planned && reminder ? days : undefined,
    });
  }

  const when = <div className="os-when">
    <p className="os-day">{date ? dayFormat.format(new Date(date + "T12:00:00")) : "Kies een dag"}</p>
    <div className="os-pair">
      <label>Datum<input type="date" ref={dateInput} required value={date}
        aria-invalid={invalid === "date" || undefined} aria-describedby={invalid === "date" ? id+"-error" : undefined}
        onChange={e => { setDate(e.target.value); if (invalid === "date") setInvalid(null); }}/></label>
      <label>{planned ? "Tijd" : "Tijd (optioneel)"}<input type="time" ref={timeInput} required={planned} value={time}
        aria-invalid={invalid === "time" || undefined} aria-describedby={invalid === "time" ? id+"-error" : undefined}
        onChange={e => { setTime(e.target.value); if (invalid === "time") setInvalid(null); }}/></label>
    </div>
    {invalid && <p id={id+"-error"} className="os-error" role="alert">{invalid === "date" ? "Kies een datum." : "Kies een tijd om dit moment te plannen."}</p>}
  </div>;
  const writing = <>
    <label>Titel (optioneel)<input type="text" value={title} placeholder="Geef dit moment een naam" onChange={e => setTitle(e.target.value)} /></label>
    <label>Privénotitie (optioneel)<textarea rows={3} value={note} placeholder={planned ? "Waar wil je ruimte voor maken?" : "Wat wil je onthouden?"} onChange={e => setNote(e.target.value)} />
      <small>Alleen zichtbaar in deze proef.</small></label>
  </>;

  return <Sheet open={open} onClose={onClose} title={planned ? "Moment plannen" : "Moment bijhouden"} variant="task" scrollable
    footer={<div className="os-footer"><button onClick={onClose}>Annuleer</button>
      <button className="os-primary" type="submit" form={id}>{record ? "Wijzigingen bewaren" : planned ? "Plan moment" : "Bewaar moment"}</button></div>}>
    <form id={id} noValidate className="os-form" onSubmit={submit}>
      {planned ? when : writing}
      <div><p className="os-label" id={id+"-partner"}>Met wie? (optioneel)</p>
        <ProfileSelect value={partner} profiles={partners} onChange={setPartner} placeholder="Zonder partner" emptyOption="Zonder partner" labelledBy={id+"-partner"}/>
      </div>
      {planned ? writing : when}
      {planned && <div className="os-reminder">
        <label><input type="checkbox" checked={reminder} onChange={event => setReminder(event.target.checked)}/>Herinner mij</label>
        {reminder && <label className="os-days">{days} {days === 1 ? "dag" : "dagen"} vooraf
          <input type="range" min={1} max={14} value={days} onChange={e => setDays(Number(e.target.value))}/>
        </label>}
      </div>}
    </form>
  </Sheet>;
}
