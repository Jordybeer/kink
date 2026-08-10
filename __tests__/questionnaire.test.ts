import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  buildQuestionnaireCoveragePlan,
  buildQuestionnaireDiscoveryWave,
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
  QUESTIONNAIRE_CANONICAL_PROBE_TARGETS,
  QUESTIONNAIRE_CATEGORY_CLUSTERS,
  QUESTIONNAIRE_COVERAGE_ANCHOR_IDS,
  QUESTIONNAIRE_CORE_ANCHOR_IDS,
  QUESTIONNAIRE_DISCOVERY_ANCHOR_IDS,
  QUESTIONNAIRE_FOLLOW_UPS,
  QUESTIONNAIRE_INTEREST_ANCHOR_IDS,
  QUESTIONNAIRE_RELATED_PAIRS,
  QUESTIONNAIRE_TOPIC_IDS,
  questionnairePrimaryCluster,
} from "@/lib/questionnaireMetadata";
import type {
  Kink,
  KinkStatus,
  Profile,
  QuestionnaireInterest,
  QuestionnaireSetup,
} from "@/types";

function profile(setup: QuestionnaireSetup): Profile {
  return {
    id: "questionnaire-test",
    name: "Nova",
    role: "Dominant",
    perspective: "dominant",
    experienceLevel: setup.version === 1 && setup.preset === "full"
      ? "diepgaand"
      : setup.version === 2 && setup.mode === "deepDive"
        ? "diepgaand"
        : "beginner",
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
  it("keeps legacy quick/balanced/full and no-setup behavior intact", () => {
    expect(questionnaireCount({ preset: "quick", interests: ["power"], version: 1 })).toBe(52);
    expect(questionnaireCount({ preset: "balanced", interests: ["sexual_social"], version: 1 })).toBe(104);

    const full = getQuestionnaireKinks(profile({ preset: "full", interests: [], version: 1 }));
    expect(full.map((kink) => kink.id)).toEqual(KINKS.map((kink) => kink.id));

    const legacy: Profile = {
      id: "legacy",
      name: "Legacy",
      role: "Switch",
      experienceLevel: "beginner",
      customKinks: [],
      createdAt: 1,
      updatedAt: 1,
      entries: {},
    };
    expect(getQuestionnaireKinks(legacy).every((kink) => kink.level <= 1)).toBe(true);
  });

  it("never hides an existing legacy answer when a v1 budget is shorter", () => {
    const lastKink = KINKS[KINKS.length - 1];
    const quick = profile({ preset: "quick", interests: [], version: 1 });
    expect(getQuestionnaireKinks(quick).some((kink) => kink.id === lastKink.id)).toBe(false);
    quick.entries[lastKink.id] = { status: "yes", comment: "bewaar mij" };
    expect(getQuestionnaireKinks(quick).some((kink) => kink.id === lastKink.id)).toBe(true);
    expect(getQuestionnaireKinks(quick).length).toBeGreaterThanOrEqual(52);
  });

  it("keeps every metadata reference on a real catalog kink", () => {
    const ids = new Set(KINKS.map((kink) => kink.id));
    const referenced = [
      ...QUESTIONNAIRE_COVERAGE_ANCHOR_IDS,
      ...QUESTIONNAIRE_CORE_ANCHOR_IDS,
      ...QUESTIONNAIRE_DISCOVERY_ANCHOR_IDS,
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

  it("covers every catalog broad cluster in the fixed Dynamic plan", () => {
    const planClusters = new Set(
      buildQuestionnaireCoveragePlan([]).anchorIds
        .map((id) => questionnairePrimaryCluster(catalogSlice(id)[0])),
    );
    const catalogClusters = new Set(KINKS.map(questionnairePrimaryCluster));
    expect([...planClusters].sort()).toEqual([...catalogClusters].sort());
  });

  it("pins canonical probes to real directional edges — changing this snapshot is a migration", () => {
    expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS).toEqual({
      spanking_hand: "spanking_implement",
      rope_bondage: "shibari",
      handcuffs: "leather_cuffs",
      rules_protocols: "rituelen_protocols",
      ochtend_avondritueel: "rituelen_protocols",
      orgasm_control: "orgasm_denial",
      exhibitionism: "being_watched",
      voyeurism: "watching_others",
      watersports_geven: "watersports_ontvangen",
      geur_scent_fetish: "panty_sniffing",
      petplay_puppy: "petplay_harnas",
    });
    for (const [source, target] of Object.entries(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS)) {
      expect(QUESTIONNAIRE_FOLLOW_UPS[source]).toContain(target);
    }
  });

  it("builds a fixed Dynamic denominator that positive answers cannot move", () => {
    const current = dynamicProfile(["impact", "humiliation"]);
    const plan = buildQuestionnaireCoveragePlan(current.questionnaireSetup!.interests);
    const before = questionnaireCoverage(current, plan);
    current.entries.spanking_hand = { status: "yes", comment: "" };
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
    current.entries.handcuffs = { status: "yes", comment: "bewaar mij" };
    const before = structuredClone(current.entries);
    getQuestionnaireRuntime(current);
    getAdaptiveQuestionQueue(current);
    expect(current.entries).toEqual(before);
    expect(Object.keys(current.entries)).toEqual(["handcuffs"]);
  });

  it("opens exactly the pinned adjacent probe after an explicit positive answer", () => {
    const current = dynamicProfile();
    current.entries.handcuffs = { status: "yes", comment: "" };
    const runtime = getQuestionnaireRuntime(current);
    const probe = runtime.queue.find((item) => item.kink.id === "leather_cuffs");
    expect(probe?.isProbe).toBe(true);
    expect(probe?.reasons).toEqual([
      { sourceKinkId: "handcuffs", targetKinkId: "leather_cuffs", relationType: "followUp", status: "yes" },
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
    const catalog = catalogSlice("handcuffs", "leather_cuffs", "doctor_patient");
    const voorHen = rankQuestionnaireCandidates(catalog, entriesWith({ handcuffs: "no" })).map((kink) => kink.id);
    const maybe = rankQuestionnaireCandidates(catalog, entriesWith({ handcuffs: "maybe" })).map((kink) => kink.id);
    expect(voorHen).toEqual(maybe);
    expect(derivePendingExpansionProbes(catalog, entriesWith({ handcuffs: "no" }))).toEqual([]);
  });

  it("keeps one hard_no neutral even on an explicit directional continuation", () => {
    const [source, target, unrelated] = catalogSlice("handcuffs", "leather_cuffs", "doctor_patient");
    const catalog = [
      { ...source, level: 1 as const },
      { ...target, level: 1 as const },
      { ...unrelated, level: 1 as const },
    ];
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ handcuffs: "maybe" }))
      .map((kink) => kink.id);
    const hard = rankQuestionnaireCandidates(catalog, entriesWith({ handcuffs: "hard_no" }))
      .map((kink) => kink.id);
    expect(hard).toEqual(neutral);
    const queueItems: QuestionnaireQueueItem[] = [
      { ...queueItem(target.id), kink: target },
      { ...queueItem(unrelated.id), kink: unrelated },
    ];
    const neutralQueue = rankQuestionnaireQueueItems(
      queueItems,
      catalog,
      entriesWith({ handcuffs: "maybe" }),
    ).map((item) => item.kink.id);
    const hardQueue = rankQuestionnaireQueueItems(
      queueItems,
      catalog,
      entriesWith({ handcuffs: "hard_no" }),
    ).map((item) => item.kink.id);
    expect(hardQueue).toEqual(neutralQueue);
    expect(derivePendingExpansionProbes(catalog, entriesWith({ handcuffs: "hard_no" }))).toEqual([]);
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

  it("does not let a hard limit on urine drinking close a Golden Shower branch", () => {
    const current = dynamicProfile();
    current.entries.watersports_geven = { status: "yes", comment: "" };
    current.entries.urine_intiem = { status: "hard_no", comment: "absoluut niet" };
    const runtime = getQuestionnaireRuntime(current);
    expect(runtime.pendingProbes.map((probe) => probe.targetKinkId)).toContain("watersports_ontvangen");
    expect(current.entries.urine_intiem.status).toBe("hard_no");
  });

  it("uses no same-topic fallback when metadata has no direct edge", () => {
    const catalog = catalogSlice("watersports_geven", "urine_intiem", "doctor_patient");
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ watersports_geven: "maybe" })).map((kink) => kink.id);
    const positive = rankQuestionnaireCandidates(catalog, entriesWith({ watersports_geven: "yes" })).map((kink) => kink.id);
    expect(positive).toEqual(neutral);
  });

  it("boosts voyeurism's real neighbor without dragging fluids or anal along", () => {
    const catalog = catalogSlice("voyeurism", "watching_others", "cum_play", "anal_fingering");
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ voyeurism: "maybe" })).map((kink) => kink.id);
    const positive = rankQuestionnaireCandidates(catalog, entriesWith({ voyeurism: "yes" })).map((kink) => kink.id);
    expect(positive.indexOf("watching_others")).toBeLessThan(neutral.indexOf("watching_others"));
    expect(positive.filter((id) => id === "cum_play" || id === "anal_fingering"))
      .toEqual(neutral.filter((id) => id === "cum_play" || id === "anal_fingering"));
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

  it("does not synthesize humiliation from Golden Shower + Trampling enthusiasm", () => {
    const catalog = catalogSlice("watersports_geven", "trampling", "humiliation_verbal", "doctor_patient");
    const neutral = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ watersports_geven: "maybe", trampling: "maybe" }),
    ).map((kink) => kink.id);
    const enthusiastic = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ watersports_geven: "yes", trampling: "yes" }),
    ).map((kink) => kink.id);
    expect(enthusiastic).toEqual(neutral);
  });

  it("never falls through to a second follow-up after the canonical target was answered", () => {
    const catalog = catalogSlice("spanking_hand", "spanking_implement", "flogging");
    const entries = entriesWith({ spanking_hand: "yes", spanking_implement: "maybe" });
    expect(QUESTIONNAIRE_FOLLOW_UPS.spanking_hand).toEqual(["spanking_implement", "flogging"]);
    expect(derivePendingExpansionProbes(catalog, entries)).toEqual([]);
  });

  it("never falls through when a canonical target is unavailable in the active catalog", () => {
    const catalog = catalogSlice("spanking_hand", "flogging");
    expect(QUESTIONNAIRE_FOLLOW_UPS.spanking_hand).toEqual(["spanking_implement", "flogging"]);
    expect(derivePendingExpansionProbes(catalog, entriesWith({ spanking_hand: "yes" }))).toEqual([]);
  });

  it("consumes a source when its canonical target was already answered before the source", () => {
    const catalog = catalogSlice("handcuffs", "leather_cuffs");
    expect(derivePendingExpansionProbes(
      catalog,
      entriesWith({ leather_cuffs: "maybe", handcuffs: "yes" }),
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
    const plan = buildQuestionnaireCoveragePlan([]);
    answerIds(current, plan.anchorIds, "maybe");
    expect(getQuestionnaireRuntime(current).complete).toBe(true);

    current.entries.handcuffs = { status: "yes", comment: "" };
    expect(getQuestionnaireRuntime(current).complete).toBe(false);
    current.entries.leather_cuffs = { status: "maybe", comment: "" };
    expect(getQuestionnaireRuntime(current).complete).toBe(true);
  });

  it("builds deterministic discovery waves with at most one anchor per broad cluster", () => {
    const current = dynamicProfile();
    const first = buildQuestionnaireDiscoveryWave(current);
    const second = buildQuestionnaireDiscoveryWave(structuredClone(current));
    expect(second).toEqual(first);
    const clusters = first.map((id) => questionnairePrimaryCluster(catalogSlice(id)[0]));
    expect(new Set(clusters).size).toBe(clusters.length);
  });

  it("treats Meer ontdekken as its own lane and finishes that explicit wave", () => {
    const current = dynamicProfile();
    answerIds(current, buildQuestionnaireCoveragePlan([]).anchorIds);
    const wave = buildQuestionnaireDiscoveryWave(current);
    const exploring = getQuestionnaireRuntime(current, { intent: "discover", discoveryWaveIds: wave });
    expect(exploring.complete).toBe(false);
    expect(exploring.queue.some((item) => item.lane === "discovery")).toBe(true);
    answerIds(current, wave);
    expect(getQuestionnaireRuntime(current, { intent: "discover", discoveryWaveIds: wave }).complete).toBe(true);
  });

  it("keeps an explicit non-probe between probes when one is available", () => {
    const next = selectConversationQuestion(
      [queueItem("leather_cuffs", true), queueItem("doctor_patient")],
      KINKS,
      { requireNonProbe: true },
    );
    expect(next?.kink.id).toBe("doctor_patient");
  });

  it("avoids an immediate topical echo when another valid question exists", () => {
    const next = selectConversationQuestion(
      [queueItem("spanking_implement"), queueItem("doctor_patient")],
      KINKS,
      { lastKinkId: "spanking_hand" },
    );
    expect(next?.kink.id).toBe("doctor_patient");
  });

  it("lets Golden Shower breathe before its explicit watersports follow-up", () => {
    const next = selectConversationQuestion(
      [queueItem("watersports_ontvangen", true), queueItem("trampling")],
      KINKS,
      { lastKinkId: "watersports_geven" },
    );
    expect(next?.kink.id).toBe("trampling");
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
    current.entries.handcuffs = { status: "yes", comment: "" };
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
      { ...queueItem("handcuffs"), lane: "interest" },
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
    current.entries.rope_bondage = { status: "hard_no", comment: "" };
    current.entries.handcuffs = { status: "hard_no", comment: "" };
    const runtime = getQuestionnaireRuntime(current);
    expect(runtime.visibleKinks.map((kink) => kink.id)).toEqual(KINKS.map((kink) => kink.id));
    expect(runtime.queue.some((item) => item.kink.id === "shibari")).toBe(true);
    expect(runtime.queue.some((item) => item.kink.id === "leather_cuffs")).toBe(true);
  });

  it("lets a fresh Deep Dive reach the complete catalog", () => {
    const runtime = getQuestionnaireRuntime(profile({ mode: "deepDive", interests: [], version: 2 }));
    expect(runtime.queue).toHaveLength(KINKS.length);
    expect(new Set(runtime.queue.map((item) => item.kink.id))).toEqual(new Set(KINKS.map((kink) => kink.id)));
  });

  it("produces deterministic ordering for identical Dynamic inputs", () => {
    const current = dynamicProfile(["impact", "bondage"]);
    current.entries.spanking_hand = { status: "willing", comment: "" };
    current.entries.handcuffs = { status: "no", comment: "" };
    const first = getQuestionnaireRuntime(current).queue.map((item) => item.kink.id);
    const second = getQuestionnaireRuntime(structuredClone(current)).queue.map((item) => item.kink.id);
    expect(second).toEqual(first);
  });

  it("keeps dominant/submissive profiles causally independent", () => {
    const dominant = dynamicProfile();
    dominant.id = "dominant";
    dominant.perspective = "dominant";
    dominant.entries.handcuffs = { status: "yes", comment: "" };
    const submissive = dynamicProfile();
    submissive.id = "submissive";
    submissive.perspective = "submissive";
    const neutral = getQuestionnaireRuntime(submissive).queue.map((item) => item.kink.id);
    expect(getQuestionnaireRuntime(dominant).queue.map((item) => item.kink.id)).not.toEqual(neutral);
    expect(getQuestionnaireRuntime(submissive).queue.map((item) => item.kink.id)).toEqual(neutral);
    expect(submissive.entries).toEqual({});
  });

  it("does not treat perspective itself as a hidden preference signal", () => {
    const dominant = dynamicProfile();
    dominant.perspective = "dominant";
    const submissive = dynamicProfile();
    submissive.perspective = "submissive";
    expect(getQuestionnaireRuntime(dominant).queue.map((item) => item.kink.id))
      .toEqual(getQuestionnaireRuntime(submissive).queue.map((item) => item.kink.id));
  });

  it("ignores BDSMtest scores and keeps full-catalog search independent", () => {
    const neutral = dynamicProfile();
    const scored = { ...structuredClone(neutral), bdsmtestScores: [{ role: "Master", pct: 100 }] };
    expect(getQuestionnaireRuntime(scored).queue.map((item) => item.kink.id))
      .toEqual(getQuestionnaireRuntime(neutral).queue.map((item) => item.kink.id));
    expect(searchAllKinks("Shibari").some((kink) => kink.id === "shibari")).toBe(true);
    expect(searchAllKinks("vastbinden met touw").some((kink) => kink.id === "rope_bondage")).toBe(true);
    expect(searchAllKinks("Nazorg").some((kink) => kink.id === "aftercare_physical")).toBe(true);
  });

  it("keeps every active catalog item reachable through its canonical name", () => {
    for (const kink of KINKS) {
      expect(searchAllKinks(kink.name).some((result) => result.id === kink.id), kink.id).toBe(true);
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
