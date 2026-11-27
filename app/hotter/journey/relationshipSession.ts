import { buildCompareModel, type ComparisonFact } from "@/lib/compareV2";
import { discussionFactKey, discussionFingerprint, discussionPairKey, profilePersonKey } from "@/lib/compareDiscussionMemory";
import type { KinkEntry, KinkStatus, Profile } from "@/types";

export type RelationshipProfileId = "noor" | "noor-alt" | "jules" | "jules-empty";
export type RelationshipSession = { profiles: Profile[]; left: string; right: string; marks: Record<string, string> };
const answer = (status: KinkStatus, extra: Partial<KinkEntry> = {}): KinkEntry => ({ status, comment: "", ...extra });
const profile = (id: RelationshipProfileId, name: string, personGroupId: string, own: boolean, entries: Profile["entries"]): Profile => ({
  id, name, personGroupId, role: "Switch", experienceLevel: "beginner", entries, customKinks: [], createdAt: 0, updatedAt: 0, origin: own ? "own" : "shared", isImported: !own,
});
export const PERSPECTIVE_LABELS: Record<RelationshipProfileId, string> = {
  noor: "Mijn perspectief",
  "noor-alt": "Mijn perspectief voor een vertrouwde dynamiek",
  jules: "Gedeeld perspectief",
  "jules-empty": "Nieuw gedeeld perspectief",
};
export const PRIVATE_RELATIONSHIP_NOTE = "Ik neem graag de tijd om iets nieuws te bespreken.";
export function initialRelationship(): RelationshipSession {
  const noor = {
    aftercare_physical: answer("yes"),
    praise_kink: answer("willing"),
    titels_aanspreekvormen: answer("maybe"),
    aftercare_alone: answer("hard_no"),
    blindfold_give: answer("willing"),
    aftercare_verbal: answer("maybe", { privateResponse: true, comment: "Fictieve persoonlijke context." }),
    dominance_submission: answer(null),
  };
  return {
    profiles: [
      { ...profile("noor", "Noor", "journey-noor", true, noor), privateNote: PRIVATE_RELATIONSHIP_NOTE },
      profile("noor-alt", "Noor", "journey-noor", true, { ...noor, titels_aanspreekvormen: answer("willing") }),
      profile("jules", "Jules", "journey-jules", false, {
        aftercare_physical: answer("yes"), praise_kink: answer("yes"), titels_aanspreekvormen: answer("no"),
        aftercare_alone: answer("yes"), blindfold_receive: answer("yes"), aftercare_verbal: answer("yes"), dominance_submission: answer("willing"),
      }),
      profile("jules-empty", "Jules", "journey-jules", false, {}),
    ],
    left: "noor", right: "jules", marks: {},
  };
}
export function findRelationshipProfile(state: RelationshipSession, id: string) { return state.profiles.find(p => p.id === id); }
export function getPair(state: RelationshipSession): [Profile, Profile] {
  return [findRelationshipProfile(state, state.left)!, findRelationshipProfile(state, state.right)!];
}
export function relationshipModel(state: RelationshipSession) {
  return buildCompareModel(...getPair(state));
}
export function perspectiveLabel(id: string) { return PERSPECTIVE_LABELS[id as RelationshipProfileId] ?? ""; }
export function identityTone(profile: Profile) { return profile.personGroupId === "journey-noor" ? "noor" : "jules"; }
function meaning(state: RelationshipSession, fact: ComparisonFact) {
  const [a,b] = getPair(state);
  return { key: discussionFactKey(a,b,fact), fingerprint: discussionFingerprint(a,b,fact,[]) };
}
export function isDiscussed(state: RelationshipSession, fact: ComparisonFact) {
  const { key,fingerprint } = meaning(state,fact);
  return state.marks[key] === fingerprint;
}
export function toggleDiscussion(state: RelationshipSession, id: string): RelationshipSession {
  const fact = relationshipModel(state).facts.find(f => f.id === id);
  if (!fact) return state;
  const {key,fingerprint} = meaning(state,fact);
  const marks = {...state.marks};
  if (marks[key] === fingerprint) delete marks[key];
  else marks[key] = fingerprint;
  return {...state,marks};
}
function reconcile(previous: RelationshipSession, next: RelationshipSession): RelationshipSession {
  if (discussionPairKey(...getPair(previous)) !== discussionPairKey(...getPair(next))) return next;
  const current = new Map(relationshipModel(next).facts.map(f => { const m = meaning(next,f); return [m.key,m.fingerprint]; }));
  const marks = {...previous.marks};
  for (const fact of relationshipModel(previous).facts) {
    const m = meaning(previous,fact);
    if (marks[m.key] !== undefined && current.get(m.key) !== m.fingerprint) delete marks[m.key];
  }
  return {...next, marks};
}
export function selectRelationship(state: RelationshipSession, left: string, right: string): RelationshipSession {
  const a = findRelationshipProfile(state,left), b = findRelationshipProfile(state,right);
  if (!a || !b || profilePersonKey(a) === profilePersonKey(b)) return state;
  if (state.left === left && state.right === right) return state;
  return reconcile(state,{...state,left,right});
}
export function changeResponse(state: RelationshipSession, id: string, topic: string, status: KinkStatus): RelationshipSession {
  const p = findRelationshipProfile(state,id);
  if (!p || p.isImported || p.origin === "shared" || !p.entries[topic]) return state;
  const profiles = state.profiles.map(candidate => candidate.id === id
    ? {...candidate, entries: {...candidate.entries,[topic]: {...candidate.entries[topic],status}}}
    : candidate);
  return reconcile(state,{...state,profiles});
}
