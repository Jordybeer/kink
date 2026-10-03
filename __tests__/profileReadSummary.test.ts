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
};

describe("profile status-first read summary", () => {
  it("orders explicit public meaning as boundaries first, then the four interest statuses", () => {
    const result = buildProfileStatusReadSummary(kinks, entries);
    expect(result.groups.map((group) => group.status)).toEqual(["hard_no", "yes", "willing", "maybe", "no"]);
    expect(result.groups[0].items.map((item) => item.name)).toEqual(["Metal restraints", "Needles"]);
    expect(result.groups[1].items.map((item) => item.name)).toEqual(["Rope", "Cuffs", "Harness", "Praise"]);
  });

  it("keeps catalogue order inside a status without inventing importance", () => {
    const yes = buildProfileStatusReadSummary(kinks, entries).groups.find((group) => group.status === "yes");
    expect(yes?.items.map((item) => item.name)).toEqual(["Rope", "Cuffs", "Harness", "Praise"]);
  });

  it("removes private answers from every public status count and group", () => {
    const result = buildProfileStatusReadSummary(kinks, entries);
    const serialized = JSON.stringify(result.groups);
    expect(result.publicCount).toBe(9);
    expect(result.privateItems).toHaveLength(1);
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

  it("ignores missing and unrated entries", () => {
    expect(buildProfileStatusReadSummary(kinks, {
      private: { status: null, comment: "Draft", privateResponse: true },
    })).toEqual({ groups: [], privateItems: [], publicCount: 0 });
  });
});
