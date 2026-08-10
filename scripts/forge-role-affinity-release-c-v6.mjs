import fs from "node:fs";
import { pathToFileURL } from "node:url";

await import(pathToFileURL(new URL("./forge-role-affinity-release-c-v5.mjs", import.meta.url).pathname).href + `?v=${Date.now()}`);

const path = "__tests__/directionality.test.ts";
let source = fs.readFileSync(path, "utf8");
const before = `    expect(DIRECTIONAL_KINK_PAIRS.slice(9).every((pair) =>
      pair.questionnaireAffinity?.dominant === "give"
      && pair.questionnaireAffinity?.submissive === "receive")).toBe(true);`;
const after = `    expect(DIRECTIONAL_KINK_PAIRS.slice(9).every((pair) =>
      "questionnaireAffinity" in pair
      && pair.questionnaireAffinity.dominant === "give"
      && pair.questionnaireAffinity.submissive === "receive")).toBe(true);`;
if (!source.includes(before)) throw new Error("Role-affinity testnarrowing target ontbreekt");
source = source.replace(before, after);
fs.writeFileSync(path, source);

console.log("Release C TypeScript narrowing expliciet gemaakt.");
