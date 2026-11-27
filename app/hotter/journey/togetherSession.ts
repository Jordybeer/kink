import type { IntimacyRecord } from "@/lib/intimacyStore";
import { buildIntimacyCalendarFile } from "@/lib/intimacyCalendar";
import type { AftercareEntry, SceneItem } from "@/types";

export type MomentDraft = Omit<IntimacyRecord, "createdAt" | "updatedAt" | "completedAt">;
export type MomentError = { field: "date" | "time" | "reminder" | "save"; message: string };
type CareDraft = { trafficLight: AftercareEntry["trafficLight"] | null; wentWell: string; remember: string };
type SampleScene = { status: "planned" | "completed"; items: SceneItem[]; aftercare?: AftercareEntry };
export type TogetherSession = {
  moments: IntimacyRecord[];
  month: string;
  day: string;
  tab: "planned" | "completed";
  draft: MomentDraft | null;
  draftOriginal: MomentDraft | null;
  details: boolean;
  error: MomentError | null;
  sequence: number;
  scene: SampleScene;
  care: CareDraft;
};

export const PARTNERS = [{ id: "jules", name: "Jules" }] as const;
const fixtureDate = "2026-11-28";
const seed = (record: MomentDraft): IntimacyRecord => ({ ...record, createdAt: 0, updatedAt: 0, ...(record.status === "completed" ? {completedAt: 0} : {}) });
const item = (id: string, name: string, intensity: SceneItem["intensity"]): SceneItem => ({ id, name, intensity, duration: "", note: "", fromKink: false, kinkId: undefined });
export function initialTogether(): TogetherSession {
  return {
    moments: [
      seed({ id: "evening", status: "planned", date: fixtureDate, time: "20:00", title: "Een avond samen", partnerProfileId: "jules", partnerName: "Jules", note: "Tijd maken voor elkaar, zonder haast.", reminderDaysBefore: 2 }),
      seed({ id: "solo", status: "planned", date: "2026-11-30", time: "19:00", title: "Tijd voor mezelf", note: "Een eigen moment om te reflecteren." }),
      seed({ id: "memory", status: "completed", date: "2026-11-14", title: "Een rustig begin", partnerProfileId: "jules", partnerName: "Jules", note: "Even tijd voor elkaar genomen." }),
    ],
    month: "2026-11", day: "", tab: "planned", draft: null, draftOriginal: null, details: false, error: null, sequence: 1,
    scene: { status: "planned", items: [item("talk", "Samen afstemmen", "zacht"), item("pause", "Een moment rust", "zacht"), item("check", "Even inchecken", "midden")] },
    care: { trafficLight: null, wentWell: "", remember: "" },
  };
}

