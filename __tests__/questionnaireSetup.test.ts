import { beforeEach, describe, expect, it } from "vitest";
import {
  defaultQuestionnaireSetup,
  normalizeQuestionnaireSetup,
  normalizeStoredQuestionnaireProfiles,
} from "@/lib/questionnaireSetup";
import { useStore } from "@/lib/store";

beforeEach(() => {
  useStore.setState(useStore.getInitialState());
});

describe("questionnaire setup normalization", () => {
  it("maps the pre-launch presets into the single Dynamic/Deep Dive model", () => {
    expect(normalizeQuestionnaireSetup({ preset: "quick", interests: ["bondage"], version: 1 }))
      .toEqual({ mode: "dynamic", interests: ["bondage"], version: 2 });
    expect(normalizeQuestionnaireSetup({ preset: "balanced", interests: ["power"], version: 1 }))
      .toEqual({ mode: "dynamic", interests: ["power"], version: 2 });
    expect(normalizeQuestionnaireSetup({ preset: "full", interests: ["impact"], version: 1 }))
      .toEqual({ mode: "deepDive", interests: ["impact"], version: 2 });
    expect(defaultQuestionnaireSetup()).toEqual({ mode: "dynamic", interests: [], version: 2 });
  });

  it("gives every newly created profile the Dynamic setup immediately", () => {
    const id = useStore.getState().createProfile("Nova", "Dominant");
    const profile = useStore.getState().profiles.find((candidate) => candidate.id === id);
    expect(profile?.questionnaireSetup)
      .toEqual({ mode: "dynamic", interests: [], version: 2 });
  });

  it("keeps entries byte-for-byte while the v18 store migration normalizes setup", () => {
    const entries = {
      handcuffs: { status: "yes" as const, comment: "bewaar mij", tags: ["vraag eerst"] },
    };
    const persisted = {
      profiles: [{
        id: "prelaunch-profile",
        name: "Nova",
        role: "Dominant",
        experienceLevel: "beginner" as const,
        questionnaireSetup: { preset: "full", interests: ["bondage"], version: 1 },
        customKinks: [],
        createdAt: 1,
        updatedAt: 1,
        entries,
      }],
    };
    const migrated = {
      ...persisted,
      profiles: normalizeStoredQuestionnaireProfiles(structuredClone(persisted.profiles)),
    };

    expect(migrated.profiles[0].questionnaireSetup)
      .toEqual({ mode: "deepDive", interests: ["bondage"], version: 2 });
    expect(migrated.profiles[0].entries).toEqual(entries);
  });

  it("defaults a pre-launch profile without setup to Dynamic without touching entries", () => {
    const entries = { voyeurism: { status: "hard_no" as const, comment: "blijft staan" } };
    const persisted = {
      profiles: [{
        id: "no-setup",
        name: "Vesper",
        role: "Submissive",
        experienceLevel: "ervaren" as const,
        customKinks: [],
        createdAt: 1,
        updatedAt: 1,
        entries,
      }],
    };
    const migrated = {
      ...persisted,
      profiles: normalizeStoredQuestionnaireProfiles(structuredClone(persisted.profiles)),
    };
    expect(migrated.profiles[0].questionnaireSetup)
      .toEqual({ mode: "dynamic", interests: [], version: 2 });
    expect(migrated.profiles[0].entries).toEqual(entries);
  });
});
