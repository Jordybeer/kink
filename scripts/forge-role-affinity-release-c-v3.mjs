import fs from "node:fs";
import { pathToFileURL } from "node:url";

await import(pathToFileURL(new URL("./forge-role-affinity-release-c-v2.mjs", import.meta.url).pathname).href + `?v=${Date.now()}`);

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Niet gevonden in ${path}: ${before.slice(0, 100)}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Niet uniek in ${path}`);
  fs.writeFileSync(path, source.slice(0, index) + after + source.slice(index + before.length));
}

function replaceAllExact(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Niet gevonden in ${path}: ${before}`);
  fs.writeFileSync(path, source.split(before).join(after));
}

// ---------------------------------------------------------------------------
// Generic share/sanitize/export tests moeten geen kink-ID gebruiken die bewust
// een semantische directionality-migratie ondergaat.
// ---------------------------------------------------------------------------
const share = "__tests__/shareProfile.test.ts";
replaceAllExact(share, "spanking_hand", "latex_rubber");
replaceAllExact(share, "flogging", "lingerie");
replaceOnce(
  share,
  `        latex_rubber:      { status: "yes",     desire: null, experienced: null, score: null, comment: "" },
        lingerie:           { status: "willing", desire: null, experienced: null, score: null, comment: "" },
        caning:             { status: "maybe",   desire: null, experienced: null, score: null, comment: "" },
        cropping:           { status: "no",      desire: null, experienced: null, score: null, comment: "" },
        spanking_implement: { status: "hard_no", desire: null, experienced: null, score: null, comment: "" },`,
  `        latex_rubber: { status: "yes",     desire: null, experienced: null, score: null, comment: "" },
        lingerie:     { status: "willing", desire: null, experienced: null, score: null, comment: "" },
        uniforms:     { status: "maybe",   desire: null, experienced: null, score: null, comment: "" },
        feet:         { status: "no",      desire: null, experienced: null, score: null, comment: "" },
        leather:      { status: "hard_no", desire: null, experienced: null, score: null, comment: "" },`,
);
replaceOnce(
  share,
  `    expect(decoded.entries.latex_rubber.status).toBe("yes");
    expect(decoded.entries.lingerie.status).toBe("willing");
    expect(decoded.entries.caning.status).toBe("maybe");
    expect(decoded.entries.cropping.status).toBe("no");
    expect(decoded.entries.spanking_implement.status).toBe("hard_no");`,
  `    expect(decoded.entries.latex_rubber.status).toBe("yes");
    expect(decoded.entries.lingerie.status).toBe("willing");
    expect(decoded.entries.uniforms.status).toBe("maybe");
    expect(decoded.entries.feet.status).toBe("no");
    expect(decoded.entries.leather.status).toBe("hard_no");`,
);
replaceOnce(
  share,
  `  it("v2: collapses legacy sg/sr into status (worst-of logic)", () => {
    const legacyPayload = { v: 2, id: "x", n: "n", r: "r", e: "beginner", ca: 0, ua: 0,
      s: " ".repeat(100), sg: "y" + " ".repeat(99), sr: "n" + " ".repeat(99) };
    const encoded = btoa(JSON.stringify(legacyPayload)).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
    const decoded = decodeProfileCompact(encoded);
    expect(decoded.entries[Object.keys(decoded.entries)[0]]?.status).toBe("no");
  });`,
  `  it("v2: collapses legacy sg/sr into status (worst-of logic) on an active historical ID", () => {
    const historicalId = "latex_rubber";
    const index = LEGACY_COMPACT_KINK_IDS_V2.indexOf(historicalId);
    const at = (char: string) => `${" ".repeat(index)}${char}`;
    const legacyPayload = { v: 2, id: "x", n: "n", r: "r", e: "beginner", ca: 0, ua: 0,
      s: " ".repeat(index + 1), sg: at("y"), sr: at("n") };
    const encoded = btoa(JSON.stringify(legacyPayload)).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
    const decoded = decodeProfileCompact(encoded);
    expect(decoded.entries[historicalId]?.status).toBe("no");
  });`,
);

const sanitize = "__tests__/sanitizeProfile.test.ts";
replaceAllExact(sanitize, "spanking_hand", "latex_rubber");
replaceAllExact(sanitize, "flogging", "lingerie");

const textExport = "__tests__/profileTextExport.test.ts";
replaceOnce(
  textExport,
  `import { buildProfileTextExport } from "@/lib/profileTextExport";`,
  `import { KINKS } from "@/lib/kinks";
import { buildProfileTextExport } from "@/lib/profileTextExport";`,
);
replaceAllExact(textExport, "spanking_hand", "ice_play");
replaceAllExact(textExport, "flogging", "latex_rubber");
replaceOnce(
  textExport,
  `describe("profile text export", () => {`,
  `const ICE_PLAY_NAME = KINKS.find((kink) => kink.id === "ice_play")!.name;
const LATEX_NAME = KINKS.find((kink) => kink.id === "latex_rubber")!.name;

describe("profile text export", () => {`,
);
replaceAllExact(textExport, `expect(text).toContain("Spanking (hand)");`, `expect(text).toContain(ICE_PLAY_NAME);`);
replaceAllExact(textExport, `expect(text).not.toContain("Flogging");`, `expect(text).not.toContain(LATEX_NAME);`);
replaceAllExact(textExport, `expect(text).toContain("Flogging");`, `expect(text).toContain(LATEX_NAME);`);

