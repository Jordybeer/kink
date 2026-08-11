import fs from "node:fs";

const path = "lib/questionnaireMetadata.ts";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first === -1) throw new Error(`Ontbrekende metadata-anchor: ${label}`);
  if (source.indexOf(needle, first + needle.length) !== -1) throw new Error(`Niet-unieke metadata-anchor: ${label}`);
  source = source.slice(0, first) + replacement + source.slice(first + needle.length);
}

replaceOnce(
  `    "spreader_bar", "hogtie", "mummification", "straitjacket",`,
  `    "spreader_bar_give", "spreader_bar_receive", "hogtie_give", "hogtie_receive",\n    "mummification_give", "mummification_receive", "straitjacket_give", "straitjacket_receive",`,
  "restraints topic",
);

replaceOnce(
  `"gag_ball_give", "gag_ball_receive", "gag_bit_give", "gag_bit_receive", "gag_tape", "gag_opblaasbaar"`,
  `"gag_ball_give", "gag_ball_receive", "gag_bit_give", "gag_bit_receive", "gag_tape_give", "gag_tape_receive", "gag_opblaasbaar"`,
  "gags topic",
);

replaceOnce(
  `"blindfold_give", "blindfold_receive", "hood", "sound_deprivation_give", "sound_deprivation_receive"`,
  `"blindfold_give", "blindfold_receive", "hood_give", "hood_receive", "sound_deprivation_give", "sound_deprivation_receive"`,
  "sensory deprivation topic",
);

fs.writeFileSync(path, source);
