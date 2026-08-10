import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(path, before, after) {
  const source = readFileSync(path, "utf8");
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${path}: verwacht 1 exacte match, vond ${occurrences}`);
  }
  writeFileSync(path, source.replace(before, after));
}

function write(path, content) {
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`);
}

replaceOnce(
  "lib/kinks.ts",
  `  {\n    id: "pegging",\n    name: "Pegging / strap-on",\n    category: "penetration",\n    level: 2,\n    description: "Penetratie van de man (of partner zonder penis) met een strap-on door de partner. Communiceer over maat, snelheid en positie.",\n  },`,
  `  {\n    id: "pegging_give",\n    name: "Pegging — giving",\n    aliases: ["Pegging geven", "Peggen geven", "Strap-on geven", "Pegging / strap-on"],\n    category: "penetration",\n    level: 2,\n    description: "Een partner anaal penetreren met een strap-on. Bespreek maat, glijmiddel, tempo, positie en stopsignalen zonder een dominante of submissieve rol te veronderstellen.",\n  },\n  {\n    id: "pegging_receive",\n    name: "Pegging — receiving",\n    aliases: ["Pegging ontvangen", "Peggen ontvangen", "Strap-on ontvangen"],\n    category: "penetration",\n    level: 2,\n    description: "Anale penetratie ontvangen met een strap-on. Bespreek maat, glijmiddel, tempo, positie en stopsignalen zonder een dominante of submissieve rol te veronderstellen.",\n  },`,
);

replaceOnce(
  "lib/questionnaireMetadata.ts",
  `    "anal_sex", "anal_fingering", "pegging", "butt_plug", "anal_beads", "fisting_anal",`,
  `    "anal_sex", "anal_fingering", "pegging_give", "pegging_receive", "butt_plug", "anal_beads", "fisting_anal",`,
);
replaceOnce(
  "lib/questionnaireMetadata.ts",
  `  penetration: ["anal_fingering", "pegging"],`,
  `  penetration: ["anal_fingering", "pegging_give", "pegging_receive"],`,
);

write("lib/directionality.ts", `import type { KinkEntry, Profile } from "@/types";

export type DirectionalKinkSide = "give" | "receive";

export interface DirectionalKinkPair {
  conceptId: string;
  giveId: string;
  receiveId: string;
}

/**
 * Expliciete handelingparen. Dit is presentation/matching-metadata, geen
 * voorkeurssignaal: perspective en antwoorden worden hier nooit uit afgeleid.
 */
export const DIRECTIONAL_KINK_PAIRS = [
  { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },
] as const satisfies readonly DirectionalKinkPair[];

const PAIR_BY_KINK_ID = new Map<string, DirectionalKinkPair>();
for (const pair of DIRECTIONAL_KINK_PAIRS) {
  PAIR_BY_KINK_ID.set(pair.giveId, pair);
  PAIR_BY_KINK_ID.set(pair.receiveId, pair);
}

export function directionalPairForKinkId(kinkId: string): DirectionalKinkPair | undefined {
  return PAIR_BY_KINK_ID.get(kinkId);
}

export function directionalSideForKinkId(kinkId: string): DirectionalKinkSide | null {
  const pair = directionalPairForKinkId(kinkId);
  if (!pair) return null;
  return pair.giveId === kinkId ? "give" : "receive";
}

export function directionalSiblingId(kinkId: string): string | null {
  const pair = directionalPairForKinkId(kinkId);
  if (!pair) return null;
  return pair.giveId === kinkId ? pair.receiveId : pair.giveId;
}

/** De partnerkant voor complementaire matching; niet-directionele IDs blijven zichzelf. */
export function partnerDirectionalKinkId(kinkId: string): string {
  return directionalSiblingId(kinkId) ?? kinkId;
}

const DEPRECATED_DIRECTIONAL_KINK_IDS = new Set<string>(["pegging"]);

/**
 * Pre-launch cleanup: een oud gecombineerd antwoord kan niet eerlijk naar give
 * én receive worden gekopieerd, dus het wordt verwijderd in plaats van geïnferreerd.
 */
export function stripDeprecatedDirectionalEntries(
  entries: Record<string, KinkEntry>,
): Record<string, KinkEntry> {
  if (![...DEPRECATED_DIRECTIONAL_KINK_IDS].some((id) => id in entries)) return entries;
  const next = { ...entries };
  for (const id of DEPRECATED_DIRECTIONAL_KINK_IDS) delete next[id];
  return next;
}

export function stripDeprecatedDirectionalProfile(profile: Profile): Profile {
  const entries = stripDeprecatedDirectionalEntries(profile.entries);
  return entries === profile.entries ? profile : { ...profile, entries };
}
`);

