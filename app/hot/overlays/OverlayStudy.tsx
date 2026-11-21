"use client";

import { useCallback, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CalendarBlank, CaretRight, GearSix, Heart, Info, LockKey } from "@phosphor-icons/react";
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
import MomentEditor from "./MomentEditor";

const dateFormat = new Intl.DateTimeFormat("nl-BE", { weekday: "long", day: "numeric", month: "long" });
const topic = getQuestionnairePresentation(KINKS.find(item => item.id === "dominance_submission")!);

function subscribeToAppearance(listener: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

type Surface = "settings" | "pin" | "info" | "moment" | null;

export default function OverlayStudy() {
  const [surface, setSurface] = useState<Surface>(null);
  const [moments, setMoments] = useState<IntimacyRecord[]>([]);
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
    setFeedback("Moment bewaard voor deze proef.");
    setSurface(null);
  }

  return (
    <PageShell width="lg" className="overlay-study">
      <h1 className="os-title">Agenda & instellingen</h1>
      <p className="os-note">Je probeert dit uit met tijdelijke gegevens.</p>
      <div className="os-menu">
        <button onClick={() => startMoment("planned")}><CalendarBlank aria-hidden="true"/>Moment plannen<CaretRight aria-hidden="true"/></button>
        <button onClick={() => startMoment("completed")}><Heart aria-hidden="true"/>Moment bijhouden<CaretRight aria-hidden="true"/></button>
        <button onClick={() => setSurface("settings")}><GearSix aria-hidden="true"/>Instellingen<CaretRight aria-hidden="true"/></button>
        <button onClick={() => setSurface("info")}><Info aria-hidden="true"/>{topic.title}<CaretRight aria-hidden="true"/></button>
      </div>
      <p className="os-note" role="status">{feedback}</p>
      {moments.length > 0 && <section className="os-menu" aria-label="Proefmomenten">
        <h2>Je momenten</h2>
        {moments.map(item => <button key={item.id} onClick={() => startMoment(item.status, item)}>
          <CalendarBlank aria-hidden="true"/><span>{item.title || dateFormat.format(new Date(item.date + "T12:00:00"))}
          <small>{[item.time, item.partnerName].filter(Boolean).join(" · ")}</small></span>
          <CaretRight aria-hidden="true"/>
        </button>)}
      </section>}

      <Sheet open={surface === "settings" || surface === "pin"} onClose={close}
        title={surface === "pin" ? "Appvergrendeling" : "Instellingen"} variant="surface" scrollable contentSized>
        {surface === "pin" ? <form className="os-form" onSubmit={event => {
          event.preventDefault();
          if (pinInput.current?.value !== "1234") {
            setPinError(true);
            pinInput.current?.focus();
            return;
          }
          setPinActive(!pinActive);
          close();
        }}>
          <p className="os-note">Gebruik de proefcode 1234.</p>
          <label>Proefcode<input ref={pinInput} autoFocus type="text" inputMode="numeric" autoComplete="off"
            maxLength={4} aria-invalid={pinError || undefined} aria-describedby={pinError ? pinErrorId : undefined}/></label>
          {pinError && <p id={pinErrorId} className="os-error" role="alert">Vul 1234 in.</p>}
          <button className="os-primary">{pinActive ? "Proefvergrendeling uitzetten" : "Vergrendeling uitproberen"}</button>
        </form> : <div className="os-settings" data-preview-theme={resolveTheme(preference, systemDark)}>
          <h3>Kleurmodus</h3>
          <ThemeSelector preference={preference} setPreference={setPreference} samples />
          <h3>Beveiliging</h3>
          <div className="os-menu">
            <button ref={pinLauncher} onClick={() => setSurface("pin")}><LockKey aria-hidden="true"/>
              <span>Appvergrendeling<small>{pinActive ? "Proefvergrendeling actief" : "Probeer de PIN-stap"}</small></span>
              <CaretRight aria-hidden="true"/>
            </button>
          </div>
        </div>}
      </Sheet>
      <Sheet open={surface === "info"} onClose={close} title={topic.title} variant="sheet" scrollable>
        <ExplanationContent><ExplanationProse>{topic.details || topic.essence}</ExplanationProse></ExplanationContent>
      </Sheet>
      {editorSession > 0 && <MomentEditor key={editorSession} open={surface === "moment"} mode={mode} record={editing} onClose={close} onSave={save}/>}
    </PageShell>
  );
}
