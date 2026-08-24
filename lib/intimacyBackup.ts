import type { IntimacyRecord } from "@/lib/intimacyStore";
import { isValidIntimacyReminderDays } from "@/lib/intimacyReminder";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);
  return probe.getFullYear() === year
    && probe.getMonth() === month - 1
    && probe.getDate() === day;
}

function validTime(value: unknown): value is string | undefined {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function sanitizeIntimacyRecord(value: unknown): IntimacyRecord | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !value.id.trim()) return null;
  if (value.status !== "planned" && value.status !== "completed") return null;
  if (!validDate(value.date) || !validTime(value.time)) return null;
  if (!optionalString(value.title)
    || !optionalString(value.partnerProfileId)
    || !optionalString(value.partnerName)
    || !optionalString(value.note)) return null;
  if (value.reminderDays !== undefined && !isValidIntimacyReminderDays(value.reminderDays)) return null;
  if (!finiteNumber(value.createdAt) || !finiteNumber(value.updatedAt)) return null;
  if (value.completedAt !== undefined && !finiteNumber(value.completedAt)) return null;
  if (value.status === "completed" && value.completedAt === undefined) return null;

  return {
    id: value.id,
    status: value.status,
    date: value.date,
    ...(value.time ? { time: value.time } : {}),
    ...(value.title ? { title: value.title } : {}),
    ...(value.partnerProfileId ? { partnerProfileId: value.partnerProfileId } : {}),
    ...(value.partnerName ? { partnerName: value.partnerName } : {}),
    ...(value.note ? { note: value.note } : {}),
    ...(value.status === "planned" && isValidIntimacyReminderDays(value.reminderDays)
      ? { reminderDays: value.reminderDays }
      : {}),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(value.status === "completed" ? { completedAt: value.completedAt as number } : {}),
  };
}

export function sanitizeIntimacyBackupEntries(value: unknown): IntimacyRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizeIntimacyRecord)
    .filter((entry): entry is IntimacyRecord => entry !== null)
    .slice(0, 300);
}
