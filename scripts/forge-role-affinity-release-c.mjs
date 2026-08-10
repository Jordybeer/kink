import fs from "node:fs";

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Niet gevonden in ${path}: ${before.slice(0, 100)}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Niet uniek in ${path}`);
  fs.writeFileSync(path, source.slice(0, index) + after + source.slice(index + before.length));
}

function replaceKink(id, replacement) {
  const path = "lib/kinks.ts";
  const source = fs.readFileSync(path, "utf8");
  const pattern = new RegExp(`  \\{\\n    id: "${id}",[\\s\\S]*?\\n  \\},`);
  const matches = source.match(new RegExp(pattern.source, "g")) ?? [];
  if (matches.length !== 1) throw new Error(`Verwacht exact één catalogusblok voor ${id}, kreeg ${matches.length}`);
  fs.writeFileSync(path, source.replace(pattern, replacement));
}

const pairs = [
  ["spanking_hand", `  {
    id: "spanking_hand_give",
    name: "Spanking (hand) — giving",
    aliases: ["Spanking geven", "Iemand spanken"],
    category: "impact",
    level: 1,
    description: "Een partner met de hand op het zitvlak slaan als afgesproken impactspel. Stem intensiteit, zones en stopmomenten vooraf af zonder een vaste rol te veronderstellen.",
  },
  {
    id: "spanking_hand_receive",
    name: "Spanking (hand) — receiving",
    aliases: ["Spanking ontvangen", "Gespankt worden"],
    category: "impact",
    level: 1,
    description: "Spanking met de hand op het zitvlak ontvangen als afgesproken impactspel. Stem intensiteit, zones en stopmomenten vooraf af zonder een vaste rol te veronderstellen.",
  },`],
  ["spanking_implement", `  {
    id: "spanking_implement_give",
    name: "Implement spanking — giving",
    aliases: ["Spanking met speeltje geven", "Implement spanking geven"],
    category: "impact",
    level: 2,
    description: "Een partner met een afgesproken slagwerktuig spanken. Bouw intensiteit geleidelijk op en stem materiaal, zones en stopmomenten af.",
  },
  {
    id: "spanking_implement_receive",
    name: "Implement spanking — receiving",
    aliases: ["Spanking met speeltje ontvangen", "Implement spanking ontvangen"],
    category: "impact",
    level: 2,
    description: "Spanking met een afgesproken slagwerktuig ontvangen. Bouw intensiteit geleidelijk op en stem materiaal, zones en stopmomenten af.",
  },`],
  ["flogging", `  {
    id: "flogging_give",
    name: "Flogging — giving",
    aliases: ["Flogging geven", "Iemand floggen"],
    category: "impact",
    level: 2,
    description: "Een partner met een flogger slaan, van zacht en sensueel tot intenser impactspel. Techniek, veilige zones en voortdurende afstemming zijn belangrijk.",
  },
  {
    id: "flogging_receive",
    name: "Flogging — receiving",
    aliases: ["Flogging ontvangen", "Geflogd worden"],
    category: "impact",
    level: 2,
    description: "Impact met een flogger ontvangen, van zacht en sensueel tot intenser spel. Stem intensiteit, veilige zones en stopmomenten voortdurend af.",
  },`],
  ["rope_bondage", `  {
    id: "rope_bondage_give",
    name: "Rope bondage — tying",
    aliases: ["Touwbondage geven", "Iemand vastbinden met touw"],
    category: "bondage",
    level: 2,
    description: "Een partner met touw vastbinden en diens bewegingsvrijheid beperken. Leer veilige basisprincipes, controleer comfort en houd noodgereedschap bereikbaar.",
  },
  {
    id: "rope_bondage_receive",
    name: "Rope bondage — being tied",
    aliases: ["Touwbondage ontvangen", "Vastgebonden worden met touw"],
    category: "bondage",
    level: 2,
    description: "Met touw vastgebonden worden en bewegingsvrijheid laten beperken. Spreek comfort, controlepunten, stopmomenten en snelle bevrijding vooraf af.",
  },`],
  ["shibari", `  {
    id: "shibari_give",
    name: "Shibari — tying",
    aliases: ["Shibari geven", "Shibari binden"],
    category: "bondage",
    level: 3,
    description: "Een partner met Japanse touwtechnieken esthetisch en sensueel binden. Dit vraagt training en zorgvuldige controle; suspensie blijft een aparte gevorderde stap.",
  },
  {
    id: "shibari_receive",
    name: "Shibari — being tied",
    aliases: ["Shibari ontvangen", "In shibari gebonden worden"],
    category: "bondage",
    level: 3,
    description: "Met Japanse touwtechnieken esthetisch en sensueel gebonden worden. Bespreek ervaring, comfort, controlepunten en snelle bevrijding vooraf.",
  },`],
  ["handcuffs", `  {
    id: "handcuffs_give",
    name: "Handcuffs — cuffing",
    aliases: ["Handboeien omdoen", "Iemand boeien"],
    category: "bondage",
    level: 1,
    description: "Een partner met metalen handboeien beperken. Controleer pasvorm en druk en houd altijd een passende sleutel direct bereikbaar.",
  },
  {
    id: "handcuffs_receive",
    name: "Handcuffs — being cuffed",
    aliases: ["Handboeien dragen", "Geboeid worden"],
    category: "bondage",
    level: 1,
    description: "Met metalen handboeien beperkt worden. Stem pasvorm, duur, stopmomenten en directe toegang tot een sleutel vooraf af.",
  },`],
  ["leather_cuffs", `  {
    id: "leather_cuffs_give",
    name: "Leather cuffs — cuffing",
    aliases: ["Leren cuffs omdoen", "Iemand met leren cuffs boeien"],
    category: "bondage",
    level: 1,
    description: "Een partner met leren pols- of enkelmanchetten beperken. Controleer pasvorm en huidcomfort regelmatig, zeker bij langer gebruik.",
  },
  {
    id: "leather_cuffs_receive",
    name: "Leather cuffs — being cuffed",
    aliases: ["Leren cuffs dragen", "Met leren cuffs geboeid worden"],
    category: "bondage",
    level: 1,
    description: "Met leren pols- of enkelmanchetten beperkt worden. Stem pasvorm, duur, huidcomfort en stopmomenten vooraf af.",
  },`],
  ["gag_ball", `  {
    id: "gag_ball_give",
    name: "Ball gag — applying",
    aliases: ["Ball gag omdoen", "Iemand knevelen met ball gag"],
    category: "bondage",
    level: 2,
    description: "Een partner een ball gag laten dragen waardoor spreken beperkt wordt. Spreek vooraf een betrouwbaar non-verbaal stopsignaal af en blijf actief controleren.",
  },
  {
    id: "gag_ball_receive",
    name: "Ball gag — wearing",
    aliases: ["Ball gag dragen", "Met ball gag gekneveld worden"],
    category: "bondage",
    level: 2,
    description: "Een ball gag dragen waardoor spreken beperkt wordt. Spreek vooraf een betrouwbaar non-verbaal stopsignaal af en behoud een directe manier om te stoppen.",
  },`],
  ["gag_bit", `  {
    id: "gag_bit_give",
    name: "Bit gag — applying",
    aliases: ["Bit gag omdoen", "Iemand knevelen met bit gag"],
    category: "bondage",
    level: 2,
    description: "Een partner een bit gag laten dragen. Spreek een betrouwbaar non-verbaal stopsignaal af en controleer pasvorm, ademruimte en comfort regelmatig.",
  },
  {
    id: "gag_bit_receive",
    name: "Bit gag — wearing",
    aliases: ["Bit gag dragen", "Met bit gag gekneveld worden"],
    category: "bondage",
    level: 2,
    description: "Een bit gag dragen. Spreek een betrouwbaar non-verbaal stopsignaal af en zorg dat stoppen en verwijderen onmiddellijk mogelijk blijven.",
  },`],
  ["blindfold", `  {
    id: "blindfold_give",
    name: "Blindfold — applying",
    aliases: ["Blinddoek omdoen", "Iemand blinddoeken"],
    category: "bondage",
    level: 1,
    description: "Het zicht van een partner met een blinddoek tijdelijk wegnemen om andere zintuigen en onzekerheid te versterken. Blijf communiceren en houd de omgeving veilig.",
  },
  {
    id: "blindfold_receive",
    name: "Blindfold — wearing",
    aliases: ["Blinddoek dragen", "Geblinddoekt worden"],
    category: "bondage",
    level: 1,
    description: "Een blinddoek dragen en tijdelijk zicht afstaan. Spreek stopmomenten af en zorg dat je de blinddoek direct kunt laten verwijderen.",
  },`],
  ["sound_deprivation", `  {
    id: "sound_deprivation_give",
    name: "Sound deprivation — applying",
    aliases: ["Geluidsdeprivatie geven", "Iemands gehoor beperken"],
    category: "sensation",
    level: 2,
    description: "Het gehoor van een partner tijdelijk dempen of afsluiten om andere sensaties en onzekerheid te versterken.",
    safetyNote: "Spreek een tastbaar non-verbaal stopsignaal af en behoud omgevingsbewustzijn voor alarmen, verkeer en andere gevaren.",
  },
  {
    id: "sound_deprivation_receive",
    name: "Sound deprivation — receiving",
    aliases: ["Geluidsdeprivatie ontvangen", "Zelf minder horen"],
    category: "sensation",
    level: 2,
    description: "Zelf tijdelijk minder horen om andere sensaties en onzekerheid te versterken.",
    safetyNote: "Spreek een tastbaar non-verbaal stopsignaal af en behoud omgevingsbewustzijn voor alarmen, verkeer en andere gevaren.",
  },`],
];
for (const [id, replacement] of pairs) replaceKink(id, replacement);

const dir = "lib/directionality.ts";
replaceOnce(dir,
  `import type { KinkEntry, Profile } from "@/types";`,
  `import type { KinkEntry, Profile, ProfilePerspective } from "@/types";`);
replaceOnce(dir,
  `export interface DirectionalKinkPair {
  conceptId: string;
  giveId: string;
  receiveId: string;
}`,
  `export interface DirectionalKinkPair {
  conceptId: string;
  giveId: string;
  receiveId: string;
  /** Alleen voor compacte Dynamic eligibility; nooit voor matching of antwoord-inferentie. */
  questionnaireAffinity?: Readonly<Partial<Record<ProfilePerspective, DirectionalKinkSide>>>;
}

