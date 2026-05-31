import type { ExperienceLevel } from "@/types";

export const ROLE_GROUPS: { label: string; roles: string[] }[] = [
  { label: "D/s dynamiek",  roles: ["Switch", "Dominant", "Submissive"] },
  { label: "Zorgzame D/s",  roles: ["Daddy Dom", "Mommy Dom", "little", "Middle", "Caregiver"] },
  { label: "Impact & touw", roles: ["Top", "Bottom", "Sadist", "Masochist", "Rigger", "Rope Bunny"] },
  { label: "Karakter",      roles: ["Brat", "Brat Tamer", "Primal Hunter", "Primal Prey"] },
  { label: "Dier & spel",   roles: ["Handler/Owner", "Pet"] },
  { label: "Overig",        roles: ["Voyeur", "Exhibitionist", "Kinkster", "Vanilla (curious)"] },
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; sub: string }[] = [
  { value: "beginner",  label: "Beginner",  sub: "kort" },
  { value: "gevorderd", label: "Gevorderd", sub: "normaal" },
  { value: "ervaren",   label: "Ervaren",   sub: "lang" },
  { value: "diepgaand", label: "Diepgaand", sub: "alles" },
];

export const RELATIONSHIP_STATUSES = [
  "Single", "Taken", "Getrouwd", "Gecollared",
  "Polyamoreus", "Open relatie", "Geowned", "Het is ingewikkeld",
];
