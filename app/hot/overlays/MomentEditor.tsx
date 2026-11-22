"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Bell, CalendarBlank, Feather, LockSimple } from "@phosphor-icons/react";
import Sheet from "@/components/Sheet";
import ProfileSelect from "@/components/ProfileSelect";
import type { IntimacyRecord, IntimacyStatus } from "@/lib/intimacyStore";

const partners = [{ id: "studio-sam", name: "Sam" }, { id: "studio-noor", name: "Noor" }];
const weekdayFormat = new Intl.DateTimeFormat("nl-BE", { weekday: "long" });
const monthFormat = new Intl.DateTimeFormat("nl-BE", { month: "long", year: "numeric" });

export default function MomentEditor({ open, mode, selectedDate, record, onClose, onSave }: {
  open: boolean;
  mode: IntimacyStatus;
  selectedDate: string;
  record?: IntimacyRecord;
  onClose: () => void;
  onSave: (record: IntimacyRecord) => void;
}) {
  const planned = mode === "planned";
  const id = useId();
  const [date, setDate] = useState(record?.date ?? selectedDate);
  const [editingDate, setEditingDate] = useState(!date);
  const [time, setTime] = useState(record?.time ?? "");
  const [title, setTitle] = useState(record?.title ?? "");
  const [note, setNote] = useState(record?.note ?? "");
  const [partner, setPartner] = useState(record?.partnerProfileId ?? "");
  const [reminder, setReminder] = useState(record?.reminderDaysBefore !== undefined);
  const [days, setDays] = useState(record?.reminderDaysBefore ?? 2);
  const [invalid, setInvalid] = useState<"date" | "time" | null>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const timeInput = useRef<HTMLInputElement>(null);
  const local = date ? new Date(`${date}T12:00:00`) : null;

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

  const when = <div>
    <div className="os-pair">
      {planned && !editingDate && local ? (
        <button type="button" className="os-date-imprint focus-ring" onClick={() => setEditingDate(true)}>
          <b>{local.getDate()}</b>
          <span><strong>{weekdayFormat.format(local)}</strong><small>{monthFormat.format(local)}</small></span>
          <span className="os-date-change">Wijzig datum</span>
        </button>
      ) : (
        <label>Datum<input type="date" ref={dateInput} required value={date} autoFocus={planned && editingDate}
          aria-invalid={invalid === "date" || undefined} aria-describedby={invalid === "date" ? id+"-error" : undefined}
          onChange={e => { setDate(e.target.value); if (invalid === "date") setInvalid(null); }}/></label>
      )}
      <label>{planned ? "Tijd" : "Tijd (optioneel)"}<input type="time" ref={timeInput} required={planned} value={time}
        aria-invalid={invalid === "time" || undefined} aria-describedby={invalid === "time" ? id+"-error" : undefined}
        onChange={e => { setTime(e.target.value); if (invalid === "time") setInvalid(null); }}/></label>
    </div>
    {invalid && <p id={id+"-error"} className="os-error" role="alert">{invalid === "date" ? "Kies een datum." : "Kies een tijd om dit moment te plannen."}</p>}
  </div>;
  const titleField = <label className="os-writing-title">Titel (optioneel)<input type="text" value={title} placeholder={planned ? "Geef dit moment een naam" : "Welk moment blijft je bij?"} onChange={e => setTitle(e.target.value)} /></label>;
  const noteField = <label className="os-writing-note"><span><LockSimple size={15} aria-hidden="true"/>Privénotitie (optioneel)</span>
      <textarea rows={planned ? 2 : 3} value={note} placeholder={planned ? "Waar wil je ruimte voor maken?" : "Wat wil je onthouden?"} onChange={e => setNote(e.target.value)} />
      <small>Alleen zichtbaar in deze proef.</small></label>;
  const heading = record ? (planned ? "Gepland moment bewerken" : "Bijgehouden moment bewerken")
    : (planned ? "Moment plannen" : "Moment bijhouden");

  return <Sheet open={open} onClose={onClose} title={heading} headerIcon={planned ? <CalendarBlank size={20}/> : <Feather size={20}/>} variant="task" scrollable
    footer={<div className="os-footer"><button type="button" onClick={onClose}>Annuleer</button>
      <button className="os-primary" type="submit" form={id}>{record ? "Wijzigingen bewaren" : planned ? "Plan moment" : "Bewaar moment"}</button></div>}>
    <form id={id} noValidate className="os-form os-moment" data-mode={mode} onSubmit={submit}>
      {planned ? when : <div className="os-writing">{titleField}{noteField}</div>}
      {planned ? titleField : when}
      <details className="os-extra" open={Boolean(record?.partnerProfileId || record?.reminderDaysBefore !== undefined || (planned && record?.note))}>
        <summary>{planned ? "Partner, privénotitie en herinnering" : "Partner toevoegen"}</summary>
        <div className="os-extra-fields">
          <div><p className="os-label" id={id+"-partner"}>Met wie?</p>
            <ProfileSelect value={partner} profiles={partners} onChange={setPartner} placeholder="Zonder partner" emptyOption="Zonder partner" labelledBy={id+"-partner"}/>
          </div>
          {planned && noteField}
          {planned && <div className="os-reminder">
            <label><Bell size={17} aria-hidden="true"/><span>Herinner mij</span><input type="checkbox" checked={reminder} onChange={event => setReminder(event.target.checked)}/></label>
            {reminder && <label className="os-days">{days} {days === 1 ? "dag" : "dagen"} vooraf
              <input type="range" min={1} max={14} value={days} onChange={e => setDays(Number(e.target.value))}/>
            </label>}
          </div>}
        </div>
      </details>
    </form>
  </Sheet>;
}
