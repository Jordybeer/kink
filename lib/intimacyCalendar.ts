import type { IntimacyRecord } from "@/lib/intimacyStore";

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function compactUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function localStart(date: string, time: string): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) throw new Error("Ongeldige datum of tijd.");

  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;
  const probe = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (
    probe.getFullYear() !== Number(year)
    || probe.getMonth() !== Number(month) - 1
    || probe.getDate() !== Number(day)
    || probe.getHours() !== Number(hour)
    || probe.getMinutes() !== Number(minute)
  ) {
    throw new Error("Ongeldige datum of tijd.");
  }

  return `${year}${month}${day}T${hour}${minute}00`;
}

function validReminderDays(value: unknown): value is number {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= 1
    && value <= 14;
}

export function buildIntimacyCalendarFile(
  entry: IntimacyRecord,
  options: { includeDetails?: boolean; now?: Date } = {},
): string {
  if (!entry.time) throw new Error("Kies eerst een tijd.");

  const includeDetails = options.includeDetails === true;
  const summary = includeDetails
    ? entry.title?.trim() || (entry.partnerName ? `Moment met ${entry.partnerName}` : "Privé moment")
    : "Privé moment";

  const description = includeDetails
    ? [
        entry.partnerName ? `Met: ${entry.partnerName}` : "",
        entry.note?.trim() || "",
      ].filter(Boolean).join("\n")
    : "";

  const safeId = entry.id.replace(/[^a-zA-Z0-9._-]/g, "");
  const eventLines = [
    "BEGIN:VEVENT",
    `UID:private-${safeId}@local.invalid`,
    `DTSTAMP:${compactUtc(options.now ?? new Date())}`,
    `DTSTART:${localStart(entry.date, entry.time)}`,
    "DURATION:PT1H",
    `SUMMARY:${escapeIcs(summary)}`,
  ];

  if (description) {
    eventLines.push(`DESCRIPTION:${escapeIcs(description)}`);
  }

  if (validReminderDays(entry.reminderDaysBefore)) {
    eventLines.push(
      "BEGIN:VALARM",
      `TRIGGER:-P${entry.reminderDaysBefore}D`,
      "ACTION:DISPLAY",
      "DESCRIPTION:Privé moment",
      "END:VALARM",
    );
  }

  eventLines.push("END:VEVENT");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Private Calendar Event//EN",
    "CALSCALE:GREGORIAN",
    ...eventLines,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
