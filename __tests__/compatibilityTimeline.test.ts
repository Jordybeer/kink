import { describe, it, expect } from "vitest";
import type { ContractSnapshot } from "@/types";

// Pure logic test: verify filtering and sorting used by CompatibilityTimeline

function filterByPair(
  contracts: ContractSnapshot[],
  aId: string,
  bId: string,
  aName: string,
  bName: string
): ContractSnapshot[] {
  return contracts.filter((c) => {
    if (c.profileAId && c.profileBId) {
      return (
        (c.profileAId === aId && c.profileBId === bId) ||
        (c.profileAId === bId && c.profileBId === aId)
      );
    }
    const names = new Set([aName.toLowerCase(), bName.toLowerCase()]);
    return names.has(c.profileAName.toLowerCase()) && names.has(c.profileBName.toLowerCase());
  });
}

const base = { matchCount: 5, discussCount: 2, softLimitCount: 1, hardLimitCount: 0 };

const snapshots: ContractSnapshot[] = [
  { id: "1", date: 1000, profileAId: "a1", profileBId: "b1", profileAName: "Alice", profileBName: "Bob", ...base },
  { id: "2", date: 2000, profileAId: "a1", profileBId: "b1", profileAName: "Alice", profileBName: "Bob", ...base },
  { id: "3", date: 3000, profileAId: "a1", profileBId: "b1", profileAName: "Alice", profileBName: "Bob", ...base },
  { id: "4", date: 4000, profileAId: "a1", profileBId: "c1", profileAName: "Alice", profileBName: "Carol", ...base },
  // Legacy: no IDs
  { id: "5", date: 5000, profileAName: "Alice", profileBName: "Bob", ...base },
];

describe("CompatibilityTimeline filtering", () => {
  it("returns only contracts matching the selected pair by ID", () => {
    const result = filterByPair(snapshots, "a1", "b1", "Alice", "Bob");
    expect(result.map((c) => c.id)).toEqual(["1", "2", "3", "5"]);
  });

  it("matches pair regardless of A/B order", () => {
    const result = filterByPair(snapshots, "b1", "a1", "Bob", "Alice");
    expect(result.map((c) => c.id)).toEqual(["1", "2", "3", "5"]);
  });

  it("excludes contracts for a different pair", () => {
    const result = filterByPair(snapshots, "a1", "c1", "Alice", "Carol");
    expect(result.map((c) => c.id)).toEqual(["4"]);
  });

  it("sorts oldest first after filtering", () => {
    const result = filterByPair(snapshots, "a1", "b1", "Alice", "Bob")
      .sort((a, b) => a.date - b.date);
    expect(result[0].id).toBe("1");
    expect(result[result.length - 1].id).toBe("5");
  });

  it("log view sorts newest first (descending)", () => {
    const result = filterByPair(snapshots, "a1", "b1", "Alice", "Bob")
      .sort((a, b) => b.date - a.date);
    expect(result[0].id).toBe("5");
    expect(result[result.length - 1].id).toBe("1");
  });
});
