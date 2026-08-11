import fs from "node:fs";

const path = ".github/scripts/forge-directionality-bondage.mjs";
const source = fs.readFileSync(path, "utf8");
const stale = `Caning, crop, paddling, whipping, belt, face slapping, punching, trampling, spreader bar, hogtie, mummification, straitjacket, chastity, tape/andere gags, hood, collar/leash, suspension en verdiepende bondage blijven kandidaat maar niet automatisch goedgekeurd. Hun directionality is vaak duidelijk; de vraag is vooral of de catalogusgranulariteit en questionnairewaarde een split rechtvaardigen.`;
const current = `Spreader bar, hogtie, mummification, straitjacket, chastity, tape/andere gags, hood, collar/leash, suspension en verdiepende bondage blijven kandidaat maar niet automatisch goedgekeurd. Hun directionality is vaak duidelijk; de vraag blijft of catalogusgranulariteit, concrete woordkeuze en questionnairewaarde een split rechtvaardigen.`;
if (!source.includes(stale)) throw new Error("De stale forge-anchor is niet exact teruggevonden");
if (source.includes(current)) throw new Error("De forge-anchor was al bijgewerkt");
fs.writeFileSync(path, source.replace(stale, current));
