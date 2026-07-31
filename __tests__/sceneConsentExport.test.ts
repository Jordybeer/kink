import { describe, expect, it } from "vitest";
import type { SceneRecord } from "@/types";
import { sceneForConsentExport } from "@/lib/sceneConsentExport";

function scene(): SceneRecord {
  return {
    id: "scene",
    title: "Gewijzigde titel",
    profileAId: "a",
    profileBId: "b",
    profileAName: "A",
    profileBName: "B",
    items: [{ id: "changed", name: "Gewijzigd", intensity: "intens", duration: "5 min", note: "", fromKink: false }],
    safeword: "groen",
    status: "planned",
    createdAt: 1,
    updatedAt: 3,
    consentLockedAt: 2,
    consentAgreement: {
      schema: 1,
      sceneId: "scene",
      title: "Vastgezette titel",
      profileAId: "a",
      profileBId: "b",
      profileAProofHash: "proof-a",
      profileBProofHash: "proof-b",
      safeword: "rood",
      items: [{ id: "locked", name: "Rope", intensity: "midden", duration: "10 min", note: "rustig", fromKink: true }],
    },
  };
}

describe("scene consent export", () => {
  it("exports the immutable agreement instead of mutable scene fields", () => {
    const exported = sceneForConsentExport(scene());
    expect(exported.title).toBe("Vastgezette titel");
    expect(exported.safeword).toBe("rood");
    expect(exported.items.map((item) => item.id)).toEqual(["locked"]);
  });
});