const DOM_GIVE_SUB_RECEIVE_AFFINITY = {
  dominant: "give",
  submissive: "receive",
} as const satisfies Readonly<Record<ProfilePerspective, DirectionalKinkSide>>;`);
replaceOnce(dir,
  `  { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
] as const satisfies readonly DirectionalKinkPair[];`,
  `  { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
  { conceptId: "spanking_hand", giveId: "spanking_hand_give", receiveId: "spanking_hand_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "spanking_implement", giveId: "spanking_implement_give", receiveId: "spanking_implement_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "flogging", giveId: "flogging_give", receiveId: "flogging_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "rope_bondage", giveId: "rope_bondage_give", receiveId: "rope_bondage_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "shibari", giveId: "shibari_give", receiveId: "shibari_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "handcuffs", giveId: "handcuffs_give", receiveId: "handcuffs_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "leather_cuffs", giveId: "leather_cuffs_give", receiveId: "leather_cuffs_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_ball", giveId: "gag_ball_give", receiveId: "gag_ball_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_bit", giveId: "gag_bit_give", receiveId: "gag_bit_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "blindfold", giveId: "blindfold_give", receiveId: "blindfold_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "sound_deprivation", giveId: "sound_deprivation_give", receiveId: "sound_deprivation_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
] as const satisfies readonly DirectionalKinkPair[];`);
replaceOnce(dir,
  `  footjob: "Footjob",
};`,
  `  footjob: "Footjob",
  spanking_hand: "Spanking (hand)",
  spanking_implement: "Implement spanking",
  flogging: "Flogging",
  rope_bondage: "Rope bondage",
  shibari: "Shibari",
  handcuffs: "Handcuffs",
  leather_cuffs: "Leather cuffs",
  gag_ball: "Ball gag",
  gag_bit: "Bit gag",
  blindfold: "Blindfold",
  sound_deprivation: "Sound deprivation",
};`);
replaceOnce(dir,
  `export function directionalSiblingId(kinkId: string): string | null {
  const pair = directionalPairForKinkId(kinkId);
  if (!pair) return null;
  return pair.giveId === kinkId ? pair.receiveId : pair.giveId;
}
`,
  `export function directionalSiblingId(kinkId: string): string | null {
  const pair = directionalPairForKinkId(kinkId);
  if (!pair) return null;
  return pair.giveId === kinkId ? pair.receiveId : pair.giveId;
}

