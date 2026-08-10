import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/apply-directionality-pegging-v1.mjs";
let source = readFileSync(path, "utf8");
const fixes = [
  ["id: `direction-${perspective}`,", "id: \"direction-\" + perspective,"],
  ["throw new Error(`Kink ontbreekt: ${id}`);", "throw new Error(\"Kink ontbreekt: \" + id);"],
];
for (const [before, after] of fixes) {
  if (!source.includes(before)) throw new Error(`Forge-fix mist verwachte bron: ${before}`);
  source = source.replace(before, after);
}
writeFileSync(path, source);
