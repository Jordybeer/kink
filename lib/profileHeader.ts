export function formatProfileHeader(name: string, role?: string): string {
  if (!role) return name;
  return `${name} — ${role}`;
}
