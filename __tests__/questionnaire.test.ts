import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  getQuestionnaireKinks,
  questionnaireCount,
  searchAllKinks,
} from "@/lib/questionnaire";
import type { Profile, QuestionnaireSetup } from "@/types";

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
});