replaceOnce(
  "lib/questionnaireEngine.ts",
  `} from "@/lib/questionnaireMetadata";\nimport type { Kink, KinkEntry } from "@/types";`,
  `} from "@/lib/questionnaireMetadata";\nimport { directionalSiblingId } from "@/lib/directionality";\nimport type { Kink, KinkEntry } from "@/types";`,
);
replaceOnce(
  "lib/questionnaireEngine.ts",
  `export interface ConversationContext {\n  /** Een positieve probe krijgt ademruimte voor de volgende zich aandient. */\n  requireNonProbe?: boolean;\n  /** Een spacing-lijntje, nooit een fluistering over het volgende antwoord. */\n  lastKinkId?: string | null;\n}`,
  `export interface ConversationContext {\n  /** Een positieve probe krijgt ademruimte voor de volgende zich aandient. */\n  requireNonProbe?: boolean;\n  /** Alleen een expliciet antwoord mag een zelfstandig eligible sibling direct uitnodigen. */\n  preferDirectionalSibling?: boolean;\n  /** Een spacing-lijntje, nooit een fluistering over het volgende antwoord. */\n  lastKinkId?: string | null;\n}`,
);
replaceOnce(
  "lib/questionnaireEngine.ts",
  `  if (context.lastKinkId) {\n    const last = catalog.find((kink) => kink.id === context.lastKinkId);`,
  `  if (context.lastKinkId) {\n    if (context.preferDirectionalSibling) {\n      const siblingId = directionalSiblingId(context.lastKinkId);\n      const sibling = siblingId\n        ? candidates.find((item) => item.kink.id === siblingId)\n        : undefined;\n      if (sibling) return sibling;\n    }\n\n    const last = catalog.find((kink) => kink.id === context.lastKinkId);`,
);

replaceOnce(
  "components/TriageDeck.tsx",
  `  const [lastAnsweredId, setLastAnsweredId] = useState<string | null>(null);\n  const [requireNonProbe, setRequireNonProbe] = useState(false);`,
  `  const [lastAnsweredId, setLastAnsweredId] = useState<string | null>(null);\n  const [requireNonProbe, setRequireNonProbe] = useState(false);\n  const [preferDirectionalSibling, setPreferDirectionalSibling] = useState(false);`,
);
replaceOnce(
  "components/TriageDeck.tsx",
  `  const currentItem = selectConversationQuestion(queue, KINKS, {\n    requireNonProbe,\n    lastKinkId: lastAnsweredId,\n  });`,
  `  const currentItem = selectConversationQuestion(queue, KINKS, {\n    requireNonProbe,\n    preferDirectionalSibling,\n    lastKinkId: lastAnsweredId,\n  });`,
);
replaceOnce(
  "components/TriageDeck.tsx",
  `    if (status == null) {\n      setHolding(null);\n      return;\n    }\n    setLastAnsweredId(kink.id);\n    setRequireNonProbe(answeredWasProbe);`,
  `    if (status == null) {\n      setHolding(null);\n      setPreferDirectionalSibling(false);\n      return;\n    }\n    setLastAnsweredId(kink.id);\n    setRequireNonProbe(answeredWasProbe);\n    setPreferDirectionalSibling(true);`,
);
replaceOnce(
  "components/TriageDeck.tsx",
  `  function skip(kink: Kink) {\n    setHolding(null);\n    setLastAnsweredId(kink.id);`,
  `  function skip(kink: Kink) {\n    setHolding(null);\n    setLastAnsweredId(kink.id);\n    setPreferDirectionalSibling(false);`,
);

replaceOnce(
  "lib/sanitizeProfile.ts",
  `import { normalizeQuestionnaireSetup } from "@/lib/questionnaireSetup";`,
  `import { normalizeQuestionnaireSetup } from "@/lib/questionnaireSetup";\nimport { stripDeprecatedDirectionalEntries } from "@/lib/directionality";`,
);
replaceOnce(
  "lib/sanitizeProfile.ts",
  `    updatedAt: asFiniteNumber(r.updatedAt) ?? now,\n    entries,\n  };`,
  `    updatedAt: asFiniteNumber(r.updatedAt) ?? now,\n    entries: stripDeprecatedDirectionalEntries(entries),\n  };`,
);

replaceOnce(
  "lib/shareProfile.ts",
  `import { deriveProfileVerificationCode, normalizeProfileVerificationCode } from "@/lib/profileVerification";`,
  `import { deriveProfileVerificationCode, normalizeProfileVerificationCode } from "@/lib/profileVerification";\nimport { stripDeprecatedDirectionalEntries } from "@/lib/directionality";`,
);
replaceOnce(
  "lib/shareProfile.ts",
  `    entries,\n    isImported: true,`,
  `    entries: stripDeprecatedDirectionalEntries(entries),\n    isImported: true,`,
);

