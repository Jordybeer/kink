import { describe, expect, it } from "vitest";
import { directionalPairForKinkId } from "@/lib/directionality";
import { CATEGORIES, KINKS } from "@/lib/kinks";
import {
  buildQuestionnaireCoveragePlan,
  getAdaptiveQuestionQueue,
  getQuestionnaireKinks,
  getQuestionnaireRuntime,
  questionnaireCount,
  questionnaireCoverage,
  searchAllKinks,
} from "@/lib/questionnaire";
import {
  derivePendingExpansionProbes,
  rankQuestionnaireCandidates,
  rankQuestionnaireQueueItems,
  selectConversationQuestion,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import {
  buildQuestionnaireFirstRoundPlan,
  getDynamicFirstRound,
} from "@/lib/questionnaireFirstRound";
import {
  QUESTIONNAIRE_CANONICAL_MAPPING_VERSION,
  QUESTIONNAIRE_CANONICAL_PROBE_TARGETS,
  QUESTIONNAIRE_CATEGORY_ANCHOR_IDS,
  QUESTIONNAIRE_CATEGORY_CLUSTERS,
  QUESTIONNAIRE_COVERAGE_ANCHOR_IDS,
  QUESTIONNAIRE_CORE_ANCHOR_IDS,
  QUESTIONNAIRE_FOLLOW_UPS,
  QUESTIONNAIRE_INTEREST_ANCHOR_IDS,
  QUESTIONNAIRE_RELATED_PAIRS,
  QUESTIONNAIRE_TOPIC_IDS,
  questionnairePrimaryCluster,
  questionnaireTopicsFor,
} from "@/lib/questionnaireMetadata";
import type {
  Kink,
  KinkStatus,
  Profile,
  QuestionnaireInterest,
  QuestionnaireSetup,
} from "@/types";

const CATALOG_V2_RELEASE_A_IDS = [
  "remote_toy", "nude_photography", "adult_content_creation", "mutual_masturbation",
  "partner_masturbation_watch", "thigh_focus", "muscle_focus", "pregnancy_attraction",
  "smeared_makeup", "crying_tears", "vampire_fangs", "erotic_massage_give", "erotic_massage_receive", "vibration_play",
  "sound_deprivation_give", "wetlook", "prostate_massage_give", "prostate_massage_receive", "sex_machine", "drool_play",
  "being_heard", "play_party", "next_day_check_in", "aftercare_cleanup", "dollification",
  "pet_training_give", "pet_training_receive", "pet_grooming_give", "pet_grooming_receive",
  "diaper_wetting", "diaper_messing", "diaper_changing_give", "diaper_changing_receive",
  "breeding_fantasy", "creampie",
] as const;

function profile(setup: QuestionnaireSetup): Profile {
  return {
    id: "questionnaire-test",
    name: "Nova",
    role: "Dominant",
    perspective: "dominant",
    experienceLevel: setup.mode === "deepDive" ? "diepgaand" : "gevorderd",
    questionnaireSetup: setup,
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: {},
    origin: "own",
  };
}

function dynamicProfile(interests: QuestionnaireInterest[] = []): Profile {
  return profile({ mode: "dynamic", interests, version: 2 });
}

function catalogSlice(...ids: string[]): Kink[] {
  return ids.map((id) => {
    const kink = KINKS.find((candidate) => candidate.id === id);
    if (!kink) throw new Error(`Test kink ontbreekt: ${id}`);
    return kink;
  });
}

function entriesWith(statuses: Record<string, NonNullable<KinkStatus>>) {
  return Object.fromEntries(
    Object.entries(statuses).map(([id, status]) => [id, { status, comment: "" }]),
  );
}

function answerIds(current: Profile, ids: readonly string[], status: NonNullable<KinkStatus> = "maybe") {
  for (const id of ids) current.entries[id] = { status, comment: "" };
}

function queueItem(id: string, isProbe = false): QuestionnaireQueueItem {
  const kink = catalogSlice(id)[0];
  return {
    kink,
    lane: isProbe ? "expansion" : "coverage",
    isProbe,
    coversAnchor: false,
    reasons: [],
  };
}

describe("adaptive questionnaire", () => {
  it("uses one Dynamic/Deep Dive runtime and defaults missing pre-launch setup to Dynamic", () => {
    expect(questionnaireCount({ mode: "dynamic", interests: [], version: 2 })).toBe(48);
    expect(questionnaireCount({ mode: "deepDive", interests: [], version: 2 })).toBe(KINKS.length);

    const withoutSetup: Profile = {
      id: "prelaunch",
      name: "Prelaunch",
      role: "Switch",
      experienceLevel: "beginner",
      customKinks: [],
      createdAt: 1,
      updatedAt: 1,
      entries: {},
    };
    const runtime = getQuestionnaireRuntime(withoutSetup);
    expect(runtime.intent).toEqual({ kind: "dynamic" });
    expect(runtime.coverage?.total).toBe(48);
  });

  it("keeps compact role-affinity coverage the same size for both perspectives", () => {
    const dominant = buildQuestionnaireCoveragePlan([], "dominant");
    const submissive = buildQuestionnaireCoveragePlan([], "submissive");
    expect(dominant.anchorIds).toHaveLength(48);
    expect(submissive.anchorIds).toHaveLength(48);
    expect(dominant.anchorIds).toContain("handcuffs_give");
    expect(dominant.anchorIds).not.toContain("handcuffs_receive");
    expect(submissive.anchorIds).toContain("handcuffs_receive");
    expect(submissive.anchorIds).not.toContain("handcuffs_give");
    expect(dominant.anchorIds).toContain("pegging_give");
    expect(dominant.anchorIds).toContain("pegging_receive");
    expect(submissive.anchorIds).toContain("pegging_give");
    expect(submissive.anchorIds).toContain("pegging_receive");
  });

  it("keeps the Dynamic first round compact, explicit and role-neutral for sexual acts", () => {
    const dominantPlan = buildQuestionnaireFirstRoundPlan([], "dominant");
    const submissivePlan = buildQuestionnaireFirstRoundPlan([], "submissive");
    expect(dominantPlan.anchorIds).toHaveLength(9);
    expect(submissivePlan.anchorIds).toHaveLength(9);
    expect(dominantPlan.anchorIds).toContain("spanking_hand_give");
    expect(submissivePlan.anchorIds).toContain("spanking_hand_receive");
    for (const plan of [dominantPlan, submissivePlan]) {
      expect(plan.anchorIds).toContain("oral_sex_give");
      expect(plan.anchorIds).toContain("oral_sex_receive");
      expect(new Set(plan.anchorIds).size).toBe(plan.anchorIds.length);
    }

    const current = dynamicProfile();
    current.entries.public_play = { status: "yes", comment: "historisch antwoord" };
    const firstRound = getDynamicFirstRound(current, getQuestionnaireRuntime(current));
    expect(firstRound.coverage).toMatchObject({ answered: 0, total: 9, percent: 0, complete: false });
    expect(firstRound.queue).toHaveLength(9);
    expect(firstRound.queue.some((item) => item.kink.id === "public_play")).toBe(false);

    answerIds(current, firstRound.plan.anchorIds, "no");
    const complete = getDynamicFirstRound(current, getQuestionnaireRuntime(current));
    expect(complete.coverage).toMatchObject({ answered: 9, total: 9, percent: 100, complete: true });
    expect(complete.complete).toBe(true);
  });

  it("never hides an existing answer outside the Dynamic plan", () => {
    const lastKink = KINKS[KINKS.length - 1];
    const current = dynamicProfile();
    expect(getQuestionnaireKinks(current).some((kink) => kink.id === lastKink.id)).toBe(false);
    current.entries[lastKink.id] = { status: "yes", comment: "bewaar mij" };
    expect(getQuestionnaireKinks(current).some((kink) => kink.id === lastKink.id)).toBe(true);
    expect(current.entries[lastKink.id].comment).toBe("bewaar mij");
  });

  it("keeps every metadata reference on a real catalog kink", () => {
    const ids = new Set(KINKS.map((kink) => kink.id));
    const referenced = [
      ...QUESTIONNAIRE_COVERAGE_ANCHOR_IDS,
      ...QUESTIONNAIRE_CORE_ANCHOR_IDS,
      ...Object.values(QUESTIONNAIRE_INTEREST_ANCHOR_IDS).flat(),
      ...Object.values(QUESTIONNAIRE_TOPIC_IDS).flat(),
      ...QUESTIONNAIRE_RELATED_PAIRS.flat(),
      ...Object.entries(QUESTIONNAIRE_FOLLOW_UPS).flatMap(([source, targets]) => [source, ...targets]),
      ...Object.entries(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS).flat(),
    ];
    expect(referenced.filter((id) => !ids.has(id))).toEqual([]);
    expect([...new Set(KINKS.map((kink) => kink.category))]
      .filter((category) => !QUESTIONNAIRE_CATEGORY_CLUSTERS[category])).toEqual([]);
    expect(QUESTIONNAIRE_CORE_ANCHOR_IDS.every((id) =>
      QUESTIONNAIRE_COVERAGE_ANCHOR_IDS.includes(
        id as (typeof QUESTIONNAIRE_COVERAGE_ANCHOR_IDS)[number],
      ))).toBe(true);
  });

  it("keeps sparse relation declarations unique and free of self-edges", () => {
    const normalizedRelated = QUESTIONNAIRE_RELATED_PAIRS.map(([left, right]) =>
      [left, right].sort().join("->"));
    expect(new Set(normalizedRelated).size).toBe(normalizedRelated.length);
    expect(QUESTIONNAIRE_RELATED_PAIRS.filter(([left, right]) => left === right)).toEqual([]);

    for (const [source, targets] of Object.entries(QUESTIONNAIRE_FOLLOW_UPS)) {
      expect(new Set(targets).size, source).toBe(targets.length);
      expect(targets, source).not.toContain(source);
    }
  });

  it("keeps new expansion sparse and explicit instead of falling back from catalog membership", () => {
    const releaseIds = new Set<string>(CATALOG_V2_RELEASE_A_IDS);
    const releaseSources = Object.fromEntries(
      Object.entries(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS)
        .filter(([source]) => releaseIds.has(source)),
    );
    expect(releaseSources).toEqual({
      remote_toy: "remote_toy_publiek",
      nude_photography: "recording",
      partner_masturbation_watch: "mutual_masturbation",
      breeding_fantasy: "creampie",
    });

    for (const id of [
      "thigh_focus", "muscle_focus", "pregnancy_attraction", "smeared_makeup",
      "crying_tears", "vampire_fangs", "erotic_massage_give", "erotic_massage_receive", "vibration_play",
      "wetlook", "prostate_massage_give", "prostate_massage_receive", "sex_machine", "drool_play", "being_heard",
      "play_party", "next_day_check_in", "aftercare_cleanup", "dollification",
      "pet_training_give", "pet_training_receive", "pet_grooming_give", "pet_grooming_receive",
      "diaper_changing_give", "diaper_changing_receive", "creampie",
    ]) {
      expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[id], id).toBeUndefined();
    }
  });

  it("covers every catalog broad cluster in the fixed Dynamic plan", () => {
    const planClusters = new Set(
      buildQuestionnaireCoveragePlan([]).anchorIds
        .map((id) => questionnairePrimaryCluster(catalogSlice(id)[0])),
    );
    const catalogClusters = new Set(KINKS.map(questionnairePrimaryCluster));
    expect([...planClusters].sort()).toEqual([...catalogClusters].sort());
  });

  it("pins a transparent 48-question base plan across every user-facing category", () => {
    const catalogById = new Map(KINKS.map((kink) => [kink.id, kink]));
    const configuredCategories = Object.entries(QUESTIONNAIRE_CATEGORY_ANCHOR_IDS)
      .filter(([, anchors]) => anchors.length > 0)
      .map(([category]) => category)
      .sort();
    expect(configuredCategories).toEqual([...CATEGORIES].sort());
    expect(QUESTIONNAIRE_CATEGORY_ANCHOR_IDS.materials_scent).toEqual([]);

    for (const category of CATEGORIES) {
      const anchors = QUESTIONNAIRE_CATEGORY_ANCHOR_IDS[category];
      expect(anchors.length, category).toBeGreaterThan(0);
      expect(anchors.every((id) => catalogById.get(id)?.category === category), category).toBe(true);
    }

    const flattened = Object.values(QUESTIONNAIRE_CATEGORY_ANCHOR_IDS).flat();
    expect(QUESTIONNAIRE_COVERAGE_ANCHOR_IDS).toEqual(flattened);
    expect(new Set(flattened).size).toBe(flattened.length);
    expect(buildQuestionnaireCoveragePlan([]).anchorIds).toHaveLength(48);
  });

  it("pins canonical probes to real directional edges — changing this snapshot is a migration", () => {
    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(6);
    expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS).toEqual({
      spanking_hand_give: "spanking_implement_give",
      spanking_hand_receive: "spanking_implement_receive",
      rope_bondage_give: "shibari_give",
      rope_bondage_receive: "shibari_receive",
      handcuffs_give: "leather_cuffs_give",
      handcuffs_receive: "leather_cuffs_receive",
      rules_protocols: "rituelen_protocols",
      ochtend_avondritueel: "rituelen_protocols",
      orgasm_control: "orgasm_denial",
      exhibitionism: "being_watched",
      voyeurism: "watching_others",
      watersports_ontvangen: "urine_intiem",
      geur_scent_fetish: "panty_sniffing",
      petplay_puppy: "petplay_harnas",
      blindfold_give: "sound_deprivation_give",
      blindfold_receive: "sound_deprivation_receive",
      being_watched: "public_play",
      remote_toy: "remote_toy_publiek",
      nude_photography: "recording",
      partner_masturbation_watch: "mutual_masturbation",
      anal_fingering_give: "anal_sex_give",
      anal_fingering_receive: "anal_sex_receive",
      luiers_dragen: "diaper_wetting",
      breeding_fantasy: "creampie",
    });
    for (const [source, target] of Object.entries(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS)) {
      expect(QUESTIONNAIRE_FOLLOW_UPS[source]).toContain(target);
    }
  });

  it("builds a fixed Dynamic denominator that positive answers cannot move", () => {
    const current = dynamicProfile(["impact", "humiliation"]);
    const plan = buildQuestionnaireCoveragePlan(current.questionnaireSetup!.interests);
    const before = questionnaireCoverage(current, plan);
    current.entries.spanking_hand_give = { status: "yes", comment: "" };
    current.entries.humiliation_verbal = { status: "yes", comment: "" };
    const after = questionnaireCoverage(current, plan);
    expect(after.total).toBe(before.total);
    expect(after.answered).toBe(before.answered + 2);
  });

  it("counts every explicit status as coverage while a skip/null does not", () => {
    const plan = buildQuestionnaireCoveragePlan([]);
    const anchor = plan.anchorIds[0];
    for (const status of ["yes", "willing", "maybe", "no", "hard_no"] as const) {
      const current = dynamicProfile();
      current.entries[anchor] = { status, comment: "" };
      expect(questionnaireCoverage(current, plan).answered).toBe(1);
    }
    const skipped = dynamicProfile();
    skipped.entries[anchor] = { status: null, comment: "later" };
    expect(questionnaireCoverage(skipped, plan).answered).toBe(0);
  });

  it("never mutates, invents, or loses a profile entry while ranking", () => {
    const current = dynamicProfile();
    current.entries.handcuffs_give = { status: "yes", comment: "bewaar mij" };
    const before = structuredClone(current.entries);
    getQuestionnaireRuntime(current);
    getAdaptiveQuestionQueue(current);
    expect(current.entries).toEqual(before);
    expect(Object.keys(current.entries)).toEqual(["handcuffs_give"]);
  });

  it("opens exactly the pinned adjacent probe after an explicit positive answer", () => {
    const current = dynamicProfile();
    current.entries.handcuffs_give = { status: "yes", comment: "" };
    const runtime = getQuestionnaireRuntime(current);
    const probe = runtime.queue.find((item) => item.kink.id === "leather_cuffs_give");
    expect(probe?.isProbe).toBe(true);
    expect(probe?.reasons).toEqual([
      { sourceKinkId: "handcuffs_give", targetKinkId: "leather_cuffs_give", relationType: "followUp", status: "yes" },
    ]);
  });

  it("lets yes outrank willing when two explicit edges nominate different candidates", () => {
    const catalog = catalogSlice("voyeurism", "watching_others", "exhibitionism", "being_watched");
    const yesVoyeur = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ voyeurism: "yes", exhibitionism: "willing" }),
    ).map((kink) => kink.id);
    const yesExhibition = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ voyeurism: "willing", exhibitionism: "yes" }),
    ).map((kink) => kink.id);
    expect(yesVoyeur.indexOf("watching_others")).toBeLessThan(yesVoyeur.indexOf("being_watched"));
    expect(yesExhibition.indexOf("being_watched")).toBeLessThan(yesExhibition.indexOf("watching_others"));
  });

  it("treats Voor hen and Misschien identically for propagation", () => {
    const catalog = catalogSlice("handcuffs_give", "leather_cuffs_give", "doctor_patient");
    const voorHen = rankQuestionnaireCandidates(catalog, entriesWith({ handcuffs_give: "no" })).map((kink) => kink.id);
    const maybe = rankQuestionnaireCandidates(catalog, entriesWith({ handcuffs_give: "maybe" })).map((kink) => kink.id);
    expect(voorHen).toEqual(maybe);
    expect(derivePendingExpansionProbes(catalog, entriesWith({ handcuffs_give: "no" }))).toEqual([]);
  });

  it("keeps one hard_no neutral even on an explicit directional continuation", () => {
    const [source, target, unrelated] = catalogSlice("handcuffs_give", "leather_cuffs_give", "doctor_patient");
    const catalog = [
      { ...source, level: 1 as const },
      { ...target, level: 1 as const },
      { ...unrelated, level: 1 as const },
    ];
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ handcuffs_give: "maybe" }))
      .map((kink) => kink.id);
    const hard = rankQuestionnaireCandidates(catalog, entriesWith({ handcuffs_give: "hard_no" }))
      .map((kink) => kink.id);
    expect(hard).toEqual(neutral);
    const queueItems: QuestionnaireQueueItem[] = [
      { ...queueItem(target.id), kink: target },
      { ...queueItem(unrelated.id), kink: unrelated },
    ];
    const neutralQueue = rankQuestionnaireQueueItems(
      queueItems,
      catalog,
      entriesWith({ handcuffs_give: "maybe" }),
    ).map((item) => item.kink.id);
    const hardQueue = rankQuestionnaireQueueItems(
      queueItems,
      catalog,
      entriesWith({ handcuffs_give: "hard_no" }),
    ).map((item) => item.kink.id);
    expect(hardQueue).toEqual(neutralQueue);
    expect(derivePendingExpansionProbes(catalog, entriesWith({ handcuffs_give: "hard_no" }))).toEqual([]);
  });

  it("accumulates repeated hard limits only on their shared explicit deeper target", () => {
    const [firstSource, secondSource, target, unrelated] = catalogSlice(
      "rules_protocols",
      "ochtend_avondritueel",
      "rituelen_protocols",
      "doctor_patient",
    );
    const catalog = [
      { ...firstSource, level: 1 as const },
      { ...secondSource, level: 1 as const },
      { ...target, level: 1 as const },
      { ...unrelated, level: 1 as const },
    ];
    const ranked = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ rules_protocols: "hard_no", ochtend_avondritueel: "hard_no" }),
    ).map((kink) => kink.id);
    expect(ranked.indexOf("rituelen_protocols")).toBeGreaterThan(ranked.indexOf("doctor_patient"));
    const queueRanked = rankQuestionnaireQueueItems(
      [
        { ...queueItem(target.id), kink: target },
        { ...queueItem(unrelated.id), kink: unrelated },
      ],
      catalog,
      entriesWith({ rules_protocols: "hard_no", ochtend_avondritueel: "hard_no" }),
    ).map((item) => item.kink.id);
    expect(queueRanked.indexOf("rituelen_protocols"))
      .toBeGreaterThan(queueRanked.indexOf("doctor_patient"));
  });

  it("never infers receiving Golden Shower from explicitly liking giving it", () => {
    const current = dynamicProfile();
    current.entries.watersports_geven = { status: "yes", comment: "geven is expliciet" };
    current.entries.urine_intiem = { status: "hard_no", comment: "absoluut niet" };
    const runtime = getQuestionnaireRuntime(current);
    expect(runtime.pendingProbes.map((probe) => probe.targetKinkId)).not.toContain("watersports_ontvangen");
    expect(current.entries.watersports_ontvangen).toBeUndefined();
    expect(current.entries.urine_intiem.status).toBe("hard_no");
  });

  it("opens ingestion only from an explicit positive receiving answer, never in reverse", () => {
    const receiving = dynamicProfile();
    receiving.entries.watersports_ontvangen = { status: "yes", comment: "expliciet" };
    expect(getQuestionnaireRuntime(receiving).pendingProbes).toEqual([
      {
        targetKinkId: "urine_intiem",
        reasons: [{
          sourceKinkId: "watersports_ontvangen",
          targetKinkId: "urine_intiem",
          relationType: "followUp",
          status: "yes",
        }],
      },
    ]);

    const ingestionLimit = dynamicProfile();
    ingestionLimit.entries.urine_intiem = { status: "hard_no", comment: "grens" };
    expect(getQuestionnaireRuntime(ingestionLimit).pendingProbes).toEqual([]);
  });

  it("uses no same-topic fallback when metadata has no direct edge", () => {
    const catalog = catalogSlice("watersports_geven", "urine_intiem", "doctor_patient");
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ watersports_geven: "maybe" })).map((kink) => kink.id);
    const positive = rankQuestionnaireCandidates(catalog, entriesWith({ watersports_geven: "yes" })).map((kink) => kink.id);
    expect(positive).toEqual(neutral);
  });

  it("boosts voyeurism's real neighbor without dragging fluids or anal along", () => {
    const catalog = catalogSlice("voyeurism", "watching_others", "cum_play", "anal_fingering_give");
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ voyeurism: "maybe" })).map((kink) => kink.id);
    const positive = rankQuestionnaireCandidates(catalog, entriesWith({ voyeurism: "yes" })).map((kink) => kink.id);
    expect(positive.indexOf("watching_others")).toBeLessThan(neutral.indexOf("watching_others"));
    expect(positive.filter((id) => id === "cum_play" || id === "anal_fingering_give"))
      .toEqual(neutral.filter((id) => id === "cum_play" || id === "anal_fingering_give"));
  });

  it("keeps Little/Ageplay separate from unrelated Pet Play", () => {
    const [source, adjacent, petPlay, clothing] = catalogSlice(
      "little_speelgoed",
      "little_space",
      "petplay_puppy",
      "uniforms",
    );
    const catalog = [source, petPlay, clothing, adjacent]
      .map((kink) => ({ ...kink, level: 1 as const }));
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ little_speelgoed: "maybe" })).map((kink) => kink.id);
    const positive = rankQuestionnaireCandidates(catalog, entriesWith({ little_speelgoed: "yes" })).map((kink) => kink.id);
    expect(positive.indexOf("little_space")).toBeLessThan(neutral.indexOf("little_space"));
    expect(positive.indexOf("petplay_puppy") < positive.indexOf("uniforms"))
      .toBe(neutral.indexOf("petplay_puppy") < neutral.indexOf("uniforms"));
  });

  it("keeps diaper play separate from Little headspace and from watersports spacing", () => {
    const [little, diaper, goldenShower] = catalogSlice(
      "little_space",
      "diaper_wetting",
      "watersports_ontvangen",
    );
    expect(questionnaireTopicsFor(little)).toContain("little_ageplay");
    expect(questionnaireTopicsFor(little)).not.toContain("diaper_play");
    expect(questionnaireTopicsFor(diaper)).toContain("diaper_play");
    expect(questionnaireTopicsFor(diaper)).not.toContain("little_ageplay");
    expect(questionnaireTopicsFor(diaper)).not.toContain("watersports");
    expect(questionnaireTopicsFor(goldenShower)).toContain("watersports");
  });

  it("does not turn general foot focus into worship relevance", () => {
    const catalog = catalogSlice("feet", "hoge_hakken_aanbidding", "doctor_patient");
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ feet: "maybe" }))
      .map((kink) => kink.id);
    const positive = rankQuestionnaireCandidates(catalog, entriesWith({ feet: "yes" }))
      .map((kink) => kink.id);
    expect(positive).toEqual(neutral);
  });

  it("keeps suggestive visual combinations out of propagation metadata", () => {
    for (const [source, target] of [
      ["pregnancy_attraction", "breeding_fantasy"],
      ["smeared_makeup", "crying_tears"],
      ["vampire_fangs", "biting"],
    ] as const) {
      const catalog = catalogSlice(source, target, "doctor_patient");
      const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ [source]: "maybe" }))
        .map((kink) => kink.id);
      const positive = rankQuestionnaireCandidates(catalog, entriesWith({ [source]: "yes" }))
        .map((kink) => kink.id);
      expect(positive, `${source} -> ${target}`).toEqual(neutral);
      expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[source]).toBeUndefined();
    }
  });

  it("stops immediate media expansion at the private recording boundary", () => {
    const photography = dynamicProfile();
    photography.entries.nude_photography = { status: "yes", comment: "foto is expliciet" };
    expect(getQuestionnaireRuntime(photography).pendingProbes.map((probe) => probe.targetKinkId))
      .toEqual(["recording"]);

    photography.entries.recording = { status: "yes", comment: "privé-opname is expliciet" };
    expect(getQuestionnaireRuntime(photography).pendingProbes.map((probe) => probe.targetKinkId))
      .toEqual([]);
  });

  it("opens local toy, masturbation, anal and diaper follow-ups without cross-propagation", () => {
    const cases = [
      ["remote_toy", "remote_toy_publiek"],
      ["partner_masturbation_watch", "mutual_masturbation"],
      ["anal_fingering_give", "anal_sex_give"],
      ["anal_fingering_receive", "anal_sex_receive"],
      ["luiers_dragen", "diaper_wetting"],
      ["breeding_fantasy", "creampie"],
    ] as const;

    for (const [source, target] of cases) {
      const current = dynamicProfile();
      current.entries[source] = { status: "yes", comment: "expliciet" };
      const probes = getQuestionnaireRuntime(current).pendingProbes;
      expect(probes.map((probe) => probe.targetKinkId), source).toEqual([target]);
      expect(probes[0].reasons[0].sourceKinkId).toBe(source);
    }
  });

  it("raadt geen diaper-changing richting uit wetting of messing", () => {
    const current = dynamicProfile();
    current.entries.diaper_wetting = { status: "yes", comment: "" };
    current.entries.diaper_messing = { status: "willing", comment: "" };
    const targets = getQuestionnaireRuntime(current).pendingProbes.map((probe) => probe.targetKinkId);
    expect(targets).not.toContain("diaper_changing_give");
    expect(targets).not.toContain("diaper_changing_receive");
  });

  it("does not synthesize humiliation from Golden Shower + Trampling enthusiasm", () => {
    const catalog = catalogSlice("watersports_geven", "trampling_receive", "humiliation_verbal", "doctor_patient");
    const neutral = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ watersports_geven: "maybe", trampling_receive: "maybe" }),
    ).map((kink) => kink.id);
    const enthusiastic = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ watersports_geven: "yes", trampling_receive: "yes" }),
    ).map((kink) => kink.id);
    expect(enthusiastic).toEqual(neutral);
  });

  it("never falls through to a second follow-up after the canonical target was answered", () => {
    const catalog = catalogSlice("spanking_hand_give", "spanking_implement_give", "flogging_give");
    const entries = entriesWith({ spanking_hand_give: "yes", spanking_implement_give: "maybe" });
    expect(QUESTIONNAIRE_FOLLOW_UPS.spanking_hand_give).toEqual(["spanking_implement_give", "flogging_give"]);
    expect(derivePendingExpansionProbes(catalog, entries)).toEqual([]);
  });

  it("never falls through when a canonical target is unavailable in the active catalog", () => {
    const catalog = catalogSlice("spanking_hand_give", "flogging_give");
    expect(QUESTIONNAIRE_FOLLOW_UPS.spanking_hand_give).toEqual(["spanking_implement_give", "flogging_give"]);
    expect(derivePendingExpansionProbes(catalog, entriesWith({ spanking_hand_give: "yes" }))).toEqual([]);
  });

  it("consumes a source when its canonical target was already answered before the source", () => {
    const catalog = catalogSlice("handcuffs_give", "leather_cuffs_give");
    expect(derivePendingExpansionProbes(
      catalog,
      entriesWith({ leather_cuffs_give: "maybe", handcuffs_give: "yes" }),
    )).toEqual([]);
  });

  it("deduplicates one probe nominated by multiple positive sources and keeps provenance", () => {
    const catalog = catalogSlice("rules_protocols", "ochtend_avondritueel", "rituelen_protocols");
    const probes = derivePendingExpansionProbes(
      catalog,
      entriesWith({ rules_protocols: "yes", ochtend_avondritueel: "willing" }),
    );
    expect(probes).toHaveLength(1);
    expect(probes[0].targetKinkId).toBe("rituelen_protocols");
    expect(probes[0].reasons.map((reason) => reason.sourceKinkId).sort())
      .toEqual(["ochtend_avondritueel", "rules_protocols"]);
  });

  it("lets a probe satisfy coverage when the target is also an explicit interest anchor", () => {
    const current = dynamicProfile(["sexual_social"]);
    const before = questionnaireCoverage(current);
    current.entries.exhibitionism = { status: "yes", comment: "" };
    const runtime = getQuestionnaireRuntime(current);
    const probe = runtime.queue.find((item) => item.kink.id === "being_watched");
    expect(probe?.isProbe).toBe(true);
    expect(probe?.coversAnchor).toBe(true);
    current.entries.being_watched = { status: "maybe", comment: "" };
    expect(questionnaireCoverage(current).answered).toBe(before.answered + 2);
  });

  it("stops Dynamic only after the fixed coverage plan and every open probe are answered", () => {
    const current = dynamicProfile();
    const plan = buildQuestionnaireCoveragePlan([], current.perspective);
    answerIds(current, plan.anchorIds, "maybe");
    expect(getQuestionnaireRuntime(current).complete).toBe(true);

    current.entries.handcuffs_give = { status: "yes", comment: "" };
    expect(getQuestionnaireRuntime(current).complete).toBe(false);
    current.entries.leather_cuffs_give = { status: "maybe", comment: "" };
    expect(getQuestionnaireRuntime(current).complete).toBe(true);
  });

  it("keeps Discover continuous inside its perspective-eligible scope", () => {
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
  });

  it("keeps category exploration local without creating answers or consuming outside probes", () => {
    const current = dynamicProfile();
    current.entries.handcuffs_give = { status: "yes", comment: "expliciet" };
    const before = structuredClone(current.entries);
    const local = getQuestionnaireRuntime(current, {
      intent: { kind: "category", category: "fluids" },
    });

    expect(local.queue.length).toBeGreaterThan(0);
    expect(local.queue.every((item) => item.kink.category === "fluids")).toBe(true);
    expect(local.queue.some((item) => item.kink.id === "leather_cuffs_give")).toBe(false);
    expect(local.pendingProbes.map((probe) => probe.targetKinkId)).toContain("leather_cuffs_give");
    expect(current.entries).toEqual(before);

    const global = getQuestionnaireRuntime(current);
    expect(global.queue.some((item) => item.kink.id === "leather_cuffs_give")).toBe(true);
  });

  it("finishes category exploration only when that category is explicitly answered", () => {
    const current = dynamicProfile();
    const fluids = KINKS.filter((kink) => kink.category === "fluids").map((kink) => kink.id);
    const intent = { kind: "category", category: "fluids" } as const;
    answerIds(current, fluids.slice(0, -1));
    expect(getQuestionnaireRuntime(current, { intent }).complete).toBe(false);
    answerIds(current, fluids.slice(-1));
    expect(getQuestionnaireRuntime(current, { intent }).complete).toBe(true);
    expect(KINKS.some((kink) => current.entries[kink.id]?.status == null)).toBe(true);
  });

  it("keeps an explicit non-probe between probes when one is available", () => {
    const next = selectConversationQuestion(
      [queueItem("leather_cuffs_give", true), queueItem("doctor_patient")],
      KINKS,
      { requireNonProbe: true },
    );
    expect(next?.kink.id).toBe("doctor_patient");
  });

  it("avoids an immediate topical echo when another valid question exists", () => {
    const next = selectConversationQuestion(
      [queueItem("spanking_implement_give"), queueItem("doctor_patient")],
      KINKS,
      { lastKinkId: "spanking_hand_give" },
    );
    expect(next?.kink.id).toBe("doctor_patient");
  });

  it("lets Golden Shower breathe before its explicit watersports follow-up", () => {
    const next = selectConversationQuestion(
      [queueItem("watersports_ontvangen", true), queueItem("trampling_receive")],
      KINKS,
      { lastKinkId: "watersports_geven" },
    );
    expect(next?.kink.id).toBe("trampling_receive");
  });

  it("keeps interests/safety ahead of concentrated answer relevance without numeric weights", () => {
    const catalog = catalogSlice("voyeurism", "watching_others", "financial_domination", "scarification");
    const ranked = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ voyeurism: "yes" }),
      {
        preferredIds: new Set(["financial_domination"]),
        safetyIds: new Set(["scarification"]),
      },
    ).map((kink) => kink.id);
    expect(ranked.indexOf("financial_domination")).toBeLessThan(ranked.indexOf("watching_others"));
    expect(ranked.indexOf("scarification")).toBeLessThan(ranked.indexOf("watching_others"));
  });

  it("schedules the tiny core set before interests and expansion", () => {
    const current = dynamicProfile(["impact"]);
    current.entries.handcuffs_give = { status: "yes", comment: "" };
    const queue = getQuestionnaireRuntime(current).queue;
    const coreIndexes = queue
      .map((item, index) => item.lane === "core" ? index : -1)
      .filter((index) => index >= 0);
    const firstAdaptiveIndex = queue.findIndex((item) =>
      item.lane === "interest" || item.lane === "expansion");
    expect(coreIndexes).toHaveLength(QUESTIONNAIRE_CORE_ANCHOR_IDS.length);
    expect(Math.max(...coreIndexes)).toBeLessThan(firstAdaptiveIndex);
  });

  it("diversifies inside a lane without letting a lower lane jump the queue", () => {
    const items: QuestionnaireQueueItem[] = [
      { ...queueItem("aftercare_physical"), lane: "core" },
      { ...queueItem("aftercare_verbal"), lane: "core" },
      { ...queueItem("aftercare_food"), lane: "core" },
      { ...queueItem("handcuffs_give"), lane: "interest" },
    ];
    const ranked = rankQuestionnaireQueueItems(items, KINKS, {});
    expect(ranked.slice(0, 3).every((item) => item.lane === "core")).toBe(true);
    expect(ranked[3].lane).toBe("interest");
  });

  it("keeps discovery broad and avoids a third cluster echo when its lane has an alternative", () => {
    const queue = getQuestionnaireRuntime(dynamicProfile(["power"])).queue;
    expect(new Set(queue.slice(0, 15).map((item) => questionnairePrimaryCluster(item.kink))).size)
      .toBeGreaterThanOrEqual(3);
    for (let index = 0; index <= queue.length - 3; index += 1) {
      const window = queue.slice(index, index + 3);
      const clusters = window.map((item) => questionnairePrimaryCluster(item.kink));
      if (new Set(clusters).size > 1) continue;

      const third = window[2];
      const sameLaneAlternativeRemains = queue.slice(index + 3).some((item) =>
        item.lane === third.lane
        && questionnairePrimaryCluster(item.kink) !== clusters[2]);
      expect(sameLaneAlternativeRemains).toBe(false);
    }
  });

  it("keeps Deep Dive exhaustive even after repeated hard limits", () => {
    const current = profile({ mode: "deepDive", interests: [], version: 2 });
    current.entries.rope_bondage_give = { status: "hard_no", comment: "" };
    current.entries.handcuffs_give = { status: "hard_no", comment: "" };
    const runtime = getQuestionnaireRuntime(current);
    expect(runtime.visibleKinks.map((kink) => kink.id)).toEqual(KINKS.map((kink) => kink.id));
    expect(runtime.queue.some((item) => item.kink.id === "shibari_give")).toBe(true);
    expect(runtime.queue.some((item) => item.kink.id === "shibari_receive")).toBe(true);
    expect(runtime.queue.some((item) => item.kink.id === "leather_cuffs_give")).toBe(true);
    expect(runtime.queue.some((item) => item.kink.id === "leather_cuffs_receive")).toBe(true);
  });

  it("lets a fresh Deep Dive reach the complete catalog", () => {
    const runtime = getQuestionnaireRuntime(profile({ mode: "deepDive", interests: [], version: 2 }));
    expect(runtime.queue).toHaveLength(KINKS.length);
    expect(new Set(runtime.queue.map((item) => item.kink.id))).toEqual(new Set(KINKS.map((kink) => kink.id)));
  });

  it("produces deterministic ordering for identical Dynamic inputs", () => {
    const current = dynamicProfile(["impact", "bondage"]);
    current.entries.spanking_hand_give = { status: "willing", comment: "" };
    current.entries.handcuffs_give = { status: "no", comment: "" };
    const first = getQuestionnaireRuntime(current).queue.map((item) => item.kink.id);
    const second = getQuestionnaireRuntime(structuredClone(current)).queue.map((item) => item.kink.id);
    expect(second).toEqual(first);
  });

  it("produces deterministic breadth-first ordering for identical Discover inputs", () => {
    const current = dynamicProfile();
    answerIds(current, buildQuestionnaireCoveragePlan([]).anchorIds);
    const first = getQuestionnaireRuntime(current, { intent: { kind: "discover" } })
      .queue.map((item) => item.kink.id);
    const second = getQuestionnaireRuntime(structuredClone(current), { intent: { kind: "discover" } })
      .queue.map((item) => item.kink.id);
    expect(second).toEqual(first);
  });

  it("keeps dominant/submissive profiles causally independent", () => {
    const dominant = dynamicProfile();
    dominant.id = "dominant";
    dominant.perspective = "dominant";
    dominant.entries.handcuffs_give = { status: "yes", comment: "" };
    const submissive = dynamicProfile();
    submissive.id = "submissive";
    submissive.perspective = "submissive";
    const neutral = getQuestionnaireRuntime(submissive).queue.map((item) => item.kink.id);
    expect(getQuestionnaireRuntime(dominant).queue.map((item) => item.kink.id)).not.toEqual(neutral);
    expect(getQuestionnaireRuntime(submissive).queue.map((item) => item.kink.id)).toEqual(neutral);
    expect(submissive.entries).toEqual({});
  });

  it("uses perspective only to choose compact role/participation sides, never a different concept path", () => {
    const dominant = dynamicProfile();
    dominant.perspective = "dominant";
    const submissive = dynamicProfile();
    submissive.perspective = "submissive";
    const dominantIds = getQuestionnaireRuntime(dominant).queue.map((item) => item.kink.id);
    const submissiveIds = getQuestionnaireRuntime(submissive).queue.map((item) => item.kink.id);
    const concepts = (ids: string[]) => ids.map((id) =>
      id === "luiers_dragen" || id === "diaper_partner_wearing"
        ? "diaper_wearing"
        : directionalPairForKinkId(id)?.conceptId ?? id,
    );
    expect(dominantIds).not.toEqual(submissiveIds);
    expect(concepts(dominantIds)).toEqual(concepts(submissiveIds));
    expect(dominant.entries).toEqual({});
    expect(submissive.entries).toEqual({});
  });

  it("ignores BDSMtest scores and keeps full-catalog search independent", () => {
    const neutral = dynamicProfile();
    const scored = { ...structuredClone(neutral), bdsmtestScores: [{ role: "Master", pct: 100 }] };
    expect(getQuestionnaireRuntime(scored).queue.map((item) => item.kink.id))
      .toEqual(getQuestionnaireRuntime(neutral).queue.map((item) => item.kink.id));
    const shibari_give = searchAllKinks("Shibari").map((kink) => kink.id);
    expect(shibari_give).toContain("shibari_give");
    expect(shibari_give).toContain("shibari_receive");
    const rope = searchAllKinks("vastbinden met touw").map((kink) => kink.id);
    expect(rope).toContain("rope_bondage_give");
    expect(searchAllKinks("Nazorg").some((kink) => kink.id === "aftercare_physical")).toBe(true);
  });

  it("keeps every active catalog item reachable through its canonical name", () => {
    for (const kink of KINKS) {
      expect(searchAllKinks(kink.name).some((result) => result.id === kink.id), kink.id).toBe(true);
    }
  });

  it("keeps every declared alias searchable without turning it into an answer", () => {
    for (const kink of KINKS) {
      for (const alias of kink.aliases ?? []) {
        expect(searchAllKinks(alias).some((result) => result.id === kink.id), `${kink.id}: ${alias}`)
          .toBe(true);
      }
    }
  });

  it("lets an unexpected positive found through search open only its canonical local door", () => {
    const current = dynamicProfile();
    expect(searchAllKinks("Ochtend- & avondritueel").some((kink) => kink.id === "ochtend_avondritueel")).toBe(true);
    current.entries.ochtend_avondritueel = { status: "yes", comment: "" };
    const runtime = getQuestionnaireRuntime(current);
    expect(runtime.pendingProbes.map((probe) => probe.targetKinkId)).toContain("rituelen_protocols");
    expect(runtime.pendingProbes).toHaveLength(1);
  });
});
