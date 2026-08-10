import fs from "node:fs";

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Niet gevonden in ${path}: ${before.slice(0, 80)}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Niet uniek in ${path}`);
  fs.writeFileSync(path, source.slice(0, index) + after + source.slice(index + before.length));
}

function replaceKink(id, replacement) {
  const path = "lib/kinks.ts";
  const source = fs.readFileSync(path, "utf8");
  const pattern = new RegExp(`  \\{\\n    id: "${id}",[\\s\\S]*?\\n  \\},`);
  const matches = source.match(new RegExp(pattern.source, "g")) ?? [];
  if (matches.length !== 1) throw new Error(`Verwacht exact één catalogusblok voor ${id}, kreeg ${matches.length}`);
  fs.writeFileSync(path, source.replace(pattern, replacement));
}

replaceKink("anal_sex", `  {
    id: "anal_sex_give",
    name: "Anal sex — giving",
    aliases: ["Anale seks geven", "Anaal penetreren"],
    category: "penetration",
    level: 2,
    description: "Een partner anaal penetreren met penis of speelgoed. Gebruik veel glijmiddel, bouw rustig op en stem tempo en stopsignalen af.",
  },
  {
    id: "anal_sex_receive",
    name: "Anal sex — receiving",
    aliases: ["Anale seks ontvangen", "Anaal gepenetreerd worden"],
    category: "penetration",
    level: 2,
    description: "Anale penetratie ontvangen met penis of speelgoed. Gebruik veel glijmiddel, bouw rustig op en stem tempo en stopsignalen af.",
  },`);

replaceKink("anal_fingering", `  {
    id: "anal_fingering_give",
    name: "Anal fingering — giving",
    aliases: ["Anaal vingeren geven", "Partner anaal vingeren"],
    category: "penetration",
    level: 1,
    description: "Een partner anaal met vingers stimuleren of penetreren. Gebruik korte gladde nagels, voldoende glijmiddel en forceer nooit weerstand.",
  },
  {
    id: "anal_fingering_receive",
    name: "Anal fingering — receiving",
    aliases: ["Anaal vingeren ontvangen", "Anaal gevingerd worden"],
    category: "penetration",
    level: 1,
    description: "Anale stimulatie of penetratie met vingers ontvangen. Gebruik voldoende glijmiddel, bouw rustig op en stop bij pijn of weerstand.",
  },`);

replaceKink("fisting_anal", `  {
    id: "fisting_anal_give",
    name: "Anal fisting — giving",
    aliases: ["Anaal fisten geven", "Partner anaal fisten"],
    category: "penetration",
    level: 3,
    description: "Een partner anaal met de hand penetreren. Vereist uitgebreide voorbereiding, veel glijmiddel, geleidelijke opbouw en voortdurend afstemmen.",
  },
  {
    id: "fisting_anal_receive",
    name: "Anal fisting — receiving",
    aliases: ["Anaal fisten ontvangen", "Anaal gefist worden"],
    category: "penetration",
    level: 3,
    description: "Anale penetratie met de hand ontvangen. Vereist uitgebreide voorbereiding, veel glijmiddel, geleidelijke opbouw en voortdurend afstemmen.",
  },`);

replaceKink("fisting_vaginal", `  {
    id: "fisting_vaginal_give",
    name: "Vaginal fisting — giving",
    aliases: ["Vaginaal fisten geven", "Partner vaginaal fisten"],
    category: "penetration",
    level: 3,
    description: "Een partner vaginaal met de hand penetreren. Uitgebreide opwarming, veel glijmiddel, geleidelijke opbouw en communicatie zijn noodzakelijk.",
  },
  {
    id: "fisting_vaginal_receive",
    name: "Vaginal fisting — receiving",
    aliases: ["Vaginaal fisten ontvangen", "Vaginaal gefist worden"],
    category: "penetration",
    level: 3,
    description: "Vaginale penetratie met de hand ontvangen. Uitgebreide opwarming, veel glijmiddel, geleidelijke opbouw en communicatie zijn noodzakelijk.",
  },`);

replaceKink("deep_throat", `  {
    id: "deep_throat_give",
    name: "Deep throat — giving oral",
    aliases: ["Deepthroat geven", "Diep oraal geven"],
    category: "sensation",
    level: 2,
    description: "Zelf de orale kant van deep throat nemen: de penis of een geschikt speeltje van een partner diep in mond of keel nemen. Spreek tempo, ademruimte en een direct non-verbaal stopsignaal af.",
  },
  {
    id: "deep_throat_receive",
    name: "Deep throat — receiving oral",
    aliases: ["Deepthroat ontvangen", "Diep oraal ontvangen"],
    category: "sensation",
    level: 2,
    description: "De andere kant van deep throat: een partner jouw penis of een door jou gebruikt geschikt speeltje diep oraal laten nemen. De mondzijde bepaalt altijd tempo, ademruimte en stoppen.",
  },`);

replaceKink("rimmen", `  {
    id: "rimming_give",
    name: "Rimming — giving",
    aliases: ["Rimmen geven", "Anilingus geven"],
    category: "penetration",
    level: 2,
    description: "De anus van een partner oraal stimuleren. Bespreek hygiëne, barrières en grenzen vooraf en wissel niet zonder reinigen van anaal naar andere lichaamszones.",
  },
  {
    id: "rimming_receive",
    name: "Rimming — receiving",
    aliases: ["Rimmen ontvangen", "Anilingus ontvangen"],
    category: "penetration",
    level: 2,
    description: "Orale stimulatie van je anus ontvangen. Bespreek hygiëne, barrières en grenzen vooraf en wissel niet zonder reinigen van anaal naar andere lichaamszones.",
  },`);

replaceKink("footjob", `  {
    id: "footjob_give",
    name: "Footjob — giving",
    aliases: ["Footjob geven", "Met voeten stimuleren"],
    category: "body_focus",
    level: 2,
    description: "De genitaliën van een partner met je voeten stimuleren. Stem druk, wrijving en tempo af; directionality staat los van Dominant of Submissive zijn.",
  },
  {
    id: "footjob_receive",
    name: "Footjob — receiving",
    aliases: ["Footjob ontvangen", "Door voeten gestimuleerd worden"],
    category: "body_focus",
    level: 2,
    description: "Genitale stimulatie met de voeten van een partner ontvangen. Stem druk, wrijving en tempo af; directionality staat los van Dominant of Submissive zijn.",
  },`);

replaceOnce(
  "lib/directionality.ts",
  `export const DIRECTIONAL_KINK_PAIRS = [\n  { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },\n] as const satisfies readonly DirectionalKinkPair[];`,
  `export const DIRECTIONAL_KINK_PAIRS = [
  { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },
  { conceptId: "golden_shower", giveId: "watersports_geven", receiveId: "watersports_ontvangen" },
  { conceptId: "anal_sex", giveId: "anal_sex_give", receiveId: "anal_sex_receive" },
  { conceptId: "anal_fingering", giveId: "anal_fingering_give", receiveId: "anal_fingering_receive" },
  { conceptId: "anal_fisting", giveId: "fisting_anal_give", receiveId: "fisting_anal_receive" },
  { conceptId: "vaginal_fisting", giveId: "fisting_vaginal_give", receiveId: "fisting_vaginal_receive" },
  { conceptId: "deep_throat", giveId: "deep_throat_give", receiveId: "deep_throat_receive" },
  { conceptId: "rimming", giveId: "rimming_give", receiveId: "rimming_receive" },
  { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
] as const satisfies readonly DirectionalKinkPair[];`,
);
replaceOnce(
  "lib/directionality.ts",
  `const DIRECTIONAL_CONCEPT_LABELS: Readonly<Record<string, string>> = {\n  pegging: "Pegging",\n};`,
  `const DIRECTIONAL_CONCEPT_LABELS: Readonly<Record<string, string>> = {
  pegging: "Pegging",
  golden_shower: "Golden shower",
  anal_sex: "Anal sex",
  anal_fingering: "Anal fingering",
  anal_fisting: "Anal fisting",
  vaginal_fisting: "Vaginal fisting",
  deep_throat: "Deep throat",
  rimming: "Rimming",
  footjob: "Footjob",
};`,
);
replaceOnce(
  "lib/directionality.ts",
  `const DEPRECATED_DIRECTIONAL_KINK_IDS = new Set<string>(["pegging"]);`,
  `const DEPRECATED_DIRECTIONAL_KINK_IDS = new Set<string>([
  "pegging",
  "anal_sex",
  "anal_fingering",
  "fisting_anal",
  "fisting_vaginal",
  "deep_throat",
  "rimmen",
  "footjob",
]);`,
);

const metadataPath = "lib/questionnaireMetadata.ts";
replaceOnce(metadataPath,
  `  watersports: [\n    "watersports_geven", "watersports_ontvangen", "urine_intiem", "plas_merken",\n    "plas_desperation", "buiten_plassen", "plas_in_kleding", "plas_slaaf",\n  ],`,
  `  watersports: [
    "watersports_geven", "watersports_ontvangen", "urine_intiem", "plas_merken",
    "plas_desperation", "buiten_plassen", "plas_in_kleding", "plas_slaaf",
  ],`);
replaceOnce(metadataPath,
  `  anal: [\n    "anal_sex", "anal_fingering", "pegging_give", "pegging_receive", "butt_plug", "anal_beads", "fisting_anal",\n    "rimmen", "anale_training",\n  ],`,
  `  anal: [
    "anal_sex_give", "anal_sex_receive", "anal_fingering_give", "anal_fingering_receive",
    "pegging_give", "pegging_receive", "butt_plug", "anal_beads",
    "fisting_anal_give", "fisting_anal_receive", "rimming_give", "rimming_receive", "anale_training",
  ],`);
replaceOnce(metadataPath,
  `    "feet", "hoge_hakken_aanbidding", "footjob", "voetgeur",`,
  `    "feet", "hoge_hakken_aanbidding", "footjob_give", "footjob_receive", "voetgeur",`);
replaceOnce(metadataPath,
  `  fluids: ["cum_play", "watersports_geven", "spitting"],`,
  `  fluids: ["cum_play", "drool_play", "spitting"],`);
replaceOnce(metadataPath,
  `  penetration: ["anal_fingering", "pegging_give", "pegging_receive"],`,
  `  penetration: ["butt_plug", "pegging_give", "pegging_receive"],`);
replaceOnce(metadataPath,
  `  ["watersports_geven", "watersports_ontvangen"],\n`,
  ``);
replaceOnce(metadataPath,
  `  ["anal_fingering", "anal_sex"],`,
  `  ["anal_fingering_give", "anal_sex_give"],
  ["anal_fingering_receive", "anal_sex_receive"],`);
replaceOnce(metadataPath,
  `  watersports_geven: ["watersports_ontvangen"],\n`,
  ``);
replaceOnce(metadataPath,
  `  anal_fingering: ["anal_sex"],`,
  `  anal_fingering_give: ["anal_sex_give"],
  anal_fingering_receive: ["anal_sex_receive"],`);
replaceOnce(metadataPath,
  `export const QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 2;`,
  `export const QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 3;`);
replaceOnce(metadataPath,
  `  watersports_geven: "watersports_ontvangen",\n`,
  ``);
replaceOnce(metadataPath,
  `  anal_fingering: "anal_sex",`,
  `  anal_fingering_give: "anal_sex_give",
  anal_fingering_receive: "anal_sex_receive",`);

const kinkTest = "__tests__/kinks.test.ts";
replaceOnce(kinkTest,
  `const DIRECTIONAL_RELEASE_IDS = ["pegging_give", "pegging_receive"] as const;`,
  `const DIRECTIONAL_RELEASE_IDS = [
  "pegging_give", "pegging_receive",
  "anal_sex_give", "anal_sex_receive",
  "anal_fingering_give", "anal_fingering_receive",
  "fisting_anal_give", "fisting_anal_receive",
  "fisting_vaginal_give", "fisting_vaginal_receive",
  "deep_throat_give", "deep_throat_receive",
  "rimming_give", "rimming_receive",
  "footjob_give", "footjob_receive",
] as const;`);
replaceOnce(kinkTest,
  `  "pegging",\n] as const;`,
  `  "pegging",
  "anal_sex",
  "anal_fingering",
  "fisting_anal",
  "fisting_vaginal",
  "deep_throat",
  "rimmen",
  "footjob",
] as const;`);
replaceOnce(kinkTest, `    expect(KINKS).toHaveLength(292);`, `    expect(KINKS).toHaveLength(299);`);
replaceOnce(kinkTest,
  `      "rimmen", "dirty_talk", "free_use", "keyholding", "predicament_bondage",`,
  `      "rimming_give", "rimming_receive", "dirty_talk", "free_use", "keyholding", "predicament_bondage",`);

const directionTest = "__tests__/directionality.test.ts";
replaceOnce(directionTest,
  `    expect(DIRECTIONAL_KINK_PAIRS).toEqual([\n      { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },\n    ]);`,
  `    expect(DIRECTIONAL_KINK_PAIRS).toEqual([
      { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },
      { conceptId: "golden_shower", giveId: "watersports_geven", receiveId: "watersports_ontvangen" },
      { conceptId: "anal_sex", giveId: "anal_sex_give", receiveId: "anal_sex_receive" },
      { conceptId: "anal_fingering", giveId: "anal_fingering_give", receiveId: "anal_fingering_receive" },
      { conceptId: "anal_fisting", giveId: "fisting_anal_give", receiveId: "fisting_anal_receive" },
      { conceptId: "vaginal_fisting", giveId: "fisting_vaginal_give", receiveId: "fisting_vaginal_receive" },
      { conceptId: "deep_throat", giveId: "deep_throat_give", receiveId: "deep_throat_receive" },
      { conceptId: "rimming", giveId: "rimming_give", receiveId: "rimming_receive" },
      { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
    ]);`);
replaceOnce(directionTest,
  `    expect(ids.has("pegging_receive")).toBe(true);`,
  `    expect(ids.has("pegging_receive")).toBe(true);
    for (const pair of DIRECTIONAL_KINK_PAIRS) {
      expect(ids.has(pair.giveId), pair.giveId).toBe(true);
      expect(ids.has(pair.receiveId), pair.receiveId).toBe(true);
    }
    for (const retired of ["anal_sex", "anal_fingering", "fisting_anal", "fisting_vaginal", "deep_throat", "rimmen", "footjob"]) {
      expect(ids.has(retired), retired).toBe(false);
    }`);
replaceOnce(directionTest,
  `    expect(partnerDirectionalKinkId("pegging_give")).toBe("pegging_receive");\n    expect(partnerDirectionalKinkId("spanking_hand")).toBe("spanking_hand");`,
  `    expect(partnerDirectionalKinkId("pegging_give")).toBe("pegging_receive");
    expect(partnerDirectionalKinkId("watersports_geven")).toBe("watersports_ontvangen");
    expect(partnerDirectionalKinkId("fisting_anal_give")).toBe("fisting_anal_receive");
    expect(partnerDirectionalKinkId("deep_throat_receive")).toBe("deep_throat_give");
    expect(partnerDirectionalKinkId("spanking_hand")).toBe("spanking_hand");`);
replaceOnce(directionTest,
  `    expect(cleaned.pegging_receive).toBeUndefined();`,
  `    expect(cleaned.pegging_receive).toBeUndefined();
    const retired = stripDeprecatedDirectionalEntries({
      anal_sex: { status: "yes", comment: "oud" },
      fisting_anal: { status: "hard_no", comment: "oud" },
      deep_throat: { status: "maybe", comment: "oud" },
    });
    expect(retired.anal_sex).toBeUndefined();
    expect(retired.fisting_anal).toBeUndefined();
    expect(retired.deep_throat).toBeUndefined();
    expect(retired.anal_sex_give).toBeUndefined();
    expect(retired.anal_sex_receive).toBeUndefined();`);

const matchingTest = "__tests__/directionalMatching.test.ts";
replaceOnce(matchingTest,
  `  it("does not mistake two give answers for a complementary match", () => {`,
  `  it("applies complementary matching to every registered concept, not just Pegging", () => {
    for (const [giveId, receiveId] of [
      ["watersports_geven", "watersports_ontvangen"],
      ["anal_sex_give", "anal_sex_receive"],
      ["fisting_anal_give", "fisting_anal_receive"],
      ["deep_throat_give", "deep_throat_receive"],
      ["rimming_give", "rimming_receive"],
      ["footjob_give", "footjob_receive"],
    ] as const) {
      const a = profile("A-" + giveId, "dominant", { [giveId]: { status: "yes" } });
      const b = profile("B-" + receiveId, "submissive", { [receiveId]: { status: "yes" } });
      const result = profileMatchScore(a, b);
      expect(result.comparedTotal, giveId).toBe(1);
      expect(result.overall, giveId).toBe(100);
    }
  });

  it("does not mistake two give answers for a complementary match", () => {`);
replaceOnce(matchingTest,
  `    expect(getComparePartnerKinkId("pegging_receive")).toBe("pegging_give");`,
  `    expect(getComparePartnerKinkId("pegging_receive")).toBe("pegging_give");
    expect(getComparePartnerKinkId("watersports_geven")).toBe("watersports_ontvangen");
    expect(getComparePartnerKinkId("rimming_receive")).toBe("rimming_give");`);

const questionnaireTest = "__tests__/questionnaire.test.ts";
replaceOnce(questionnaireTest, `    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(2);`, `    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(3);`);
replaceOnce(questionnaireTest, `      watersports_geven: "watersports_ontvangen",\n`, ``);
replaceOnce(questionnaireTest,
  `      anal_fingering: "anal_sex",`,
  `      anal_fingering_give: "anal_sex_give",
      anal_fingering_receive: "anal_sex_receive",`);

const directie = fs.readFileSync("directie.md", "utf8");
const oldPerspective = `### Alle perspectieven krijgen beide kanten\n\nDit geldt voor ieder profielperspectief:\n\n- Dominant profiel: geven + ontvangen;\n- Submissive profiel: geven + ontvangen;\n- \`Beide kanten\`: twee onafhankelijke profielen, dus elk profiel opnieuw geven + ontvangen.\n\nDat kan vier verschillende antwoorden voor één persoon opleveren en dat is inhoudelijk correct.\n`;
const newPerspective = `### Perspective bepaalt nooit een antwoord — eligibility mag wel zuinig zijn\n\nIedere directionele kant blijft een zelfstandig mogelijk antwoord. Dominant of Submissive vult nooit een sibling in, maakt hem nooit \`no\` en kopieert geen status.\n\nVoor **rol-neutrale** directionele concepten (zoals Pegging, fisting of rimming) mag perspective geen kant wegfilteren. Als beide kanten onafhankelijk eligible zijn, kunnen beide expliciet gevraagd worden.\n\nVoor een latere **sterk rol-geassocieerde** pair (bijvoorbeeld bepaalde impact- of bondagehandelingen) mag Dynamic één rol-aligned kant als basisvraag kiezen om de standaardflow niet kunstmatig te verdubbelen. De andere kant blijft dan **onbekend**, niet negatief, en blijft bereikbaar via Discover, Deep Dive, categorie-exploratie of gericht zoeken. Een Switch behoudt twee perspectieven; ieder perspectief krijgt zijn eigen zuinige basisflow.\n\nRole affinity is dus uitsluitend een eligibility/prioriteitsregel en nooit een voorkeurssignaal. Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn.\n`;
if (!directie.includes(oldPerspective)) throw new Error("directie perspective-sectie niet gevonden");
let nextDirectie = directie.replace(oldPerspective, newPerspective);
nextDirectie = nextDirectie.replace(
  `### Eerste vertical slice — uitgevoerd\n\nDe eerste en voorlopig enige directionele vertical slice is **Pegging**.`,
  `### Vertical slices — uitgevoerd\n\n**Pegging** blijft de referentie-vertical-slice. Release B breidt hetzelfde bewezen model conservatief uit naar rol-neutrale handelingen waarvan de twee kanten onafhankelijk betekenisvol zijn.`
);
nextDirectie = nextDirectie.replace(
  `Pas nadat de volledige pegging-slice bewezen stabiel is, wordt de rest van de catalogus geaudit.\n\nMogelijke latere kandidaten zijn bijvoorbeeld expliciete bondage-, impact-, watersports- of worship-handelingen, maar alleen na item-per-item review. Geen bulktransformatie op basis van categorie of grammatica.`,
  `De eerste catalogusaudit daarna splitst uitsluitend high-confidence rol-neutrale handelingen: Golden shower (bestaande twee IDs worden nu echt complementair), anal sex, anal fingering, anal/vaginal fisting, deep throat, rimming en footjob. De oude enkelvoudige IDs starten pre-launch bewust onbeantwoord; er wordt niets naar siblings gekopieerd.\n\nImpact, bondage en andere sterk rol-geassocieerde handelingen worden **niet** in deze release gebulksplitst. Ze wachten op item-per-item role-affinity-audit zodat Dynamic niet onnodig verdubbelt. Worship, toys en anatomy/equipment-gevoelige gevallen blijven eveneens apart staan totdat de labels ondubbelzinnig zijn.`
);
fs.writeFileSync("directie.md", nextDirectie);

fs.writeFileSync("docs/directionality-catalog-audit.md", `# Directionality catalog audit — Release B\n\nStatus: uitgevoerd op 10 augustus 2026, na de Pegging-reference slice en Switch-share closeout.\n\n## Beslisregel\n\nEen concept wordt alleen gepaird wanneer geven en ontvangen onafhankelijk kunnen verschillen, dat verschil matching/grenzen verandert en beide kanten zonder rol-, gender- of anatomie-inferentie kunnen worden gevraagd. Een ontbrekend antwoord blijft onbekend.\n\n## Release B — direct uitvoeren\n\n- Pegging — bestaande referentiepair.\n- Golden shower — de catalogus had al \`watersports_geven\` / \`watersports_ontvangen\`, maar ze waren nog niet complementair gekoppeld. De oude positieve give→receive questionnaire-edge vervalt: een voorkeur voor geven zegt niets over ontvangen.\n- Anal sex — geven / ontvangen.\n- Anal fingering — geven / ontvangen.\n- Anal fisting — geven / ontvangen.\n- Vaginal fisting — geven / ontvangen.\n- Deep throat — orale kant geven / orale stimulatie ontvangen; wording blijft genderneutraal en staat strap-on/toy-context toe.\n- Rimming — geven / ontvangen.\n- Footjob — geven / ontvangen.\n\nDe zeven oude enkelvoudige IDs worden pre-launch retired zonder antwoorden naar beide nieuwe kanten te kopiëren.\n\n## Sterk directioneel, maar eerst role-affinity\n\nImpact (spanking, flogging, caning, whipping, face/body slapping, trampling), bondage (rope, cuffs, blindfold, gags, suspension en confinement) en veel power/sensation-handelingen hebben echte giver/receiver-asymmetrie. Ze worden nog niet massaal gesplitst: voor deze groep is één kant vaak sterk Dom- of Sub-geassocieerd en een naïeve pair-uitrol zou Dynamic onnodig breed maken.\n\nDe volgende laag mag daarom metadata voor sterke role affinity gebruiken als **eligibility/prioriteit**, nooit als antwoord. Dom→give of Sub→receive mag hoogstens bepalen welke kant in de compacte basisflow verschijnt; de andere kant blijft onbekend en bereikbaar via Discover/Deep Dive/search.\n\n## Eerst wording/applicability auditen\n\nWorship (body/cock/vulva/ass/boots), prostate massage, erotic massage, remote toys, sex machine, pet grooming/training, diaper changing en vergelijkbare cases hebben vaak twee kanten, maar \"give/receive\" is niet altijd de beste gebruikerswoordenschat of praktische toepasbaarheid kan afhangen van expliciete anatomy/equipment-context. Geen genderfilter gebruiken.\n\n## Geen pair op dit moment\n\nMateriaal- en kledingfetishes, lichaamsaantrekking, algemene D/s- en roleplay-dynamieken, groeps/sociale contexten, media-consentcontexten en persoonlijke aftercarebehoeften blijven één concept zolang complementaire matching geen twee concrete handelingkanten nodig heeft.\n\n## Questionnaire-keuzes\n\n- Golden shower verdwijnt uit de vaste fluids-anchor om één willekeurige richting niet als neutrale basis te behandelen; \`drool_play\` neemt die breadth-slot over.\n- Het oude ambigue \`anal_fingering\`-anchor wordt vervangen door \`butt_plug\`, zodat de 45-vragen Dynamic-denominator niet groeit.\n- Anal fingering kan buiten de base flow nog same-side naar anal sex verdiepen: give→give en receive→receive.\n- Pairflow maakt nooit een sibling eligible; hij zet alleen een sibling direct erna wanneer die al independently eligible is.\n`);

replaceOnce(
  "planned-changes.md",
  `One product gate remains before its specific code lands: how explicit\npegging-giving/receiving IDs should take part in complementary matching without\nusing Dominant/Submissive as an answer proxy.`,
  `The original Pegging product gate is shipped. Directionality Release B now audits the catalog with the same anti-inference contract: high-confidence role-neutral sexual actions become explicit complementary pairs, while impact/bondage stay deferred behind a role-affinity eligibility pass so Dynamic does not balloon.`
);

// Regressieguard: actieve runtime- en metadatafiles mogen de retired samengestelde IDs niet blijven gebruiken.
const retired = ["anal_sex", "anal_fingering", "fisting_anal", "fisting_vaginal", "deep_throat", "rimmen", "footjob"];
for (const path of ["lib/kinks.ts", "lib/questionnaireMetadata.ts"]) {
  const source = fs.readFileSync(path, "utf8");
  for (const id of retired) {
    const token = `"${id}"`;
    if (source.includes(token)) throw new Error(`Retired directionele ID blijft actief in ${path}: ${id}`);
  }
}

console.log("Directionality Release B is gesmeed zonder voorkeuren te verzinnen.");