function toDraft(record: IntimacyRecord): MomentDraft {
  const { createdAt: _created, updatedAt: _updated, completedAt: _completed, ...draft } = record;
  return draft;
}
export function openMoment(state: TogetherSession, id?: string, complete = false): TogetherSession {
  if (state.draft) return state;
  const old = state.moments.find(m => m.id === id);
  if (id && !old) return state;
  if (complete && old?.status !== "planned") return state;
  const draft: MomentDraft = old ? toDraft(old) : { id: "sample-" + state.sequence, date: state.day || state.month + "-01", time: "20:00", status: state.tab, title: "", note: "" };
  if (complete) { draft.status = "completed"; delete draft.reminderDaysBefore; }
  return { ...state, draft, draftOriginal: { ...draft }, details: !old, error: null, sequence: old ? state.sequence : state.sequence + 1 };
}
export function patchMoment(state: TogetherSession, patch: Partial<Pick<MomentDraft, "date"|"time"|"title"|"note"|"partnerProfileId"|"reminderDaysBefore">>): TogetherSession {
  if (!state.draft) return state;
  const draft = { ...state.draft, ...patch };
  const partner = PARTNERS.find(p => p.id === draft.partnerProfileId);
  draft.partnerProfileId = partner?.id;
  draft.partnerName = partner?.name;
  if (draft.status === "completed") delete draft.reminderDaysBefore;
  return { ...state, draft, error: null };
}
export function hasMomentChanges(state: TogetherSession) {
  if (!state.draft || !state.draftOriginal) return false;
  const normalize = (d: MomentDraft) => JSON.stringify([d.title ?? "",d.date,d.time ?? "",d.partnerProfileId ?? "",d.note ?? "",d.reminderDaysBefore ?? null]);
  return normalize(state.draft) !== normalize(state.draftOriginal);
}
export function discardMoment(state: TogetherSession): TogetherSession {
  return { ...state, draft: null, draftOriginal: null, details: false, error: null };
}
export function validMomentDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0,4)) < 1000) return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function validateMoment(d: MomentDraft): MomentError | null {
  if (!validMomentDate(d.date)) return { field: "date", message: "Kies een geldige datum." };
  if ((d.status === "planned" || d.time) && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time ?? "")) return { field: "time", message: "Kies een geldige tijd." };
  if (d.reminderDaysBefore !== undefined && (!Number.isInteger(d.reminderDaysBefore) || d.reminderDaysBefore < 1 || d.reminderDaysBefore > 14)) return { field: "reminder", message: "Kies een herinnering van 1 tot 14 dagen." };
  if (d.time) {
    try { buildIntimacyCalendarFile({...d,createdAt:0,updatedAt:0}, {now:new Date(0)}); }
    catch { return {field:"time",message:"Deze lokale tijd is niet geldig op de gekozen datum."}; }
  }
  return null;
}
export function saveMoment(state: TogetherSession, now: number, fail = false): TogetherSession {
  const draft = state.draft;
  if (!draft) return state;
  const error = validateMoment(draft);
  if (error) return { ...state, error, details: true };
  if (fail) return { ...state, error: { field: "save", message: "Bewaartest mislukt. Je notitie is nog aanwezig. Probeer opnieuw." } };
  const old = state.moments.find(m => m.id === draft.id);
  const partner = PARTNERS.find(p => p.id === draft.partnerProfileId);
  const saved: IntimacyRecord = { ...draft, title: draft.title?.trim() || "Privé moment", partnerProfileId: partner?.id, partnerName: partner?.name, time: draft.time || undefined, createdAt: old?.createdAt ?? now, updatedAt: now };
  if (saved.status === "completed") { saved.completedAt = old?.completedAt ?? now; delete saved.reminderDaysBefore; }
  const moments = old ? state.moments.map(m => m.id === saved.id ? saved : m) : [...state.moments, saved];
  return { ...discardMoment(state), moments, tab: saved.status, month: saved.date.slice(0,7), day: "" };
}
export function moveMonth(month: string, delta: number) {
  if (!validMomentDate(month + "-01") || !Number.isInteger(delta)) return month;
  const [y,m] = month.split("-").map(Number);
  const value = new Date(Date.UTC(y,m-1+delta,1));
  if (!Number.isFinite(value.getTime()) || value.getUTCFullYear()<1000 || value.getUTCFullYear()>9999) return month;
  return value.toISOString().slice(0,7);
}
export function calendarContents(record: IntimacyRecord, includeDetails = false, now?: Date) {
  return buildIntimacyCalendarFile(record, { includeDetails, now });
}
export function updateScene(state: TogetherSession, id: string, intensity: SceneItem["intensity"]): TogetherSession {
  if (state.scene.status === "completed") return state;
  return {...state,scene:{...state.scene,items:state.scene.items.map(i=>i.id===id?{...i,intensity}:i)}};
}
export function reorderScene(state: TogetherSession, id: string, delta: number): TogetherSession {
  if (state.scene.status === "completed") return state;
  const items = [...state.scene.items], from = items.findIndex(i=>i.id===id), to = from+delta;
  if (from<0||to<0||to>=items.length) return state;
  [items[from],items[to]]=[items[to],items[from]];
  return {...state,scene:{...state.scene,items}};
}
export function completeScene(state: TogetherSession): TogetherSession {
  return state.scene.status === "completed" || state.scene.items.length === 0 ? state : {...state,scene:{...state.scene,status:"completed"}};
}
export function saveAftercare(state: TogetherSession, now: number): TogetherSession {
  const { trafficLight,wentWell,remember }=state.care;
  if (state.scene.status!=="completed"||!trafficLight) return state;
  return {...state,scene:{...state.scene,aftercare:{trafficLight,wentWell,remember,completedAt:state.scene.aftercare?.completedAt??now}}};
}
