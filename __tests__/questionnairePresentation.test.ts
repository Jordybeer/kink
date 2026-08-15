import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  getQuestionnairePresentation,
  QUESTIONNAIRE_TITLE_OVERRIDES,
} from "@/lib/questionnairePresentation";

describe("questionnaire presentation", () => {
  it("keeps every directional title override attached to a real catalog item", () => {
    const ids = new Set(KINKS.map((kink) => kink.id));
    for (const id of Object.keys(QUESTIONNAIRE_TITLE_OVERRIDES)) {
      expect(ids.has(id), `missing catalog kink for ${id}`).toBe(true);
    }
  });

  it("does not leak generic giving/receiving suffixes into questionnaire titles", () => {
    const genericDirectionals = KINKS.filter((kink) => /— (giving|receiving)(?:\s|$)/i.test(kink.name));
    expect(genericDirectionals.length).toBeGreaterThan(0);

    for (const kink of genericDirectionals) {
      const { title } = getQuestionnairePresentation(kink);
      expect(title, kink.id).not.toMatch(/— (giving|receiving)(?:\s|$)/i);
    }
  });

  it("gives cuckolding a concise decision surface and keeps depth available", () => {
    const kink = KINKS.find((candidate) => candidate.id === "cuckolding");
    expect(kink).toBeDefined();

    const presentation = getQuestionnairePresentation(kink!);
    expect(presentation.title).toBe("Cuckolding");
    expect(presentation.essence).toBe(
      "Een afgesproken scenario waarin jij weet of ziet dat je partner seks heeft met een instemmende derde.",
    );
    expect(presentation.hasDetails).toBe(true);
    expect(presentation.details).toContain("specifieke cuckolding-dynamiek");
  });

  it("keeps essential stop-signal context on the sound-deprivation surface", () => {
    for (const id of ["sound_deprivation_give", "sound_deprivation_receive"]) {
      const kink = KINKS.find((candidate) => candidate.id === id);
      expect(kink).toBeDefined();
      expect(getQuestionnairePresentation(kink!).essence).toContain("tastbaar stopsignaal");
    }
  });
});
