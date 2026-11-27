import { describe, expect, it } from "vitest";
import { initialTogether, openMoment, patchMoment, saveMoment, discardMoment, moveMonth, calendarContents, updateScene, completeScene, saveAftercare } from "@/app/hotter/journey/togetherSession";

describe("journey moments", () => {
  it("preserves an optional partner when editing and clearing a plan", () => {
    let s = openMoment(initialTogether(), "solo");
    expect(s.draft?.partnerProfileId).toBeUndefined();
    s = patchMoment(s, { note: "Een eigen gedachte" });
    s = saveMoment(s, 1);
    expect(s.moments.find(m => m.id === "solo")?.partnerProfileId).toBeUndefined();
    s = openMoment(s, "evening");
    s = patchMoment(s, { partnerProfileId: undefined });
    s = saveMoment(s, 2);
    expect(s.moments.find(m => m.id === "evening")?.partnerName).toBeUndefined();
  });

  it("rejects invalid date/time and keeps a failed draft intact", () => {
    let s = patchMoment(openMoment(initialTogether(), "evening"), { date: "2026-02-31" });
    const before = s.moments;
    s = saveMoment(s, 1);
    expect(s.error?.field).toBe("date");
    expect(s.moments).toBe(before);
    s = patchMoment(s, { date: "2026-11-28", time: "" });
    s = saveMoment(s, 2);
    expect(s.error?.field).toBe("time");
    s = patchMoment(s, { time: "20:00", note: "Bewaar mij" });
    s = saveMoment(s, 3, true);
    expect(s.error?.field).toBe("save");
    expect(s.draft?.note).toBe("Bewaar mij");
    expect(s.moments).toBe(before);
    s = saveMoment(s, 4);
    expect(s.draft).toBeNull();
    expect(s.moments.find(m => m.id === "evening")?.note).toBe("Bewaar mij");
  });

  it("only completes on explicit save, retains identity and clears reminders", () => {
    const initial = initialTogether();
    let s = openMoment(initial, "evening", true);
    expect(s.moments).toBe(initial.moments);
    const original = initial.moments.find(m => m.id === "evening")!;
    expect(discardMoment(s).moments).toBe(initial.moments);
    s = saveMoment(s, 123);
    const saved = s.moments.find(m => m.id === original.id)!;
    expect(saved).toMatchObject({ title: original.title, date: original.date, note: original.note, partnerProfileId: original.partnerProfileId, status: "completed", completedAt: 123 });
    expect(saved.reminderDaysBefore).toBeUndefined();
  });

  it("exports a discreet calendar event unless details explicitly requested", () => {
    const event = initialTogether().moments.find(m => m.id === "evening")!;
    const discreet = calendarContents(event, false, new Date("2026-11-27T00:00:00Z"));
    expect(discreet).toContain("SUMMARY:Privé moment");
    expect(discreet).not.toContain(event.title!);
    expect(discreet).not.toContain("Jules");
    expect(discreet).toContain("TRIGGER:-P2D");
    expect(calendarContents(event, true)).toContain(event.title!);
  });

  it("keeps scene completion distinct from logbook and requires a separate aftercare choice", () => {
    const initial = initialTogether();
    let s = updateScene(initial, "talk", "intens");
    expect(s.scene.items.find(i => i.id === "talk")?.intensity).toBe("intens");
    s = completeScene(s);
    expect(s.scene.status).toBe("completed");
    expect(s.scene.aftercare).toBeUndefined();
    expect(s.moments).toBe(initial.moments);
    expect(saveAftercare(s, 123)).toBe(s);
    expect(updateScene(s, "talk", "zacht")).toBe(s);
    expect(moveMonth("2026-12", 1)).toBe("2027-01");
  });
});
