import { describe, expect, it } from "vitest";
import { hashContractContent, type ContractVersionContent } from "@/lib/contractLifecycle";

function content(commentA?: string, commentB?: string): ContractVersionContent {
  return {
    schema: 1,
    profileA: {
      profileId: "a",
      profileName: "Alex",
      role: "Dominant",
      verificationCode: "a-code",
    },
    profileB: {
      profileId: "b",
      profileName: "Sam",
      role: "Submissive",
      verificationCode: "b-code",
    },
    preamble: "Wij maken deze afspraken bewust samen.",
    createdAt: 100,
    signalsA: { green: "Meer", amber: "Geel", red: "Rood", black: "Stop" },
    signalsB: { green: "Meer", amber: "Geel", red: "Rood", black: "Stop" },
    aftercareA: [],
    aftercareB: [],
    shared: [{
      name: "Rope bondage",
      statusA: "yes",
      statusB: "willing",
      ...(commentA ? { commentA } : {}),
      ...(commentB ? { commentB } : {}),
    }],
    softLimits: [],
    hardLimits: [],
    hardLimitDetails: [],
    discuss: [],
  };
}

describe("contract participant notes", () => {
  it("binds each participant note into the canonical contract hash", async () => {
    const withoutNotes = await hashContractContent(content());
    const withAlex = await hashContractContent(content("Polsen niet te strak."));
    const withBoth = await hashContractContent(content("Polsen niet te strak.", "Rustig opbouwen."));

    expect(withAlex).not.toBe(withoutNotes);
    expect(withBoth).not.toBe(withAlex);
  });

  it("keeps the two participants distinct in canonical content", async () => {
    const alexOnly = await hashContractContent(content("Eerst rustig opbouwen.", undefined));
    const samOnly = await hashContractContent(content(undefined, "Eerst rustig opbouwen."));
    expect(alexOnly).not.toBe(samOnly);
  });
});
