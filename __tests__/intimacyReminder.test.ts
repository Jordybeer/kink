import { describe, expect, it } from "vitest";
import {
  daysUntilIntimacyLabel,
  intimacyReminderAt,
  intimacyReminderFingerprint,
  shouldSendIntimacyReminder,
} from "@/lib/intimacyReminder";
import type { IntimacyRecord } from "@/lib/intimacyStore";

const ENTRY: IntimacyRecord = {
  id: "moment-1",
  status: "planned",
  date: "2026-08-30",
  time: "20:30",
  reminderDays: 3,
  createdAt: 1,
  updatedAt: 1,
};

describe("intimacy reminders", () => {
  it("starts the reminder window the chosen number of local calendar days beforehand", () => {
    expect(intimacyReminderAt(ENTRY)).toEqual(new Date(2026, 7, 27, 20, 30));
    expect(shouldSendIntimacyReminder(ENTRY, new Date(2026, 7, 27, 20, 29))).toBe(false);
    expect(shouldSendIntimacyReminder(ENTRY, new Date(2026, 7, 27, 20, 30))).toBe(true);
    expect(shouldSendIntimacyReminder(ENTRY, new Date(2026, 7, 30, 20, 30))).toBe(false);
  });

  it("does not remind for completed, invalid or unscheduled moments", () => {
    expect(shouldSendIntimacyReminder({ ...ENTRY, status: "completed", completedAt: 2 }, new Date(2026, 7, 28))).toBe(false);
    expect(shouldSendIntimacyReminder({ ...ENTRY, time: undefined }, new Date(2026, 7, 28))).toBe(false);
    expect(shouldSendIntimacyReminder({ ...ENTRY, reminderDays: 15 }, new Date(2026, 7, 28))).toBe(false);
  });

  it("uses schedule details in the receipt fingerprint so edits re-arm the reminder", () => {
    expect(intimacyReminderFingerprint(ENTRY)).toBe("moment-1:2026-08-30:20:30:3");
    expect(intimacyReminderFingerprint({ ...ENTRY, time: "21:00" })).not.toBe(intimacyReminderFingerprint(ENTRY));
  });

  it("renders a compact relative date hint for the composer", () => {
    const now = new Date(2026, 7, 24, 12, 0);
    expect(daysUntilIntimacyLabel("2026-08-24", now)).toBe("Vandaag");
    expect(daysUntilIntimacyLabel("2026-08-25", now)).toBe("Binnen 1 dag");
    expect(daysUntilIntimacyLabel("2026-08-30", now)).toBe("Binnen 6 dagen");
    expect(daysUntilIntimacyLabel("2026-08-20", now)).toBe("Datum is voorbij");
  });
});
