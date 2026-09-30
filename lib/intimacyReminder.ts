import type { IntimacyRecord } from "@/lib/intimacyStore";

export const MIN_INTIMACY_REMINDER_DAYS = 1;
export const MAX_INTIMACY_REMINDER_DAYS = 14;

export type IntimacyNotificationPermission = NotificationPermission | "unsupported";

const DAY_MS = 24 * 60 * 60 * 1_000;
const RECEIPT_PREFIX = "kinksync-intimacy-reminder:";

function validReminderDays(value: unknown): value is number {
  return Number.isInteger(value)
    && Number(value) >= MIN_INTIMACY_REMINDER_DAYS
    && Number(value) <= MAX_INTIMACY_REMINDER_DAYS;
}

function localMoment(entry: Pick<IntimacyRecord, "date" | "time">): Date | null {
  if (!entry.time) return null;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(entry.date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(entry.time);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    result.getFullYear() !== year
    || result.getMonth() !== month - 1
    || result.getDate() !== day
    || result.getHours() !== hour
    || result.getMinutes() !== minute
  ) {
    return null;
  }

  return result;
}

export function formatIntimacyReminderLead(days: number): string {
  return days === 1 ? "1 dag vooraf" : `${days} dagen vooraf`;
}

export function intimacyCountdownLabel(date: string, now = new Date()): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year
    || probe.getMonth() !== month - 1
    || probe.getDate() !== day
  ) {
    return null;
  }

  const targetDay = Date.UTC(year, month - 1, day);
  const currentDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((targetDay - currentDay) / DAY_MS);

  if (days === 0) return "Vandaag";
  if (days === 1) return "Morgen";
  if (days > 1) return `Binnen ${days} dagen`;
  if (days === -1) return "Gisteren";
  return `${Math.abs(days)} dagen geleden`;
}

export function shouldTriggerIntimacyReminder(
  entry: IntimacyRecord,
  now = new Date(),
): boolean {
  if (entry.status !== "planned" || !validReminderDays(entry.reminderDaysBefore)) {
    return false;
  }

  const moment = localMoment(entry);
  if (!moment) return false;

  const trigger = new Date(moment);
  trigger.setDate(trigger.getDate() - entry.reminderDaysBefore);

  return now.getTime() >= trigger.getTime() && now.getTime() < moment.getTime();
}

export function intimacyReminderReceiptKey(entry: IntimacyRecord): string | null {
  if (!entry.time || !validReminderDays(entry.reminderDaysBefore)) return null;
  return `${RECEIPT_PREFIX}${encodeURIComponent(entry.id)}:${entry.date}:${entry.time}:${entry.reminderDaysBefore}`;
}

export function getIntimacyNotificationPermission(): IntimacyNotificationPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestIntimacyNotificationPermission(): Promise<IntimacyNotificationPermission> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function receiptWasDelivered(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function rememberReceipt(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // A notification is still useful when storage is temporarily unavailable.
  }
}

export async function showDueIntimacyReminders(
  entries: IntimacyRecord[],
  now = new Date(),
): Promise<number> {
  if (
    typeof window === "undefined"
    || typeof Notification === "undefined"
    || Notification.permission !== "granted"
  ) {
    return 0;
  }

  const due = entries.filter((entry) => shouldTriggerIntimacyReminder(entry, now));
  if (due.length === 0) return 0;

  let registration: ServiceWorkerRegistration | undefined;
  if ("serviceWorker" in navigator) {
    try {
      registration = await navigator.serviceWorker.getRegistration();
    } catch {
      registration = undefined;
    }
  }

  let delivered = 0;
  for (const entry of due) {
    const receiptKey = intimacyReminderReceiptKey(entry);
    if (!receiptKey || receiptWasDelivered(receiptKey)) continue;

    const options: NotificationOptions = {
      body: "Je geplande privé moment komt dichterbij.",
      icon: "/icon-192.png",
      tag: `intimacy-reminder-${entry.id}`,
      data: { url: "/intimacy" },
    };

    try {
      if (registration) {
        await registration.showNotification("Privé moment", options);
      } else {
        const notification = new Notification("Privé moment", options);
        notification.onclick = () => {
          notification.close();
          window.focus();
          window.location.assign("/intimacy");
        };
      }
      rememberReceipt(receiptKey);
      delivered++;
    } catch {
      // Reminder delivery is best-effort and may be blocked by the platform.
    }
  }

  return delivered;
}
