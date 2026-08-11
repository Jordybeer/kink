import fs from "node:fs";

const path = "lib/questionnaireMetadata.ts";
let source = fs.readFileSync(path, "utf8");
const needle = `    "voeten_in_gezicht", "voeten_in_mond", "voet_vernedering", "voetslaaf", "laarzen_aanbidding",`;
const replacement = `    "voeten_in_gezicht", "voeten_in_mond", "voet_vernedering", "voetslaaf",\n    "laarzen_aanbidding_give", "laarzen_aanbidding_receive",`;
const count = source.split(needle).length - 1;
if (count !== 1) throw new Error(`foot_focus anchor verwacht 1 keer, gevonden ${count}`);
source = source.replace(needle, replacement);
fs.writeFileSync(path, source);
