import { describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import {
  discussionPairKey,
  discussionFactKey,
  discussionFingerprint,
  invalidateDiscussedTransition,
  loadValidDiscussed,
  setDiscussedMemory,
  subscribeDiscussionMemory,
  DISCUSSION_CHANGED_EVENT,
} from "@/lib/compareDiscussionMemory";
import { buildCompareModel, type ComparisonFact } from "@/lib/compareV2";
import { installDiscussionInvalidation } from "@/lib/compareDiscussionSync";
import { KINKS } from "@/lib/kinks";
import { complementaryPartnerKinkId } from "@/lib/participation";
import type { ContractSeries, ContractVersionContent } from "@/lib/contractLifecycle";
import type { Profile } from "@/types";

function profile(id: string, personGroupId: string, status: "yes" | "willing" | "maybe" = "yes"): Profile {
  return {
    id,
    personGroupId,
    verificationCode: `verification-${id}`,
    name: id,
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: { bondage: { status, comment: "" } },
  };
}

const FACT: ComparisonFact = {
  id: "catalog:profile-a:bondage|profile-b:bondage",
  kind: "shared",
  reasonCode: "mutual_explicit_interest",
  relation: "same",
  label: "Bondage",
  category: "bondage",
  custom: false,
  kinkAId: "bondage",
  kinkBId: "bondage",
  statusA: "yes",
  statusB: "willing",
};

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key(index: number) { return [...values.keys()][index] ?? null; },
    removeItem(key: string) { values.delete(key); },
    clear() { values.clear(); },
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
  };
}

function contractContent(statusB: "willing" | "maybe" = "willing"): ContractVersionContent {
  const detail = { name: "Bondage", statusA: "yes" as const, statusB, commentA: "", commentB: "" };
  return {
    schema: 1,
    profileA: {
      profileId: "profile-a",
      personGroupId: "person-a",
      profileName: "A",
      role: "Switch",
      verificationCode: "verification-a",
    },
    profileB: {
      profileId: "profile-b",
      personGroupId: "person-b",
      profileName: "B",
      role: "Switch",
      verificationCode: "verification-b",
    },
    preamble: "",
    createdAt: 1,
    signalsA: { green: "", amber: "", red: "", black: "" },
    signalsB: { green: "", amber: "", red: "", black: "" },
    aftercareA: [],
    aftercareB: [],
    shared: [detail],
    softLimits: [],
    hardLimits: [],
    hardLimitDetails: [],
    discuss: [],
  };
}

function contract(status: ContractSeries["status"] = "active", statusB: "willing" | "maybe" = "willing"): ContractSeries {
  const content = contractContent(statusB);
  return {
    id: "series-1",
    pairKey: "profile-a|profile-b",
    participants: [content.profileA, content.profileB],
    status,
    createdAt: 1,
    updatedAt: 2,
    currentVersionId: "version-1",
    versions: [{
      id: "version-1",
      number: 1,
      createdAt: 1,
      updatedAt: 2,
      contentHash: "hash",
      content,
      summary: { matchCount: 1, hardLimitCount: 0, softLimitCount: 0, discussCount: 0 },
      state: "signed",
      signatures: [],
    }],
    events: [],
  };
}

describe("Compare discussion memory", () => {
  it("recovers from malformed stored pairs and reports failed writes", () => {
    const a = profile("a", "person-a");
    const b = profile("b", "person-b");
    const storage = memoryStorage();
    storage.setItem("kinksync-compare-discussed-v1", JSON.stringify({ version: 1, pairs: { [discussionPairKey(a, b)]: "broken" } }));
    expect(setDiscussedMemory(storage, a, b, FACT, [], true)).toBe(true);
    expect(loadValidDiscussed(storage, a, b, [FACT], [])).toEqual(new Set([FACT.id]));
    expect(setDiscussedMemory({ ...storage, setItem() { throw new Error("quota"); } }, a, b, FACT, [], true)).toBe(false);
  });

  it("scopes memory to people instead of temporary profile ids", () => {
    const aDominant = profile("a-dom", "person-a");
    const aSubmissive = profile("a-sub", "person-a");
    const b = profile("b", "person-b", "willing");

    expect(discussionPairKey(aDominant, b)).toBe(discussionPairKey(aSubmissive, b));
  });

  it("survives a linked perspective switch when the meaning is unchanged", () => {
    const storage = memoryStorage();
    const aDominant = profile("a-dom", "person-a");
    const aSubmissive = profile("a-sub", "person-a");
    const b = profile("b", "person-b", "willing");

    setDiscussedMemory(storage, aDominant, b, FACT, [], true);
    const discussed = loadValidDiscussed(storage, aSubmissive, b, [{ ...FACT, id: "new-render-id" }], []);

    expect(discussed).toEqual(new Set(["new-render-id"]));
  });

  it("reopens only when a person's current status changes", () => {
    const storage = memoryStorage();
    const a = profile("a", "person-a");
    const b = profile("b", "person-b", "willing");
    setDiscussedMemory(storage, a, b, FACT, [], true);

    const changed = { ...FACT, statusB: "maybe" as const };
    expect(loadValidDiscussed(storage, a, b, [changed], [])).toEqual(new Set());
  });

  it("ignores pause/stop lifecycle state but reopens on relevant agreement meaning", () => {
    const storage = memoryStorage();
    const a = profile("a", "person-a");
    const b = profile("b", "person-b", "willing");
    setDiscussedMemory(storage, a, b, FACT, [contract("active")], true);

    expect(loadValidDiscussed(storage, a, b, [FACT], [contract("paused")])).toEqual(new Set([FACT.id]));

    setDiscussedMemory(storage, a, b, FACT, [contract("active")], true);
    expect(loadValidDiscussed(storage, a, b, [FACT], [contract("active", "maybe")])).toEqual(new Set());
  });
});

