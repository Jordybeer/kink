import { describe, expect, it } from "vitest";
import {
  discussionPairKey,
  loadValidDiscussed,
  setDiscussedMemory,
} from "@/lib/compareDiscussionMemory";
import type { ComparisonFact } from "@/lib/compareV2";
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
