import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(path, before, after) {
  const source = read(path);
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${path}: expected text not found:\n${before.slice(0, 180)}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${path}: expected text occurs more than once`);
  }
  write(path, source.slice(0, first) + after + source.slice(first + before.length));
}

function replaceRegexOnce(path, pattern, replacement) {
  const source = read(path);
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"))];
  if (matches.length !== 1) throw new Error(`${path}: expected one regex match, got ${matches.length}: ${pattern}`);
  write(path, source.replace(pattern, replacement));
}

// ---------------------------------------------------------------------------
// 1. Explicit questionnaire role policy. This is deliberately separate from
// the older questionnaireAffinity hint: priority metadata never silently grows
// into a semantic access rule.
// ---------------------------------------------------------------------------
write("lib/questionnaireEligibility.ts", `import {
  directionalPairForKinkId,
  directionalSideForKinkId,
} from "@/lib/directionality";
import type { ProfilePerspective } from "@/types";

export type QuestionnaireRolePolicy = "alignedUntilDeepDive";

/**
 * High-confidence D/s-bound handelingen. Buiten Deep Dive blijft de guided
 * questionnaire aan de gekozen perspective-kant. Dit is alleen eligibility:
 * er wordt nooit een antwoord, grens of identiteit uit afgeleid.
 *
 * Blindfold, hood en sound deprivation staan bewust niet in deze lijst. Ze
 * houden hun compacte Dynamic-affinity, maar zijn semantisch niet hard genoeg
 * om de tegenovergestelde kant buiten Discover/categorie te blokkeren.
 */
export const ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS = [
  "spanking_hand",
  "spanking_implement",
  "flogging",
  "caning",
  "cropping",
  "paddling",
  "whipping",
  "belt",
  "slapping_face",
  "punching",
  "trampling",
  "rope_bondage",
  "shibari",
  "handcuffs",
  "leather_cuffs",
  "spreader_bar",
  "hogtie",
  "mummification",
  "straitjacket",
  "gag_ball",
  "gag_bit",
  "gag_tape",
  "gag_opblaasbaar",
  "gag_penisvorm",
  "gag_rubber",
  "suspension_rechtop",
  "suspension_ondersteboven",
  "suspension_horizontaal",
  "opsluiting_kooi",
  "opsluiting_donker",
  "opsluiting_kleine_ruimte",
] as const;

const ROLE_BOUND_DIRECTIONAL_CONCEPTS = new Set<string>(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS);

export function questionnaireRolePolicyForKinkId(kinkId: string): QuestionnaireRolePolicy | null {
  const pair = directionalPairForKinkId(kinkId);
  return pair && ROLE_BOUND_DIRECTIONAL_CONCEPTS.has(pair.conceptId)
    ? "alignedUntilDeepDive"
    : null;
}

export function isQuestionnaireKinkEligibleForPerspective(
  kinkId: string,
  perspective?: ProfilePerspective,
  exhaustive = false,
): boolean {
  if (exhaustive || !perspective) return true;
  if (questionnaireRolePolicyForKinkId(kinkId) !== "alignedUntilDeepDive") return true;

  const side = directionalSideForKinkId(kinkId);
  if (!side) return true;
  return perspective === "dominant" ? side === "give" : side === "receive";
}
`);

// ---------------------------------------------------------------------------
// 2. Generic complementary participation. Directionality stays Geven/Ontvangen;
// diaper self/partner is a different semantic axis layered above it.
// ---------------------------------------------------------------------------
write("lib/participation.ts", `import type { KinkEntry } from "@/types";
import {
  directionalCompareLabel,
  partnerDirectionalKinkId,
} from "@/lib/directionality";

export interface ComplementaryParticipationPair {
  conceptId: string;
  leftId: string;
  rightId: string;
  leftLabel: string;
  rightLabel: string;
}

export const COMPLEMENTARY_PARTICIPATION_PAIRS = [
  {
    conceptId: "diaper_wearing",
    leftId: "luiers_dragen",
    rightId: "diaper_partner_wearing",
    leftLabel: "Zelf dragen",
    rightLabel: "Partner draagt",
  },
] as const satisfies readonly ComplementaryParticipationPair[];

const SPECIAL_PAIR_BY_KINK_ID = new Map<string, ComplementaryParticipationPair>();
for (const pair of COMPLEMENTARY_PARTICIPATION_PAIRS) {
  SPECIAL_PAIR_BY_KINK_ID.set(pair.leftId, pair);
  SPECIAL_PAIR_BY_KINK_ID.set(pair.rightId, pair);
}

export function complementarySiblingId(kinkId: string): string | null {
  const special = SPECIAL_PAIR_BY_KINK_ID.get(kinkId);
  if (special) return special.leftId === kinkId ? special.rightId : special.leftId;
  const directionalPartner = partnerDirectionalKinkId(kinkId);
  return directionalPartner === kinkId ? null : directionalPartner;
}

export function complementaryPartnerKinkId(kinkId: string): string {
  return complementarySiblingId(kinkId) ?? kinkId;
}

const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };

