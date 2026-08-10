import { readFileSync, writeFileSync } from "node:fs";

const path = "directie.md";
let source = readFileSync(path, "utf8");

function replaceOnce(before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Verwacht 1 match, vond ${count}: ${before.slice(0, 80)}`);
  source = source.replace(before, after);
}

replaceOnce(
  "Dit document beschrijft hoe KinkSync directionele kinks uiteindelijk moet modelleren. Het is bewust een plan, geen huidige runtimebelofte.",
  `Dit document is het directionality-contract én de roadmap voor verdere uitbreiding. De eerste Pegging-vertical-slice is inmiddels daadwerkelijk geïmplementeerd; verdere directionele catalogusuitbreiding blijft bewust item-per-item toekomstwerk.\n\n## Implementatiestatus — 10 augustus 2026\n\nDe Pegging-vertical-slice staat op \\`dev\\`:\n\n- PR #308: \\`pegging_give\\` en \\`pegging_receive\\`, flat entries, pair-metadata, directe pairflow wanneer beide siblings zelfstandig eligible zijn, search/sharing/sanitize/store-migratie en verwijdering van het oude ambigue \\`pegging\\`-antwoord zonder inference;\n- PR #309: complementaire matching \\`give ↔ receive\\`, directionele compare-rijen, categoriepercentages, filters, concrete hard limits en behoud van \\`Voor hen\\`/privacy-semantiek;\n- Dominant/Submissive blijft uitsluitend profielcontext en heeft geen invloed op de gekozen handelingrichting;\n- de Pegging-varianten zijn bewust geen canonical expansion-targets.\n\nNog niet automatisch uitgerold naar andere kinks: iedere volgende directionele kandidaat vereist dezelfde item-per-item audit.`
);

replaceOnce(
  "Directionele matching hoort in een aparte matching-PR nadat questionnaire/store/sharing stabiel zijn.",
  "Voor Pegging is directionele matching in PR #309 als aparte matching-slice geïmplementeerd nadat questionnaire/store/sharing in PR #308 stabiel waren. Nieuwe directionele pairs moeten hetzelfde gescheiden patroon volgen."
);

replaceOnce(
  "### Eerste vertical slice\n\nStart uitsluitend met **Pegging**.",
  "### Eerste vertical slice — uitgevoerd\n\nDe eerste en voorlopig enige directionele vertical slice is **Pegging**."
);

replaceOnce(
  `## Implementatievolgorde\n\n1. Audit het huidige pegging-item en alle call-sites.\n2. Voeg de twee stabiele IDs en pair-metadata toe.\n3. Verwijder het oude samengestelde pegging-item via een eenvoudige pre-launch migratie.\n4. Laat questionnaire beide siblings als pairflow tonen wanneer zelfstandig eligible.\n5. Werk search, category en overzichtsgroepering bij.\n6. Verifieer sharing/import/sanitize/QR/snapshots.\n7. Implementeer complementaire pegging-matching in een aparte, kleine matching-slice.\n8. Run volledige tests/build/browser-device checks.\n9. Dogfood pegging in Dominant-, Submissive- en beide-perspectiefprofielen.\n10. Pas daarna beslissen welke andere catalogusitems dezelfde behandeling verdienen.`,
  `## Implementatievolgorde\n\nUitgevoerd voor Pegging:\n\n1. huidig pegging-item en call-sites geaudit;\n2. twee stabiele IDs en pair-metadata toegevoegd;\n3. oud samengesteld pegging-item via prelaunch-migratie verwijderd zonder antwoorden te kopiëren;\n4. questionnaire pairflow toegevoegd wanneer beide siblings zelfstandig eligible zijn;\n5. search en directionele compare-weergave bijgewerkt;\n6. sharing/import/sanitize en concrete IDs geverifieerd;\n7. complementaire pegging-matching in een aparte matching-slice geïmplementeerd;\n8. volledige tests/build/browser-device/PWA-offline checks groen.\n\nVervolg:\n\n9. Pegging verder dogfooden in Dominant-, Submissive- en beide-perspectiefprofielen;\n10. pas daarna item-per-item beslissen welke andere catalogusitems dezelfde behandeling verdienen.`
);

writeFileSync(path, source);