/**
 * Kiest uitsluitend welke kant als compacte Dynamic-anchor telt. De helper
 * muteert geen entry en zegt niets over de onbekende sibling.
 */
export function questionnaireDirectionalKinkIdForPerspective(
  kinkId: string,
  perspective?: ProfilePerspective,
): string {
  if (!perspective) return kinkId;
  const pair = directionalPairForKinkId(kinkId);
  const side = pair?.questionnaireAffinity?.[perspective];
  if (!pair || !side) return kinkId;
  return side === "give" ? pair.giveId : pair.receiveId;
}
`);
replaceOnce(dir,
  `  "footjob",
]);`,
  `  "footjob",
  "spanking_hand",
  "spanking_implement",
  "flogging",
  "rope_bondage",
  "shibari",
  "handcuffs",
  "leather_cuffs",
  "gag_ball",
  "gag_bit",
  "blindfold",
  "sound_deprivation",
]);`);

const meta = "lib/questionnaireMetadata.ts";
replaceOnce(meta,
  `    "spanking_hand", "spanking_implement", "flogging", "caning", "cropping", "paddling",`,
  `    "spanking_hand_give", "spanking_hand_receive", "spanking_implement_give", "spanking_implement_receive",
    "flogging_give", "flogging_receive", "caning", "cropping", "paddling",`);
replaceOnce(meta,
  `    "rope_bondage", "shibari", "suspension_rechtop", "suspension_ondersteboven",`,
  `    "rope_bondage_give", "rope_bondage_receive", "shibari_give", "shibari_receive",
    "suspension_rechtop", "suspension_ondersteboven",`);
replaceOnce(meta,
  `    "handcuffs", "leather_cuffs", "spreader_bar", "hogtie", "mummification", "straitjacket",`,
  `    "handcuffs_give", "handcuffs_receive", "leather_cuffs_give", "leather_cuffs_receive",
    "spreader_bar", "hogtie", "mummification", "straitjacket",`);
replaceOnce(meta,
  `  gags: ["gag_ball", "gag_bit", "gag_tape", "gag_opblaasbaar", "gag_penisvorm", "gag_rubber"],`,
  `  gags: ["gag_ball_give", "gag_ball_receive", "gag_bit_give", "gag_bit_receive", "gag_tape", "gag_opblaasbaar", "gag_penisvorm", "gag_rubber"],`);
replaceOnce(meta,
  `  sensory_deprivation: ["blindfold", "hood", "sound_deprivation"],`,
  `  sensory_deprivation: ["blindfold_give", "blindfold_receive", "hood", "sound_deprivation_give", "sound_deprivation_receive"],`);
replaceOnce(meta,
  `  impact: ["spanking_hand", "flogging"],
  bondage: ["handcuffs", "rope_bondage", "gag_ball", "blindfold"],`,
  `  impact: ["spanking_hand_give", "flogging_give"],
  bondage: ["handcuffs_give", "rope_bondage_give", "gag_ball_give", "blindfold_give"],`);
replaceOnce(meta,
  `  impact: ["spanking_hand", "flogging"],
  bondage: ["handcuffs", "rope_bondage", "gag_ball"],`,
  `  impact: ["spanking_hand_give", "flogging_give"],
  bondage: ["handcuffs_give", "rope_bondage_give", "gag_ball_give"],`);
replaceOnce(meta,
  `  ["spanking_hand", "spanking_implement"],
  ["rope_bondage", "shibari"],
  ["handcuffs", "leather_cuffs"],
  ["gag_ball", "gag_bit"],`,
  `  ["spanking_hand_give", "spanking_implement_give"],
  ["spanking_hand_receive", "spanking_implement_receive"],
  ["rope_bondage_give", "shibari_give"],
  ["rope_bondage_receive", "shibari_receive"],
  ["handcuffs_give", "leather_cuffs_give"],
  ["handcuffs_receive", "leather_cuffs_receive"],
  ["gag_ball_give", "gag_bit_give"],
  ["gag_ball_receive", "gag_bit_receive"],`);
replaceOnce(meta,
  `  ["blindfold", "sound_deprivation"],
  ["shibari", "suspension_rechtop"],`,
  `  ["blindfold_give", "sound_deprivation_give"],
  ["blindfold_receive", "sound_deprivation_receive"],
  ["shibari_give", "suspension_rechtop"],`);
replaceOnce(meta,
  `  spanking_hand: ["spanking_implement", "flogging"],
  rope_bondage: ["shibari"],
  handcuffs: ["leather_cuffs"],`,
  `  spanking_hand_give: ["spanking_implement_give", "flogging_give"],
  spanking_hand_receive: ["spanking_implement_receive", "flogging_receive"],
  rope_bondage_give: ["shibari_give"],
  rope_bondage_receive: ["shibari_receive"],
  handcuffs_give: ["leather_cuffs_give"],
  handcuffs_receive: ["leather_cuffs_receive"],`);
replaceOnce(meta,
  `  shibari: ["suspension_rechtop"],
  blindfold: ["sound_deprivation"],`,
  `  shibari_give: ["suspension_rechtop"],
  blindfold_give: ["sound_deprivation_give"],
  blindfold_receive: ["sound_deprivation_receive"],`);
replaceOnce(meta,
  ` * APPEND-ONLY CONTRACT — dit slot gaat niet stiekem van sleutel wisselen.
 *
 * Een bestaande source -> target wijzigen of wissen is een semantische migratie,
 * geen onschuldige metadata-opruimbeurt. Nieuwe sources mogen erbij. Het target
 * blijft vastgepind, zodat reloads of catalogusherschikking een oud positief
 * antwoord nooit een tweede expansionbeurt geven. Er is bewust geen fallback.
 */
