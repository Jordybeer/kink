/** Parse a "YYYY-MM-DD" date-only string as local midnight, not UTC midnight. */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid date: ${dateStr} rolled over to ${date.toISOString()}`);
  }
  return date;
}
