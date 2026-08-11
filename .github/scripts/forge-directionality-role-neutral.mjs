import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, text) => fs.writeFileSync(path, text);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceOnce(text, needle, replacement, label) {
  const first = text.indexOf(needle);
  if (first === -1) throw new Error(`Ontbrekende anchor: ${label}`);
  if (text.indexOf(needle, first + needle.length) !== -1) throw new Error(`Niet-unieke anchor: ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + needle.length);
}

function replaceCatalogObject(text, id, replacement) {
  const pattern = new RegExp(`  \\{\\n    id: "${escapeRegex(id)}",[\\s\\S]*?\\n  \\},`, "g");
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`Catalog anchor ${id}: verwacht 1 object, kreeg ${matches.length}`);
  return text.replace(pattern, replacement);
}

function edit(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (after === before) throw new Error(`Geen wijziging in ${path}`);
  write(path, after);
}

const catalogPairs = {
  body_worship: `  {
    id: "body_worship_give",
    name: "Body worship — worshipping",
    aliases: ["Body worship geven", "Het lichaam van een partner aanbidden"],
    category: "body_focus",
    level: 1,
    description: "Het lichaam van een partner aanbidden via aanraking, kussen of verbale devotie. Stem af welke lichaamsdelen en vormen van aandacht welkom zijn zonder een vaste rol te veronderstellen.",
  },
  {
    id: "body_worship_receive",
    name: "Body worship — being worshipped",
    aliases: ["Body worship ontvangen", "Je lichaam laten aanbidden"],
    category: "body_focus",
    level: 1,
    description: "Je lichaam door een partner laten aanbidden via aanraking, kussen of verbale devotie. Stem af welke lichaamsdelen en vormen van aandacht welkom zijn zonder een vaste rol te veronderstellen.",
  },`,
  vagina_aanbidding: `  {
    id: "vagina_aanbidding_give",
    name: "Vulva / pussy worship — worshipping",
    aliases: ["Vulva-aanbidding geven", "Vagina-aanbidding geven", "Een vulva aanbidden"],
    category: "body_focus",
    level: 1,
    description: "De vulva van een partner expliciet aanbidden met aandacht, woorden of seksuele handelingen. Dit vraagt alleen de concrete handeling en veronderstelt geen rol of genderidentiteit.",
  },
  {
    id: "vagina_aanbidding_receive",
    name: "Vulva / pussy worship — being worshipped",
    aliases: ["Vulva-aanbidding ontvangen", "Vagina-aanbidding ontvangen", "Je vulva laten aanbidden"],
    category: "body_focus",
    level: 1,
    description: "Je vulva expliciet door een partner laten aanbidden met aandacht, woorden of seksuele handelingen. Dit is een anatomy-specifieke voorkeur en veronderstelt geen rol of genderidentiteit.",
  },`,
  cock_worship: `  {
    id: "cock_worship_give",
    name: "Cock worship — worshipping",
    aliases: ["Cock worship geven", "Een penis aanbidden"],
    category: "body_focus",
    level: 2,
    description: "De penis van een partner toegewijd aanbidden met mond, handen of woorden als ritueel van devotie, zonder een vaste machtsrol te veronderstellen.",
  },
  {
    id: "cock_worship_receive",
    name: "Cock worship — being worshipped",
    aliases: ["Cock worship ontvangen", "Je penis laten aanbidden"],
    category: "body_focus",
    level: 2,
    description: "Je penis toegewijd door een partner laten aanbidden met mond, handen of woorden als ritueel van devotie, zonder een vaste machtsrol te veronderstellen.",
  },`,
  ass_worship: `  {
    id: "ass_worship_give",
    name: "Ass worship — worshipping",
    aliases: ["Ass worship geven", "Billen aanbidden"],
    category: "body_focus",
    level: 2,
    description: "De billen van een partner aanbidden door bijvoorbeeld te kussen, likken, masseren of ertegenaan te liggen, zonder een vaste dominante of submissieve kant te veronderstellen.",
  },
  {
    id: "ass_worship_receive",
    name: "Ass worship — being worshipped",
    aliases: ["Ass worship ontvangen", "Je billen laten aanbidden"],
    category: "body_focus",
    level: 2,
    description: "Je billen door een partner laten aanbidden door bijvoorbeeld kussen, likken, massage of lichamelijke aandacht, zonder een vaste dominante of submissieve kant te veronderstellen.",
  },`,
  laarzen_aanbidding: `  {
    id: "laarzen_aanbidding_give",
    name: "Boot / shoe worship — worshipping",
    aliases: ["Laarzenaanbidding geven", "Schoenen aanbidden", "Boot worship geven"],
    category: "body_focus",
    level: 2,
    description: "De laarzen of schoenen van een partner kussen, likken of aanbidden als afgesproken fetisj- of D/s-spel, zonder daar automatisch een profielrol uit af te leiden.",
  },
  {
    id: "laarzen_aanbidding_receive",
    name: "Boot / shoe worship — being worshipped",
    aliases: ["Laarzenaanbidding ontvangen", "Je schoenen laten aanbidden", "Boot worship ontvangen"],
    category: "body_focus",
    level: 2,
    description: "Een partner je laarzen of schoenen laten kussen, likken of aanbidden als afgesproken fetisj- of D/s-spel, zonder daar automatisch een profielrol uit af te leiden.",
  },`,
  erotic_massage: `  {
    id: "erotic_massage_give",
    name: "Erotic massage — giving",
    aliases: ["Erotische massage geven", "Sensuele massage geven"],
    category: "sensation",
    level: 1,
    description: "Een partner sensueel of seksueel masseren zonder masseur/client-rollenspel of een vaste machtsrol te veronderstellen.",
  },
  {
    id: "erotic_massage_receive",
    name: "Erotic massage — receiving",
    aliases: ["Erotische massage ontvangen", "Sensuele massage ontvangen"],
    category: "sensation",
    level: 1,
    description: "Een sensuele of seksuele massage van een partner ontvangen zonder masseur/client-rollenspel of een vaste machtsrol te veronderstellen.",
  },`,
  prostate_massage: `  {
    id: "prostate_massage_give",
    name: "Prostate massage — giving",
    aliases: ["Prostaatmassage geven", "Een prostaat stimuleren"],
    category: "penetration",
    level: 2,
    description: "De prostaat van een partner via rectale aanraking of een daarvoor ontworpen hulpmiddel stimuleren. De handeling is anatomy-specifiek maar veronderstelt geen gender of rol.",
    safetyNote: "Gebruik veel geschikt glijmiddel, ga langzaam en stop bij scherpe pijn, gevoelloosheid of bloed. Reinig hulpmiddelen volgens materiaalvoorschrift en voorkom overdracht tussen lichaamsopeningen.",
  },
  {
    id: "prostate_massage_receive",
    name: "Prostate massage — receiving",
    aliases: ["Prostaatmassage ontvangen", "Je prostaat laten stimuleren"],
    category: "penetration",
    level: 2,
    description: "Je prostaat via rectale aanraking of een daarvoor ontworpen hulpmiddel laten stimuleren. De voorkeur is anatomy-specifiek maar veronderstelt geen gender of rol.",
    safetyNote: "Gebruik veel geschikt glijmiddel, ga langzaam en stop bij scherpe pijn, gevoelloosheid of bloed. Reinig hulpmiddelen volgens materiaalvoorschrift en voorkom overdracht tussen lichaamsopeningen.",
  },`,
  pet_training: `  {
    id: "pet_training_give",
    name: "Pet training / tricks — training",
    aliases: ["Pet training geven", "Een partner als pet trainen", "Dierentrucjes trainen"],
    category: "pet_play",
    level: 2,
    description: "Een volwassen partner binnen pet play consensueel trucjes, commando's of gewenst rolgedrag laten oefenen, los van puppy-, kitten- of pony-identiteit.",
  },
  {
    id: "pet_training_receive",
    name: "Pet training / tricks — being trained",
    aliases: ["Pet training ontvangen", "Als pet getraind worden", "Dierentrucjes oefenen als pet"],
    category: "pet_play",
    level: 2,
    description: "Binnen pet play consensueel door een partner getraind worden met trucjes, commando's of gewenst rolgedrag, los van puppy-, kitten- of pony-identiteit.",
  },`,
  pet_grooming: `  {
    id: "pet_grooming_give",
    name: "Pet grooming — grooming",
    aliases: ["Pet grooming geven", "Een partner als pet verzorgen", "Pet verzorging geven"],
    category: "pet_play",
    level: 1,
    description: "Een volwassen partner binnen pet play borstelen, wassen of verzorgen als afgesproken ritueel met menselijke en lichaamsgeschikte materialen.",
  },
  {
    id: "pet_grooming_receive",
    name: "Pet grooming — being groomed",
    aliases: ["Pet grooming ontvangen", "Als pet verzorgd worden", "Pet verzorging ontvangen"],
    category: "pet_play",
    level: 1,
    description: "Binnen pet play door een partner geborsteld, gewassen of verzorgd worden als afgesproken ritueel met menselijke en lichaamsgeschikte materialen.",
  },`,
  diaper_changing: `  {
    id: "diaper_changing_give",
    name: "Diaper changing — changing",
    aliases: ["Luier verschonen", "Een volwassen partner verschonen", "Diaper changing geven"],
    category: "adult_ageplay",
    level: 3,
    description: "Een volwassen partner consensueel een luier aandoen of verschonen als verzorgings- of rollenspelelement, los van wat erin zit.",
    safetyNote: "Bij een natte of bevuilde luier zijn snelle verschoning, huidhygiëne en grondige handreiniging belangrijk. Gebruik bij contact met ontlasting geschikte barrièremiddelen en voorkom kruisbesmetting.",
  },
  {
    id: "diaper_changing_receive",
    name: "Diaper changing — being changed",
    aliases: ["Verschoond worden", "Een luier aangedaan krijgen", "Diaper changing ontvangen"],
    category: "adult_ageplay",
    level: 3,
    description: "Consensueel door een volwassen partner een luier aangedaan krijgen of verschoond worden als verzorgings- of rollenspelelement, los van wat erin zit.",
    safetyNote: "Bij een natte of bevuilde luier zijn snelle verschoning en huidhygiëne belangrijk. Stop bij huidirritatie, pijn of ander lichamelijk ongemak en voorkom kruisbesmetting.",
  },`,
};

edit("lib/kinks.ts", (source) => {
  let text = source;
  for (const [id, replacement] of Object.entries(catalogPairs)) {
    text = replaceCatalogObject(text, id, replacement);
  }
  return text;
});

edit("lib/directionality.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`  { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },`,
`  { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
  { conceptId: "body_worship", giveId: "body_worship_give", receiveId: "body_worship_receive" },
  { conceptId: "vagina_aanbidding", giveId: "vagina_aanbidding_give", receiveId: "vagina_aanbidding_receive" },
  { conceptId: "cock_worship", giveId: "cock_worship_give", receiveId: "cock_worship_receive" },
  { conceptId: "ass_worship", giveId: "ass_worship_give", receiveId: "ass_worship_receive" },
  { conceptId: "laarzen_aanbidding", giveId: "laarzen_aanbidding_give", receiveId: "laarzen_aanbidding_receive" },
  { conceptId: "erotic_massage", giveId: "erotic_massage_give", receiveId: "erotic_massage_receive" },
  { conceptId: "prostate_massage", giveId: "prostate_massage_give", receiveId: "prostate_massage_receive" },
  { conceptId: "pet_training", giveId: "pet_training_give", receiveId: "pet_training_receive" },
  { conceptId: "pet_grooming", giveId: "pet_grooming_give", receiveId: "pet_grooming_receive" },
  { conceptId: "diaper_changing", giveId: "diaper_changing_give", receiveId: "diaper_changing_receive" },`,
"neutral pair insertion");

  text = replaceOnce(text,
`  footjob: "Footjob",`,
`  footjob: "Footjob",
  body_worship: "Body worship",
  vagina_aanbidding: "Vulva / pussy worship",
  cock_worship: "Cock worship",
  ass_worship: "Ass worship",
  laarzen_aanbidding: "Boot / shoe worship",
  erotic_massage: "Erotic massage",
  prostate_massage: "Prostate massage",
  pet_training: "Pet training / tricks",
  pet_grooming: "Pet grooming",
  diaper_changing: "Diaper changing",`,
"neutral pair labels");

  text = replaceOnce(text,
`  "footjob",
  "spanking_hand",`,
`  "footjob",
  "body_worship",
  "vagina_aanbidding",
  "cock_worship",
  "ass_worship",
  "laarzen_aanbidding",
  "erotic_massage",
  "prostate_massage",
  "pet_training",
  "pet_grooming",
  "diaper_changing",
  "spanking_hand",`,
"retired neutral singles");
  return text;
});

edit("lib/questionnaireMetadata.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`  diaper_play: ["luiers_dragen", "diaper_wetting", "diaper_messing", "diaper_changing"],`,
`  diaper_play: [
    "luiers_dragen", "diaper_wetting", "diaper_messing",
    "diaper_changing_give", "diaper_changing_receive",
  ],`,
"diaper topic");
  text = replaceOnce(text,
`    "fox_tail_plug", "petplay_kooi", "petplay_kattenbak", "pet_training", "pet_grooming",
  ],`,
`    "fox_tail_plug", "petplay_kooi", "petplay_kattenbak",
    "pet_training_give", "pet_training_receive", "pet_grooming_give", "pet_grooming_receive",
  ],`,
"pet topic");

  for (const edge of [
    `  ["petplay_puppy", "pet_training"],\n`,
    `  ["diaper_wetting", "diaper_changing"],\n`,
    `  ["diaper_messing", "diaper_changing"],\n`,
  ]) {
    text = replaceOnce(text, edge, "", `related edge ${edge.trim()}`);
  }
  for (const line of [
    `  diaper_wetting: ["diaper_changing"],\n`,
    `  diaper_messing: ["diaper_changing"],\n`,
  ]) {
    text = replaceOnce(text, line, "", `follow-up ${line.trim()}`);
  }
  for (const line of [
    `  diaper_wetting: "diaper_changing",\n`,
    `  diaper_messing: "diaper_changing",\n`,
  ]) {
    text = replaceOnce(text, line, "", `canonical ${line.trim()}`);
  }
  text = replaceOnce(text,
`export const QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 4;`,
`export const QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 5;`,
"canonical mapping version");
  return text;
});

edit("lib/storeCore.ts", (source) => {
  let text = replaceOnce(source, "export const STORE_PERSIST_VERSION = 23;", "export const STORE_PERSIST_VERSION = 24;", "store v23");
  if (!text.includes("migrateStoredDirectionalityV23")) throw new Error("V23 directionalitymigratie ontbreekt");
  text = text.replaceAll("migrateStoredDirectionalityV23", "migrateStoredDirectionalityV24");
  return text;
});

edit("__tests__/directionality.test.ts", (source) => {
  let text = source.replaceAll("migrateStoredDirectionalityV23", "migrateStoredDirectionalityV24");
  text = replaceOnce(text,
`    expect(DIRECTIONAL_KINK_PAIRS).toHaveLength(43);
    expect(DIRECTIONAL_KINK_PAIRS.slice(9).every((pair) =>
      "questionnaireAffinity" in pair
      && pair.questionnaireAffinity.dominant === "give"
      && pair.questionnaireAffinity.submissive === "receive")).toBe(true);`,
`    expect(DIRECTIONAL_KINK_PAIRS).toHaveLength(53);
    const affinityPairs = DIRECTIONAL_KINK_PAIRS.filter((pair) => "questionnaireAffinity" in pair);
    expect(affinityPairs).toHaveLength(34);
    for (const pair of affinityPairs) {
      expect("questionnaireAffinity" in pair).toBe(true);
      if ("questionnaireAffinity" in pair) {
        expect(pair.questionnaireAffinity.dominant).toBe("give");
        expect(pair.questionnaireAffinity.submissive).toBe("receive");
      }
    }`,
"optional affinity contract");
  text = replaceOnce(text,
`      "suspension_rechtop", "suspension_ondersteboven", "suspension_horizontaal",
      "opsluiting_kooi", "opsluiting_donker", "opsluiting_kleine_ruimte",
    ]) {`,
`      "suspension_rechtop", "suspension_ondersteboven", "suspension_horizontaal",
      "opsluiting_kooi", "opsluiting_donker", "opsluiting_kleine_ruimte",
      "body_worship", "vagina_aanbidding", "cock_worship", "ass_worship", "laarzen_aanbidding",
      "erotic_massage", "prostate_massage", "pet_training", "pet_grooming", "diaper_changing",
    ]) {`,
"retired neutral ids in pair integrity");
  text = replaceOnce(text,
`    expect(partnerDirectionalKinkId("opsluiting_kooi_give")).toBe("opsluiting_kooi_receive");`,
`    expect(partnerDirectionalKinkId("opsluiting_kooi_give")).toBe("opsluiting_kooi_receive");
    expect(partnerDirectionalKinkId("body_worship_give")).toBe("body_worship_receive");
    expect(partnerDirectionalKinkId("prostate_massage_receive")).toBe("prostate_massage_give");
    expect(partnerDirectionalKinkId("diaper_changing_give")).toBe("diaper_changing_receive");`,
"neutral partner mappings");
  text = replaceOnce(text,
`    expect(suspensionIds).toContain("suspension_rechtop_receive");
  });`,
`    expect(suspensionIds).toContain("suspension_rechtop_receive");
    const worshipIds = searchAllKinks("body worship").map((kink) => kink.id);
    expect(worshipIds).toContain("body_worship_give");
    expect(worshipIds).toContain("body_worship_receive");
  });`,
"neutral search pair");
  text = replaceOnce(text,
`  it("drops the old ambiguous answer instead of copying it to either direction", () => {`,
`  it("houdt role-neutrale partnerhandelingen directioneel zonder perspective-inference", () => {
    const ids = [
      "body_worship_give", "body_worship_receive", "vagina_aanbidding_give", "vagina_aanbidding_receive",
      "cock_worship_give", "cock_worship_receive", "ass_worship_give", "ass_worship_receive",
      "laarzen_aanbidding_give", "laarzen_aanbidding_receive", "erotic_massage_give", "erotic_massage_receive",
      "prostate_massage_give", "prostate_massage_receive", "pet_training_give", "pet_training_receive",
      "pet_grooming_give", "pet_grooming_receive", "diaper_changing_give", "diaper_changing_receive",
    ];
    for (const id of ids) {
      expect(QUESTIONNAIRE_FOLLOW_UPS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_PROGRESSION_EDGES.some(([parent, child]) => parent === id || child === id)).toBe(false);
      expect(questionnaireDirectionalKinkIdForPerspective(id, "dominant")).toBe(id);
      expect(questionnaireDirectionalKinkIdForPerspective(id, "submissive")).toBe(id);
    }
  });

  it("drops the old ambiguous answer instead of copying it to either direction", () => {`,
"neutral no-inference test");
  text = replaceOnce(text,
`    expect(completionRetired.opsluiting_kooi).toBeUndefined();
  });`,
`    expect(completionRetired.opsluiting_kooi).toBeUndefined();
    const neutralRetired = stripDeprecatedDirectionalEntries({
      body_worship: { status: "yes", comment: "oud gecombineerd" },
      prostate_massage: { status: "hard_no", comment: "oud gecombineerd" },
      diaper_changing: { status: "maybe", comment: "oud gecombineerd" },
    });
    expect(neutralRetired.body_worship).toBeUndefined();
    expect(neutralRetired.body_worship_give).toBeUndefined();
    expect(neutralRetired.body_worship_receive).toBeUndefined();
    expect(neutralRetired.prostate_massage).toBeUndefined();
    expect(neutralRetired.diaper_changing).toBeUndefined();
  });`,
"neutral retired cleanup");
  text = replaceOnce(text, "expect(STORE_PERSIST_VERSION).toBe(23);", "expect(STORE_PERSIST_VERSION).toBe(24);", "persist version 23");
  text = replaceOnce(text,
`  it("laat v23 state ongemoeid door dezelfde migratieboundary", () => {
    const profile = ownProfile("dominant", { suspension_rechtop_give: { status: "yes", comment: "expliciet" } });
    const migrated = migrateStoredDirectionalityV24({ profiles: [profile] }, 23);
    expect(migrated.profiles?.[0].entries.suspension_rechtop_give?.status).toBe("yes");
  });`,
`  it("migreert v23 role-neutrale singles zonder een kant te verzinnen", () => {
    const profile = ownProfile("dominant", {
      body_worship: { status: "yes", comment: "oud gecombineerd" },
      diaper_changing: { status: "maybe", comment: "oud gecombineerd" },
      praise_kink: { status: "willing", comment: "blijft" },
    });
    const migrated = migrateStoredDirectionalityV24({ profiles: [profile] }, 23);
    expect(migrated.profiles?.[0].entries.body_worship).toBeUndefined();
    expect(migrated.profiles?.[0].entries.body_worship_give).toBeUndefined();
    expect(migrated.profiles?.[0].entries.body_worship_receive).toBeUndefined();
    expect(migrated.profiles?.[0].entries.diaper_changing).toBeUndefined();
    expect(migrated.profiles?.[0].entries.diaper_changing_give).toBeUndefined();
    expect(migrated.profiles?.[0].entries.diaper_changing_receive).toBeUndefined();
    expect(migrated.profiles?.[0].entries.praise_kink?.status).toBe("willing");
  });

  it("laat v24 state ongemoeid door dezelfde migratieboundary", () => {
    const profile = ownProfile("dominant", { body_worship_give: { status: "yes", comment: "expliciet" } });
    const migrated = migrateStoredDirectionalityV24({ profiles: [profile] }, 24);
    expect(migrated.profiles?.[0].entries.body_worship_give?.status).toBe("yes");
  });`,
"v23 v24 migration boundary");
  return text;
});

edit("__tests__/directionalityIntegration.test.ts", (source) => replaceOnce(source,
`      ["fisting_anal_give", "fisting_anal_receive"],`,
`      ["fisting_anal_give", "fisting_anal_receive"],
      ["body_worship_give", "body_worship_receive"],`,
"generic scene neutral pair"));

edit("__tests__/kinks.test.ts", (source) => {
  let text = source;
  for (const id of ["erotic_massage", "prostate_massage", "pet_training", "pet_grooming", "diaper_changing"]) {
    text = replaceOnce(text, `  "${id}",\n`, "", `remove retired Release A ${id}`);
  }
  text = replaceOnce(text,
`  "opsluiting_kleine_ruimte_give", "opsluiting_kleine_ruimte_receive",
] as const;`,
`  "opsluiting_kleine_ruimte_give", "opsluiting_kleine_ruimte_receive",
  "body_worship_give", "body_worship_receive",
  "vagina_aanbidding_give", "vagina_aanbidding_receive",
  "cock_worship_give", "cock_worship_receive",
  "ass_worship_give", "ass_worship_receive",
  "laarzen_aanbidding_give", "laarzen_aanbidding_receive",
  "erotic_massage_give", "erotic_massage_receive",
  "prostate_massage_give", "prostate_massage_receive",
  "pet_training_give", "pet_training_receive",
  "pet_grooming_give", "pet_grooming_receive",
  "diaper_changing_give", "diaper_changing_receive",
] as const;`,
"directional neutral release ids");
  text = replaceOnce(text,
`const RETIRED_POST_V2_DIRECTIONAL_IDS = [`,
`const RETIRED_HISTORICAL_ROLE_NEUTRAL_IDS = [
  "body_worship", "vagina_aanbidding", "cock_worship", "ass_worship", "laarzen_aanbidding",
] as const;

const RETIRED_RELEASE_A_DIRECTIONAL_IDS = [
  "erotic_massage", "prostate_massage", "pet_training", "pet_grooming", "diaper_changing",
] as const;

const RETIRED_POST_V2_DIRECTIONAL_IDS = [`,
"retired neutral ledgers");
  text = replaceOnce(text,
`  ...RETIRED_HISTORICAL_BONDAGE_COMPLETION_IDS,
] as const;`,
`  ...RETIRED_HISTORICAL_BONDAGE_COMPLETION_IDS,
  ...RETIRED_HISTORICAL_ROLE_NEUTRAL_IDS,
  ...RETIRED_RELEASE_A_DIRECTIONAL_IDS,
] as const;`,
"retired post v2 expansion");
  text = replaceOnce(text, "expect(KINKS).toHaveLength(333);", "expect(KINKS).toHaveLength(343);", "catalog count 333");
  text = replaceOnce(text,
`    expect(ids.has("diaper_changing")).toBe(true);`,
`    expect(ids.has("diaper_changing")).toBe(false);
    expect(ids.has("diaper_changing_give")).toBe(true);
    expect(ids.has("diaper_changing_receive")).toBe(true);`,
"diaper active assertions");
  text = replaceOnce(text,
`      ...RETIRED_HISTORICAL_BONDAGE_COMPLETION_IDS,
    ].sort());`,
`      ...RETIRED_HISTORICAL_BONDAGE_COMPLETION_IDS,
      ...RETIRED_HISTORICAL_ROLE_NEUTRAL_IDS,
    ].sort());`,
"historical retired neutral set");
  text = replaceOnce(text,
`      "crying_tears", "sound_deprivation_give", "sound_deprivation_receive", "prostate_massage", "sex_machine",`,
`      "crying_tears", "sound_deprivation_give", "sound_deprivation_receive",
      "prostate_massage_give", "prostate_massage_receive", "sex_machine",`,
"prostate safety ids");
  return text;
});

edit("__tests__/questionnaire.test.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`  "smeared_makeup", "crying_tears", "vampire_fangs", "erotic_massage", "vibration_play",
  "sound_deprivation_give", "wetlook", "prostate_massage", "sex_machine", "drool_play",
  "being_heard", "play_party", "next_day_check_in", "aftercare_cleanup", "dollification",
  "pet_training", "pet_grooming", "diaper_wetting", "diaper_messing", "diaper_changing",`,
`  "smeared_makeup", "crying_tears", "vampire_fangs", "erotic_massage_give", "erotic_massage_receive", "vibration_play",
  "sound_deprivation_give", "wetlook", "prostate_massage_give", "prostate_massage_receive", "sex_machine", "drool_play",
  "being_heard", "play_party", "next_day_check_in", "aftercare_cleanup", "dollification",
  "pet_training_give", "pet_training_receive", "pet_grooming_give", "pet_grooming_receive",
  "diaper_wetting", "diaper_messing", "diaper_changing_give", "diaper_changing_receive",`,
"Release A directionalized ids");
  text = replaceOnce(text,
`      diaper_wetting: "diaper_changing",
      diaper_messing: "diaper_changing",
