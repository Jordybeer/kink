import { describe, it, expect } from "vitest";
import { buildPreamble, buildIntimatePreamble, buildFormalPreamble } from "@/lib/contractPreamble";

const base = {
  nameA: "Lily",
  roleA: "Dominant",
  nameB: "Sam",
  roleB: "Submissive",
  levelA: "gevorderd",
  levelB: "gevorderd",
};

describe("buildIntimatePreamble", () => {
  it("uses nickname-and-role intro for Dom/Sub", () => {
    const text = buildIntimatePreamble(base);
    expect(text).toContain("Dit verbond wordt gesloten tussen Lily (Dominant) en Sam (Submissive).");
  });

  it("names the submissive as the one offering and the dominant as the one accepting", () => {
    const text = buildIntimatePreamble(base);
    expect(text).toContain("biedt Sam zichzelf aan");
    expect(text).toContain("Lily aanvaardt die gave");
  });

  it("flips offer/accept when A is sub and B is dom", () => {
    const text = buildIntimatePreamble({ ...base, roleA: "Submissive", roleB: "Dominant" });
    expect(text).toContain("biedt Lily zichzelf aan");
    expect(text).toContain("Sam aanvaardt die gave");
  });

  it("falls back to mutual body for switch + switch", () => {
    const text = buildIntimatePreamble({ ...base, roleA: "Switch", roleB: "Switch" });
    expect(text).toContain("Door dit verbond bevestigen Lily en Sam hun grenzen");
    expect(text).not.toContain("biedt Sam zichzelf aan");
    expect(text).not.toContain("biedt Lily zichzelf aan");
  });
});

describe("buildFormalPreamble", () => {
  const formal = { ...base, realNameA: "Lily Vermeer", realNameB: "Sam Janssen" };

  it("uses the 'hierna genoemd de' intro with real names + nickname brackets", () => {
    const text = buildFormalPreamble(formal);
    expect(text).toContain(
      "Dit verbond wordt gesloten tussen Lily Vermeer, hierna genoemd de Dominant, en Sam Janssen, hierna genoemd de Submissive."
    );
  });

  it("uses role labels (not names) in the body for Dom/Sub", () => {
    const text = buildFormalPreamble(formal);
    expect(text).toContain("biedt de Submissive zich aan");
    expect(text).toContain("De Dominant aanvaardt die toewijding");
  });

  it("falls back to a mutual formal body for switch + switch", () => {
    const text = buildFormalPreamble({ ...formal, roleA: "Switch", roleB: "Switch" });
    expect(text).toContain("bevestigen Lily Vermeer en Sam Janssen hun grenzen");
    expect(text).not.toContain("biedt de Submissive zich aan");
  });
});

describe("buildPreamble dispatcher", () => {
  it("uses the intimate template when both real names are empty/undefined", () => {
    const text = buildPreamble(base);
    expect(text).toContain("(Dominant)");
    expect(text).not.toContain("hierna genoemd de");
  });

  it("treats a one-sided real name as 'no real names'", () => {
    const textOnlyA = buildPreamble({ ...base, realNameA: "Lily Vermeer", realNameB: "" });
    const textOnlyB = buildPreamble({ ...base, realNameA: undefined, realNameB: "Sam Janssen" });
    expect(textOnlyA).not.toContain("hierna genoemd de");
    expect(textOnlyB).not.toContain("hierna genoemd de");
  });

  it("uses the formal template when both real names are present", () => {
    const text = buildPreamble({ ...base, realNameA: "Lily Vermeer", realNameB: "Sam Janssen" });
    expect(text).toContain("hierna genoemd de Dominant");
    expect(text).toContain("hierna genoemd de Submissive");
  });
});

describe("guidance clause", () => {
  it("appends a guidance clause when beginner pairs with ervaren — intimate variant", () => {
    const text = buildIntimatePreamble({ ...base, levelA: "beginner", levelB: "ervaren" });
    expect(text).toContain("Lily brengt nieuwsgierigheid");
    expect(text).toContain("Sam brengt geduld en begeleiding");
  });

  it("appends a guidance clause when beginner pairs with diepgaand — formal variant", () => {
    const text = buildFormalPreamble({
      ...base,
      realNameA: "Lily Vermeer",
      realNameB: "Sam Janssen",
      levelA: "diepgaand",
      levelB: "beginner",
    });
    expect(text).toContain("Sam brengt nieuwsgierigheid");
    expect(text).toContain("Lily brengt geduld en begeleiding");
  });

  it("omits the guidance clause when both are gevorderd", () => {
    const text = buildIntimatePreamble(base);
    expect(text).not.toContain("brengt nieuwsgierigheid");
  });
});
