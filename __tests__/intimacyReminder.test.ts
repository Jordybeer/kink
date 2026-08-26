import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatIntimacyReminderLead,
  intimacyCountdownLabel,
  intimacyReminderReceiptKey,
  shouldTriggerIntimacyReminder,
  showDueIntimacyReminders,
} from "@/lib/intimacyReminder";
import type { IntimacyRecord } from "@/lib/intimacyStore";

const ENTRY: IntimacyRecord = {
  id: "moment-1",
  status: "planned",
  date: "2026-08-30",
  time: "20:30",
  reminderDaysBefore: 2,
  createdAt: 1,
  updatedAt: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("intimacy reminders", () => {
  it("formats the relative date without DST drift", () => {
    expect(intimacyCountdownLabel("2026-08-30", new Date(2026, 7, 24, 23, 55))).toBe("Binnen 6 dagen");
    expect(intimacyCountdownLabel("2026-08-25", new Date(2026, 7, 24, 12, 0))).toBe("Morgen");
    expect(intimacyCountdownLabel("2026-08-24", new Date(2026, 7, 24, 1, 0))).toBe("Vandaag");
  });

  it("starts the reminder window at the same local time x days beforehand", () => {
    expect(shouldTriggerIntimacyReminder(ENTRY, new Date(2026, 7, 28, 20, 29))).toBe(false);
    expect(shouldTriggerIntimacyReminder(ENTRY, new Date(2026, 7, 28, 20, 30))).toBe(true);
    expect(shouldTriggerIntimacyReminder(ENTRY, new Date(2026, 7, 30, 20, 29))).toBe(true);
    expect(shouldTriggerIntimacyReminder(ENTRY, new Date(2026, 7, 30, 20, 30))).toBe(false);
  });

  it("never triggers for completed moments or missing reminder settings", () => {
    expect(shouldTriggerIntimacyReminder({ ...ENTRY, status: "completed", completedAt: 1 }, new Date(2026, 7, 29, 12, 0))).toBe(false);
    expect(shouldTriggerIntimacyReminder({ ...ENTRY, reminderDaysBefore: undefined }, new Date(2026, 7, 29, 12, 0))).toBe(false);
  });

  it("uses schedule details in the one-shot receipt key", () => {
    const key = intimacyReminderReceiptKey(ENTRY);
    expect(key).toContain("moment-1");
    expect(key).toContain("2026-08-30:20:30:2");
    expect(intimacyReminderReceiptKey({ ...ENTRY, reminderDaysBefore: undefined })).toBeNull();
  });

  it("uses calm Dutch lead-time copy", () => {
    expect(formatIntimacyReminderLead(1)).toBe("1 dag vooraf");
    expect(formatIntimacyReminderLead(4)).toBe("4 dagen vooraf");
  });

  it("opens Intimiteit when a fallback notification is clicked", async () => {
    const storage = new Map<string, string>();
    const focus = vi.fn();
    const assign = vi.fn();

    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      focus,
      location: { assign },
    });
    vi.stubGlobal("navigator", {});

    const notifications: FakeNotification[] = [];
    class FakeNotification {
      static permission = "granted";
      onclick: ((event: Event) => void) | null = null;
      close = vi.fn();

      constructor(
        public readonly title: string,
        public readonly options?: NotificationOptions,
      ) {
        notifications.push(this);
      }
    }
    vi.stubGlobal("Notification", FakeNotification);

    const delivered = await showDueIntimacyReminders(
      [ENTRY],
      new Date(2026, 7, 29, 12, 0),
    );

    expect(delivered).toBe(1);
    expect(notifications).toHaveLength(1);
    const latestNotification = notifications[0];
    expect(latestNotification.title).toBe("Privé moment");
    expect(latestNotification.options?.body).toBe("Je geplande privé moment komt dichterbij.");

    latestNotification.onclick?.({} as Event);

    expect(latestNotification.close).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledWith("/intimacy");
  });
});
