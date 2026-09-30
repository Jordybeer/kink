import { describe, expect, it } from "vitest";
import { summarizeProfileCategory } from "@/lib/profileReadSummary";
import type { Kink, KinkEntry } from "@/types";

const kinks: Kink[] = [
  { id: "yes-one", name: "Rope", category: "bondage", level: 1 },
  { id: "yes-two", name: "Cuffs", category: "bondage", level: 1 },
  { id: "yes-three", name: "Harness", category: "bondage", level: 1 },
  { id: "willing", name: "Blindfold", category: "bondage", level: 1 },
  { id: "maybe", name: "Suspension", category: "bondage", level: 1 },
  { id: "hard", name: "Metal restraints", category: "bondage", level: 1 },
  { id: "private", name: "Secret subject", category: "bondage", level: 1 },
];

function entries(overrides: Record<string, Partial<KinkEntry>> = {}): Record<string, KinkEntry> {
  const base: Record<string, KinkEntry> = {
    "yes-one": { status: "yes", comment: "" },
    "yes-two": { status: "yes", comment: "" },
    "yes-three": { status: "yes", comment: "" },
    willing: { status: "willing", comment: "" },
    maybe: { status: "maybe", comment: "" },
    hard: { status: "hard_no", comment: "" },
    private: { status: "yes", comment: "Never expose this.", privateResponse: true },
  };

  for (const [id, patch] of Object.entries(overrides)) {
    base[id] = { ...base[id], ...patch };
  }
  return base;
}

describe("profile category read summary", () => {
  it("previews the highest explicit public interest status in stable catalogue order", () => {
    const summary = summarizeProfileCategory(kinks, entries());

    expect(summary.preview).toEqual({
      status: "yes",
      names: ["Rope", "Cuffs"],
      remaining: 1,
    });
  });

  it("uses Ja only when there is no public Heel graag answer", () => {
    const summary = summarizeProfileCategory(kinks, entries({
      "yes-one": { status: "maybe" },
      "yes-two": { status: "no" },
      "yes-three": { status: "maybe" },
    }));

    expect(summary.preview).toEqual({
      status: "willing",
      names: ["Blindfold"],
      remaining: 0,
    });
  });

  it("keeps every public hard boundary named and excludes private hard boundaries", () => {
    const hardKinks = [
      { id: "hard", name: "Metal restraints" },
      { id: "hard-two", name: "Needles" },
      { id: "private-hard", name: "Secret limit" },
    ];
    const summary = summarizeProfileCategory(hardKinks, {
      hard: { status: "hard_no", comment: "" },
      "hard-two": { status: "hard_no", comment: "" },
      "private-hard": { status: "hard_no", comment: "Never expose this.", privateResponse: true },
    });

    expect(summary.hardLimits).toEqual(["Metal restraints", "Needles"]);
    expect(summary.privateCount).toBe(1);
    expect(JSON.stringify(summary)).not.toContain("Secret limit");
    expect(JSON.stringify(summary)).not.toContain("Never expose this.");
  });

  it("shows the single public note without inventing an importance label", () => {
    const summary = summarizeProfileCategory(kinks, entries({
      maybe: { comment: "Alleen als we rustig opbouwen." },
    }));

    expect(summary.context).toEqual([{
      text: "Alleen als we rustig opbouwen.",
      subject: "Suspension",
    }]);
  });

  it("uses a sole hard-limit note when several public notes exist and keeps attribution factual", () => {
    const summary = summarizeProfileCategory(kinks, entries({
      "yes-one": { comment: "Fun on weekends." },
      hard: { comment: "No exceptions." },
    }));

    expect(summary.context).toEqual([{
      text: "No exceptions.",
      subject: "Metal restraints",
    }]);
  });

  it("omits ambiguous context instead of choosing a note arbitrarily", () => {
    const summary = summarizeProfileCategory(kinks, entries({
      "yes-one": { comment: "First note." },
      willing: { comment: "Second note." },
      hard: { comment: "" },
    }));

    expect(summary.context).toEqual([]);
  });

  it("reports private answers only as a count", () => {
    const summary = summarizeProfileCategory(kinks, entries());

    expect(summary.privateCount).toBe(1);
    expect(JSON.stringify(summary)).not.toContain("Secret subject");
    expect(JSON.stringify(summary)).not.toContain("Never expose this.");
  });

  it("keeps context for every public boundary without selecting between them", () => {
    const summary = summarizeProfileCategory(kinks, entries({
      "yes-one": { comment: "A preference note." },
      "yes-two": { status: "hard_no", comment: "Do not use cuffs." },
      hard: { comment: "No metal." },
      private: { status: "hard_no" },
    }));

    expect(summary.context).toEqual([
      { subject: "Cuffs", text: "Do not use cuffs." },
      { subject: "Metal restraints", text: "No metal." },
    ]);
    expect(summary.hardLimits).toEqual(["Cuffs", "Metal restraints"]);
  });

  it("private content cannot influence a public preview, remainder, note or fallback", () => {
    const base = entries({ "yes-one": { status: "willing" }, "yes-two": { status: "willing" }, "yes-three": { status: "willing" } });
    const expected = summarizeProfileCategory(kinks, base);
    expect(expected.preview).toEqual({ status: "willing", names: ["Rope", "Cuffs"], remaining: 2 });

    for (const status of ["yes", "willing", "maybe", "no", "hard_no"] as const) {
      const changed = { ...base, private: { status, comment: "Secret context", tags: ["Secret tag"], curious: true, privateResponse: true } };
      expect(summarizeProfileCategory(kinks, changed)).toEqual(expected);
    }
  });

  it("ignores missing and unrated entries, including private drafts", () => {
    expect(summarizeProfileCategory(kinks, { private: { status: null, comment: "Draft", privateResponse: true } })).toEqual({
      preview: null, hardLimits: [], context: [], privateCount: 0, fallback: null,
    });
  });

  it("falls back to one exact public status when no interest, hard limit or unambiguous note exists", () => {
    const fallbackKinks = [
      { id: "maybe-one", name: "Wax play" },
      { id: "partner-only", name: "Massage" },
    ];
    const summary = summarizeProfileCategory(fallbackKinks, {
      "maybe-one": { status: "maybe", comment: "" },
      "partner-only": { status: "no", comment: "" },
    });

    expect(summary.fallback).toEqual({ status: "maybe", name: "Wax play" });
  });

  it("keeps context snippets compact without splitting emoji", () => {
    const longComment = `${"x".repeat(108)}🙂extra`;
    const summary = summarizeProfileCategory(
      [{ id: "maybe", name: "Suspension" }],
      { maybe: { status: "maybe", comment: longComment } },
    );

    expect(summary.context[0]?.text.endsWith("…")).toBe(true);
    expect(summary.context[0]?.text).not.toContain("�");
  });

  it("shows only a private count when every answer in a category is private", () => {
    const privateOnly = summarizeProfileCategory(
      [{ id: "private", name: "Secret subject" }],
      { private: { status: "hard_no", comment: "Never expose this.", privateResponse: true } },
    );

    expect(privateOnly).toEqual({
      preview: null,
      hardLimits: [],
      context: [],
      privateCount: 1,
      fallback: null,
    });
  });
});
