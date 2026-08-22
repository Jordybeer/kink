import { describe, expect, it } from "vitest";
import { buildIntimacyCalendarFile } from "@/lib/intimacyCalendar";
import type { IntimacyRecord } from "@/lib/intimacyStore";

const ENTRY: IntimacyRecord = {
  id: "abc-123",
  status: "planned",
  date: "2026-08-22",
  time: "20:30",
  title: "Stoute zaterdag",
  partnerName: "Sam",
  note: "Wijn, massage;\nen zien waar het eindigt.",
  createdAt: 1,
  updatedAt: 1,
};

describe("intimacy calendar export", () => {
  it("is discreet by default", () => {
    const ics = buildIntimacyCalendarFile(ENTRY, { now: new Date("2026-08-22T12:00:00Z") });
    expect(ics).toContain("DTSTART:20260822T203000");
    expect(ics).toContain("SUMMARY:Privé moment");
    expect(ics).not.toContain("Stoute zaterdag");
    expect(ics).not.toContain("Sam");
    expect(ics).not.toContain("massage");
  });

  it("includes explicitly requested details with ICS escaping", () => {
    const ics = buildIntimacyCalendarFile(ENTRY, {
      includeDetails: true,
      now: new Date("2026-08-22T12:00:00Z"),
    });
    expect(ics).toContain("SUMMARY:Stoute zaterdag");
    expect(ics).toContain("Met: Sam");
    expect(ics).toContain("Wijn\\, massage\\;\\nen zien waar het eindigt.");
  });

  it("requires a real local date and time", () => {
    expect(() => buildIntimacyCalendarFile({ ...ENTRY, time: undefined })).toThrow("Kies eerst een tijd.");
    expect(() => buildIntimacyCalendarFile({ ...ENTRY, date: "2026-02-31" })).toThrow("Ongeldige datum of tijd.");
  });
});
