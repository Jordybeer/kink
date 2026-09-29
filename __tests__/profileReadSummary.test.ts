import { describe, expect, it } from "vitest";
import { summarizeProfileCategory } from "@/lib/profileReadSummary";
import type { Kink, KinkEntry } from "@/types";

const kinks: Kink[] = [
  { id: "yes-one", name: "Rope", category: "bondage", level: 1 },
  { id: "yes-two", name: "Cuffs", category: "bondage", level: 1 },
  { id: "willing", name: "Blindfold", category: "bondage", level: 1 },
  { id: "maybe", name: "Suspension", category: "bondage", level: 1 },
  { id: "hard", name: "Metal restraints", category: "bondage", level: 1 },
  { id: "private", name: "Secret subject", category: "bondage", level: 1 },
];

function entries(overrides: Record<string, Partial<KinkEntry>> = {}): Record<string, KinkEntry> {
  const base: Record<string, KinkEntry> = {
    "yes-one": { status: "yes", comment: "Slow setup matters." },
    "yes-two": { status: "yes", comment: "" },
    willing: { status: "willing", comment: "" },
    maybe: { status: "maybe", comment: "" },
    hard: { status: "hard_no", comment: "No exceptions." },
    private: { status: "yes", comment: "Never expose this.", privateResponse: true },
  };

  for (const [id, patch] of Object.entries(overrides)) {
    base[id] = { ...base[id], ...patch };
  }
  return base;
}

describe("profile category read summary", () => {
  it("surfaces at most two strongest public interests in status order", () => {
    const summary = summarizeProfileCategory(kinks, entries());

    expect(summary.strongest).toEqual([
      { name: "Rope", status: "yes" },
      { name: "Cuffs", status: "yes" },
    ]);
  });

  it("keeps public hard boundaries named in the collapsed summary", () => {
    const summary = summarizeProfileCategory(kinks, entries());

    expect(summary.hardLimits).toEqual(["Metal restraints"]);
  });

  it("uses useful public context and never private context", () => {
    const summary = summarizeProfileCategory(kinks, entries({
      "yes-one": { comment: "" },
      hard: { comment: "No pressure on joints." },
    }));

    expect(summary.context).toEqual({
      subject: "Metal restraints",
      text: "No pressure on joints.",
    });
    expect(JSON.stringify(summary)).not.toContain("Never expose this.");
    expect(JSON.stringify(summary)).not.toContain("Secret subject");
  });

  it("reports private answers only as a count", () => {
    const summary = summarizeProfileCategory(kinks, entries());

    expect(summary.privateCount).toBe(1);
    expect(JSON.stringify(summary)).not.toContain("Secret subject");
  });

  it("falls back to an exact public status when a category has no strong interest, boundary, or note", () => {
    const fallbackKinks: Kink[] = [
      { id: "maybe-only", name: "Wax play", category: "sensation", level: 1 },
      { id: "partner-only", name: "Massage", category: "sensation", level: 1 },
    ];
    const fallbackEntries: Record<string, KinkEntry> = {
      "maybe-only": { status: "maybe", comment: "" },
      "partner-only": { status: "no", comment: "" },
    };

    const summary = summarizeProfileCategory(fallbackKinks, fallbackEntries);

    expect(summary.fallback).toEqual({ name: "Wax play", status: "maybe" });
  });

  it("shows only a private count when every answer in a category is private", () => {
    const privateOnly = summarizeProfileCategory(
      [{ id: "private", name: "Secret subject" }],
      { private: { status: "hard_no", comment: "Never expose this.", privateResponse: true } },
    );

    expect(privateOnly).toEqual({
      strongest: [],
      hardLimits: [],
      context: null,
      privateCount: 1,
      fallback: null,
    });
  });
});
