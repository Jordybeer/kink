import { describe, it, expect } from "vitest";
import {
  formatSceneDisplayDate,
  formatSceneFilename,
  formatSceneParticipantLine,
  summarizeIntensities,
} from "@/lib/scenePdf";
import type { SceneItem } from "@/types";

function item(intensity: SceneItem["intensity"]): SceneItem {
  return { id: intensity, name: intensity, intensity, duration: "", note: "", fromKink: false };
}

describe("formatSceneFilename", () => {
  it("normal title + date", () =>
    expect(formatSceneFilename("Saturday Night", "2026-07-04")).toBe("kink-scene-saturday-night-2026-07-04.pdf"));

  it("empty title → menu fallback", () =>
    expect(formatSceneFilename("", "2026-07-04")).toBe("kink-scene-menu-2026-07-04.pdf"));

  it("strips diacritics and special chars", () => {
    const result = formatSceneFilename("Mooi & ééns?", "2026-07-04");
    expect(result).toBe("kink-scene-mooi-eens-2026-07-04.pdf");
  });

  it("missing date → uses injected now", () =>
    expect(formatSceneFilename("Saturday", undefined, new Date(2026, 6, 4, 12))).toBe("kink-scene-saturday-2026-07-04.pdf"));
});

describe("scene PDF display copy", () => {
  it("formats an ISO date as calm Dutch print copy", () => {
    expect(formatSceneDisplayDate("2026-08-22")).toBe("22 augustus 2026");
    expect(formatSceneDisplayDate("not-a-date")).toBe("not-a-date");
  });

  it("does not repeat participant names when the title already is the pair", () => {
    expect(formatSceneParticipantLine("Evvv & Hhh", "Evvv", "Hhh")).toBeNull();
    expect(formatSceneParticipantLine("Zaterdagavond", "Evvv", "Hhh")).toBe("Evvv + Hhh");
  });
});

describe("summarizeIntensities", () => {
  it("mixed counts → correct sentence", () => {
    const items = [...Array(3).fill(item("zacht")), ...Array(2).fill(item("midden")), item("intens")];
    const { zacht, midden, intens, total, sentence } = summarizeIntensities(items);
    expect(zacht).toBe(3);
    expect(midden).toBe(2);
    expect(intens).toBe(1);
    expect(total).toBe(6);
    expect(sentence).toBe("3× zacht · 2× midden · 1× intens · totaal 6 items");
  });

  it("empty → Geen items", () => {
    const { total, sentence } = summarizeIntensities([]);
    expect(total).toBe(0);
    expect(sentence).toBe("Geen items");
  });

  it("only one intensity omits others from sentence", () => {
    const { sentence } = summarizeIntensities([item("intens"), item("intens")]);
    expect(sentence).toBe("2× intens · totaal 2 items");
  });
});