export const QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 3;`,
  ` * VERSIONED CONTRACT — een source -> target wijziging is een semantische migratie.
 * Nieuwe mappings mogen alleen met expliciete audit; bestaande mappings wijzigen
 * uitsluitend samen met een version bump en bijbehorende pre-launch cleanup.
 * Er is bewust geen fallback of automatische sibling-propagatie.
 */
export const QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 4;`);
replaceOnce(meta,
  `  spanking_hand: "spanking_implement",
  rope_bondage: "shibari",
  handcuffs: "leather_cuffs",`,
  `  spanking_hand_give: "spanking_implement_give",
  spanking_hand_receive: "spanking_implement_receive",
  rope_bondage_give: "shibari_give",
  rope_bondage_receive: "shibari_receive",
  handcuffs_give: "leather_cuffs_give",
  handcuffs_receive: "leather_cuffs_receive",`);
replaceOnce(meta,
  `  shibari: "suspension_rechtop",
  blindfold: "sound_deprivation",`,
  `  shibari_give: "suspension_rechtop",
  blindfold_give: "sound_deprivation_give",
  blindfold_receive: "sound_deprivation_receive",`);

const questionnaire = "lib/questionnaire.ts";
replaceOnce(questionnaire,
  `import { kinkCategorySearchTerms } from "@/lib/kinkCategories";`,
  `import { kinkCategorySearchTerms } from "@/lib/kinkCategories";
