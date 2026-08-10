import fs from "node:fs";
import { pathToFileURL } from "node:url";

const originalPath = "scripts/forge-role-affinity-release-c.mjs";
let source = fs.readFileSync(originalPath, "utf8");

function patchOnce(before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Forge-patch ontbreekt: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Forge-patch niet uniek: ${label}`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

// RELEASE_A_IDS staat één ID per regel; maak deze assertie niet formatting-afhankelijk.
patchOnce(
  'replaceOnce(kinkTest, `  "sound_deprivation", "wetlook",`, `  "wetlook",`);',
  'replaceOnce(kinkTest, `  "sound_deprivation",\\n`, ``);',
  "sound deprivation Release-A retirement",
);

// Shibari is directioneel, suspension nog niet. Geen directionele source naar een ambigue target sturen.
patchOnce(
  'replaceOnce(meta,\n  `  ["blindfold", "sound_deprivation"],\\n  ["shibari", "suspension_rechtop"],`,\n  `  ["blindfold_give", "sound_deprivation_give"],\\n  ["blindfold_receive", "sound_deprivation_receive"],\\n  ["shibari_give", "suspension_rechtop"],`);',
  'replaceOnce(meta,\n  `  ["blindfold", "sound_deprivation"],\\n  ["shibari", "suspension_rechtop"],`,\n  `  ["blindfold_give", "sound_deprivation_give"],\\n  ["blindfold_receive", "sound_deprivation_receive"],`);',
  "related shibari suspension edge",
);
patchOnce(
  'replaceOnce(meta,\n  `  shibari: ["suspension_rechtop"],\\n  blindfold: ["sound_deprivation"],`,\n  `  shibari_give: ["suspension_rechtop"],\\n  blindfold_give: ["sound_deprivation_give"],\\n  blindfold_receive: ["sound_deprivation_receive"],`);',
  'replaceOnce(meta,\n  `  shibari: ["suspension_rechtop"],\\n  blindfold: ["sound_deprivation"],`,\n  `  blindfold_give: ["sound_deprivation_give"],\\n  blindfold_receive: ["sound_deprivation_receive"],`);',
  "follow-up shibari suspension edge",
);
patchOnce(
  'replaceOnce(meta,\n  `  shibari: "suspension_rechtop",\\n  blindfold: "sound_deprivation",`,\n  `  shibari_give: "suspension_rechtop",\\n  blindfold_give: "sound_deprivation_give",\\n  blindfold_receive: "sound_deprivation_receive",`);',
  'replaceOnce(meta,\n  `  shibari: "suspension_rechtop",\\n  blindfold: "sound_deprivation",`,\n  `  blindfold_give: "sound_deprivation_give",\\n  blindfold_receive: "sound_deprivation_receive",`);',
  "canonical shibari suspension edge",
);
patchOnce(
  'replaceOnce(questionnaireTest,\n  `      shibari: "suspension_rechtop",\\n      blindfold: "sound_deprivation",`,\n  `      shibari_give: "suspension_rechtop",\\n      blindfold_give: "sound_deprivation_give",\\n      blindfold_receive: "sound_deprivation_receive",`);',
  'replaceOnce(questionnaireTest,\n  `      shibari: "suspension_rechtop",\\n      blindfold: "sound_deprivation",`,\n  `      blindfold_give: "sound_deprivation_give",\\n      blindfold_receive: "sound_deprivation_receive",`);',
  "canonical mapping test shibari suspension edge",
);

const fixedPath = "/tmp/forge-role-affinity-release-c-fixed.mjs";
fs.writeFileSync(fixedPath, source);
await import(pathToFileURL(fixedPath).href + `?v=${Date.now()}`);
