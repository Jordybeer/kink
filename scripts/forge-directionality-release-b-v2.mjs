import fs from "node:fs";
import "./forge-directionality-release-b.mjs";

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Niet gevonden in ${path}: ${before.slice(0, 100)}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Niet uniek in ${path}`);
  fs.writeFileSync(path, source.slice(0, index) + after + source.slice(index + before.length));
}

const questionnaire = "__tests__/questionnaire.test.ts";
replaceOnce(
  questionnaire,
  `  it("does not let a hard limit on urine drinking close a Golden Shower branch", () => {
    const current = dynamicProfile();
    current.entries.watersports_geven = { status: "yes", comment: "" };
    current.entries.urine_intiem = { status: "hard_no", comment: "absoluut niet" };
    const runtime = getQuestionnaireRuntime(current);
    expect(runtime.pendingProbes.map((probe) => probe.targetKinkId)).toContain("watersports_ontvangen");
    expect(current.entries.urine_intiem.status).toBe("hard_no");
  });`,
  `  it("never infers receiving Golden Shower from explicitly liking giving it", () => {
    const current = dynamicProfile();
    current.entries.watersports_geven = { status: "yes", comment: "geven is expliciet" };
    current.entries.urine_intiem = { status: "hard_no", comment: "absoluut niet" };
    const runtime = getQuestionnaireRuntime(current);
    expect(runtime.pendingProbes.map((probe) => probe.targetKinkId)).not.toContain("watersports_ontvangen");
    expect(current.entries.watersports_ontvangen).toBeUndefined();
    expect(current.entries.urine_intiem.status).toBe("hard_no");
  });`,
);

replaceOnce(
  questionnaire,
  `    const catalog = catalogSlice("voyeurism", "watching_others", "cum_play", "anal_fingering");
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ voyeurism: "maybe" })).map((kink) => kink.id);
    const positive = rankQuestionnaireCandidates(catalog, entriesWith({ voyeurism: "yes" })).map((kink) => kink.id);
    expect(positive.indexOf("watching_others")).toBeLessThan(neutral.indexOf("watching_others"));
    expect(positive.filter((id) => id === "cum_play" || id === "anal_fingering"))
      .toEqual(neutral.filter((id) => id === "cum_play" || id === "anal_fingering"));`,
  `    const catalog = catalogSlice("voyeurism", "watching_others", "cum_play", "anal_fingering_give");
    const neutral = rankQuestionnaireCandidates(catalog, entriesWith({ voyeurism: "maybe" })).map((kink) => kink.id);
    const positive = rankQuestionnaireCandidates(catalog, entriesWith({ voyeurism: "yes" })).map((kink) => kink.id);
    expect(positive.indexOf("watching_others")).toBeLessThan(neutral.indexOf("watching_others"));
    expect(positive.filter((id) => id === "cum_play" || id === "anal_fingering_give"))
      .toEqual(neutral.filter((id) => id === "cum_play" || id === "anal_fingering_give"));`,
);

replaceOnce(
  questionnaire,
  `      ["anal_fingering", "anal_sex"],`,
  `      ["anal_fingering_give", "anal_sex_give"],
      ["anal_fingering_receive", "anal_sex_receive"],`,
);

const integration = "__tests__/directionalityIntegration.test.ts";
replaceOnce(
  integration,
  `    const spanking = directionalComparisonEntries(a, b, "spanking_hand");
    expect(spanking.partnerKinkId).toBe("spanking_hand");
    expect(spanking.partnerEntry.status).toBe("yes");`,
  `    const goldenA = { watersports_geven: entry("yes") };
    const goldenB = { watersports_ontvangen: entry("willing") };
    const golden = directionalComparisonEntries(goldenA, goldenB, "watersports_geven");
    expect(golden.partnerKinkId).toBe("watersports_ontvangen");
    expect(golden.partnerEntry.status).toBe("willing");

    const spanking = directionalComparisonEntries(a, b, "spanking_hand");
    expect(spanking.partnerKinkId).toBe("spanking_hand");
    expect(spanking.partnerEntry.status).toBe("yes");`,
);

replaceOnce(
  integration,
  `  it("records scene usage on A's concrete direction and B's complementary direction", () => {
    const aId = useStore.getState().createProfile("A", "Dominant");
    const bId = useStore.getState().createProfile("B", "Submissive");
    const sceneId = useStore.getState().saveScene({
      title: "Directionele scène",
      profileAId: aId, profileBId: bId, profileAName: "A", profileBName: "B",
      items: [{ id: "peg", name: "Pegging — geven ↔ ontvangen", kinkId: "pegging_give", intensity: "midden", duration: "", note: "", fromKink: true }],
      status: "planned",
    });
    useStore.getState().completeScene(sceneId, { completedAt: Date.now(), trafficLight: "green", wentWell: "", remember: "" });

    const a = useStore.getState().profiles.find((candidate) => candidate.id === aId)!;
    const b = useStore.getState().profiles.find((candidate) => candidate.id === bId)!;
    expect(a.entries.pegging_give?.usedInScene).toBe(1);
    expect(a.entries.pegging_receive?.usedInScene).toBeUndefined();
    expect(b.entries.pegging_receive?.usedInScene).toBe(1);
    expect(b.entries.pegging_give?.usedInScene).toBeUndefined();
  });`,
  `  it("records scene usage on A's concrete direction and B's complementary direction generically", () => {
    for (const [kinkId, partnerId] of [
      ["pegging_give", "pegging_receive"],
      ["fisting_anal_give", "fisting_anal_receive"],
    ] as const) {
      useStore.setState(useStore.getInitialState());
      const aId = useStore.getState().createProfile("A", "Dominant");
      const bId = useStore.getState().createProfile("B", "Submissive");
      const sceneId = useStore.getState().saveScene({
        title: "Directionele scène",
        profileAId: aId, profileBId: bId, profileAName: "A", profileBName: "B",
        items: [{ id: kinkId, name: kinkId, kinkId, intensity: "midden", duration: "", note: "", fromKink: true }],
        status: "planned",
      });
      useStore.getState().completeScene(sceneId, { completedAt: Date.now(), trafficLight: "green", wentWell: "", remember: "" });

      const a = useStore.getState().profiles.find((candidate) => candidate.id === aId)!;
      const b = useStore.getState().profiles.find((candidate) => candidate.id === bId)!;
      expect(a.entries[kinkId]?.usedInScene, kinkId).toBe(1);
      expect(b.entries[partnerId]?.usedInScene, partnerId).toBe(1);
    }
  });`,
);

replaceOnce(
  integration,
  `      pegging_give: entry("yes", { comment: "geven" }),
      pegging_receive: entry("hard_no", { comment: "ontvangen grens" }),
      spanking_hand: entry("maybe", { comment: noise(9000) }),`,
  `      pegging_give: entry("yes", { comment: "geven" }),
      pegging_receive: entry("hard_no", { comment: "ontvangen grens" }),
      fisting_anal_give: entry("willing", { comment: "fisten geven" }),
      fisting_anal_receive: entry("maybe", { comment: "fisten ontvangen" }),
      spanking_hand: entry("maybe", { comment: noise(9000) }),`,
);
replaceOnce(
  integration,
  `    expect(decoded.entries.pegging_receive?.status).toBe("hard_no");
    expect(decoded.entries.pegging).toBeUndefined();`,
  `    expect(decoded.entries.pegging_receive?.status).toBe("hard_no");
    expect(decoded.entries.fisting_anal_give?.status).toBe("willing");
    expect(decoded.entries.fisting_anal_receive?.status).toBe("maybe");
    expect(decoded.entries.pegging).toBeUndefined();
    expect(decoded.entries.fisting_anal).toBeUndefined();`,
);

console.log("Release B stale tests en generieke consumer-regressies bijgewerkt.");
