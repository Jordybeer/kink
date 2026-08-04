import { describe, expect, it } from "vitest";
import { sanitizeProfileFull } from "@/lib/sanitizeProfile";

const LOCAL_FIELDS = {
  personGroupId: "person-group-1",
  perspective: "dominant",
  questionnaireSetup: {
    preset: "balanced",
    interests: ["power", "bondage", "unknown"],
    version: 1,
  },
};

describe("profile perspective backup sanitizing", () => {
  it("preserves valid local fields for an own backup profile", () => {
    const profile = sanitizeProfileFull({
      id: "profile-1",
      name: "Nova",
      role: "Dominant",
      origin: "own",
      experienceLevel: "gevorderd",
      customKinks: [],
      entries: {},
      ...LOCAL_FIELDS,
    })!;

    expect(profile.personGroupId).toBe("person-group-1");
    expect(profile.perspective).toBe("dominant");
    expect(profile.questionnaireSetup).toEqual({
      preset: "balanced",
      interests: ["power", "bondage"],
      version: 1,
    });
  });

  it("drops local grouping fields from a shared profile", () => {
    const profile = sanitizeProfileFull({
      id: "profile-1",
      name: "Nova",
      role: "Dominant",
      origin: "shared",
      isImported: true,
      experienceLevel: "gevorderd",
      customKinks: [],
      entries: {},
      ...LOCAL_FIELDS,
    })!;

    expect(profile.personGroupId).toBeUndefined();
    expect(profile.perspective).toBeUndefined();
    expect(profile.questionnaireSetup).toBeUndefined();
  });

  it("rejects malformed perspective and questionnaire metadata", () => {
    const profile = sanitizeProfileFull({
      id: "profile-1",
      name: "Nova",
      role: "Dominant",
      origin: "own",
      experienceLevel: "gevorderd",
      customKinks: [],
      entries: {},
      personGroupId: 42,
      perspective: "switch",
      questionnaireSetup: {
        preset: "everything",
        interests: ["root"],
        version: 999,
      },
    })!;

    expect(profile.personGroupId).toBeUndefined();
    expect(profile.perspective).toBeUndefined();
    expect(profile.questionnaireSetup).toBeUndefined();
  });
});
