import { readFileSync, writeFileSync } from "node:fs";

const path = "directie.md";
let source = readFileSync(path, "utf8");

function replaceOnce(before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Verwacht 1 match, vond ${count}: ${before.slice(0, 80)}`);
  source = source.replace(before, after);
}

const statusBlock = [
  "Dit document is het directionality-contract én de roadmap voor verdere uitbreiding. De eerste Pegging-vertical-slice is inmiddels daadwerkelijk geïmplementeerd; verdere directionele catalogusuitbreiding blijft bewust item-per-item toekomstwerk.",
  "",
  "## Implementatiestatus — 10 augustus 2026",
  "",
  "De Pegging-vertical-slice staat op `dev`:",
  "",
  "- PR #308: `pegging_give` en `pegging_receive`, flat entries, pair-metadata, directe pairflow wanneer beide siblings zelfstandig eligible zijn, search/sharing/sanitize/store-migratie en verwijdering van het oude ambigue `pegging`-antwoord zonder inference;",
  "- PR #309: complementaire matching `give ↔ receive`, directionele compare-rijen, categoriepercentages, filters, concrete hard limits en behoud van `Voor hen`/privacy-semantiek;",
  "- Dominant/Submissive blijft uitsluitend profielcontext en heeft geen invloed op de gekozen handelingrichting;",
  "- de Pegging-varianten zijn bewust geen canonical expansion-targets.",
  "",
  "Nog niet automatisch uitgerold naar andere kinks: iedere volgende directionele kandidaat vereist dezelfde item-per-item audit.",
].join("\n");

replaceOnce(
  "Dit document beschrijft hoe KinkSync directionele kinks uiteindelijk moet modelleren. Het is bewust een plan, geen huidige runtimebelofte.",
  statusBlock,
);

replaceOnce(
  "Directionele matching hoort in een aparte matching-PR nadat questionnaire/store/sharing stabiel zijn.",
  "Voor Pegging is directionele matching in PR #309 als aparte matching-slice geïmplementeerd nadat questionnaire/store/sharing in PR #308 stabiel waren. Nieuwe directionele pairs moeten hetzelfde gescheiden patroon volgen.",
);

replaceOnce(
  "### Eerste vertical slice\n\nStart uitsluitend met **Pegging**.",
  "### Eerste vertical slice — uitgevoerd\n\nDe eerste en voorlopig enige directionele vertical slice is **Pegging**.",
);

const oldImplementationOrder = [
  "## Implementatievolgorde",
  "",
  "1. Audit het huidige pegging-item en alle call-sites.",
  "2. Voeg de twee stabiele IDs en pair-metadata toe.",
  "3. Verwijder het oude samengestelde pegging-item via een eenvoudige pre-launch migratie.",
  "4. Laat questionnaire beide siblings als pairflow tonen wanneer zelfstandig eligible.",
  "5. Werk search, category en overzichtsgroepering bij.",
  "6. Verifieer sharing/import/sanitize/QR/snapshots.",
  "7. Implementeer complementaire pegging-matching in een aparte, kleine matching-slice.",
  "8. Run volledige tests/build/browser-device checks.",
  "9. Dogfood pegging in Dominant-, Submissive- en beide-perspectiefprofielen.",
  "10. Pas daarna beslissen welke andere catalogusitems dezelfde behandeling verdienen.",
].join("\n");

const newImplementationOrder = [
  "## Implementatievolgorde",
  "",
  "Uitgevoerd voor Pegging:",
  "",
  "1. huidig pegging-item en call-sites geaudit;",
  "2. twee stabiele IDs en pair-metadata toegevoegd;",
  "3. oud samengesteld pegging-item via prelaunch-migratie verwijderd zonder antwoorden te kopiëren;",
  "4. questionnaire pairflow toegevoegd wanneer beide siblings zelfstandig eligible zijn;",
  "5. search en directionele compare-weergave bijgewerkt;",
  "6. sharing/import/sanitize en concrete IDs geverifieerd;",
  "7. complementaire pegging-matching in een aparte matching-slice geïmplementeerd;",
  "8. volledige tests/build/browser-device/PWA-offline checks groen.",
  "",
  "Vervolg:",
  "",
  "9. Pegging verder dogfooden in Dominant-, Submissive- en beide-perspectiefprofielen;",
  "10. pas daarna item-per-item beslissen welke andere catalogusitems dezelfde behandeling verdienen.",
].join("\n");

replaceOnce(oldImplementationOrder, newImplementationOrder);
writeFileSync(path, source);
