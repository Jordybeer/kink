import { describe, expect, it } from "vitest";
import { sanitizeIntimacyBackupEntries, sanitizeIntimacyRecord } from "@/lib/intimacyBackup";

const VALID = {
  id: "moment-1",
  status: "completed",
  date: "2026-08-22",
  time: "21:15",
  title: "Privé moment",
  partnerProfileId: "partner-1",
  partnerName: "Sam",
  note: "Fijn en rustig",
  createdAt: 10,
  updatedAt: 20,
  completedAt: 20,
};

describe("intimacy backup sanitation", () => {
  it("keeps a valid local intimacy record", () => {
    expect(sanitizeIntimacyRecord(VALID)).toEqual(VALID);
  });

  it("keeps a valid planned reminder and rejects malformed lead times", () => {
    const planned = {
      ...VALID,
      status: "planned",
      completedAt: undefined,
      reminderDays: 4,
    };
    expect(sanitizeIntimacyRecord(planned)).toEqual({
      id: VALID.id,
      status: "planned",
      date: VALID.date,
      time: VALID.time,
      title: VALID.title,
      partnerProfileId: VALID.partnerProfileId,
      partnerName: VALID.partnerName,
      note: VALID.note,
      reminderDays: 4,
      createdAt: VALID.createdAt,
      updatedAt: VALID.updatedAt,
    });
    expect(sanitizeIntimacyRecord({ ...planned, reminderDays: 0 })).toBeNull();
    expect(sanitizeIntimacyRecord({ ...planned, reminderDays: 15 })).toBeNull();
    expect(sanitizeIntimacyRecord({ ...planned, reminderDays: 2.5 })).toBeNull();
  });

  it("drops malformed dates, times and incomplete completed records", () => {
    expect(sanitizeIntimacyRecord({ ...VALID, date: "2026-02-31" })).toBeNull();
    expect(sanitizeIntimacyRecord({ ...VALID, time: "25:00" })).toBeNull();
    expect(sanitizeIntimacyRecord({ ...VALID, completedAt: undefined })).toBeNull();
  });

  it("filters invalid records instead of trusting backup payloads", () => {
    const restored = sanitizeIntimacyBackupEntries([
      VALID,
      { ...VALID, id: "bad-date", date: "later" },
      { status: "completed" },
    ]);
    expect(restored).toEqual([VALID]);
  });
});
