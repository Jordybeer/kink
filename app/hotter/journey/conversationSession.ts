import { KINKS } from "@/lib/kinks";
import { getQuestionnaireRuntime } from "@/lib/questionnaire";
import { getDynamicFirstRound } from "@/lib/questionnaireFirstRound";
import { isConversationContinuation, positiveQuestionnaireStatus, selectConversationQuestion, type ConversationPhase } from "@/lib/questionnaireEngine";
import type { KinkEntry, KinkStatus, Profile } from "@/types";

export type CurrentQuestion = { id: string; relation: "initial" | "followup" | "complement" | "new"; continuation: boolean };
export type ConversationSession = {
  entries: Record<string, KinkEntry>;
  deferred: string[];
  current: CurrentQuestion | null;
  pending: boolean;
  revision: number;
  mode: "deck" | "overview" | "edit";
  editId: string | null;
};
export type ConversationAction =
  | { type: "choose"; id: string; status: KinkStatus }
  | { type: "flag"; id: string; flag: "privateResponse" | "curious" }
  | { type: "tag"; id: string; tag: "vraag eerst" | "eerste keer" }
  | { type: "advance"; revision: number }
  | { type: "skip"; id: string }
  | { type: "overview" }
  | { type: "resume" }
  | { type: "revisit" }
  | { type: "edit"; id: string };

const sample: Profile = {
  id: "journey-conversation-noor",
  name: "Noor",
  role: "Switch",
  experienceLevel: "beginner",
  entries: {},
  customKinks: [],
  createdAt: 0,
  updatedAt: 0,
};
const EMPTY: KinkEntry = { status: null, comment: "" };
const catalog = new Map(KINKS.map(kink => [kink.id, kink]));
export function getConversationTopic(id: string) { return catalog.get(id); }
export function getConversationRound(entries: Record<string, KinkEntry>) {
  const profile: Profile = { ...sample, entries };
  return getDynamicFirstRound(profile, getQuestionnaireRuntime(profile));
}

function nextQuestion(entries: Record<string, KinkEntry>, deferred: string[], phase: ConversationPhase, lastId: string | null, first = false): CurrentQuestion | null {
  const queue = getConversationRound(entries).queue.filter(item => !deferred.includes(item.kink.id));
  // The study starts with a known eligible core anchor for reproducible comparison.
  const item = (first ? queue.find(candidate => candidate.kink.id === "dominance_submission") : undefined)
    ?? selectConversationQuestion(queue, KINKS, { phase, lastKinkId: lastId });
  if (!item) return null;
  const continuation = isConversationContinuation(item, lastId);
  const probe = phase === "preferContinuation" && item.isProbe && continuation;
  const complement = (phase === "preferContinuation" || phase === "preferComplement") && continuation && !probe;
  return { id: item.kink.id, relation: first ? "initial" : probe ? "followup" : complement ? "complement" : "new", continuation };
}

export function startConversation(): ConversationSession {
  return { entries: {}, deferred: [], current: nextQuestion({}, [], "normal", null, true), pending: false, revision: 0, mode: "deck", editId: null };
}

function advance(state: ConversationSession): ConversationSession {
  if (!state.pending || !state.current) return state;
  const { id, continuation } = state.current;
  const status = state.entries[id]?.status;
  if (status == null) return { ...state, pending: false };
  const phase: ConversationPhase = continuation || status === "hard_no"
    ? "topicBreakRequired" : positiveQuestionnaireStatus(status) ? "preferContinuation" : "preferComplement";
  return { ...state, current: nextQuestion(state.entries, state.deferred, phase, id), pending: false };
}

function updateEntry(state: ConversationSession, id: string, patch: Partial<KinkEntry>) {
  return { ...state.entries, [id]: { ...(state.entries[id] ?? EMPTY), ...patch } };
}

export function transitionConversation(state: ConversationSession, action: ConversationAction): ConversationSession {
  const activeId = state.mode === "edit" ? state.editId : state.mode === "deck" ? state.current?.id : null;
  switch (action.type) {
    case "choose": {
      if (action.id !== activeId) return state;
      const previous = state.entries[action.id]?.status ?? null;
      const status = previous === action.status ? null : action.status;
      const entries = updateEntry(state, action.id, { status, desire: null });
      return { ...state, entries, revision: state.revision + 1, pending: state.mode === "deck" && status != null };
    }
    case "flag":
      if (action.id !== activeId) return state;
      return { ...state, entries: updateEntry(state, action.id, { [action.flag]: !state.entries[action.id]?.[action.flag] }) };
    case "tag": {
      if (action.id !== activeId) return state;
      const tags = state.entries[action.id]?.tags ?? [];
      return { ...state, entries: updateEntry(state, action.id, { tags: tags.includes(action.tag) ? tags.filter(tag => tag !== action.tag) : [...tags, action.tag] }) };
    }
    case "advance":
      return action.revision === state.revision && state.mode === "deck" ? advance(state) : state;
    case "skip": {
      if (state.mode !== "deck" || action.id !== activeId || state.pending) return state;
      const deferred = [...new Set([...state.deferred, action.id])];
      return { ...state, deferred, current: nextQuestion(state.entries, deferred, "normal", action.id), revision: state.revision + 1 };
    }
    case "overview": {
      const next = advance(state);
      if (state.mode === "edit") {
        // An edited earlier answer can change eligibility; do not retain a stale probe or cue.
        const queue = getConversationRound(next.entries).queue;
        const current = next.current && queue.some(item => item.kink.id === next.current?.id) && !next.deferred.includes(next.current.id)
          ? { ...next.current, relation: "new" as const, continuation: false }
          : nextQuestion(next.entries, next.deferred, "normal", null);
        return { ...next, mode: "overview", editId: null, current };
      }
      return { ...next, mode: "overview", editId: null };
    }
    case "resume":
      return { ...state, mode: "deck", editId: null };
    case "revisit":
      return { ...state, deferred: [], current: nextQuestion(state.entries, [], "normal", null), pending: false, mode: "deck", editId: null, revision: state.revision + 1 };
    case "edit":
      if (state.mode !== "overview" || !catalog.has(action.id) || !state.entries[action.id] || state.entries[action.id].status == null) return state;
      return { ...state, mode: "edit", editId: action.id, pending: false };
  }
}