replaceOnce(
  "lib/storeCore.ts",
  `import { defaultQuestionnaireSetup, normalizeStoredQuestionnaireProfiles } from "@/lib/questionnaireSetup";`,
  `import { defaultQuestionnaireSetup, normalizeStoredQuestionnaireProfiles } from "@/lib/questionnaireSetup";\nimport { stripDeprecatedDirectionalProfile } from "@/lib/directionality";`,
);
replaceOnce("lib/storeCore.ts", `      version: 18,`, `      version: 19,`);
replaceOnce(
  "lib/storeCore.ts",
  `        if (version < 18 && state.profiles) {\n          state.profiles = normalizeStoredQuestionnaireProfiles(state.profiles);\n        }\n        return state;`,
  `        if (version < 18 && state.profiles) {\n          state.profiles = normalizeStoredQuestionnaireProfiles(state.profiles);\n        }\n        if (version < 19 && state.profiles) {\n          state.profiles = state.profiles.map(stripDeprecatedDirectionalProfile);\n        }\n        return state;`,
);

replaceOnce(
  "__tests__/kinks.test.ts",
  `const RETIRED_COMPOSITE_OR_DUPLICATE_IDS = [\n  "filmen_prive",\n  "trampling_voeten",\n  "breeding_creampie",\n  "luiers_gebruik",\n  "deepthroat",\n] as const;`,
  `const DIRECTIONAL_RELEASE_IDS = ["pegging_give", "pegging_receive"] as const;\n\nconst RETIRED_COMPOSITE_OR_DUPLICATE_IDS = [\n  "filmen_prive",\n  "trampling_voeten",\n  "breeding_creampie",\n  "luiers_gebruik",\n  "deepthroat",\n  "pegging",\n] as const;`,
);
replaceOnce(
  "__tests__/kinks.test.ts",
  `  it("lands the reviewed Release A set without silently deciding the two owner gates", () => {\n    const ids = new Set(KINKS.map((kink) => kink.id));\n    expect(RELEASE_A_IDS.filter((id) => !ids.has(id))).toEqual([]);\n    expect(KINKS).toHaveLength(291);\n\n    expect(KINKS.find((kink) => kink.id === "pegging")?.name).toBe("Pegging / strap-on");\n    expect(ids.has("pegging_giving")).toBe(false);\n    expect(ids.has("pegging_receiving")).toBe(false);\n    expect([...ids].some((id) => id.includes("auto_masturb"))).toBe(false);\n  });`,
  `  it("lands Release A plus explicit pegging directionality without deciding auto-masturbation", () => {\n    const ids = new Set(KINKS.map((kink) => kink.id));\n    expect(RELEASE_A_IDS.filter((id) => !ids.has(id))).toEqual([]);\n    expect(DIRECTIONAL_RELEASE_IDS.filter((id) => !ids.has(id))).toEqual([]);\n    expect(KINKS).toHaveLength(292);\n\n    expect(ids.has("pegging")).toBe(false);\n    expect([...ids].some((id) => id.includes("auto_masturb"))).toBe(false);\n  });`,
);
replaceOnce(
  "__tests__/kinks.test.ts",
  `    expect(added).toEqual([...RELEASE_A_IDS].sort());`,
  `    expect(added).toEqual([...RELEASE_A_IDS, ...DIRECTIONAL_RELEASE_IDS].sort());`,
);

replaceOnce("__tests__/questionnaire.test.ts", `toBe(44);`, `toBe(45);`);
replaceOnce("__tests__/questionnaire.test.ts", `toBe(44);`, `toBe(45);`);
replaceOnce(
  "__tests__/questionnaire.test.ts",
  `it("pins a transparent 44-question base plan across every user-facing category",`,
  `it("pins a transparent 45-question base plan across every user-facing category",`,
);
replaceOnce(
  "__tests__/questionnaire.test.ts",
  `expect(buildQuestionnaireCoveragePlan([]).anchorIds).toHaveLength(44);`,
  `expect(buildQuestionnaireCoveragePlan([]).anchorIds).toHaveLength(45);`,
);

