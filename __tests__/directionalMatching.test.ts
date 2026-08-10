import { describe, expect, it } from "vitest";
import {
  getCompareCategoryScores,
  getCompareKinkLabel,
  getComparePartnerKinkId,
  getCompareSummary,
} from "@/lib/compare";
import { profileMatchScore } from "@/lib/matching";
import type { KinkEntry, Profile, ProfilePerspective } from "@/types";

function profile(
  id: string,
  perspective: ProfilePerspective,
  entries: Record<string, Partial<KinkEntry>>,
): Profile {
  return {
    id,
    name: id,
    role: perspective === "dominant" ? "Dominant" : "Submissive",
    perspective,
    origin: "own",
    experienceLevel: "gevorderd",
    questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: Object.fromEntries(
      Object.entries(entries).map(([kinkId, entry]) => [
        kinkId,
        { status: null, comment: "", ...entry } satisfies KinkEntry,
      ]),
    ),
  };
}

describe("complementaire directionele matching", () => {
  it("matches A geven only against B ontvangen", () => {
    const a = profile("A", "dominant", { pegging_give: { status: "yes" } });
    const b = profile("B", "dominant", { pegging_receive: { status: "yes" } });

    const result = profileMatchScore(a, b);
    expect(result.comparedTotal).toBe(1);
    expect(result.overall).toBe(100);
    expect(result.counts.perfect).toBe(1);
  });

  it("does not mistake two give answers for a complementary match", () => {
    const a = profile("A", "dominant", { pegging_give: { status: "yes" } });
    const b = profile("B", "submissive", { pegging_give: { status: "yes" } });

    const result = profileMatchScore(a, b);
    expect(result.comparedTotal).toBe(0);
    expect(result.overall).toBe(0);
    expect(result.counts.perfect).toBe(0);
  });

  it("keeps the pairing independent from Dominant/Submissive perspective", () => {
    const dominantReceiver = profile("A", "dominant", { pegging_receive: { status: "yes" } });
    const dominantGiver = profile("B", "dominant", { pegging_give: { status: "yes" } });
    const submissiveReceiver = profile("C", "submissive", { pegging_receive: { status: "yes" } });

    expect(profileMatchScore(dominantReceiver, dominantGiver).overall).toBe(100);
    expect(profileMatchScore(submissiveReceiver, dominantGiver).overall).toBe(100);
  });

  it("applies a hard limit only to the concrete complementary direction", () => {
    const a = profile("A", "dominant", {
      pegging_give: { status: "hard_no" },
      pegging_receive: { status: "yes" },
    });
    const b = profile("B", "submissive", {
      pegging_receive: { status: "yes" },
      pegging_give: { status: "yes" },
    });

    const result = profileMatchScore(a, b);
    expect(result.comparedTotal).toBe(2);
    expect(result.counts.limit).toBe(1);
    expect(result.counts.perfect).toBe(1);
    expect(result.overall).toBe(50);
  });

  it("preserves Voor hen semantics on the complementary pair", () => {
    const a = profile("A", "dominant", { pegging_give: { status: "yes" } });
    const b = profile("B", "submissive", { pegging_receive: { status: "no" } });

    const result = profileMatchScore(a, b);
    expect(result.comparedTotal).toBe(1);
    expect(result.counts.discuss).toBe(1);
    expect(result.counts.limit).toBe(0);
  });

  it("does not expose a private counterpart through matching", () => {
    const a = profile("A", "dominant", { pegging_give: { status: "yes" } });
    const b = profile("B", "submissive", {
      pegging_receive: { status: "yes", privateResponse: true },
    });

    const result = profileMatchScore(a, b);
    expect(result.comparedTotal).toBe(0);
    expect(result.counts.perfect).toBe(0);
  });

  it("uses the same complementary pairing in category scores and compare summary", () => {
    const a = profile("A", "dominant", { pegging_give: { status: "yes" } });
    const b = profile("B", "submissive", { pegging_receive: { status: "yes" } });

    const penetration = getCompareCategoryScores(a, b).find((item) => item.category === "penetration");
    expect(penetration?.compared).toBe(1);
    expect(penetration?.rate).toBe(1);
    expect(getCompareSummary(a, b).score).toBe(100);
  });

  it("makes the compare direction explicit and routes B to the counterpart ID", () => {
    expect(getComparePartnerKinkId("pegging_give")).toBe("pegging_receive");
    expect(getComparePartnerKinkId("pegging_receive")).toBe("pegging_give");
    expect(getComparePartnerKinkId("spanking_hand")).toBe("spanking_hand");

    expect(getCompareKinkLabel("pegging_give", "Pegging — giving")).toBe("Pegging — geven ↔ ontvangen");
    expect(getCompareKinkLabel("pegging_receive", "Pegging — receiving")).toBe("Pegging — ontvangen ↔ geven");
    expect(getCompareKinkLabel("spanking_hand", "Spanking — hand")).toBe("Spanking — hand");
  });
});
