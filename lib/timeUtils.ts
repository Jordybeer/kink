export function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTime(s: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(s);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function parseDurationMinutes(s: string): number | null {
  const match = /^(\d+)\s*min/.exec(s.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatDurationMinutes(n: number): string {
  return `${n} min`;
}
