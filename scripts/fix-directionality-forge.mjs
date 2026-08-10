import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/apply-directionality-pegging-v1.mjs";
let source = readFileSync(path, "utf8");
const fixes = [
  ["id: `direction-\\${perspective}`,", "id: \"direction-\" + perspective,"],
  ["throw new Error(`Kink ontbreekt: \\${id}`);", "throw new Error(\"Kink ontbreekt: \" + id);"],
];
for (const [before, after] of fixes) {
  if (!source.includes(before)) throw new Error(`Forge-fix mist verwachte bron: ${before}`);
  source = source.replace(before, after);
}

const genericCountPatch = 'replaceOnce("__tests__/questionnaire.test.ts", `toBe(44);`, `toBe(45);`);';
if (source.split(genericCountPatch).length - 1 !== 2) {
  throw new Error("Forge-fix verwacht exact twee generieke 44->45 assertions");
}
source = source.replace(
  genericCountPatch,
  'replaceOnce("__tests__/questionnaire.test.ts", `    expect(questionnaireCount({ mode: "dynamic", interests: [], version: 2 })).toBe(44);`, `    expect(questionnaireCount({ mode: "dynamic", interests: [], version: 2 })).toBe(45);`);',
);
source = source.replace(
  genericCountPatch,
  'replaceOnce("__tests__/questionnaire.test.ts", `    expect(runtime.coverage?.total).toBe(44);`, `    expect(runtime.coverage?.total).toBe(45);`);',
);

writeFileSync(path, source);
