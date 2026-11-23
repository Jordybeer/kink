"use client";

import { useCallback, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, BookOpen, CaretRight, GearSix, Keyhole, LockKey } from "@phosphor-icons/react";
import PageShell from "@/components/PageShell";
import Sheet from "@/components/Sheet";
import { ExplanationContent, ExplanationProse } from "@/components/ExplanationContent";
import { ThemeSelector } from "@/components/sheets/SettingsSheet";
import { useTheme } from "@/components/ThemeProvider";
import { useTopNavActions } from "@/components/nav/TopNavContext";
import { resolveTheme } from "@/lib/theme";
import { KINKS } from "@/lib/kinks";
import { getQuestionnairePresentation } from "@/lib/questionnairePresentation";
import type { IntimacyRecord, IntimacyStatus } from "@/lib/intimacyStore";
import Agenda, { exampleDay, exampleMoments, fullDay } from "./Agenda";
import MomentEditor from "./MomentEditor";

const topic = getQuestionnairePresentation(KINKS.find(item => item.id === "dominance_submission")!);

function subscribeToAppearance(listener: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

type Surface = "settings" | "pin" | "info" | "moment" | null;

export default function OverlayStudy() {
  const [surface, setSurface] = useState<Surface>(null);
  const [moments, setMoments] = useState(exampleMoments);
  const [selectedDate, setSelectedDate] = useState(exampleDay);
  const [editorSession, setEditorSession] = useState(0);
  const [mode, setMode] = useState<IntimacyStatus>("planned");
  const [editing, setEditing] = useState<IntimacyRecord>();
  const [pinActive, setPinActive] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pinError, setPinError] = useState(false);
  const pinInput = useRef<HTMLInputElement>(null);
  const pinLauncher = useRef<HTMLButtonElement>(null);
  const pinErrorId = useId();
  const { preference: devicePreference } = useTheme();
  const [preference, setPreference] = useState(devicePreference);
  const systemDark = useSyncExternalStore(subscribeToAppearance,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  const actions = useMemo(() => [], []);
  useTopNavActions(actions, "Agenda & instellingen", "/hot");

  function selectDate(date: string) {
    setSelectedDate(date);
    setFeedback("");
  }

  function startMoment(status: IntimacyStatus, record?: IntimacyRecord) {
    setFeedback("");
    setEditorSession(value => value + 1);
    setEditing(record);
    setMode(status);
    setSurface("moment");
  }

  const close = useCallback(() => {
    if (surface === "pin") {
      setSurface("settings");
      setPinError(false);
      requestAnimationFrame(() => pinLauncher.current?.focus());
    } else {
      setSurface(null);
    }
  }, [surface]);

  function save(record: IntimacyRecord) {
    setMoments(previous => [record, ...previous.filter(item => item.id !== record.id)]);
    setSelectedDate(record.date);
    const day = fullDay.format(new Date(`${record.date}T12:00:00`));
    setFeedback(`${record.status === "planned" ? "Gepland voor" : "Bijgehouden voor"} ${day}${record.time ? " om " + record.time : ""}.`);
    setSurface(null);
    if (editing && selectedDate !== record.date) {
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-moment-id="${CSS.escape(record.id)}"]`)?.focus());
    }
  }

  return (
    <PageShell width="2xl" className="overlay-study">
      <header className="os-mast">
        <div><h1 className="os-title">Agenda</h1><p className="os-note">Voorbeeldmomenten voor deze sessie.</p></div>
        <button className="os-settings-launch" type="button" aria-label="Instellingen" title="Instellingen" onClick={() => setSurface("settings")}><GearSix weight="regular"/></button>
      </header>
      <Agenda selected={selectedDate} onSelect={selectDate} moments={moments} onOpen={startMoment}/>
      <p className="os-feedback" role="status">{feedback}</p>
      <button className="os-reading-link" type="button" onClick={() => setSurface("info")}>
        <BookOpen aria-hidden="true"/><span><small>Gespreksonderwerp</small><strong>{topic.title}</strong></span><ArrowUpRight aria-hidden="true"/>
      </button>

      <Sheet open={surface === "settings" || surface === "pin"} onClose={close}
        previewTheme={resolveTheme(preference, systemDark)}
        title={surface === "pin" ? "Appvergrendeling" : "Instellingen"} variant="sheet" titleTone="editorial" scrollable contentSized>
        {surface === "pin" ? <form className="os-form os-pin" onSubmit={event => {
          event.preventDefault();
          if (pinInput.current?.value !== "1234") {
            setPinError(true);
            pinInput.current?.focus();
            return;
          }
          setPinActive(value => !value);
          close();
        }}>
          <Keyhole className="os-pin-key" size={32} aria-hidden="true"/>
          <p className="os-note">Gebruik de proefcode <strong>1234</strong>. Je apparaatinstellingen blijven zoals ze zijn.</p>
          <label>Proefcode<input ref={pinInput} autoFocus type="password" inputMode="numeric" autoComplete="off"
            maxLength={4} aria-invalid={pinError || undefined} aria-describedby={pinError ? pinErrorId : undefined}
            onChange={() => setPinError(false)}/></label>
          {pinError && <p id={pinErrorId} className="os-error" role="alert">Vul 1234 in.</p>}
          <button className="os-primary">{pinActive ? "Proefvergrendeling uitzetten" : "Vergrendeling uitproberen"}</button>
        </form> : <div className="os-settings">
          <h3>Kleurmodus</h3>
          <ThemeSelector preference={preference} setPreference={setPreference}/>
          <h3>Beveiliging</h3>
          <button className="os-lock-row" type="button" ref={pinLauncher} onClick={() => setSurface("pin")}><LockKey aria-hidden="true"/>
            <span>Appvergrendeling<small>{pinActive ? "Proefvergrendeling actief" : "Probeer de PIN-stap"}</small></span>
            <CaretRight aria-hidden="true"/>
          </button>
        </div>}
      </Sheet>
      <Sheet open={surface === "info"} onClose={close} title={topic.title} headerIcon={<BookOpen/>} variant="sheet" titleTone="editorial" scrollable>
        <ExplanationContent><ExplanationProse>{topic.essence}</ExplanationProse>
          {topic.details && <ExplanationProse secondary>{topic.details}</ExplanationProse>}
        </ExplanationContent>
      </Sheet>
      {editorSession > 0 && <MomentEditor key={editorSession} open={surface === "moment"} mode={mode} selectedDate={selectedDate} record={editing} onClose={close} onSave={save}/>}
    </PageShell>
  );
}