export interface ComplementaryComparisonEntries {
  sourceKinkId: string;
  partnerKinkId: string;
  sourceEntry: KinkEntry;
  partnerEntry: KinkEntry;
}

export function complementaryComparisonEntries(
  sourceEntries: Readonly<Record<string, KinkEntry>> | undefined,
  partnerEntries: Readonly<Record<string, KinkEntry>> | undefined,
  kinkId: string,
): ComplementaryComparisonEntries {
  const partnerKinkId = complementaryPartnerKinkId(kinkId);
  return {
    sourceKinkId: kinkId,
    partnerKinkId,
    sourceEntry: sourceEntries?.[kinkId] ?? EMPTY_ENTRY,
    partnerEntry: partnerEntries?.[partnerKinkId] ?? EMPTY_ENTRY,
  };
}

export function complementaryCompareLabel(kinkId: string, fallbackName: string): string {
  const special = SPECIAL_PAIR_BY_KINK_ID.get(kinkId);
  if (!special) return directionalCompareLabel(kinkId, fallbackName);
  const side = special.leftId === kinkId ? special.leftLabel : special.rightLabel;
  return `Diaper wearing — ${side}`;
}
`);

// ---------------------------------------------------------------------------
// 3. Catalog: add the missing partner-facing diaper participation without
// copying or migrating the existing self-wearing answer.
// ---------------------------------------------------------------------------
replaceOnce(
  "lib/kinks.ts",
  `  {
    id: "luiers_dragen",
    name: "Diaper wearing",
    aliases: ["Luiers dragen"],
    category: "adult_ageplay",
    level: 3,
    description: "Als volwassene een luier dragen om lichamelijke, praktische, esthetische of erotische redenen, zonder ageplay, controle of vernedering te veronderstellen.",
  },`,
  `  {
    id: "luiers_dragen",
    name: "Diaper wearing",
    aliases: ["Luiers dragen"],
    category: "adult_ageplay",
    level: 3,
    description: "Als volwassene een luier dragen om lichamelijke, praktische, esthetische of erotische redenen, zonder ageplay, controle of vernedering te veronderstellen.",
  },
  {
    id: "diaper_partner_wearing",
    name: "Partner wearing diapers",
    aliases: ["Partner in luiers", "Je partner een luier zien dragen", "Partner diaper wearing"],
    category: "adult_ageplay",
    level: 3,
    description: "Het aantrekkelijk, erotisch of betekenisvol vinden dat een volwassen partner een luier draagt, zonder te veronderstellen dat je zelf een luier wilt dragen of dat ageplay, controle of vernedering erbij hoort.",
  },`,
);

// ---------------------------------------------------------------------------
// 4. Matching/compare use the generic complementary layer. Existing direction
// pairs keep exactly the same behavior; diaper wearing gains self ↔ partner.
// ---------------------------------------------------------------------------
replaceOnce(
  "lib/matching.ts",
  `import { directionalComparisonEntries } from "@/lib/directionality";`,
  `import { complementaryComparisonEntries } from "@/lib/participation";`,
);
replaceOnce(
  "lib/matching.ts",
  `    const { sourceEntry: eA, partnerEntry: eB } = directionalComparisonEntries(`,
  `    const { sourceEntry: eA, partnerEntry: eB } = complementaryComparisonEntries(`,
);

replaceOnce(
  "lib/compare.ts",
  `import {
  directionalCompareLabel,
  partnerDirectionalKinkId,
} from "@/lib/directionality";`,
  `import {
  complementaryCompareLabel,
  complementaryPartnerKinkId,
} from "@/lib/participation";`,
);
replaceOnce(
  "lib/compare.ts",
  `  return partnerDirectionalKinkId(kinkId);`,
  `  return complementaryPartnerKinkId(kinkId);`,
);
replaceOnce(
  "lib/compare.ts",
  `  return directionalCompareLabel(kinkId, fallbackName);`,
  `  return complementaryCompareLabel(kinkId, fallbackName);`,
);

// ---------------------------------------------------------------------------
// 5. Metadata: partner diaper shares the topic/complement neighborhood; private
// recording remains related but no longer opens public content creation as an
// immediate canonical door. This is a semantic migration: v5 -> v6.
// ---------------------------------------------------------------------------
replaceOnce(
  "lib/questionnaireMetadata.ts",
  `    "luiers_dragen", "diaper_wetting", "diaper_messing",
    "diaper_changing_give", "diaper_changing_receive",`,
  `    "luiers_dragen", "diaper_partner_wearing", "diaper_wetting", "diaper_messing",
    "diaper_changing_give", "diaper_changing_receive",`,
);
replaceOnce(
  "lib/questionnaireMetadata.ts",
  `  ["luiers_dragen", "diaper_wetting"],`,
  `  ["luiers_dragen", "diaper_partner_wearing"],
  ["luiers_dragen", "diaper_wetting"],`,
);
replaceOnce(
  "lib/questionnaireMetadata.ts",
  `  recording: ["adult_content_creation"],\n`,
  ``,
);
replaceOnce(
  "lib/questionnaireMetadata.ts",
  `export const QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 5;`,
  `export const QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 6;`,
);
replaceOnce(
  "lib/questionnaireMetadata.ts",
  `  recording: "adult_content_creation",\n`,
  ``,
);

// ---------------------------------------------------------------------------
// 6. Runtime eligibility and intent-local completion/progress.
// ---------------------------------------------------------------------------
replaceOnce(
  "lib/questionnaire.ts",
  `import { questionnaireDirectionalKinkIdForPerspective } from "@/lib/directionality";`,
  `import { questionnaireDirectionalKinkIdForPerspective } from "@/lib/directionality";
import { isQuestionnaireKinkEligibleForPerspective } from "@/lib/questionnaireEligibility";`,
);
replaceRegexOnce(
  "lib/questionnaire.ts",
  /export interface QuestionnaireRuntime \{[\s\S]*?\n\}\n\ninterface RuntimeOptions/,
  `export interface QuestionnaireScopeProgress {
  answered: number;
  total: number;
}

export interface QuestionnaireRuntime {
  intent: QuestionnaireIntent;
  queue: QuestionnaireQueueItem[];
  visibleKinks: Kink[];
  pendingProbes: PendingExpansionProbe[];
  coverage: QuestionnaireCoverage;
  scope: QuestionnaireScopeProgress;
  complete: boolean;
}

interface RuntimeOptions`,
);
replaceRegexOnce(
  "lib/questionnaire.ts",
  /export function getQuestionnaireRuntime\([\s\S]*?\n\}\n\n\/\*\* Dynamic returns its factual working set; Deep Dive returns the catalog\. \*\//,
  `export function getQuestionnaireRuntime(
  profile: Profile,
  options: RuntimeOptions = {},
): QuestionnaireRuntime {
  const setup = profile.questionnaireSetup ?? defaultQuestionnaireSetup();

  const requestedIntent = options.intent ?? { kind: "dynamic" };
  const intent: QuestionnaireIntent = requestedIntent.kind === "category"
    ? requestedIntent
    : setup.mode === "deepDive"
      ? { kind: "deepDive" }
      : requestedIntent;
  const perspective = questionnairePerspective(profile);
  const exhaustive = intent.kind === "deepDive";
  const isGuidedEligible = (kinkId: string) =>
    isQuestionnaireKinkEligibleForPerspective(kinkId, perspective, exhaustive);

  const coveragePlan = buildQuestionnaireCoveragePlan(setup.interests, perspective);
  const coverage = questionnaireCoverage(profile, coveragePlan);
  const coverageIds = new Set(coveragePlan.anchorIds);
  const coreIds = new Set<string>(QUESTIONNAIRE_CORE_ANCHOR_IDS);
  const interestIds = new Set(coveragePlan.interestAnchorIds);

  const pendingProbes = derivePendingExpansionProbes(KINKS, profile.entries)
    .filter((probe) => isGuidedEligible(probe.targetKinkId));
  const probeByTarget = new Map(pendingProbes.map((probe) => [probe.targetKinkId, probe]));

  const scopeIds = intent.kind === "deepDive"
    ? KINKS.map((kink) => kink.id)
    : intent.kind === "discover"
      ? KINKS.filter((kink) => isGuidedEligible(kink.id)).map((kink) => kink.id)
      : intent.kind === "category"
        ? KINKS
            .filter((kink) => kink.category === intent.category && isGuidedEligible(kink.id))
            .map((kink) => kink.id)
        : coveragePlan.anchorIds;
  const scopeAnswered = scopeIds.filter((kinkId) => explicitlyAnswered(profile, kinkId)).length;
  const scope: QuestionnaireScopeProgress = {
    answered: intent.kind === "dynamic" ? coverage.answered : scopeAnswered,
    total: intent.kind === "dynamic" ? coverage.total : scopeIds.length,
  };

  const eligibleIds = new Set<string>();
  if (intent.kind === "deepDive" || intent.kind === "discover" || intent.kind === "category") {
    for (const kinkId of scopeIds) {
      if (!explicitlyAnswered(profile, kinkId)) eligibleIds.add(kinkId);
    }
  } else {
    for (const kinkId of coveragePlan.anchorIds) {
      if (!explicitlyAnswered(profile, kinkId)) eligibleIds.add(kinkId);
    }
    for (const probe of pendingProbes) eligibleIds.add(probe.targetKinkId);
  }

  const items = KINKS
    .filter((kink) => eligibleIds.has(kink.id) && !explicitlyAnswered(profile, kink.id))
    .map((kink): QuestionnaireQueueItem => {
      const probe = probeByTarget.get(kink.id);
      const lane = coreIds.has(kink.id)
        ? "core"
        : interestIds.has(kink.id)
          ? "interest"
          : probe
            ? "expansion"
            : intent.kind === "discover"
              ? "discovery"
              : intent.kind === "category"
                ? "category"
                : coverageIds.has(kink.id)
                  ? "coverage"
                  : "deepDive";
      return {
        kink,
        lane,
        isProbe: !!probe,
        coversAnchor: coverageIds.has(kink.id),
        reasons: probe?.reasons ?? [],
      };
    });
  const queue = rankQuestionnaireQueueItems(items, KINKS, profile.entries);
  const complete = intent.kind === "deepDive" || intent.kind === "discover" || intent.kind === "category"
    ? scope.answered === scope.total
    : coverage.complete && pendingProbes.length === 0;

  const visibleScopeIds = new Set(scopeIds);
  return {
    intent,
    queue,
    visibleKinks: intent.kind === "deepDive"
      ? [...KINKS]
      : intent.kind === "dynamic"
        ? runtimeVisibleKinks(profile, eligibleIds)
        : runtimeVisibleKinks(profile, visibleScopeIds),
    pendingProbes,
    coverage,
    scope,
    complete,
  };
}

/** Dynamic returns its factual working set; Deep Dive returns the catalog. */`,
);

// ---------------------------------------------------------------------------
// 7. Conversation state: same-concept complement first, else one source-linked
// canonical probe immediately, then a hard topic break. Legacy context remains
// as a compatibility adapter for existing callers/tests while the live deck
// uses the explicit phase contract.
// ---------------------------------------------------------------------------
replaceOnce(
  "lib/questionnaireEngine.ts",
  `import { directionalSiblingId } from "@/lib/directionality";`,
  `import { complementarySiblingId } from "@/lib/participation";`,
);
replaceRegexOnce(
  "lib/questionnaireEngine.ts",
  /export interface ConversationContext \{[\s\S]*?\n\}/,
  `export type ConversationPhase = "normal" | "preferContinuation" | "topicBreakRequired";

export interface ConversationContext {
  /** Nieuwe expliciete live-state; afwezig houdt de oude adaptersemantiek. */
  phase?: ConversationPhase;
  /** Een positieve probe krijgt ademruimte voor de volgende zich aandient. */
  requireNonProbe?: boolean;
  /** Legacy adapter: alleen een zelfstandig eligible sibling direct uitnodigen. */
  preferDirectionalSibling?: boolean;
  /** Bron voor sibling/follow-up en topic spacing. */
  lastKinkId?: string | null;
}`,
);
replaceOnce(
  "lib/questionnaireEngine.ts",
  `/**
 * De laatste kaartdanser bewaakt alleen het ritme: een probe of topical echo mag
 * even wachten, maar Conversation maakt nooit antwoorden of eligibility aan.
 */
export function selectConversationQuestion(`,
  `export function isConversationContinuation(
  item: QuestionnaireQueueItem | null | undefined,
  sourceKinkId: string | null | undefined,
): boolean {
  if (!item || !sourceKinkId) return false;
  if (complementarySiblingId(sourceKinkId) === item.kink.id) return true;
  return item.isProbe && item.reasons.some((reason) =>
    reason.sourceKinkId === sourceKinkId && reason.targetKinkId === item.kink.id,
  );
}

/**
 * De kaartdanser bewaakt alleen het gesprek. Hij maakt nooit eligibility of
 * antwoorden aan: een complement/probe moet al in de queue staan om direct te
 * mogen volgen.
 */
export function selectConversationQuestion(`,
);
replaceOnce(
  "lib/questionnaireEngine.ts",
  `  if (context.requireNonProbe) {`,
  `  if (context.phase) {
    if (context.phase === "topicBreakRequired" && context.lastKinkId) {
      const last = catalog.find((kink) => kink.id === context.lastKinkId);
      if (last) {
        const differentTopic = candidates.find((item) =>
          !isConversationContinuation(item, context.lastKinkId)
          && !sharesTopic(last, item.kink),
        );
        if (differentTopic) return differentTopic;
      }
      return candidates[0] ?? null;
    }

    if (context.phase === "preferContinuation" && context.lastKinkId) {
      const siblingId = complementarySiblingId(context.lastKinkId);
      const sibling = siblingId
        ? candidates.find((item) => item.kink.id === siblingId)
        : undefined;
      if (sibling) return sibling;

      const canonicalProbe = candidates.find((item) =>
        item.isProbe && item.reasons.some((reason) =>
          reason.sourceKinkId === context.lastKinkId
          && reason.targetKinkId === item.kink.id,
        ),
      );
      if (canonicalProbe) return canonicalProbe;
    }

    return candidates[0] ?? null;
  }

  if (context.requireNonProbe) {`,
);
replaceOnce(
  "lib/questionnaireEngine.ts",
  `      const siblingId = directionalSiblingId(context.lastKinkId);`,
  `      const siblingId = complementarySiblingId(context.lastKinkId);`,
);

// ---------------------------------------------------------------------------
// 8. Live deck adopts the explicit phase state machine.
// ---------------------------------------------------------------------------
replaceOnce(
  "components/TriageDeck.tsx",
  `  selectConversationQuestion,
  type QuestionnaireQueueItem,`,
  `  isConversationContinuation,
  selectConversationQuestion,
  type ConversationPhase,
  type QuestionnaireQueueItem,`,
);
replaceOnce(
  "components/TriageDeck.tsx",
  `  const [lastAnsweredId, setLastAnsweredId] = useState<string | null>(null);
  const [requireNonProbe, setRequireNonProbe] = useState(false);
  const [preferDirectionalSibling, setPreferDirectionalSibling] = useState(false);`,
  `  const [lastAnsweredId, setLastAnsweredId] = useState<string | null>(null);
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>("normal");`,
);
replaceOnce(
  "components/TriageDeck.tsx",
  `  const currentItem = selectConversationQuestion(queue, KINKS, {
    requireNonProbe,
    preferDirectionalSibling,
    lastKinkId: lastAnsweredId,
  });`,
  `  const currentItem = selectConversationQuestion(queue, KINKS, {
    phase: conversationPhase,
    lastKinkId: lastAnsweredId,
  });`,
);
replaceRegexOnce(
  "components/TriageDeck.tsx",
  /  function handleSelect\(kink: Kink, status: KinkStatus\) \{[\s\S]*?\n  \}\n\n  function toggleAgreement/,
  `  function handleSelect(kink: Kink, status: KinkStatus) {
    const answeredWasContinuation = isConversationContinuation(currentItem, lastAnsweredId);
    onStatusChange(kink.id, status);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (status == null) {
      setHolding(null);
      setConversationPhase("normal");
      return;
    }
    setLastAnsweredId(kink.id);
    setConversationPhase(answeredWasContinuation ? "topicBreakRequired" : "preferContinuation");
    setHolding(kink.id);
    holdTimer.current = setTimeout(() => setHolding(null), CARD_FEEDBACK_MS);
  }

  function toggleAgreement`,
);
replaceRegexOnce(
  "components/TriageDeck.tsx",
  /  function skip\(kink: Kink\) \{[\s\S]*?\n  \}/,
  `  function skip(kink: Kink) {
    setHolding(null);
    setLastAnsweredId(kink.id);
    setConversationPhase("normal");
    setSkipped((previous) => new Set(previous).add(kink.id));
  }`,
);

// ---------------------------------------------------------------------------
// 9. Progress reflects the active guided scope rather than pretending Discover
// must include Deep-Dive-only role opposites.
// ---------------------------------------------------------------------------
replaceRegexOnce(
  "components/profile/QuestionsScreen.tsx",
  /const CATALOG_IDS_BY_CATEGORY = new Map<[\s\S]*?\n\}\n\nexport default function QuestionsScreen/,
  `export default function QuestionsScreen`,
);
replaceRegexOnce(
  "components/profile/QuestionsScreen.tsx",
  /  const catalogRated = KINKS\.filter[\s\S]*?  const returnLabel = categoryReturnIntent\.kind === "discover"/,
  `  const catalogRated = KINKS.filter((kink) => currentProfile.entries[kink.id]?.status != null).length;
  const activeCategory = runtimeKind === "category" ? activeRuntime.intent.category : null;
  const scopedProgress = activeRuntime.scope;
  const progressPercent = runtimeKind === "dynamic"
    ? activeRuntime.coverage.percent
    : Math.round((scopedProgress.answered / Math.max(1, scopedProgress.total)) * 100);
  const progressLabel = activeCategory
    ? `${kinkCategoryLabel(activeCategory)} · ${scopedProgress.answered} / ${scopedProgress.total}`
    : runtimeKind === "discover" || runtimeKind === "deepDive"
      ? `${runtimeKind === "discover" ? "Discover" : "Deep Dive"} · ${scopedProgress.answered} / ${scopedProgress.total}`
      : `Dynamic · ${activeRuntime.coverage.answered} / ${activeRuntime.coverage.total}`;
  const discoverComplete = getQuestionnaireRuntime(currentProfile, { intent: { kind: "discover" } }).complete;
  const returnLabel = categoryReturnIntent.kind === "discover"`,
);
replaceOnce(
  "components/profile/QuestionsScreen.tsx",
  `                  disabled={catalogRated === KINKS.length}`,
  `                  disabled={discoverComplete}`,
);
replaceOnce(
  "components/profile/QuestionsScreen.tsx",
  `                  : `${catalogRated} van ${KINKS.length} onderwerpen zijn expliciet beoordeeld.`}`,
  `                  : `${activeRuntime.scope.answered} van ${activeRuntime.scope.total} onderwerpen in deze modus zijn expliciet beoordeeld.`}`,
);

// ---------------------------------------------------------------------------
// 10. Existing snapshots that intentionally pin semantic contracts.
// ---------------------------------------------------------------------------
replaceOnce(
  "__tests__/questionnaire.test.ts",
  `    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(5);`,
  `    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(6);`,
);
replaceOnce(
  "__tests__/questionnaire.test.ts",
  `      recording: "adult_content_creation",\n`,
  ``,
);
replaceRegexOnce(
  "__tests__/questionnaire.test.ts",
  /  it\("keeps Discover continuous instead of ending after a micro-wave", \(\) => \{[\s\S]*?\n  \}\);/,
  `  it("keeps Discover continuous inside its perspective-eligible scope", () => {
    const current = dynamicProfile();
    answerIds(current, buildQuestionnaireCoveragePlan([]).anchorIds);
    const exploring = getQuestionnaireRuntime(current, { intent: { kind: "discover" } });
    expect(exploring.complete).toBe(false);
    expect(exploring.queue.some((item) => item.lane === "discovery")).toBe(true);
    expect(exploring.scope.total).toBeLessThan(KINKS.length);
    expect(exploring.queue.length).toBe(exploring.scope.total - exploring.scope.answered);

    answerIds(current, exploring.queue.slice(0, 3).map((item) => item.kink.id));
    const continued = getQuestionnaireRuntime(current, { intent: { kind: "discover" } });
    expect(continued.complete).toBe(false);
    expect(continued.queue.length).toBe(exploring.queue.length - 3);

    answerIds(current, continued.queue.map((item) => item.kink.id));
    const completed = getQuestionnaireRuntime(current, { intent: { kind: "discover" } });
    expect(completed.complete).toBe(true);
    expect(completed.scope.answered).toBe(completed.scope.total);
    expect(Object.keys(current.entries).length).toBeLessThan(KINKS.length);
  });`,
);
replaceOnce(
  "__tests__/kinks.test.ts",
  `    expect(KINKS).toHaveLength(343);`,
  `    expect(KINKS).toHaveLength(344);`,
);

// ---------------------------------------------------------------------------
// 11. New invariants and end-to-end semantic policy tests.
// ---------------------------------------------------------------------------
write("__tests__/semanticFlowV3.test.ts", `import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  getQuestionnaireRuntime,
  searchAllKinks,
} from "@/lib/questionnaire";
import {
  ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS,
  isQuestionnaireKinkEligibleForPerspective,
} from "@/lib/questionnaireEligibility";
import {
  complementaryCompareLabel,
  complementaryPartnerKinkId,
  complementarySiblingId,
} from "@/lib/participation";
import {
  isConversationContinuation,
  selectConversationQuestion,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import {
  QUESTIONNAIRE_CANONICAL_MAPPING_VERSION,
  QUESTIONNAIRE_CANONICAL_PROBE_TARGETS,
  questionnaireRelatedIds,
} from "@/lib/questionnaireMetadata";
import { directionalPairForKinkId } from "@/lib/directionality";
import { profileMatchScore } from "@/lib/matching";
import type { KinkEntry, Profile, ProfilePerspective } from "@/types";

function ownProfile(perspective: ProfilePerspective, mode: "dynamic" | "deepDive" = "dynamic"): Profile {
  return {
    id: `semantic-${perspective}-${mode}`,
    name: "Semantic",
    role: perspective === "dominant" ? "Dominant" : "Submissive",
    perspective,
    questionnaireSetup: { mode, interests: [], version: 2 },
    experienceLevel: mode === "deepDive" ? "diepgaand" : "gevorderd",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: {},
    origin: "own",
  };
}

function queueItem(id: string, options: Partial<QuestionnaireQueueItem> = {}): QuestionnaireQueueItem {
  const kink = KINKS.find((candidate) => candidate.id === id);
  if (!kink) throw new Error(`Kink ontbreekt: ${id}`);
  return {
    kink,
    lane: "coverage",
    isProbe: false,
    coversAnchor: false,
    reasons: [],
    ...options,
  };
}

function entry(status: NonNullable<KinkEntry["status"]>): KinkEntry {
  return { status, comment: "" };
}

describe("questionnaire semantic flow v3", () => {
  it("keeps hard role policy explicit and separate from broad directionality", () => {
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).toHaveLength(31);
    expect(new Set(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).size).toBe(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS.length);
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).toContain("whipping");
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).not.toContain("blindfold");
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).not.toContain("hood");
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).not.toContain("sound_deprivation");
    expect(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS).not.toContain("pegging");

    for (const conceptId of ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS) {
      const pair = KINKS
        .map((kink) => directionalPairForKinkId(kink.id))
        .find((candidate) => candidate?.conceptId === conceptId);
      expect(pair, conceptId).toBeDefined();
    }
  });

  it("admits only the aligned side of every role-bound pair outside Deep Dive", () => {
    for (const conceptId of ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS) {
      const pair = KINKS
        .map((kink) => directionalPairForKinkId(kink.id))
        .find((candidate) => candidate?.conceptId === conceptId)!;
      expect(isQuestionnaireKinkEligibleForPerspective(pair.giveId, "dominant"), conceptId).toBe(true);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.receiveId, "dominant"), conceptId).toBe(false);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.giveId, "submissive"), conceptId).toBe(false);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.receiveId, "submissive"), conceptId).toBe(true);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.giveId, "submissive", true), conceptId).toBe(true);
      expect(isQuestionnaireKinkEligibleForPerspective(pair.receiveId, "dominant", true), conceptId).toBe(true);
    }

    expect(isQuestionnaireKinkEligibleForPerspective("pegging_give", "submissive")).toBe(true);
    expect(isQuestionnaireKinkEligibleForPerspective("pegging_receive", "dominant")).toBe(true);
    expect(isQuestionnaireKinkEligibleForPerspective("blindfold_receive", "dominant")).toBe(true);
  });

  it("uses the same role gate in Discover and category while Deep Dive stays exhaustive", () => {
    const dominant = ownProfile("dominant");
    const discover = getQuestionnaireRuntime(dominant, { intent: { kind: "discover" } });
    const discoverIds = new Set(discover.queue.map((item) => item.kink.id));
    expect(discoverIds.has("whipping_give")).toBe(true);
    expect(discoverIds.has("whipping_receive")).toBe(false);
    expect(discoverIds.has("pegging_give")).toBe(true);
    expect(discoverIds.has("pegging_receive")).toBe(true);

    const impact = getQuestionnaireRuntime(dominant, { intent: { kind: "category", category: "impact" } });
    const impactIds = new Set(impact.queue.map((item) => item.kink.id));
    expect(impactIds.has("whipping_give")).toBe(true);
    expect(impactIds.has("whipping_receive")).toBe(false);

    const deep = getQuestionnaireRuntime(ownProfile("dominant", "deepDive"));
    const deepIds = new Set(deep.queue.map((item) => item.kink.id));
    expect(deepIds.has("whipping_give")).toBe(true);
    expect(deepIds.has("whipping_receive")).toBe(true);
    expect(deep.queue).toHaveLength(KINKS.length);
  });

  it("never hides an explicitly stored opposite-side answer", () => {
    const dominant = ownProfile("dominant");
    dominant.entries.whipping_receive = entry("yes");
    const discover = getQuestionnaireRuntime(dominant, { intent: { kind: "discover" } });
    expect(discover.queue.some((item) => item.kink.id === "whipping_receive")).toBe(false);
    expect(discover.visibleKinks.some((kink) => kink.id === "whipping_receive")).toBe(true);
    expect(dominant.entries.whipping_receive.status).toBe("yes");
  });

  it("keeps manual search explicit even when guided flow hides a role-opposite", () => {
    expect(searchAllKinks("Whipping").map((kink) => kink.id)).toContain("whipping_receive");
  });

  it("prefers a same-concept complement, then one canonical source probe, then a topic break", () => {
    const siblingQueue = [
      queueItem("pegging_receive"),
      queueItem("anal_sex_give", {
        lane: "expansion",
        isProbe: true,
        reasons: [{
          sourceKinkId: "pegging_give",
          targetKinkId: "anal_sex_give",
          relationType: "followUp",
          status: "yes",
        }],
      }),
    ];
    const sibling = selectConversationQuestion(siblingQueue, KINKS, {
      phase: "preferContinuation",
      lastKinkId: "pegging_give",
    });
    expect(sibling?.kink.id).toBe("pegging_receive");
    expect(isConversationContinuation(sibling, "pegging_give")).toBe(true);

    const probe = queueItem("leather_cuffs_give", {
      lane: "expansion",
      isProbe: true,
      reasons: [{
        sourceKinkId: "handcuffs_give",
        targetKinkId: "leather_cuffs_give",
        relationType: "followUp",
        status: "yes",
      }],
    });
    expect(selectConversationQuestion([queueItem("doctor_patient"), probe], KINKS, {
      phase: "preferContinuation",
      lastKinkId: "handcuffs_give",
    })?.kink.id).toBe("leather_cuffs_give");

    expect(selectConversationQuestion([probe, queueItem("doctor_patient")], KINKS, {
      phase: "topicBreakRequired",
      lastKinkId: "handcuffs_give",
    })?.kink.id).toBe("doctor_patient");
  });

  it("models diaper wearing as self/partner participation without calling it give/receive", () => {
    expect(complementarySiblingId("luiers_dragen")).toBe("diaper_partner_wearing");
    expect(complementarySiblingId("diaper_partner_wearing")).toBe("luiers_dragen");
    expect(complementaryPartnerKinkId("luiers_dragen")).toBe("diaper_partner_wearing");
    expect(complementaryCompareLabel("luiers_dragen", "Diaper wearing")).toContain("Zelf dragen");
    expect(complementaryCompareLabel("diaper_partner_wearing", "Partner wearing diapers")).toContain("Partner draagt");
    expect(KINKS.some((kink) => kink.id === "diaper_partner_wearing")).toBe(true);
    expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS.diaper_partner_wearing).toBeUndefined();
  });

  it("matches diaper self-wearing only against a partner's explicit partner-facing preference", () => {
    const a = ownProfile("submissive");
    const b = ownProfile("dominant");
    a.entries.luiers_dragen = entry("yes");
    b.entries.diaper_partner_wearing = entry("yes");
    const complementary = profileMatchScore(a, b);
    expect(complementary.counts.perfect).toBeGreaterThan(0);

    const wrongDirection = ownProfile("dominant");
    wrongDirection.entries.luiers_dragen = entry("yes");
    expect(profileMatchScore(a, wrongDirection).counts.perfect).toBe(0);
  });

  it("keeps private recording related but removes it as a canonical immediate publication step", () => {
    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(6);
    expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS.recording).toBeUndefined();
    expect(questionnaireRelatedIds("recording")).toContain("adult_content_creation");
  });
});
`);

// ---------------------------------------------------------------------------
// 12. Documentation: update the contract so future work cannot silently restore
// the old Discover/category loophole or delayed-follow-up rule.
// ---------------------------------------------------------------------------
replaceRegexOnce(
  "directie.md",
  /Voor \*\*sterk rol-geassocieerde\*\* pair[\s\S]*?Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn\./,
  `Voor **expliciet role-bound** directionele concepten geldt een aparte questionnaire-policy. Buiten Deep Dive blijft de guided flow aan de perspective-aligned kant: Dominant krijgt de give-kant, Submissive de receive-kant. De tegenovergestelde kant wordt niet als negatief ingevuld en wordt niet verwijderd; ze is alleen Deep-Dive-eligible binnen de guided questionnaire. Een Switch krijgt de aligned kant vanzelf in elk van zijn twee onafhankelijke perspectives. Handmatige catalogussearch blijft wel volledig expliciet toegankelijk.

