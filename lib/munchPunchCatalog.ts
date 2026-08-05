export const MUNCH_PUNCH_PROMPT_IDS = [
  "social",
  "greeting",
  "photos",
  "topics",
  "demo",
  "pace",
  "support",
  "energy",
] as const;

export type MunchPunchPromptId = (typeof MUNCH_PUNCH_PROMPT_IDS)[number];

export interface MunchPunchOption {
  value: number;
  label: string;
}

export interface MunchPunchPrompt {
  id: MunchPunchPromptId;
  question: string;
  hint: string;
  options: readonly MunchPunchOption[];
}

const FOUR_POINT_OPTIONS = {
  social: [
    { value: 0, label: "Liever observeren" },
    { value: 1, label: "Eén rustig gesprek" },
    { value: 2, label: "Kleine groep" },
    { value: 3, label: "Graag nieuwe mensen ontmoeten" },
  ],
  greeting: [
    { value: 0, label: "Geen aanraking" },
    { value: 1, label: "Altijd eerst vragen" },
    { value: 2, label: "Handdruk is oké" },
    { value: 3, label: "Knuffel na toestemming" },
  ],
  photos: [
    { value: 0, label: "Geen foto's" },
    { value: 1, label: "Alleen de ruimte" },
    { value: 2, label: "Vraag mij vooraf" },
    { value: 3, label: "Groepsfoto na duidelijke toestemming" },
  ],
  topics: [
    { value: 0, label: "Grenzen en consent" },
    { value: 1, label: "Aftercare" },
    { value: 2, label: "Kink basics" },
    { value: 3, label: "Ervaringen uitwisselen" },
  ],
  demo: [
    { value: 0, label: "Geen demo" },
    { value: 1, label: "Alleen kijken" },
    { value: 2, label: "Uitleg zonder aanraking" },
    { value: 3, label: "Vrijwillig oefenen na toestemming" },
  ],
  pace: [
    { value: 0, label: "Heel rustig" },
    { value: 1, label: "Rustig" },
    { value: 2, label: "Levendig" },
    { value: 3, label: "Veel energie" },
  ],
  support: [
    { value: 0, label: "Geen behoefte" },
    { value: 1, label: "Een duidelijke host" },
    { value: 2, label: "Een rustige aanspreekpersoon" },
    { value: 3, label: "Regelmatige groepscheck-in" },
  ],
  energy: [
    { value: 0, label: "Ik wil vroeg vertrekken" },
    { value: 1, label: "Korte avond" },
    { value: 2, label: "Ik blijf waarschijnlijk" },
    { value: 3, label: "Ik heb nog veel sociale batterij" },
  ],
} satisfies Record<MunchPunchPromptId, readonly MunchPunchOption[]>;

export const MUNCH_PUNCH_PROMPTS: readonly MunchPunchPrompt[] = [
  { id: "social", question: "Hoe sociaal wil je vanavond zijn?", hint: "Een momentopname, geen belofte.", options: FOUR_POINT_OPTIONS.social },
  { id: "greeting", question: "Welke begroeting voelt goed?", hint: "Toestemming blijft nodig, ook bij een meerderheid.", options: FOUR_POINT_OPTIONS.greeting },
  { id: "photos", question: "Wat voelt goed rond foto's?", hint: "De strengste grens in de ruimte blijft leidend.", options: FOUR_POINT_OPTIONS.photos },
  { id: "topics", question: "Welk gespreksthema trekt je het meest?", hint: "De host ziet alleen groepsaantallen.", options: FOUR_POINT_OPTIONS.topics },
  { id: "demo", question: "Hoe comfortabel ben je met een educatieve demo?", hint: "Geen antwoord maakt aanraking vanzelf toegestaan.", options: FOUR_POINT_OPTIONS.demo },
  { id: "pace", question: "Welke groepssnelheid past nu?", hint: "Tempo kan tijdens de avond veranderen.", options: FOUR_POINT_OPTIONS.pace },
  { id: "support", question: "Welke ondersteuning helpt je?", hint: "Vraag rechtstreeks hulp wanneer dat nodig is.", options: FOUR_POINT_OPTIONS.support },
  { id: "energy", question: "Hoe vol zit je sociale batterij?", hint: "Vertrekken hoeft nooit uitgelegd te worden.", options: FOUR_POINT_OPTIONS.energy },
];

const PROMPT_BY_ID = new Map(MUNCH_PUNCH_PROMPTS.map((prompt) => [prompt.id, prompt]));

export function getMunchPunchPrompt(id: MunchPunchPromptId): MunchPunchPrompt {
  const prompt = PROMPT_BY_ID.get(id);
  if (!prompt) throw new Error("Onbekende Munch Punch-vraag");
  return prompt;
}

export function isMunchPunchPromptId(value: unknown): value is MunchPunchPromptId {
  return typeof value === "string" && PROMPT_BY_ID.has(value as MunchPunchPromptId);
}
