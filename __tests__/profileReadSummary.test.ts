import { describe, expect, it } from "vitest";
import { buildProfileStatusReadSummary } from "@/lib/profileReadSummary";
import type { Kink, KinkEntry } from "@/types";

const kinks: Kink[] = [
  { id: "yes-one", name: "Rope", category: "bondage", level: 1 },
  { id: "yes-two", name: "Cuffs", category: "bondage", level: 1 },
  { id: "yes-three", name: "Harness", category: "bondage", level: 1 },
  { id: "yes-four", name: "Praise", category: "power", level: 1 },
  { id: "willing", name: "Blindfold", category: "bondage", level: 1 },
  { id: "maybe", name: "Suspension", category: "bondage", level: 1 },
  { id: "partner", name: "Massage", category: "aftercare", level: 1 },
  { id: "hard", name: "Metal restraints", category: "bondage", level: 1 },
  { id: "hard-two", name: "Needles", category: "sensation", level: 1 },
  { id: "private", name: "Secret subject", category: "roleplay", level: 1 },
  { id: "custom-public", name: "Kaarsvet druppels", category: "custom", level: 1 },
  { id: "custom-hard", name: "Persoonlijke grens", category: "custom", level: 1 },
  { id: "custom-private", name: "Privé eigen onderwerp", category: "custom", level: 1 },
];

const entries: Record<string, KinkEntry> = {
  "yes-one": { status: "yes", comment: "" },
  "yes-two": { status: "yes", comment: "" },
  "yes-three": { status: "yes", comment: "" },
  "yes-four": { status: "yes", comment: "Keep the context." },
  willing: { status: "willing", comment: "" },
  maybe: { status: "maybe", comment: "Only slowly." },
  partner: { status: "no", comment: "" },
  hard: { status: "hard_no", comment: "No exceptions." },
  "hard-two": { status: "hard_no", comment: "" },
  private: { status: "yes", comment: "Never expose this.", tags: ["secret"], curious: true, privateResponse: true },
  "custom-public": { status: "willing", comment: "Alleen met vooraf afgesproken materiaal." },
  "custom-hard": { status: "hard_no", comment: "Niet bespreekbaar." },
  "custom-private": { status: "maybe", comment: "Alleen voor mezelf.", privateResponse: true },
};

describe("profile status-first read summary", () => {
  it("orders explicit public meaning as boundaries first, then the four interest statuses", () => {
    const result = buildProfileStatusReadSummary(kinks, entries);
    expect(result.groups.map((group) => group.status)).toEqual(["hard_no", "yes", "willing", "maybe", "no"]);
    expect(result.groups[0].items.map((item) => item.name)).toEqual(["Metal restraints", "Needles", "Persoonlijke grens"]);
    expect(result.groups[1].items.map((item) => item.name)).toEqual(["Rope", "Cuffs", "Harness", "Praise"]);
  });

  it("keeps catalogue order inside a status without inventing importance", () => {
    const yes = buildProfileStatusReadSummary(kinks, entries).groups.find((group) => group.status === "yes");
    expect(yes?.items.map((item) => item.name)).toEqual(["Rope", "Cuffs", "Harness", "Praise"]);
  });

  it("removes private answers from every public status count and group", () => {
    const result = buildProfileStatusReadSummary(kinks, entries);
    const serialized = JSON.stringify(result.groups);
    expect(result.publicCount).toBe(11);
    expect(result.privateItems).toHaveLength(2);
    expect(serialized).not.toContain("Secret subject");
    expect(serialized).not.toContain("Never expose this.");
    expect(serialized).not.toContain("secret");
  });

  it("keeps private detail only in the private collection for deliberate local reveal", () => {
    const result = buildProfileStatusReadSummary(kinks, entries);
    expect(result.privateItems[0]).toMatchObject({
      name: "Secret subject",
      status: "yes",
      comment: "Never expose this.",
      tags: ["secret"],
      curious: true,
    });
  });

  it("treats rated custom topics as ordinary public answers", () => {
    const result = buildProfileStatusReadSummary(kinks, entries);
    const willing = result.groups.find((group) => group.status === "willing");
    expect(willing?.items).toContainEqual(expect.objectContaining({
      id: "custom-public",
      name: "Kaarsvet druppels",
      category: "custom",
      status: "willing",
      comment: "Alleen met vooraf afgesproken materiaal.",
    }));
  });

  it("keeps a custom hard boundary in the hard boundary group", () => {
    const hard = buildProfileStatusReadSummary(kinks, entries).groups.find((group) => group.status === "hard_no");
    expect(hard?.items).toContainEqual(expect.objectContaining({
      id: "custom-hard",
      category: "custom",
      status: "hard_no",
    }));
  });

  it("keeps a private custom topic out of public groups and in deliberate private reveal", () => {
    const result = buildProfileStatusReadSummary(kinks, entries);
    expect(JSON.stringify(result.groups)).not.toContain("Privé eigen onderwerp");
    expect(result.privateItems).toContainEqual(expect.objectContaining({
      id: "custom-private",
      category: "custom",
      status: "maybe",
      comment: "Alleen voor mezelf.",
    }));
  });

  it("ignores missing and unrated entries", () => {
    expect(buildProfileStatusReadSummary(kinks, {
      private: { status: null, comment: "Draft", privateResponse: true },
    })).toEqual({ groups: [], privateItems: [], publicCount: 0 });
  });
});