import { questionnaireDirectionalKinkIdForPerspective } from "@/lib/directionality";`);
replaceOnce(questionnaire,
  `  Profile,
  QuestionnaireInterest,`,
  `  Profile,
  ProfilePerspective,
  QuestionnaireInterest,`);
replaceOnce(questionnaire,
  `export function buildQuestionnaireCoveragePlan(
  interests: readonly QuestionnaireInterest[],
): QuestionnaireCoveragePlan {`,
  `export function buildQuestionnaireCoveragePlan(
  interests: readonly QuestionnaireInterest[],
  perspective?: ProfilePerspective,
): QuestionnaireCoveragePlan {`);
replaceOnce(questionnaire,
  `  for (const kinkId of QUESTIONNAIRE_COVERAGE_ANCHOR_IDS) {
    if (!catalogIds.has(kinkId) || seen.has(kinkId)) continue;
    seen.add(kinkId);
    anchorIds.push(kinkId);
  }
  for (const interest of interests) {
    for (const kinkId of QUESTIONNAIRE_INTEREST_ANCHOR_IDS[interest]) {
      if (!catalogIds.has(kinkId)) continue;
      if (!interestAnchorIds.includes(kinkId)) interestAnchorIds.push(kinkId);
      if (seen.has(kinkId)) continue;
      seen.add(kinkId);
      anchorIds.push(kinkId);
    }
  }`,
  `  for (const sourceId of QUESTIONNAIRE_COVERAGE_ANCHOR_IDS) {
    const kinkId = questionnaireDirectionalKinkIdForPerspective(sourceId, perspective);
    if (!catalogIds.has(kinkId) || seen.has(kinkId)) continue;
    seen.add(kinkId);
    anchorIds.push(kinkId);
  }
  for (const interest of interests) {
    for (const sourceId of QUESTIONNAIRE_INTEREST_ANCHOR_IDS[interest]) {
      const kinkId = questionnaireDirectionalKinkIdForPerspective(sourceId, perspective);
      if (!catalogIds.has(kinkId)) continue;
      if (!interestAnchorIds.includes(kinkId)) interestAnchorIds.push(kinkId);
      if (seen.has(kinkId)) continue;
      seen.add(kinkId);
      anchorIds.push(kinkId);
    }
  }`);
replaceOnce(questionnaire,
  `export function questionnaireCoverage(
  profile: Profile,
  plan: QuestionnaireCoveragePlan = buildQuestionnaireCoveragePlan(profile.questionnaireSetup?.interests ?? []),
): QuestionnaireCoverage {`,
  `function questionnairePerspective(profile: Profile): ProfilePerspective | undefined {
  if (profile.perspective) return profile.perspective;
  const role = profile.role.trim().toLowerCase();
  return role === "dominant" || role === "submissive" ? role : undefined;
}

export function questionnaireCoverage(
  profile: Profile,
  plan: QuestionnaireCoveragePlan = buildQuestionnaireCoveragePlan(
    profile.questionnaireSetup?.interests ?? [],
    questionnairePerspective(profile),
  ),
): QuestionnaireCoverage {`);
replaceOnce(questionnaire,
  `  const coveragePlan = buildQuestionnaireCoveragePlan(setup.interests);`,
  `  const coveragePlan = buildQuestionnaireCoveragePlan(setup.interests, questionnairePerspective(profile));`);

const kinkTest = "__tests__/kinks.test.ts";
replaceOnce(kinkTest, `  "sound_deprivation", "wetlook",`, `  "wetlook",`);
replaceOnce(kinkTest,
  `  "footjob_give", "footjob_receive",
] as const;`,
  `  "footjob_give", "footjob_receive",
  "spanking_hand_give", "spanking_hand_receive",
  "spanking_implement_give", "spanking_implement_receive",
  "flogging_give", "flogging_receive",
  "rope_bondage_give", "rope_bondage_receive",
  "shibari_give", "shibari_receive",
  "handcuffs_give", "handcuffs_receive",
  "leather_cuffs_give", "leather_cuffs_receive",
  "gag_ball_give", "gag_ball_receive",
  "gag_bit_give", "gag_bit_receive",
  "blindfold_give", "blindfold_receive",
  "sound_deprivation_give", "sound_deprivation_receive",
] as const;`);
replaceOnce(kinkTest,
  `  "footjob",
] as const;`,
  `  "footjob",
  "spanking_hand",
  "spanking_implement",
  "flogging",
  "rope_bondage",
  "shibari",
  "handcuffs",
  "leather_cuffs",
  "gag_ball",
  "gag_bit",
  "blindfold",
] as const;

