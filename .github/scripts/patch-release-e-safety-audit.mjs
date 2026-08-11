import fs from "node:fs";

const path = "__tests__/kinks.test.ts";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first === -1) throw new Error(`Ontbrekende safety-anchor: ${label}`);
  if (source.indexOf(needle, first + needle.length) !== -1) throw new Error(`Niet-unieke safety-anchor: ${label}`);
  source = source.slice(0, first) + replacement + source.slice(first + needle.length);
}

replaceOnce(
  `      "bullwhip", "gag_opblaasbaar", "gag_rubber", "borsten_afbinden", "gasmasker",\n      "suspension_rechtop", "suspension_ondersteboven", "suspension_horizontaal",\n      "opsluiting_kooi", "opsluiting_donker", "opsluiting_kleine_ruimte", "vacuumbed",`,
  `      "bullwhip",\n      "gag_opblaasbaar_give", "gag_opblaasbaar_receive", "gag_rubber_give", "gag_rubber_receive",\n      "borsten_afbinden", "gasmasker",\n      "suspension_rechtop_give", "suspension_rechtop_receive",\n      "suspension_ondersteboven_give", "suspension_ondersteboven_receive",\n      "suspension_horizontaal_give", "suspension_horizontaal_receive",\n      "opsluiting_kooi_give", "opsluiting_kooi_receive",\n      "opsluiting_donker_give", "opsluiting_donker_receive",\n      "opsluiting_kleine_ruimte_give", "opsluiting_kleine_ruimte_receive", "vacuumbed",`,
  "reviewed bondage safety ids",
);

fs.writeFileSync(path, source);