Role-bound is eigen metadata en mag nooit stilzwijgend uit questionnaireAffinity worden afgeleid. De eerste audited set omvat high-confidence impact, fysieke restraints, gags, suspension en confinement. Blindfold, hood en sound deprivation behouden voorlopig alleen hun compacte affinity en worden niet hard role-bound gemaakt.

Voor **role-neutrale** directionele concepten (zoals Pegging, fisting, rimming, worship en massage) filtert perspective geen kant weg. Als beide kanten onafhankelijk eligible zijn, kunnen beide expliciet gevraagd worden. Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn.`,
);
replaceRegexOnce(
  "directie.md",
  /### Directionele siblings horen direct bij elkaar[\s\S]*?### Geen automatische koppeling/,
  `### Eén lokale continuation, daarna ademruimte

Conversation gebruikt voortaan het mentale momentum van de gebruiker zonder een topic-tunnel te bouwen:

1. als een independently eligible sibling/complement bestaat, komt die direct eerst;
2. anders mag na \`Heel graag\` of \`Ja\` maximaal één canonical follow-up van exact die bron direct volgen;
3. na zo'n sibling of directe follow-up is een topic break verplicht wanneer een ander geldig onderwerp beschikbaar is;
4. verdere positieve verdieping blijft pending en kan later terugkomen.

Een directionele sibling is geen inhoudelijke voorspelling maar de tweede expliciete as van hetzelfde concept. Diaper wearing bewijst dat een complement ook een andere participatie-as kan hebben: \`zelf dragen ↔ partner draagt\`, zonder die posities artificieel \`Geven/Ontvangen\` te noemen.

\`related\` beïnvloedt uitsluitend ranking en opent nooit eligibility. Alleen de versioned canonical source→target-edge mag een nieuwe probe openen.

### Geen automatische koppeling`,
);

// Temporary transformer removes itself and its single-trigger workflow from the
// resulting product commit. The PR diff therefore contains only product/tests/docs.
fs.rmSync("scripts/apply-questionnaire-semantic-flow-v3.mjs");
fs.rmSync(".github/workflows/semantic-flow-v3-transform.yml");

console.log("semantic-flow v3 transform applied");