const RETIRED_POST_V2_DIRECTIONAL_IDS = ["sound_deprivation"] as const;`);
replaceOnce(kinkTest, `    expect(KINKS).toHaveLength(299);`, `    expect(KINKS).toHaveLength(310);`);
replaceOnce(kinkTest,
  `    expect(RETIRED_COMPOSITE_OR_DUPLICATE_IDS.filter((id) => ids.has(id))).toEqual([]);`,
  `    expect(RETIRED_COMPOSITE_OR_DUPLICATE_IDS.filter((id) => ids.has(id))).toEqual([]);
    expect(RETIRED_POST_V2_DIRECTIONAL_IDS.filter((id) => ids.has(id))).toEqual([]);`);
replaceOnce(kinkTest,
  `      "crying_tears", "sound_deprivation", "prostate_massage", "sex_machine",`,
  `      "crying_tears", "sound_deprivation_give", "sound_deprivation_receive", "prostate_massage", "sex_machine",`);

const directionTest = "__tests__/directionality.test.ts";
replaceOnce(directionTest,
  `  partnerDirectionalKinkId,
  stripDeprecatedDirectionalEntries,`,
  `  partnerDirectionalKinkId,
  questionnaireDirectionalKinkIdForPerspective,
  stripDeprecatedDirectionalEntries,`);
replaceOnce(directionTest,
  `    expect(DIRECTIONAL_KINK_PAIRS).toEqual([
      { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },`,
  `    expect(DIRECTIONAL_KINK_PAIRS.slice(0, 9)).toEqual([
      { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },`);
replaceOnce(directionTest,
  `      { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
    ]);`,
  `      { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
    ]);
    expect(DIRECTIONAL_KINK_PAIRS).toHaveLength(20);
    expect(DIRECTIONAL_KINK_PAIRS.slice(9).every((pair) =>
      pair.questionnaireAffinity?.dominant === "give"
      && pair.questionnaireAffinity?.submissive === "receive")).toBe(true);`);
replaceOnce(directionTest,
  `    for (const retired of ["anal_sex", "anal_fingering", "fisting_anal", "fisting_vaginal", "deep_throat", "rimmen", "footjob"]) {`,
  `    for (const retired of [
      "anal_sex", "anal_fingering", "fisting_anal", "fisting_vaginal", "deep_throat", "rimmen", "footjob",
      "spanking_hand", "spanking_implement", "flogging", "rope_bondage", "shibari", "handcuffs",
      "leather_cuffs", "gag_ball", "gag_bit", "blindfold", "sound_deprivation",
    ]) {`);
replaceOnce(directionTest,
  `  it("keeps both directions independently eligible in Dynamic for every perspective", () => {
    const plan = buildQuestionnaireCoveragePlan([]);
    expect(plan.anchorIds).toContain("pegging_give");
    expect(plan.anchorIds).toContain("pegging_receive");

    for (const perspective of ["dominant", "submissive"] as const) {
      const ids = getQuestionnaireRuntime(ownProfile(perspective)).queue.map((item) => item.kink.id);
      expect(ids).toContain("pegging_give");
      expect(ids).toContain("pegging_receive");
    }
  });`,
  `  it("keeps neutral pairs role-independent while compact Dynamic aligns strong role-affinity anchors", () => {
    for (const perspective of ["dominant", "submissive"] as const) {
      const plan = buildQuestionnaireCoveragePlan([], perspective);
      expect(plan.anchorIds).toHaveLength(45);
      expect(plan.anchorIds).toContain("pegging_give");
      expect(plan.anchorIds).toContain("pegging_receive");
      expect(plan.anchorIds).toContain(perspective === "dominant" ? "spanking_hand_give" : "spanking_hand_receive");
      expect(plan.anchorIds).not.toContain(perspective === "dominant" ? "spanking_hand_receive" : "spanking_hand_give");

      const ids = getQuestionnaireRuntime(ownProfile(perspective)).queue.map((item) => item.kink.id);
      expect(ids).toContain("pegging_give");
      expect(ids).toContain("pegging_receive");
      expect(ids).toContain(perspective === "dominant" ? "rope_bondage_give" : "rope_bondage_receive");
      expect(ids).not.toContain(perspective === "dominant" ? "rope_bondage_receive" : "rope_bondage_give");
    }
  });

  it("uses role affinity only for questionnaire eligibility, never as an answer", () => {
    expect(questionnaireDirectionalKinkIdForPerspective("spanking_hand_give", "submissive"))
      .toBe("spanking_hand_receive");
    expect(questionnaireDirectionalKinkIdForPerspective("spanking_hand_receive", "dominant"))
      .toBe("spanking_hand_give");
    expect(questionnaireDirectionalKinkIdForPerspective("pegging_give", "submissive"))
      .toBe("pegging_give");
    const sub = ownProfile("submissive");
    getQuestionnaireRuntime(sub);
    expect(sub.entries.spanking_hand_give).toBeUndefined();
    expect(sub.entries.spanking_hand_receive).toBeUndefined();
  });`);
replaceOnce(directionTest,
  `    const queue = [queueItem("spanking_hand"), queueItem("pegging_receive")];`,
  `    const queue = [queueItem("ice_play"), queueItem("pegging_receive")];`);
replaceOnce(directionTest,
  `    })?.kink.id).toBe("spanking_hand");`,
  `    })?.kink.id).toBe("ice_play");`);
replaceOnce(directionTest,
  `    expect(partnerDirectionalKinkId("spanking_hand")).toBe("spanking_hand");`,
  `    expect(partnerDirectionalKinkId("spanking_hand_give")).toBe("spanking_hand_receive");
    expect(partnerDirectionalKinkId("spanking_hand_receive")).toBe("spanking_hand_give");`);
replaceOnce(directionTest,
  `    expect(retired.anal_sex_receive).toBeUndefined();`,
  `    expect(retired.anal_sex_receive).toBeUndefined();
    const roleRetired = stripDeprecatedDirectionalEntries({
      spanking_hand: { status: "yes", comment: "ambigue oud antwoord" },
      sound_deprivation: { status: "maybe", comment: "ambigue oud antwoord" },
    });
    expect(roleRetired.spanking_hand).toBeUndefined();
    expect(roleRetired.spanking_hand_give).toBeUndefined();
    expect(roleRetired.spanking_hand_receive).toBeUndefined();
    expect(roleRetired.sound_deprivation).toBeUndefined();`);

const matchingTest = "__tests__/directionalMatching.test.ts";
replaceOnce(matchingTest,
  `import { profileMatchScore } from "@/lib/matching";`,
  `import { DIRECTIONAL_KINK_PAIRS } from "@/lib/directionality";
