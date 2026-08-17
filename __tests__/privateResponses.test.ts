import { describe, expect, it } from "vitest";
import { buildCompareModel } from "@/lib/compareV2";
import {
  comparableEntry,
  isResponseVisible,
  privateResponseKey,
  profileExportResponse,
  visibleUsedInScene,
  visibleStatus,
} from "@/lib/privateResponses";
import type { KinkEntry, Profile } from "@/types";

const PRIVATE_ENTRY: KinkEntry = {
  status: "yes",
  desire: 5,
  experienced: true,
  comment: "alleen voor ons",
  tags: ["vraag eerst"],
  curious: true,
  privateResponse: true,
};

function profile(id: string, overrides: Partial<Profile> = {}): Profile {
  return {
    id,
    name: id,
    role: "Dominant",
    experienceLevel: "beginner",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: {},
    ...overrides,
  };
}

describe("private responses", () => {
  it("uses a profile-scoped reveal key", () => {
    expect(privateResponseKey("profile-a", "spanking")).toBe("profile-a:spanking");
  });

  it("hides status until the response is deliberately revealed", () => {
    expect(isResponseVisible(PRIVATE_ENTRY)).toBe(false);
    expect(visibleStatus(PRIVATE_ENTRY)).toBeNull();
    expect(visibleStatus(PRIVATE_ENTRY, true)).toBe("yes");
  });

  it("removes every answer-derived field before matching", () => {
    expect(comparableEntry(PRIVATE_ENTRY)).toEqual({
      status: null,
      comment: "",
      privateResponse: true,
    });
  });

  it("does not let concealed scene history influence suggestions", () => {
    expect(visibleUsedInScene({ ...PRIVATE_ENTRY, usedInScene: 7 })).toBe(0);
    expect(visibleUsedInScene({ status: "yes", comment: "", usedInScene: 3 })).toBe(3);
  });

  it("omits a concealed answer from a safe export model", () => {
    expect(profileExportResponse(PRIVATE_ENTRY)).toEqual({
      kind: "omitted",
    });
  });

  it("only includes private details after explicit export opt-in", () => {
    expect(profileExportResponse(PRIVATE_ENTRY, true)).toEqual({
      kind: "visible",
      status: "yes",
      comment: "alleen voor ons",
      tags: ["vraag eerst"],
    });
  });

  it("does not let private custom metadata change Compare v2 output", () => {
    const visible = profile("visible", {
      customKinks: [{ id: "custom-topic", name: "Custom topic" }],
      entries: {
        "custom-topic": { status: "yes", comment: "" },
      },
    });
    const absent = profile("other");
    const concealed = profile("other", {
      customKinks: [{ id: "custom-topic", name: "Custom topic" }],
      entries: {
        "custom-topic": { ...PRIVATE_ENTRY, status: "hard_no" },
      },
    });

    expect(buildCompareModel(visible, concealed)).toEqual(buildCompareModel(visible, absent));
  });
});
