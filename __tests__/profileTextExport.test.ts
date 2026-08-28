import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
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
    ice_play: {
      status: "yes",
      comment: "zichtbare notitie",
      tags: ["vraag eerst"],
    },
    latex_rubber: {
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

const ICE_PLAY_NAME = KINKS.find((kink) => kink.id === "ice_play")!.name;
const LATEX_NAME = KINKS.find((kink) => kink.id === "latex_rubber")!.name;

describe("profile text export", () => {
  it("omits every trace of private house and custom answers by default", () => {
    const text = buildProfileTextExport(PROFILE, 5, {
      generatedAt: new Date("2026-07-28T00:00:00Z"),
    });

    expect(text).toContain(ICE_PLAY_NAME);
    expect(text).toContain("[Heel graag]");
    expect(text).toContain("een voorkeur of overlap is geen toestemming");
    expect(text).toContain("zichtbare notitie");
    expect(text).toContain("Zichtbaar eigen ding");
    expect(text).not.toContain(LATEX_NAME);
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

    expect(text).toContain(LATEX_NAME);
    expect(text).toContain("geheime notitie");
    expect(text).toContain("Geheime custom naam");
    expect(text).toContain("custom geheim");
  });
});
