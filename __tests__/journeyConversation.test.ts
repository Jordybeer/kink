import { describe, expect, it } from "vitest";
import { startConversation, transitionConversation } from "@/app/hotter/journey/conversationSession";
import { questionnaireCanonicalProbeTarget } from "@/lib/questionnaireMetadata";

describe("journey conversation", () => {
  it("uses the real canonical probe after a positive response and never pre-fills it", () => {
    const initial = startConversation();
    const id = initial.current!.id;
    const target = questionnaireCanonicalProbeTarget(id);
    expect(id).toBe("dominance_submission");
    const holding = transitionConversation(initial, { type: "choose", id, status: "yes" });
    expect(holding.entries[id].status).toBe("yes");
    expect(holding.current!.id).toBe(id);
    const next = transitionConversation(holding, { type: "advance", revision: holding.revision });
    expect(next.current!.id).toBe(target);
    expect(next.current!.relation).toBe("followup");
    expect(next.entries[target!]?.status ?? null).toBeNull();
    const answered = transitionConversation(next, { type: "choose", id: target!, status: "yes" });
    const after = transitionConversation(answered, { type: "advance", revision: answered.revision });
    expect(after.current?.relation).not.toBe("followup");
  });

  it("does not cue a canonical probe after a hard limit", () => {
    const initial = startConversation();
    const id = initial.current!.id;
    const holding = transitionConversation(initial, { type: "choose", id, status: "hard_no" });
    const next = transitionConversation(holding, { type: "advance", revision: holding.revision });
    expect(next.current!.id).not.toBe(questionnaireCanonicalProbeTarget(id));
    expect(next.current!.relation).toBe("new");
    expect(next.entries[id].status).toBe("hard_no");
  });

  it("keeps per-topic privacy, curiosity and agreement markers separate from answers", () => {
    let state = startConversation();
    const id = state.current!.id;
    state = transitionConversation(state, { type: "flag", id, flag: "privateResponse" });
    state = transitionConversation(state, { type: "flag", id, flag: "curious" });
    state = transitionConversation(state, { type: "tag", id, tag: "vraag eerst" });
    expect(state.entries[id]).toMatchObject({ status: null, privateResponse: true, curious: true, tags: ["vraag eerst"] });
    state = transitionConversation(state, { type: "skip", id });
    expect(state.deferred).toContain(id);
    expect(state.entries[id].status).toBeNull();
    expect(state.entries[state.current!.id]?.privateResponse).toBeUndefined();
  });

  it("defers every eligible topic once, then offers an explicit revisit", () => {
    let state = startConversation();
    const seen = new Set<string>();
    for (let i = 0; state.current && i < 1000; i++) {
      const id = state.current.id;
      expect(seen.has(id)).toBe(false);
      seen.add(id);
      state = transitionConversation(state, { type: "skip", id });
    }
    expect(state.current).toBeNull();
    expect(seen.size).toBeGreaterThan(1);
    expect(state.deferred).toHaveLength(seen.size);
    expect(Object.values(state.entries).filter(e => e.status != null)).toHaveLength(0);
    const revisited = transitionConversation(state, { type: "revisit" });
    expect(revisited.current).not.toBeNull();
    expect(revisited.deferred).toHaveLength(0);
  });

  it("ignores stale timers and stale topic events; edits preserve explicit meaning", () => {
    let state = startConversation();
    const id = state.current!.id;
    state = transitionConversation(state, { type: "choose", id, status: "yes" });
    const oldRevision = state.revision;
    state = transitionConversation(state, { type: "choose", id, status: "maybe" });
    expect(transitionConversation(state, { type: "advance", revision: oldRevision })).toBe(state);
    state = transitionConversation(state, { type: "advance", revision: state.revision });
    expect(transitionConversation(state, { type: "choose", id, status: "yes" })).toBe(state);
    state = transitionConversation(state, { type: "overview" });
    state = transitionConversation(state, { type: "edit", id });
    state = transitionConversation(state, { type: "choose", id, status: "hard_no" });
    expect(state.pending).toBe(false);
    expect(state.entries[id].status).toBe("hard_no");
    state = transitionConversation(state, { type: "overview" });
    expect(state.mode).toBe("overview");
  });
});