`,
"",
"releaseSources diaper inference");
  text = replaceOnce(text,
`      "crying_tears", "vampire_fangs", "erotic_massage", "vibration_play",
      "wetlook", "prostate_massage", "sex_machine", "drool_play", "being_heard",
      "play_party", "next_day_check_in", "aftercare_cleanup", "dollification",
      "pet_training", "pet_grooming", "diaper_changing", "creampie",`,
`      "crying_tears", "vampire_fangs", "erotic_massage_give", "erotic_massage_receive", "vibration_play",
      "wetlook", "prostate_massage_give", "prostate_massage_receive", "sex_machine", "drool_play", "being_heard",
      "play_party", "next_day_check_in", "aftercare_cleanup", "dollification",
      "pet_training_give", "pet_training_receive", "pet_grooming_give", "pet_grooming_receive",
      "diaper_changing_give", "diaper_changing_receive", "creampie",`,
"no canonical role-neutral ids");
  text = replaceOnce(text,
`    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(4);`,
`    expect(QUESTIONNAIRE_CANONICAL_MAPPING_VERSION).toBe(5);`,
"canonical test version 4");
  text = replaceOnce(text,
`      diaper_wetting: "diaper_changing",
      diaper_messing: "diaper_changing",
`,
"",
"canonical snapshot diaper inference");
  text = replaceOnce(text,
`  it("deduplicates diaper changing when either explicit use answer nominates it", () => {
    const current = dynamicProfile();
    current.entries.diaper_wetting = { status: "yes", comment: "" };
    current.entries.diaper_messing = { status: "willing", comment: "" };
    const probes = getQuestionnaireRuntime(current).pendingProbes;
    expect(probes).toHaveLength(1);
    expect(probes[0].targetKinkId).toBe("diaper_changing");
    expect(probes[0].reasons.map((reason) => reason.sourceKinkId).sort())
      .toEqual(["diaper_messing", "diaper_wetting"]);
  });`,
`  it("raadt geen diaper-changing richting uit wetting of messing", () => {
    const current = dynamicProfile();
    current.entries.diaper_wetting = { status: "yes", comment: "" };
    current.entries.diaper_messing = { status: "willing", comment: "" };
    const targets = getQuestionnaireRuntime(current).pendingProbes.map((probe) => probe.targetKinkId);
    expect(targets).not.toContain("diaper_changing_give");
    expect(targets).not.toContain("diaper_changing_receive");
  });`,
"diaper probe regression");
  return text;
});

edit("docs/directionality-catalog-audit.md", (source) => {
  let text = source;
  text = replaceOnce(text,
`## Eerst wording/applicability auditen

