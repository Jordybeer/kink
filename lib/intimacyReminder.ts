import type { IntimacyRecord } from "@/lib/intimacyStore";

export const MIN_INTIMACY_REMINDER_DAYS = 1;
export const MAX_INTIMACY_REMINDER_DAYS = 14;

export function isValidIntimacyReminderDays(value: unknown): value is number {
  return Number.isInteger(value)
    && typeof value === "number"
    && value >= MIN_INTIMACY_REMINDER_DAYS
    && value <= MAX_INTIMACY_REMINDER_DAYS;
}

function localStart(entry: Pick<IntimacyRecord, "date" | "time">): Date | null {
  if (!entry.time) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(entry.date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(entry.time);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const start = new Date(year, month - 1, day, hour, minute);

  if (
    start.getFullYear() !== year
    || start.getMonth() !== month - 1
    || start.getDate() !== day
    || start.getHours() !== hour
    || start.getMinutes() !== minute
  ) return null;

  return start;
}

export function intimacyReminderAt(entry: IntimacyRecord): Date | null {
  if (entry.status !== "planned" || !isValidIntimacyReminderDays(entry.reminderDays)) return null;
  const start = localStart(entry);
  if (!start) return null;

  const reminderAt = new Date(start);
  reminderAt.setDate(reminderAt.getDate() - entry.reminderDays);
  return reminderAt;
}

export function shouldSendIntimacyReminder(entry: IntimacyRecord, now = new Date()): boolean {
  const start = localStart(entry);
  const reminderAt = intimacyReminderAt(entry);
  if (!start || !reminderAt) return false;
  return now.getTime() >= reminderAt.getTime() && now.getTime() < start.getTime();
}

export function intimacyReminderFingerprint(entry: IntimacyRecord): string | null {
  if (!entry.time || !isValidIntimacyReminderDays(entry.reminderDays)) return null;
  return `${entry.id}:${entry.date}:${entry.time}:${entry.reminderDays}`;
}

export function daysUntilIntimacyLabel(date: string, now = new Date()): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target - today) / 86_400_000);

  if (days < 0) return "Datum is voorbij";
  if (days === 0) return "Vandaag";
  if (days === 1) return "Binnen 1 dag";
  return `Binnen ${days} dagen`;
}