const secondFact: ComparisonFact = { ...FACT, id: "second", label: "Second", kinkAId: "second", kinkBId: "second" };
function context(a: Profile, b: Profile, facts = [FACT], series: ContractSeries[] = []) {
  return { profileA: a, profileB: b, facts, contractSeries: series };
}
function seedLegacy(storage: Storage, a: Profile, b: Profile, fact: ComparisonFact) {
  storage.setItem("kinksync-compare-discussed-v1", JSON.stringify({
    version: 1,
    pairs: { [discussionPairKey(a, b)]: {
      [`${fact.custom ? "custom" : "catalog"}:${fact.relation}:${fact.label.trim().toLocaleLowerCase("nl-BE").replace(/\s+/g, " ")}`]: {
        fingerprint: discussionFingerprint(a, b, fact, []), updatedAt: 1,
      },
    } },
  }));
}
function legacyFact(): ComparisonFact {
  const kink = KINKS.find((item) => complementaryPartnerKinkId(item.id) === item.id
    && KINKS.filter((other) => other.name.toLocaleLowerCase("nl-BE") === item.name.toLocaleLowerCase("nl-BE")).length === 1)!;
  return { ...FACT, label: kink.name, kinkAId: kink.id, kinkBId: kink.id };
}

describe("discussion memory without crossed ropes", () => {
  const a = profile("a", "person-a");
  const b = profile("b", "person-b", "willing");

  it("keeps independent marks when another tab writes during a write", () => {
    const storage = memoryStorage();
    let interleave = true;
    const tab = {
      ...storage,
      setItem(key: string, value: string) {
        if (interleave) {
          interleave = false;
          setDiscussedMemory(storage, a, b, secondFact, [], true);
        }
        storage.setItem(key, value);
      },
    };
    setDiscussedMemory(tab, a, b, FACT, [], true);
    expect(loadValidDiscussed(storage, a, b, [FACT, secondFact], [])).toEqual(new Set([FACT.id, secondFact.id]));
    setDiscussedMemory(tab, a, b, FACT, [], false);
    expect(loadValidDiscussed(storage, a, b, [FACT, secondFact], [])).toEqual(new Set([secondFact.id]));
  });

  it("keeps actual catalogue directions separate and survives swapping columns", () => {
    const entries = { pegging_give: { status: "yes" as const, comment: "" }, pegging_receive: { status: "yes" as const, comment: "" } };
    const giver = { ...a, entries };
    const receiver = { ...b, entries };
    const facts = buildCompareModel(giver, receiver).facts;
    expect(facts).toHaveLength(2);
    expect(facts[0].label).toBe(facts[1].label);
    expect(discussionFactKey(giver, receiver, facts[0])).not.toBe(discussionFactKey(giver, receiver, facts[1]));
    const storage = memoryStorage();
    setDiscussedMemory(storage, giver, receiver, facts[0], [], true);
    expect(loadValidDiscussed(storage, giver, receiver, facts, [])).toEqual(new Set([facts[0].id]));
    expect(loadValidDiscussed(storage, receiver, giver, buildCompareModel(receiver, giver).facts, [])).toEqual(new Set([facts[0].id]));
    const changed = { ...facts[1], statusB: "maybe" as const };
    loadValidDiscussed(storage, giver, receiver, [facts[0], changed], []);
    expect(loadValidDiscussed(storage, giver, receiver, facts, [])).toEqual(new Set([facts[0].id]));
  });

  it("does not conflate same-label custom ids or depend on display wording", () => {
    const storage = memoryStorage();
    const first = { ...FACT, custom: true };
    const other = { ...secondFact, label: first.label, custom: true };
    setDiscussedMemory(storage, a, b, first, [], true);
    expect(loadValidDiscussed(storage, a, b, [first, other], [])).toEqual(new Set([first.id]));
    expect(loadValidDiscussed(storage, a, b, [{ ...first, label: "Renamed" }], [])).toEqual(new Set([first.id]));
  });

  it("lets stale readers hide a changed mark without erasing it", () => {
    const storage = memoryStorage();
    const changed = { ...FACT, statusB: "maybe" as const };
    setDiscussedMemory(storage, a, b, changed, [], true);
    const writes = vi.spyOn(storage, "setItem");
    expect(loadValidDiscussed(storage, a, b, [FACT], [])).toEqual(new Set());
    expect(writes).not.toHaveBeenCalled();
    expect(loadValidDiscussed(storage, a, b, [changed], [])).toEqual(new Set([FACT.id]));
  });

  it("permanently reopens changed meaning, but leaves unrelated marks alone", () => {
    const storage = memoryStorage();
    const changed = { ...FACT, statusB: "maybe" as const };
    setDiscussedMemory(storage, a, b, FACT, [], true);
    setDiscussedMemory(storage, a, b, secondFact, [], true);
    expect(invalidateDiscussedTransition(storage, context(a, b, [FACT, secondFact]), context(a, b, [changed, secondFact]))).toBe(true);
    expect(loadValidDiscussed(storage, a, b, [FACT, secondFact], [])).toEqual(new Set([secondFact.id]));
    setDiscussedMemory(storage, a, b, FACT, [], true);
    expect(loadValidDiscussed(storage, a, b, [FACT], [])).toEqual(new Set([FACT.id]));
  });

  it("cannot revoke a fresh acknowledgement written while the old one is being invalidated", () => {
    const storage = memoryStorage();
    const changed = { ...FACT, statusB: "maybe" as const };
    setDiscussedMemory(storage, a, b, FACT, [], true);
    const interleaved = {
      ...storage,
      setItem(key: string, value: string) {
        setDiscussedMemory(storage, a, b, changed, [], true);
        storage.setItem(key, value);
      },
    };
    invalidateDiscussedTransition(interleaved, context(a, b), context(a, b, [changed]));
    expect(loadValidDiscussed(storage, a, b, [changed], [])).toEqual(new Set([FACT.id]));
    // An obsolete transition cannot revoke a different current fingerprint either.
    invalidateDiscussedTransition(storage, context(a, b), context(a, b, []));
    expect(loadValidDiscussed(storage, a, b, [changed], [])).toEqual(new Set([FACT.id]));
  });

  it("preserves unambiguous legacy marks without copying them, and never resurrects an unchecked mark", () => {
    const storage = memoryStorage();
    const fact = legacyFact();
    seedLegacy(storage, a, b, fact);
    const writes = vi.spyOn(storage, "setItem");
    expect(loadValidDiscussed(storage, a, b, [fact], [])).toEqual(new Set([fact.id]));
    expect(writes).not.toHaveBeenCalled();
    setDiscussedMemory(storage, a, b, fact, [], false);
    seedLegacy(storage, a, b, fact); // Even a still-open v1 tab cannot override v2.
    expect(loadValidDiscussed(storage, a, b, [fact], [])).toEqual(new Set());
  });

  it("rejects ambiguous directional and duplicate custom legacy marks", () => {
    const storage = memoryStorage();
    const directional = { ...FACT, relation: "complementary" as const };
    seedLegacy(storage, a, b, directional);
    expect(loadValidDiscussed(storage, a, b, [directional], [])).toEqual(new Set());
    const custom = { ...FACT, custom: true };
    const duplicate = { ...a, customKinks: [{ id: "one", name: FACT.label }, { id: "two", name: FACT.label }] };
    seedLegacy(storage, duplicate, b, custom);
    expect(loadValidDiscussed(storage, duplicate, b, [custom], [])).toEqual(new Set());
  });

  it("invalidates a legacy acknowledgement without touching a concurrent v2 choice", () => {
    const storage = memoryStorage();
    const fact = legacyFact();
    seedLegacy(storage, a, b, fact);
    invalidateDiscussedTransition(storage, context(a, b, [fact]), context(a, b, []));
    expect(loadValidDiscussed(storage, a, b, [fact], [])).toEqual(new Set());
    setDiscussedMemory(storage, a, b, fact, [], true);
    expect(loadValidDiscussed(storage, a, b, [fact], [])).toEqual(new Set([fact.id]));
  });

  it("fails closed for malformed v2 entries and reports failed invalidation", () => {
    const storage = memoryStorage();
    const fact = legacyFact();
    seedLegacy(storage, a, b, fact);
    const key = `kinksync-compare-discussed-v2:${discussionFactKey(a, b, fact)}`;
    for (const bad of ["null", "{", "{}", JSON.stringify({ version: 2, discussed: true })]) {
      storage.setItem(key, bad);
      expect(loadValidDiscussed(storage, a, b, [fact], [])).toEqual(new Set());
    }
    setDiscussedMemory(storage, a, b, fact, [], true);
    expect(invalidateDiscussedTransition({ ...storage, setItem() { throw new Error("quota"); } }, context(a, b, [fact]), context(a, b, []))).toBe(false);
  });

  it("refreshes only relevant storage changes, local changes and focus, and cleans up", () => {
    const storage = memoryStorage();
    const target = new EventTarget() as Window;
    const refresh = vi.fn();
    const unsubscribe = subscribeDiscussionMemory(target, storage, refresh);
    function emit(key: string | null, storageArea = storage) {
      target.dispatchEvent(Object.assign(new Event("storage"), { key, storageArea }));
    }
    emit("unrelated");
    emit(null, memoryStorage());
    expect(refresh).not.toHaveBeenCalled();
    emit("kinksync-compare-discussed-v2:row");
    emit("kinksync-compare-discussed-invalid-v2:acknowledgement");
    emit("kinksync-compare-discussed-v1");
    emit(null);
    target.dispatchEvent(new Event(DISCUSSION_CHANGED_EVENT));
    target.dispatchEvent(new Event("focus"));
    expect(refresh).toHaveBeenCalledTimes(6);
    unsubscribe();
    emit(null);
    target.dispatchEvent(new Event(DISCUSSION_CHANGED_EVENT));
    target.dispatchEvent(new Event("focus"));
    expect(refresh).toHaveBeenCalledTimes(6);
  });

  it("observes real store edits while Compare is absent, including a change and reversion", () => {
    const entries = { pegging_give: { status: "yes" as const, comment: "" }, pegging_receive: { status: "yes" as const, comment: "" } };
    const p = { ...a, entries };
    const q = { ...b, entries };
    const facts = buildCompareModel(p, q).facts;
    const fact = facts.find((item) => item.kinkAId === "pegging_give")!;
    const other = facts.find((item) => item !== fact)!;
    const storage = memoryStorage();
    const profiles = createStore(() => ({ profiles: [p, q] as Profile[] }));
    const contracts = createStore(() => ({ series: [] as ContractSeries[] }));
    const stop = installDiscussionInvalidation(profiles, contracts, storage);
    setDiscussedMemory(storage, p, q, fact, [], true);
    setDiscussedMemory(storage, p, q, other, [], true);
    profiles.setState({ profiles: [{ ...p, entries: { ...entries, pegging_give: { status: "maybe", comment: "" } } }, q] });
    profiles.setState({ profiles: [p, q] });
    expect(loadValidDiscussed(storage, p, q, facts, [])).toEqual(new Set([other.id]));
    stop();
  });

  it("observes agreement edits, preserving pause/stop and reopening only relevant rows", () => {
    const fact = legacyFact();
    const p = { ...a, entries: { [fact.kinkAId]: { status: "yes" as const, comment: "" } } };
    const q = { ...b, entries: { [fact.kinkBId]: { status: "willing" as const, comment: "" } } };
    const row = buildCompareModel(p, q).facts[0];
    const initial = contract();
    initial.versions[0].content!.shared[0].name = row.label;
    const storage = memoryStorage();
    const profiles = createStore(() => ({ profiles: [p, q] as Profile[] }));
    const contracts = createStore(() => ({ series: [initial] }));
    const stop = installDiscussionInvalidation(profiles, contracts, storage);
    setDiscussedMemory(storage, p, q, row, [initial], true);
    contracts.setState({ series: [{ ...initial, status: "stopped" }] });
    expect(loadValidDiscussed(storage, p, q, [row], [initial])).toEqual(new Set([row.id]));
    const changed = structuredClone(initial);
    changed.versions[0].content!.shared[0].commentA = "Changed agreement";
    contracts.setState({ series: [changed] });
    contracts.setState({ series: [initial] });
    expect(loadValidDiscussed(storage, p, q, [row], [initial])).toEqual(new Set());
    stop();
  });
});