const matching = "__tests__/matchingScore.test.ts";
replaceOnce(
  matching,
  `  const [k0, k1, k2, k3] = KINKS;`,
  `  const [k0, k1, k2, k3] = ["latex_rubber", "lingerie", "uniforms", "feet"]
    .map((id) => KINKS.find((kink) => kink.id === id)!);`,
);

// ---------------------------------------------------------------------------
// Questionnaire tests: oude single IDs zijn niet langer geldige fixtures.
// De give-kant is de canonical metadata-source; receive krijgt eigen same-side
// mappings. Daarna herschrijven we de perspective-regressie expliciet.
// ---------------------------------------------------------------------------
const questionnaire = "__tests__/questionnaire.test.ts";
for (const [oldId, giveId] of [
  ["spanking_hand", "spanking_hand_give"],
  ["spanking_implement", "spanking_implement_give"],
  ["flogging", "flogging_give"],
  ["rope_bondage", "rope_bondage_give"],
  ["shibari", "shibari_give"],
  ["handcuffs", "handcuffs_give"],
  ["leather_cuffs", "leather_cuffs_give"],
  ["gag_ball", "gag_ball_give"],
  ["gag_bit", "gag_bit_give"],
  ["blindfold", "blindfold_give"],
  ["sound_deprivation", "sound_deprivation_give"],
]) {
  replaceAllExact(questionnaire, `"${oldId}"`, `"${giveId}"`);
}
replaceOnce(
  questionnaire,
  `import { CATEGORIES, KINKS } from "@/lib/kinks";`,
  `import { directionalPairForKinkId } from "@/lib/directionality";
import { CATEGORIES, KINKS } from "@/lib/kinks";`,
);
replaceOnce(
  questionnaire,
  `  it("does not treat perspective itself as a hidden preference signal", () => {
    const dominant = dynamicProfile();
    dominant.perspective = "dominant";
    const submissive = dynamicProfile();
    submissive.perspective = "submissive";
    expect(getQuestionnaireRuntime(dominant).queue.map((item) => item.kink.id))
      .toEqual(getQuestionnaireRuntime(submissive).queue.map((item) => item.kink.id));
  });`,
  `  it("uses perspective only to choose the compact role-affinity side, never a different concept path", () => {
    const dominant = dynamicProfile();
    dominant.perspective = "dominant";
    const submissive = dynamicProfile();
    submissive.perspective = "submissive";
    const dominantIds = getQuestionnaireRuntime(dominant).queue.map((item) => item.kink.id);
    const submissiveIds = getQuestionnaireRuntime(submissive).queue.map((item) => item.kink.id);
    const concepts = (ids: string[]) => ids.map((id) => directionalPairForKinkId(id)?.conceptId ?? id);

    expect(dominantIds).not.toEqual(submissiveIds);
    expect(concepts(dominantIds)).toEqual(concepts(submissiveIds));
    expect(dominant.entries).toEqual({});
    expect(submissive.entries).toEqual({});
  });`,
);
replaceOnce(
  questionnaire,
  `    expect(runtime.queue.some((item) => item.kink.id === "shibari_give")).toBe(true);
    expect(runtime.queue.some((item) => item.kink.id === "leather_cuffs_give")).toBe(true);`,
  `    expect(runtime.queue.some((item) => item.kink.id === "shibari_give")).toBe(true);
    expect(runtime.queue.some((item) => item.kink.id === "shibari_receive")).toBe(true);
    expect(runtime.queue.some((item) => item.kink.id === "leather_cuffs_give")).toBe(true);
    expect(runtime.queue.some((item) => item.kink.id === "leather_cuffs_receive")).toBe(true);`,
);
replaceOnce(
  questionnaire,
  `    expect(searchAllKinks("Shibari").some((kink) => kink.id === "shibari_give")).toBe(true);
    expect(searchAllKinks("vastbinden met touw").some((kink) => kink.id === "rope_bondage_give")).toBe(true);`,
  `    const shibari = searchAllKinks("Shibari").map((kink) => kink.id);
    expect(shibari).toContain("shibari_give");
    expect(shibari).toContain("shibari_receive");
    const rope = searchAllKinks("vastbinden met touw").map((kink) => kink.id);
    expect(rope).toContain("rope_bondage_give");`,
);

console.log("Release C tests gebruiken nu expliciete semantiek in plaats van toevallige oude IDs.");