write("__tests__/directionality.test.ts", `import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  DIRECTIONAL_KINK_PAIRS,
  directionalSiblingId,
  partnerDirectionalKinkId,
  stripDeprecatedDirectionalEntries,
} from "@/lib/directionality";
import {
  buildQuestionnaireCoveragePlan,
  getQuestionnaireRuntime,
  searchAllKinks,
} from "@/lib/questionnaire";
import {
  derivePendingExpansionProbes,
  selectConversationQuestion,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import { encodeProfile, decodeAny } from "@/lib/shareProfile";
import { sanitizeProfileFull } from "@/lib/sanitizeProfile";
import type { KinkEntry, Profile, ProfilePerspective } from "@/types";

function ownProfile(perspective: ProfilePerspective, entries: Record<string, KinkEntry> = {}): Profile {
  return {
    id: `direction-\${perspective}`,
    name: "Direction",
    role: perspective === "dominant" ? "Dominant" : "Submissive",
    perspective,
    questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    experienceLevel: "gevorderd",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries,
    origin: "own",
  };
}

function queueItem(id: string): QuestionnaireQueueItem {
  const kink = KINKS.find((candidate) => candidate.id === id);
  if (!kink) throw new Error(`Kink ontbreekt: \${id}`);
  return { kink, lane: "coverage", isProbe: false, coversAnchor: true, reasons: [] };
}

describe("directionele kinkvragen", () => {
  it("models pegging as two flat explicit IDs and retires the ambiguous combined ID", () => {
    const ids = new Set(KINKS.map((kink) => kink.id));
    expect(DIRECTIONAL_KINK_PAIRS).toEqual([
      { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },
    ]);
    expect(ids.has("pegging")).toBe(false);
    expect(ids.has("pegging_give")).toBe(true);
    expect(ids.has("pegging_receive")).toBe(true);
  });

  it("keeps both directions independently eligible in Dynamic for every perspective", () => {
    const plan = buildQuestionnaireCoveragePlan([]);
    expect(plan.anchorIds).toContain("pegging_give");
    expect(plan.anchorIds).toContain("pegging_receive");

    for (const perspective of ["dominant", "submissive"] as const) {
      const ids = getQuestionnaireRuntime(ownProfile(perspective)).queue.map((item) => item.kink.id);
      expect(ids).toContain("pegging_give");
      expect(ids).toContain("pegging_receive");
    }
  });

  it("asks an independently eligible sibling directly after an explicit answer", () => {
    const queue = [queueItem("spanking_hand"), queueItem("pegging_receive")];
    expect(selectConversationQuestion(queue, KINKS, {
      lastKinkId: "pegging_give",
      preferDirectionalSibling: true,
    })?.kink.id).toBe("pegging_receive");

    expect(selectConversationQuestion(queue, KINKS, {
      lastKinkId: "pegging_give",
      preferDirectionalSibling: false,
    })?.kink.id).toBe("spanking_hand");
  });

  it("never turns pairflow into an expansion probe", () => {
    const entries = { pegging_give: { status: "yes", comment: "" } } satisfies Record<string, KinkEntry>;
    expect(derivePendingExpansionProbes(KINKS, entries)
      .some((probe) => probe.targetKinkId === "pegging_receive")).toBe(false);
    expect(entries.pegging_give.status).toBe("yes");
    expect((entries as Record<string, KinkEntry>).pegging_receive).toBeUndefined();
  });

  it("keeps direction pairing explicit and role-independent", () => {
    expect(directionalSiblingId("pegging_give")).toBe("pegging_receive");
    expect(directionalSiblingId("pegging_receive")).toBe("pegging_give");
    expect(partnerDirectionalKinkId("pegging_give")).toBe("pegging_receive");
    expect(partnerDirectionalKinkId("spanking_hand")).toBe("spanking_hand");
  });

  it("searches both variants through the shared concept vocabulary", () => {
    const ids = searchAllKinks("pegging").map((kink) => kink.id);
    expect(ids).toContain("pegging_give");
    expect(ids).toContain("pegging_receive");
  });

  it("drops the old ambiguous answer instead of copying it to either direction", () => {
    const old = { pegging: { status: "yes", comment: "legacy" } } satisfies Record<string, KinkEntry>;
    const cleaned = stripDeprecatedDirectionalEntries(old);
    expect(cleaned.pegging).toBeUndefined();
    expect(cleaned.pegging_give).toBeUndefined();
    expect(cleaned.pegging_receive).toBeUndefined();
  });

  it("sanitizes and shares both explicit directions independently", () => {
    const raw = ownProfile("dominant", {
      pegging: { status: "yes", comment: "oud" },
      pegging_give: { status: "willing", comment: "geven" },
      pegging_receive: { status: "hard_no", comment: "ontvangen", privateResponse: true },
    });
    const clean = sanitizeProfileFull(raw);
    expect(clean?.entries.pegging).toBeUndefined();
    expect(clean?.entries.pegging_give?.status).toBe("willing");
    expect(clean?.entries.pegging_receive?.status).toBe("hard_no");

    const encoded = encodeProfile(clean!, { includePrivateResponses: true });
    const decoded = decodeAny(encoded);
    expect(decoded.entries.pegging_give?.status).toBe("willing");
    expect(decoded.entries.pegging_receive?.status).toBe("hard_no");
    expect(decoded.entries.pegging_receive?.privateResponse).toBe(true);
  });
});
`);

console.log("Directionality Release A toegepast.");
