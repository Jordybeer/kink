import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  getAdaptiveQuestionQueue,
  getQuestionnaireKinks,
  questionnaireCount,
  searchAllKinks,
} from "@/lib/questionnaire";
import { rankQuestionnaireCandidates } from "@/lib/questionnaireEngine";
import {
  QUESTIONNAIRE_CATEGORY_CLUSTERS,
  QUESTIONNAIRE_TOPIC_IDS,
  questionnairePrimaryCluster,
} from "@/lib/questionnaireMetadata";
import type { Kink, KinkStatus, Profile, QuestionnaireSetup } from "@/types";

function profile(setup: QuestionnaireSetup): Profile {
  return {
    id: "questionnaire-test",
    name: "Nova",
    role: "Dominant",
    perspective: "dominant",
    experienceLevel: setup.preset === "full" ? "diepgaand" : "beginner",
    questionnaireSetup: setup,
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: {},
    origin: "own",
  };
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

describe("adaptive questionnaire", () => {
  it("keeps quick and balanced presets at their promised size", () => {
    expect(questionnaireCount({ preset: "quick", interests: ["power", "sexual_social"], version: 1 })).toBe(52);
    expect(questionnaireCount({ preset: "balanced", interests: ["power", "sexual_social"], version: 1 })).toBe(104);
  });

  it("returns the complete catalog for the full preset", () => {
    const result = getQuestionnaireKinks(profile({ preset: "full", interests: [], version: 1 }));
    expect(result).toHaveLength(KINKS.length);
    expect(result.map((kink) => kink.id)).toEqual(KINKS.map((kink) => kink.id));
  });

  it("never hides an existing answer when the preset becomes shorter", () => {
    const lastKink = KINKS[KINKS.length - 1];
    const quick = profile({ preset: "quick", interests: [], version: 1 });
    expect(getQuestionnaireKinks(quick).some((kink) => kink.id === lastKink.id)).toBe(false);

    quick.entries[lastKink.id] = { status: "yes", comment: "" };
    const afterAnswer = getQuestionnaireKinks(quick);
    expect(afterAnswer.some((kink) => kink.id === lastKink.id)).toBe(true);
    expect(afterAnswer.length).toBeGreaterThanOrEqual(52);
  });

  it("prioritizes chosen interests without changing the size target", () => {
    const neutral = getQuestionnaireKinks(profile({ preset: "quick", interests: [], version: 1 }));
    const bondage = getQuestionnaireKinks(profile({ preset: "quick", interests: ["bondage"], version: 1 }));
    expect(bondage).toHaveLength(52);
    expect(bondage.filter((kink) => /bondage|rope|touw|cuff|boei/i.test(`${kink.name} ${kink.category}`)).length)
      .toBeGreaterThan(neutral.filter((kink) => /bondage|rope|touw|cuff|boei/i.test(`${kink.name} ${kink.category}`)).length);
  });

  it("searches the full catalog rather than only the start selection", () => {
    const results = searchAllKinks("Shibari");
    expect(results.some((kink) => kink.id === "shibari")).toBe(true);
  });

  it("preserves legacy experience-level behavior when no setup exists", () => {
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
    const result = getQuestionnaireKinks(legacy);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((kink) => kink.level <= 1)).toBe(true);
  });

  it("covers every catalog category with thin queue metadata", () => {
    const unmapped = [...new Set(KINKS.map((kink) => kink.category))]
      .filter((category) => !QUESTIONNAIRE_CATEGORY_CLUSTERS[category]);
    expect(unmapped).toEqual([]);
  });

  it("keeps every explicit topical neighbor anchored to a real catalog kink", () => {
    const catalogIds = new Set(KINKS.map((kink) => kink.id));
    const unknownIds = Object.values(QUESTIONNAIRE_TOPIC_IDS)
      .flat()
      .filter((id) => !catalogIds.has(id));
    expect(unknownIds).toEqual([]);
  });

  it("never mutates, invents, or loses an explicit answer", () => {
    const current = profile({ preset: "quick", interests: [], version: 1 });
    current.entries.handcuffs = { status: "yes", comment: "bewaar mij" };
    const before = structuredClone(current.entries);

    const selected = getQuestionnaireKinks(current);
    getAdaptiveQuestionQueue(current);

    expect(current.entries).toEqual(before);
    expect(selected.some((kink) => kink.id === "handcuffs")).toBe(true);
    expect(Object.keys(current.entries)).toEqual(["handcuffs"]);
  });

  it("moves a true topical neighbor forward after an explicit positive answer", () => {
    const baseline = profile({ preset: "full", interests: [], version: 1 });
    baseline.entries.handcuffs = { status: "maybe", comment: "" };
    const before = getAdaptiveQuestionQueue(baseline).map((kink) => kink.id);
    const current = structuredClone(baseline);
    current.entries.handcuffs = { status: "yes", comment: "" };

    const after = getAdaptiveQuestionQueue(current).map((kink) => kink.id);

    expect(after.indexOf("leather_cuffs")).toBeLessThan(before.indexOf("leather_cuffs"));
  });

  it("lets Ja promote a topical follow-up while Misschien stays neutral", () => {
    const catalog = catalogSlice("handcuffs", "mummification", "doctor_patient");
    const neutral = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ handcuffs: "maybe" }),
    ).map((kink) => kink.id);
    const willing = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ handcuffs: "willing" }),
    ).map((kink) => kink.id);

    expect(neutral.indexOf("mummification")).toBeGreaterThan(neutral.indexOf("doctor_patient"));
    expect(willing.indexOf("mummification")).toBeLessThan(willing.indexOf("doctor_patient"));
  });

  it("lets an unexpected positive answer open its cluster inside a quick budget", () => {
    const current = profile({ preset: "quick", interests: [], version: 1 });
    const before = getQuestionnaireKinks(current);
    const beforeBondage = before.filter((kink) => kink.category === "Bondage").length;

    // A full-catalog search can surface this even when it was not suggested.
    current.entries.shibari = { status: "yes", comment: "" };
    const after = getQuestionnaireKinks(current);
    const afterBondage = after.filter((kink) => kink.category === "Bondage").length;

    expect(after.some((kink) => kink.id === "shibari")).toBe(true);
    expect(afterBondage).toBeGreaterThan(beforeBondage);
    expect(after).toHaveLength(52);
  });

  it("treats Voor hen as neutral instead of helping a hard limit close a branch", () => {
    const catalog = catalogSlice("handcuffs", "leather_cuffs", "mummification", "financial_domination");
    const withVoorHen = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ handcuffs: "no", leather_cuffs: "hard_no" }),
    ).map((kink) => kink.id);
    const neutral = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ handcuffs: "maybe", leather_cuffs: "hard_no" }),
    ).map((kink) => kink.id);

    expect(withVoorHen).toEqual(neutral);
  });

  it("uses repeated hard limits as the only negative branch signal", () => {
    const catalog = catalogSlice("handcuffs", "leather_cuffs", "mummification", "financial_domination");
    const neutral = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ handcuffs: "maybe", leather_cuffs: "maybe" }),
    ).map((kink) => kink.id);
    const limited = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ handcuffs: "hard_no", leather_cuffs: "hard_no" }),
    ).map((kink) => kink.id);

    expect(neutral.indexOf("mummification")).toBeLessThan(neutral.indexOf("financial_domination"));
    expect(limited.indexOf("mummification")).toBeGreaterThan(limited.indexOf("financial_domination"));
  });

  it("boosts voyeurism neighbors without dragging fluids or anal along", () => {
    const catalog = catalogSlice("voyeurism", "watching_others", "cum_play", "anal_fingering");
    const neutral = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ voyeurism: "maybe" }),
    ).map((kink) => kink.id);
    const enthusiastic = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ voyeurism: "yes" }),
    ).map((kink) => kink.id);

    expect(enthusiastic.indexOf("watching_others")).toBeLessThan(neutral.indexOf("watching_others"));
    expect(enthusiastic.indexOf("watching_others")).toBeLessThan(enthusiastic.indexOf("cum_play"));
    expect(enthusiastic.indexOf("watching_others")).toBeLessThan(enthusiastic.indexOf("anal_fingering"));
    expect(enthusiastic.filter((id) => id === "cum_play" || id === "anal_fingering"))
      .toEqual(neutral.filter((id) => id === "cum_play" || id === "anal_fingering"));
  });

  it("keeps Little/Ageplay relevance separate from Pet Play", () => {
    const catalog = catalogSlice("little_space", "baby_infantiliteit", "petplay_puppy", "uniforms");
    const neutral = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ little_space: "maybe" }),
    ).map((kink) => kink.id);
    const enthusiastic = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ little_space: "yes" }),
    ).map((kink) => kink.id);

    expect(neutral.indexOf("baby_infantiliteit")).toBeGreaterThan(neutral.indexOf("petplay_puppy"));
    expect(enthusiastic.indexOf("baby_infantiliteit")).toBeLessThan(enthusiastic.indexOf("petplay_puppy"));
    expect(enthusiastic.filter((id) => id === "petplay_puppy" || id === "uniforms"))
      .toEqual(neutral.filter((id) => id === "petplay_puppy" || id === "uniforms"));
  });

  it("suppresses only true topical depth after repeated hard limits", () => {
    const catalog = catalogSlice(
      "rope_bondage",
      "shibari",
      "suspension_ondersteboven",
      "mummification",
    );
    const neutral = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ rope_bondage: "maybe", shibari: "maybe" }),
    ).map((kink) => kink.id);
    const limited = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ rope_bondage: "hard_no", shibari: "hard_no" }),
    ).map((kink) => kink.id);

    expect(neutral.indexOf("suspension_ondersteboven")).toBeLessThan(neutral.indexOf("mummification"));
    expect(limited.indexOf("suspension_ondersteboven")).toBeGreaterThan(limited.indexOf("mummification"));
  });

  it("keeps safety and chosen interests ahead of concentrated topical enthusiasm", () => {
    const catalog = catalogSlice(
      "feet",
      "hoge_hakken_aanbidding",
      "footjob",
      "voetslaaf",
      "financial_domination",
      "scarification",
    );
    const ranked = rankQuestionnaireCandidates(
      catalog,
      entriesWith({ feet: "yes", hoge_hakken_aanbidding: "yes", footjob: "willing" }),
      {
        preferredIds: new Set(["financial_domination"]),
        safetyIds: new Set(["scarification"]),
      },
    ).map((kink) => kink.id);

    expect(ranked.indexOf("financial_domination")).toBeLessThan(ranked.indexOf("voetslaaf"));
    expect(ranked.indexOf("scarification")).toBeLessThan(ranked.indexOf("voetslaaf"));
  });

  it("keeps discovery alive even when one cluster has several positive answers", () => {
    const current = profile({ preset: "full", interests: ["power"], version: 1 });
    current.entries.dominance_submission = { status: "yes", comment: "" };
    current.entries.praise_kink = { status: "yes", comment: "" };
    current.entries.service = { status: "willing", comment: "" };

    const clusters = new Set(
      getAdaptiveQuestionQueue(current).slice(0, 15).map(questionnairePrimaryCluster),
    );
    expect(clusters.size).toBeGreaterThanOrEqual(3);
  });

  it("never lets one cluster monopolize three consecutive queue slots", () => {
    const current = profile({ preset: "full", interests: ["power"], version: 1 });
    current.entries.dominance_submission = { status: "yes", comment: "" };
    current.entries.praise_kink = { status: "yes", comment: "" };
    current.entries.service = { status: "yes", comment: "" };
    const queue = getAdaptiveQuestionQueue(current).slice(0, 40);

    for (let index = 0; index <= queue.length - 3; index += 1) {
      const clusters = queue.slice(index, index + 3).map(questionnairePrimaryCluster);
      expect(new Set(clusters).size).toBeGreaterThan(1);
    }
  });

  it("produces deterministic ordering for identical inputs", () => {
    const current = profile({ preset: "balanced", interests: ["impact", "bondage"], version: 1 });
    current.entries.spanking_hand = { status: "willing", comment: "" };
    current.entries.handcuffs = { status: "no", comment: "" };

    const first = getAdaptiveQuestionQueue(current).map((kink) => kink.id);
    const second = getAdaptiveQuestionQueue(structuredClone(current)).map((kink) => kink.id);
    expect(second).toEqual(first);
  });

  it("keeps perspective queues independent because only that profile's answers are signals", () => {
    const dominant = profile({ preset: "full", interests: [], version: 1 });
    dominant.id = "dominant";
    dominant.perspective = "dominant";
    dominant.entries.handcuffs = { status: "yes", comment: "" };

    const submissive = profile({ preset: "full", interests: [], version: 1 });
    submissive.id = "submissive";
    submissive.perspective = "submissive";

    const neutral = getAdaptiveQuestionQueue(submissive).map((kink) => kink.id);
    const dominantQueue = getAdaptiveQuestionQueue(dominant).map((kink) => kink.id);

    expect(dominantQueue).not.toEqual(neutral);
    expect(getAdaptiveQuestionQueue(submissive).map((kink) => kink.id)).toEqual(neutral);
    expect(submissive.entries).toEqual({});
  });

  it("ignores BDSMtest scores as questionnaire signals", () => {
    const neutral = profile({ preset: "full", interests: [], version: 1 });
    const scored = { ...structuredClone(neutral), bdsmtestScores: [{ role: "Master", pct: 100 }] };
    expect(getAdaptiveQuestionQueue(scored).map((kink) => kink.id))
      .toEqual(getAdaptiveQuestionQueue(neutral).map((kink) => kink.id));
  });
});
