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
  'replaceOnce(kinkTest, `  "sound_deprivation",\n`, ``);',
  "sound deprivation Release-A retirement",
);

// Shibari is directioneel, suspension nog niet. Verwijder alleen de nieuwe ambigue outputregel;
// de oorspronkelijke shibari -> suspension source wordt door dezelfde migratie bewust verwijderd.
patchOnce(
  '  ["shibari_give", "suspension_rechtop"],`);',
  '`);',
  "related shibari suspension output",
);
patchOnce(
  '  `  shibari_give: ["suspension_rechtop"],\n  blindfold_give:',
  '  `  blindfold_give:',
  "follow-up shibari suspension output",
);
patchOnce(
  '  `  shibari_give: "suspension_rechtop",\n  blindfold_give:',
  '  `  blindfold_give:',
  "canonical shibari suspension output",
);
patchOnce(
  '  `      shibari_give: "suspension_rechtop",\n      blindfold_give:',
  '  `      blindfold_give:',
  "canonical mapping test shibari suspension output",
);

const fixedPath = "/tmp/forge-role-affinity-release-c-fixed.mjs";
fs.writeFileSync(fixedPath, source);
await import(pathToFileURL(fixedPath).href + `?v=${Date.now()}`);
