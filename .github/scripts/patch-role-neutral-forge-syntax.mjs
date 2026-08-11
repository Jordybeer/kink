import fs from "node:fs";

const path = ".github/scripts/forge-directionality-role-neutral.mjs";
let source = fs.readFileSync(path, "utf8");

const replacements = [
  [
    "De oude `diaper_wetting`/`diaper_messing` → `diaper_changing` related/follow-up/canonical edges",
    "De oude \\`diaper_wetting\\`/\\`diaper_messing\\` → \\`diaper_changing\\` related/follow-up/canonical edges",
  ],
  [
    "`remote_toy` is een vaste Dynamic-anchor met bestaande private→public progression",
    "\\`remote_toy\\` is een vaste Dynamic-anchor met bestaande private→public progression",
  ],
  [
    "`sex_machine` combineert zelfgebruik en partnerbediening",
    "\\`sex_machine\\` combineert zelfgebruik en partnerbediening",
  ],
];

for (const [needle, replacement] of replacements) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Forge syntax-anchor verwacht exact 1 keer: ${needle} (gevonden ${count})`);
  source = source.replace(needle, replacement);
}

fs.writeFileSync(path, source);
