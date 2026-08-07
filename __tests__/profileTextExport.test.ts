import { describe, expect, it } from "vitest";
import { buildProfileTextExport } from "@/lib/profileTextExport";
import type { Profile } from "@/types";

const PROFILE: Profile = {
  id: "profile-a",
  name: "Alice",
  role: "Switch",
  experienceLevel: "ervaren",
  createdAt: 1,
  updatedAt: 1,
  customKinks: [
    { id: "custom-visible", name: "Zichtbaar eigen ding" },
    { id: "custom-private", name: "Geheime custom naam" },
  ],
  entries: {
    spanking_hand: {
      status: "yes",
      comment: "zichtbare notitie",
      tags: ["vraag eerst"],
    },
    flogging: {
      status: "hard_no",
      comment: "geheime notitie",
      tags: ["alleen privé"],
      privateResponse: true,
    },
    "custom-visible": { status: "maybe", comment: "bespreken" },
    "custom-private": {
      status: "yes",
      comment: "custom geheim",
      privateResponse: true,
    },
  },
};

describe("profile text export", () => {
  it("omits every trace of private house and custom answers by default", () => {
    const text = buildProfileTextExport(PROFILE, 5, {
      generatedAt: new Date("2026-07-28T00:00:00Z"),
    });

    expect(text).toContain("Spanking (hand)");
    expect(text).toContain("zichtbare notitie");
    expect(text).toContain("Zichtbaar eigen ding");
    expect(text).not.toContain("Flogging");
    expect(text).not.toContain("geheime notitie");
    expect(text).not.toContain("alleen privé");
    expect(text).not.toContain("Geheime custom naam");
    expect(text).not.toContain("custom geheim");
    expect(text).not.toContain("[PRIVÉ]");
  });

  it("includes private answers only after explicit export opt-in", () => {
    const text = buildProfileTextExport(PROFILE, 5, {
      includePrivateResponses: true,
      generatedAt: new Date("2026-07-28T00:00:00Z"),
    });

    expect(text).toContain("Flogging");
    expect(text).toContain("geheime notitie");
    expect(text).toContain("Geheime custom naam");
    expect(text).toContain("custom geheim");
  });
});
