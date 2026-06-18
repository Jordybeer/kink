import { describe, it, expect } from "vitest";
import { eligibleParentProfiles } from "@/lib/subprofile";
import type { Profile } from "@/types";

function p(overrides: Partial<Profile> & { name: string }): Profile {
  return {
    id: overrides.name.toLowerCase().replace(/\s+/g, "-"),
    isImported: false,
    origin: "local",
    kinks: [],
    customKinks: [],
    createdAt: 0,
    updatedAt: 0,
    entries: {},
    role: "",
    experienceLevel: "beginner",
    ...overrides,
  } as unknown as Profile;
}

describe("eligibleParentProfiles", () => {
  it("empty array → []", () => {
    expect(eligibleParentProfiles([], null)).toEqual([]);
  });

  it("three own profiles, no partner → all three names, deduplicated, sorted nl-NL", () => {
    const profiles = [p({ name: "Zoë" }), p({ name: "Anna" }), p({ name: "Mia" })];
    expect(eligibleParentProfiles(profiles, null)).toEqual(["Anna", "Mia", "Zoë"]);
  });

  it("partner profile (origin: shared) excluded", () => {
    const profiles = [
      p({ name: "Lily" }),
      p({ id: "partner-1", name: "Alex", isImported: true, origin: "shared" }),
    ];
    expect(eligibleParentProfiles(profiles, null)).toEqual(["Lily"]);
  });

  it("two own profiles with same name → deduplicated to one entry", () => {
    const profiles = [
      p({ id: "lily-1", name: "Lily" }),
      p({ id: "lily-2", name: "Lily" }),
    ];
    expect(eligibleParentProfiles(profiles, null)).toEqual(["Lily"]);
  });

  it("case-insensitive deduplication: 'lily' and 'Lily' collapse to one", () => {
    const profiles = [
      p({ id: "lily-lower", name: "lily" }),
      p({ id: "lily-upper", name: "Lily" }),
    ];
    expect(eligibleParentProfiles(profiles, null)).toHaveLength(1);
  });

  it("whitespace-only name excluded", () => {
    const profiles = [p({ id: "blank", name: "   " }), p({ name: "Lily" })];
    expect(eligibleParentProfiles(profiles, null)).toEqual(["Lily"]);
  });
});
