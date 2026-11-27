import { describe, expect, it } from "vitest";
import { initialRelationship, relationshipModel, selectRelationship, toggleDiscussion, changeResponse, isDiscussed } from "@/app/hotter/journey/relationshipSession";

describe("journey relationship", () => {
  it("uses explicit visible answers and excludes private values from comparison", () => {
    const state = initialRelationship();
    const model = relationshipModel(state);
    expect(model.facts.some(f => f.kind === "shared")).toBe(true);
    expect(model.facts.some(f => f.kind === "conflict" || f.kind === "limit")).toBe(true);
    expect(model.facts.some(f => f.kinkAId === "aftercare_verbal")).toBe(false);
    expect(model.unpaired.some(f => f.kinkAId === "aftercare_verbal")).toBe(true);
  });

  it("keeps an explicit acknowledgement through swapping columns and unchanged linked perspectives", () => {
    let state = initialRelationship();
    const fact = relationshipModel(state).facts.find(f => f.kinkAId === "aftercare_physical")!;
    expect(fact).toBeDefined();
    state = toggleDiscussion(state, fact.id);
    expect(isDiscussed(state, fact)).toBe(true);
    state = selectRelationship(state, "jules", "noor");
    const reverse = relationshipModel(state).facts.find(f => f.kinkBId === "aftercare_physical")!;
    expect(isDiscussed(state, reverse)).toBe(true);
    state = selectRelationship(state, "noor-alt", "jules");
    const linked = relationshipModel(state).facts.find(f => f.kinkAId === "aftercare_physical")!;
    expect(isDiscussed(state, linked)).toBe(true);
  });

  it("reopens a changed meaning and does not restore an outdated acknowledgement", () => {
    let state = initialRelationship();
    const fact = relationshipModel(state).facts.find(f => f.kinkAId === "titels_aanspreekvormen")!;
    state = toggleDiscussion(state, fact.id);
    expect(isDiscussed(state, fact)).toBe(true);
    state = selectRelationship(state, "noor-alt", "jules");
    state = selectRelationship(state, "noor", "jules");
    expect(isDiscussed(state, fact)).toBe(false);
  });

  it("cannot edit the shared profile or compare two perspectives of the same person", () => {
    const state = initialRelationship();
    expect(changeResponse(state, "jules", "aftercare_physical", "hard_no")).toBe(state);
    expect(selectRelationship(state, "noor", "noor-alt")).toBe(state);
    const empty = selectRelationship(state, "noor", "jules-empty");
    expect(relationshipModel(empty).facts).toHaveLength(0);
  });
});