import { profileMatchScore } from "@/lib/matching";`);
replaceOnce(matchingTest,
  `    for (const [giveId, receiveId] of [
      ["pegging_give", "pegging_receive"],
      ["watersports_geven", "watersports_ontvangen"],
      ["anal_sex_give", "anal_sex_receive"],
      ["anal_fingering_give", "anal_fingering_receive"],
      ["fisting_anal_give", "fisting_anal_receive"],
      ["fisting_vaginal_give", "fisting_vaginal_receive"],
      ["deep_throat_give", "deep_throat_receive"],
      ["rimming_give", "rimming_receive"],
      ["footjob_give", "footjob_receive"],
    ] as const) {`,
  `    for (const { giveId, receiveId } of DIRECTIONAL_KINK_PAIRS) {`);
replaceOnce(matchingTest,
  `    expect(profileMatchScore(submissiveReceiver, dominantGiver).overall).toBe(100);`,
  `    expect(profileMatchScore(submissiveReceiver, dominantGiver).overall).toBe(100);

    const dominantSpankingReceiver = profile("D", "dominant", { spanking_hand_receive: { status: "yes" } });
    const submissiveSpankingGiver = profile("E", "submissive", { spanking_hand_give: { status: "yes" } });
    expect(profileMatchScore(dominantSpankingReceiver, submissiveSpankingGiver).overall).toBe(100);`);

const questionnaireTest = "__tests__/questionnaire.test.ts";
replaceOnce(questionnaireTest, `    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(3);`, `    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(4);`);
replaceOnce(questionnaireTest,
  `      spanking_hand: "spanking_implement",
      rope_bondage: "shibari",
      handcuffs: "leather_cuffs",`,
  `      spanking_hand_give: "spanking_implement_give",
      spanking_hand_receive: "spanking_implement_receive",
      rope_bondage_give: "shibari_give",
      rope_bondage_receive: "shibari_receive",
      handcuffs_give: "leather_cuffs_give",
      handcuffs_receive: "leather_cuffs_receive",`);
replaceOnce(questionnaireTest,
  `      shibari: "suspension_rechtop",
      blindfold: "sound_deprivation",`,
  `      shibari_give: "suspension_rechtop",
      blindfold_give: "sound_deprivation_give",
      blindfold_receive: "sound_deprivation_receive",`);
replaceOnce(questionnaireTest,
  `  it("never hides an existing answer outside the Dynamic plan", () => {`,
  `  it("keeps compact role-affinity coverage the same size for both perspectives", () => {
    const dominant = buildQuestionnaireCoveragePlan([], "dominant");
    const submissive = buildQuestionnaireCoveragePlan([], "submissive");
    expect(dominant.anchorIds).toHaveLength(45);
    expect(submissive.anchorIds).toHaveLength(45);
    expect(dominant.anchorIds).toContain("handcuffs_give");
    expect(dominant.anchorIds).not.toContain("handcuffs_receive");
    expect(submissive.anchorIds).toContain("handcuffs_receive");
    expect(submissive.anchorIds).not.toContain("handcuffs_give");
    expect(dominant.anchorIds).toContain("pegging_give");
    expect(dominant.anchorIds).toContain("pegging_receive");
    expect(submissive.anchorIds).toContain("pegging_give");
    expect(submissive.anchorIds).toContain("pegging_receive");
  });

  it("never hides an existing answer outside the Dynamic plan", () => {`);

let docs = fs.readFileSync("directie.md", "utf8");
docs = docs.replace(
  `Voor een latere **sterk rol-geassocieerde** pair (bijvoorbeeld bepaalde impact- of bondagehandelingen) mag Dynamic één rol-aligned kant als basisvraag kiezen om de standaardflow niet kunstmatig te verdubbelen. De andere kant blijft dan **onbekend**, niet negatief, en blijft bereikbaar via Discover, Deep Dive, categorie-exploratie of gericht zoeken. Een Switch behoudt twee perspectieven; ieder perspectief krijgt zijn eigen zuinige basisflow.`,
  `Voor een **sterk rol-geassocieerde** pair (zoals de Release C impact- en bondageverticals) mag Dynamic één rol-aligned kant als basisvraag kiezen om de standaardflow niet kunstmatig te verdubbelen. De andere kant blijft **onbekend**, niet negatief, en blijft bereikbaar via Discover, Deep Dive, categorie-exploratie of gericht zoeken. Een Switch behoudt twee perspectieven; ieder perspectief krijgt zijn eigen zuinige basisflow.`
);
docs = docs.replace(
  `Impact, bondage en andere sterk rol-geassocieerde handelingen worden **niet** in deze release gebulksplitst. Ze wachten op item-per-item role-affinity-audit zodat Dynamic niet onnodig verdubbelt. Worship, toys en anatomy/equipment-gevoelige gevallen blijven eveneens apart staan totdat de labels ondubbelzinnig zijn.`,
  `Release C bewijst role-affinity op een beperkte keten van bestaande Dynamic-anchors en directe semantische vervolgen: hand-spanking, implement-spanking, flogging, rope bondage, shibari, handcuffs, leather cuffs, ball/bit gag, blindfold en sound deprivation. Alleen de compacte Dynamic-anchor kiest per perspective een geassocieerde kant; alle andere productpaden blijven beide richtingen expliciet behandelen. Overige impact/bondage-items wachten nog steeds op item-per-item audit. Worship, toys en anatomy/equipment-gevoelige gevallen blijven apart staan totdat de labels ondubbelzinnig zijn.`
);
fs.writeFileSync("directie.md", docs);

fs.writeFileSync("docs/directionality-role-affinity.md", `# Directionality role-affinity — Release C

Status: high-confidence vertical slice na Release B.

## Doel

Directionality correct opslaan zonder de compacte Dynamic-flow te verdubbelen voor handelingen waarvan één kant vaak sterk samenvalt met het gekozen Dominant- of Submissive-perspectief.

## Harde grens

Role affinity is **geen antwoordmodel**. Het bestaat uitsluitend als questionnaire-eligibilitymetadata op een reeds expliciet directioneel pair.

- Dominant-perspectief kan de give-kant als Dynamic-anchor krijgen.
- Submissive-perspectief kan de receive-kant als Dynamic-anchor krijgen.
- De niet-getoonde sibling blijft onbekend, nooit \`no\`.
- Discover, Deep Dive, category exploration en search blijven beide kanten tonen.
- Matching blijft uitsluitend give ↔ receive en negeert role affinity volledig.
- Een Dominant mag dus expliciet receive = Heel graag beantwoorden; een Submissive mag give = Heel graag beantwoorden.
- Switch blijft twee onafhankelijke perspectieven; elk krijgt zijn eigen compacte anchorselectie.

## Release C — uitgevoerd

High-confidence role-affinity pairs:

### Impact
- Spanking (hand)
- Implement spanking
- Flogging

### Bondage / sensory restriction
- Rope bondage
- Shibari
- Handcuffs
- Leather cuffs
- Ball gag
- Bit gag
- Blindfold
- Sound deprivation

Dit zijn bewust alleen bestaande Dynamic-anchors en hun directe, al gemodelleerde semantische vervolgketens. Daardoor bewijst Release C de architectuur zonder tientallen instrumenten en nichevormen tegelijk te converteren.

## Niet meegenomen

Caning, crop, paddling, whipping, belt, face slapping, punching, trampling, spreader bar, hogtie, mummification, straitjacket, chastity, tape/andere gags, hood, collar/leash, suspension en verdiepende bondage blijven kandidaat maar niet automatisch goedgekeurd. Hun directionality is vaak duidelijk; de vraag is vooral of de catalogusgranulariteit en questionnairewaarde een split rechtvaardigen.

Power-exchange-identiteiten zoals D/s, Master/slave, Owner/pet en brat/tamer zijn geen give/receive-instrumenten en worden niet door dit model gesplitst.

## Canonical expansion

Bestaande inhoudelijke routes blijven same-side:

- spanking give → implement spanking give / flogging give
- spanking receive → implement spanking receive / flogging receive
- rope give → shibari give
- rope receive → shibari receive
- cuffs give → leather cuffs give
- cuffs receive → leather cuffs receive
- blindfold give → sound deprivation give
- blindfold receive → sound deprivation receive

Geen van deze edges opent ooit de opposite sibling.
`);

replaceOnce(
  "planned-changes.md",
  `The original Pegging product gate is shipped. Directionality Release B now audits the catalog with the same anti-inference contract: high-confidence role-neutral sexual actions become explicit complementary pairs, while impact/bondage stay deferred behind a role-affinity eligibility pass so Dynamic does not balloon.`,
  `The original Pegging product gate and Release B role-neutral catalog audit are shipped. Release C now proves role-affinity on a deliberately small impact/bondage vertical slice: explicit pairs remain fully independent, while only compact Dynamic coverage may choose the perspective-aligned sibling. The opposite side stays unknown and reachable. Remaining impact/bondage candidates stay item-by-item work, not a bulk split.`
);

// Guardrails: old ambiguous IDs may remain only in the explicit deprecated set/tests/docs, never active catalog/metadata.
const retiredActiveIds = [
  "spanking_hand", "spanking_implement", "flogging", "rope_bondage", "shibari", "handcuffs",
  "leather_cuffs", "gag_ball", "gag_bit", "blindfold", "sound_deprivation",
];
for (const path of ["lib/kinks.ts", "lib/questionnaireMetadata.ts"]) {
  const source = fs.readFileSync(path, "utf8");
  for (const id of retiredActiveIds) {
    if (source.includes(`"${id}"`)) throw new Error(`Retired role-affinity ID blijft actief in ${path}: ${id}`);
  }
}

console.log("Role-affinity Release C gesmeed zonder antwoorden uit rol af te leiden.");
