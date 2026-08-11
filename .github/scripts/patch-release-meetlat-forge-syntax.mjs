import fs from "node:fs";

const path = ".github/scripts/forge-release-meetlat-0a.mjs";
let source = fs.readFileSync(path, "utf8");
const needle = '          `E2E seed ${profile.name} (${profile.id}) gebruikt retired of onbekende kink-ID: ${kinkId}`,';
const replacement = '          "E2E seed " + profile.name + " (" + profile.id + ") gebruikt retired of onbekende kink-ID: " + kinkId,';
const count = source.split(needle).length - 1;
if (count !== 1) throw new Error(`Meetlat forge syntax-anchor verwacht 1 keer, gevonden ${count}`);
source = source.replace(needle, replacement);
fs.writeFileSync(path, source);
