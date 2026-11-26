import type { KinkStatus } from "@/types";

export type Status = NonNullable<KinkStatus>;
export type QuestionId = "lead" | "titles" | "rest";
export const QUESTIONS: readonly { id: QuestionId; category: string; title: string; meaning: string; emphasis: string; detail: string }[] = [
  { id: "lead", category: "Dynamiek", title: "Leiding nemen of geven", meaning: "Hoe sta je tegenover een afgesproken verdeling van leiding binnen jullie dynamiek?", emphasis: "afgesproken verdeling", detail: "Je kunt leiding op bepaalde momenten fijn vinden en op andere momenten zelf willen beslissen. Een voorkeur is nooit een afspraak." },
  { id: "titles", category: "Rituelen", title: "Aanspreektitels", meaning: "Hoe sta je tegenover afgesproken titels die jullie dynamiek uitdrukken?", emphasis: "afgesproken titels", detail: "Een titel kan alleen voor een bepaald moment bedoeld zijn. Je kunt zelf aangeven in welke context een titel bij je past." },
  { id: "rest", category: "Nazorg", title: "Samen tot rust komen", meaning: "Hoe sta je tegenover bewust tijd maken om samen tot rust te komen na een intens moment?", emphasis: "samen tot rust komen", detail: "Dat kan praten zijn, stil samenzijn of juist even alleen zijn. Bespreek wat voor ieder van jullie prettig is." },
];

export const PEOPLE = [
  { id: "noor", name: "Noor", initial: "N", perspective: "Mijn perspectief", description: "Ruimte om te ontdekken, met duidelijke afspraken.", linked: "Noor · Mijn perspectief voor een vertrouwde dynamiek" },
  { id: "jules", name: "Jules", initial: "J", perspective: "Gedeeld perspectief", description: "Samen bespreken wat bij ons past.", linked: null },
] as const;
export type PersonId = (typeof PEOPLE)[number]["id"];
export const PRIVATE_NOTE = "Ik neem graag de tijd om iets nieuws te bespreken.";

export const TOPICS: readonly { id: string; title: string; context: string; noor: Status | null; jules: Status | null; group: "shared" | "difference" | "boundary" | "unknown" }[] = [
  { id: "rest", title: "Samen tot rust komen", context: "Bewust tijd nemen voor elkaar.", noor: "yes", jules: "yes", group: "shared" },
  { id: "praise", title: "Complimenten", context: "Waardering uitspreken.", noor: "willing", jules: "yes", group: "shared" },
  { id: "titles", title: "Aanspreektitels", context: "De context kan voor ieder anders zijn.", noor: "maybe", jules: "no", group: "difference" },
  { id: "public", title: "Publieke aandacht", context: "Een expliciete persoonlijke grens.", noor: "hard_no", jules: "maybe", group: "boundary" },
  { id: "lead", title: "Leiding nemen of geven", context: "Nog niet voor beiden beantwoord.", noor: null, jules: "willing", group: "unknown" },
];
export const MOMENT = { title: "Een avond samen", date: "2026-11-28", day: "28", month: "November", weekday: "Zaterdag", time: "20:00", partner: "Noor & Jules" } as const;
export const OTHER_MOMENTS = [
  { id: "memory", title: "Een rustig begin", detail: "14 november · Beleefd", note: "Even tijd voor elkaar genomen." },
  { id: "solo", title: "Tijd voor mezelf", detail: "30 november · Geen partner gekozen", note: "Een eigen moment om te reflecteren." },
] as const;
export const AGREEMENT = { title: "Afspraken voor samen", status: "Concept", terms: ["We vragen eerst wat voor ieder prettig is.", "Iedereen kan op elk moment stoppen."] } as const;
export const SCENE = { title: "Een rustig moment", status: "Beleefd", aftercare: "Samen gepraat en ruimte genomen." } as const;