Worship (body/cock/vulva/ass/boots), prostate massage, erotic massage, remote toys, sex machine, pet grooming/training, diaper changing en vergelijkbare cases hebben vaak twee kanten, maar "give/receive" is niet altijd de beste gebruikerswoordenschat of praktische toepasbaarheid kan afhangen van expliciete anatomy/equipment-context. Geen genderfilter gebruiken.
`,
`## Release F — role-neutrale partnerhandelingen

De wording/applicability-audit is afgerond voor de concrete partnerhandelingen die zonder rol- of genderaanname twee onafhankelijke kanten hebben:

- body, vulva, cock, ass en boot/shoe worship — aanbidden / aanbeden worden;
- erotic massage en prostate massage — geven / ontvangen;
- pet training en pet grooming — trainen/verzorgen / getraind of verzorgd worden;
- diaper changing — verschonen / verschoond worden.

Deze tien pairs hebben **geen questionnaire role affinity**. Dominant en Submissive krijgen dus nooit automatisch een andere kant. Anatomy-specifieke receive-copy (vulva, penis, prostaat) vraagt de anatomy rechtstreeks en gebruikt geen genderfilter.

De oude `diaper_wetting`/`diaper_messing` → `diaper_changing` related/follow-up/canonical edges zijn verwijderd: na de split bestaat er geen eerlijke targetkant die uit wetting of messing volgt. Daarom gaat de canonical mappingversie naar v5.

