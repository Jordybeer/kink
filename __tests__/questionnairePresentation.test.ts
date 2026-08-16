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

  it("keeps visible questionnaire titles English by default", () => {
    for (const id of ["spanking_hand_receive", "pegging_receive", "sound_deprivation_receive"]) {
      const kink = KINKS.find((candidate) => candidate.id === id);
      expect(kink).toBeDefined();
      expect(getQuestionnairePresentation(kink!).title).not.toMatch(/\b(ontvangen|geven|worden|gehoor beperken)\b/i);
    }
  });

  it("gives cuckolding one coherent decision surface and continuation", () => {
    const kink = KINKS.find((candidate) => candidate.id === "cuckolding");
    expect(kink).toBeDefined();

    const presentation = getQuestionnairePresentation(kink!);
    expect(presentation.title).toBe("Cuckolding");
    expect(presentation.essence).toBe(
      "Een afgesproken scenario waarin jij weet of ziet dat je partner seks heeft met een instemmende derde.",
    );
    expect(presentation.hasDetails).toBe(true);
    expect(presentation.details).toBe("De specifieke cuckolding-dynamiek wordt daarbij expliciet benoemd.");
  });

  it("continues after the visible first sentence instead of replaying the full description", () => {
    const kink = KINKS.find((candidate) => candidate.id === "spanking_hand_give");
    expect(kink).toBeDefined();

    const presentation = getQuestionnairePresentation(kink!);
    expect(presentation.essence).toBe("Een partner met de hand op het zitvlak slaan als afgesproken impactspel.");
    expect(presentation.details).toBe(
      "Stem intensiteit, zones en stopmomenten vooraf af zonder een vaste rol te veronderstellen.",
    );
    expect(presentation.details).not.toContain(presentation.essence);
  });

  it("does not manufacture depth when a complete one-sentence essence already suffices", () => {
    const kink = KINKS.find((candidate) => candidate.id === "orgasm_control");
    expect(kink).toBeDefined();
    const presentation = getQuestionnairePresentation(kink!);
    expect(presentation.details).toBeNull();
    expect(presentation.hasDetails).toBe(false);
  });

  it("keeps essential stop-signal context on the sound-deprivation surface", () => {
    for (const id of ["sound_deprivation_give", "sound_deprivation_receive"]) {
      const kink = KINKS.find((candidate) => candidate.id === id);
      expect(kink).toBeDefined();
      expect(getQuestionnairePresentation(kink!).essence).toContain("tastbaar stopsignaal");
    }
  });
});
