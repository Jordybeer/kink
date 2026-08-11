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
  [
    "  text = replaceOnce(text,\n`      diaper_wetting: \"diaper_changing\",\n      diaper_messing: \"diaper_changing\",\n`,\n\"\",\n\"releaseSources diaper inference\");",
    "  text = text.replace(\n`      diaper_wetting: \"diaper_changing\",\n      diaper_messing: \"diaper_changing\",\n`,\n\"\");",
  ],
  [
    "  text = replaceOnce(text,\n`      diaper_wetting: \"diaper_changing\",\n      diaper_messing: \"diaper_changing\",\n`,\n\"\",\n\"canonical snapshot diaper inference\");",
    "  text = text.replace(\n`      diaper_wetting: \"diaper_changing\",\n      diaper_messing: \"diaper_changing\",\n`,\n\"\");",
  ],
];

for (const [needle, replacement] of replacements) {
  const count = source.split(needle).length - 1;
  if (count !== 1) throw new Error(`Forge patch-anchor verwacht exact 1 keer: ${needle.slice(0, 80)} (gevonden ${count})`);
  source = source.replace(needle, replacement);
}

fs.writeFileSync(path, source);