Nog bewust niet gepaird: remote toys en sex machine. `remote_toy` is een vaste Dynamic-anchor met bestaande private→public progression; een neutrale controller/wearer-split vraagt eerst een expliciete coverage-strategie. `sex_machine` combineert zelfgebruik en partnerbediening en heeft dus eerst scherpere catalogussemantiek nodig. Stocking/lingerie worship blijft voorlopig object-/kledingfetish; high-heel focus is expliciet geen worship-item.
`,
"Release F audit section");
  return text;
});

edit("docs/directionality-role-affinity.md", (source) => replaceOnce(source,
`Power-exchange-identiteiten zoals D/s, Master/slave, Owner/pet en brat/tamer zijn geen give/receive-instrumenten en worden niet door dit model gesplitst.`,
`Release F voegt daarnaast tien expliciet **role-neutrale** partnerhandelingen toe (worship, massage, pet training/grooming en diaper changing). Die pairs hebben bewust géén questionnaireAffinity: profile perspective kiest daar nooit een kant.

Power-exchange-identiteiten zoals D/s, Master/slave, Owner/pet en brat/tamer zijn geen give/receive-instrumenten en worden niet door dit model gesplitst.`,
"neutral affinity note"));

edit("directie.md", (source) => replaceOnce(source,
`Release C bewijst role-affinity op een beperkte keten van bestaande Dynamic-anchors en directe semantische vervolgen: hand-spanking, implement-spanking, flogging, rope bondage, shibari, handcuffs, leather cuffs, ball/bit gag, blindfold en sound deprivation. De volgende Impact-audit splitst ook caning, crop, paddling, whipping, belt, face slapping, punching/thudding en trampling item voor item. Alleen compacte Dynamic-selectie mag role-affinity gebruiken; alle andere productpaden behandelen beide richtingen expliciet. De Impact-instrumenten krijgen bewust geen progression- of canonical-edges. Overige bondage-items wachten nog op item-per-item audit. Worship, toys en anatomy/equipment-gevoelige gevallen blijven apart staan totdat de labels ondubbelzinnig zijn.`,
`Release C bewijst role-affinity op een beperkte keten van bestaande Dynamic-anchors en directe semantische vervolgen; latere Impact- en Bondage-audits hebben dat model item voor item uitgebreid zonder progression of answer inference. Release F maakt de tweede as expliciet: body/vulva/cock/ass/boot worship, erotic/prostate massage, pet training/grooming en diaper changing zijn directioneel maar **role-neutraal** en krijgen dus geen questionnaireAffinity. Remote toys en sex machine blijven apart totdat hun coverage- en catalogussemantiek ondubbelzinnig is.`,
"directie current status"));

edit("planned-changes.md", (source) => {
  let text = source;
  text = replaceOnce(text,
`The original Pegging product gate and Release B role-neutral catalog audit are shipped. Release C proves role-affinity on a deliberately small impact/bondage vertical slice: explicit pairs remain fully independent, while only compact Dynamic coverage may choose the perspective-aligned sibling. The opposite side stays unknown and reachable. The audited Impact extension splits caning, crop, paddling, whipping, belt, face slapping, punching/thudding and trampling. Two high-confidence bondage slices then split spreader bar, hogtie, mummification, straitjacket, tape gag, hood, the remaining three gag types, all three suspension positions and all three confinement forms. None gains progression or canonical inference. Chastity, collar/leash, breast bondage and gas-mask play stay item-by-item editorial work, not a bulk split.`,
`The original Pegging product gate and Release B role-neutral catalog audit are shipped. Release C proves role-affinity on a deliberately small impact/bondage vertical slice: explicit pairs remain fully independent, while only compact Dynamic coverage may choose the perspective-aligned sibling. The opposite side stays unknown and reachable. The audited Impact extension and two high-confidence bondage slices are shipped. Release F then splits ten role-neutral partner actions (body/vulva/cock/ass/boot worship, erotic/prostate massage, pet training/grooming and diaper changing) with zero role affinity. The ambiguous diaper-use→changing canonical inference is removed in mapping v5. Remote toys and sex machine remain editorial/coverage work; chastity, collar/leash, breast bondage and gas-mask play still require sharper concept semantics.`,
"active catalog Release F ledger");
  text = replaceOnce(text,
`The audited
Impact instrument extension and both high-confidence bondage slices (restraints,
gag variants, suspension positions and confinement forms) follow that same
contract. Remaining directional candidates stay item-by-item editorial work and
must not be bulk split or inferred from \`profile.role\`.`,
`The audited
Impact instrument extension, both high-confidence bondage slices and Release F
role-neutral partner actions follow that same contract. Role-neutral pairs carry
no questionnaireAffinity at all. Remaining directional candidates stay item-by-item
editorial work and must not be bulk split or inferred from \`profile.role\`.`,
"matching Release F ledger");
  return text;
});

console.log("Release F role-neutrale directionality transform klaar.");
