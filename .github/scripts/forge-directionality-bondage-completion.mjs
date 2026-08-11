import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, text) => fs.writeFileSync(path, text);

function replaceOnce(text, needle, replacement, label) {
  const first = text.indexOf(needle);
  if (first === -1) throw new Error(`Ontbrekende anchor: ${label}`);
  if (text.indexOf(needle, first + needle.length) !== -1) throw new Error(`Niet-unieke anchor: ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + needle.length);
}

function edit(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (after === before) throw new Error(`Geen wijziging in ${path}`);
  write(path, after);
}

edit("lib/kinks.ts", (source) => {
  let text = source;
  const pairs = [
    [
`  {
    id: "gag_opblaasbaar",
    name: "Inflatable gag",
    aliases: ["Mondknevel (opblaasbaar)"],
    category: "bondage",
    level: 2,
    description: "Een opblaasbare gag waarvan volume en druk stapsgewijs geregeld worden.",
    safetyNote: "Een gag belemmert spreken en kan de luchtweg beïnvloeden. Spreek een non-verbaal stopsignaal af, blijf voortdurend aanwezig en laat snelle verwijdering altijd mogelijk.",
  },`,
`  {
    id: "gag_opblaasbaar_give",
    name: "Inflatable gag — applying",
    aliases: ["Opblaasbare gag aanbrengen", "Iemand een opblaasbare mondknevel omdoen"],
    category: "bondage",
    level: 2,
    description: "Een partner consensueel een opblaasbare gag laten dragen en volume of druk stapsgewijs regelen. Begin laag, blijf actief controleren en verwijder direct bij ongemak.",
    safetyNote: "Een gag belemmert spreken en kan de luchtweg beïnvloeden. Spreek een betrouwbaar non-verbaal stopsignaal af, blijf voortdurend aanwezig en laat onmiddellijke verwijdering altijd mogelijk.",
  },
  {
    id: "gag_opblaasbaar_receive",
    name: "Inflatable gag — wearing",
    aliases: ["Opblaasbare gag dragen", "Met een opblaasbare mondknevel gekneveld worden"],
    category: "bondage",
    level: 2,
    description: "Consensueel een opblaasbare gag dragen waarvan volume of druk stapsgewijs wordt geregeld. Spreek vooraf comfortgrenzen en directe verwijdering af.",
    safetyNote: "Een gag belemmert spreken en kan de luchtweg beïnvloeden. Gebruik een betrouwbaar non-verbaal stopsignaal en stop onmiddellijk bij benauwdheid, paniek, misselijkheid of gevoelloosheid.",
  },`],
    [
`  {
    id: "gag_penisvorm",
    name: "Penis-shaped gag",
    aliases: ["Mondknevel (penisvormig)"],
    category: "bondage",
    level: 2,
    description: "Een penisvormige mondknevel met sterke vernedering-component. Communiceer verwachtingen rondom misselijkheid en ademhaling.",
  },`,
`  {
    id: "gag_penisvorm_give",
    name: "Penis-shaped gag — applying",
    aliases: ["Penisvormige gag aanbrengen", "Iemand een penisvormige mondknevel omdoen"],
    category: "bondage",
    level: 2,
    description: "Een partner consensueel een penisvormige gag laten dragen als knevel- of vernederingsspel. Stem maat, ademruimte, kokhalsreactie en een non-verbaal stopsignaal vooraf af.",
  },
  {
    id: "gag_penisvorm_receive",
    name: "Penis-shaped gag — wearing",
    aliases: ["Penisvormige gag dragen", "Met een penisvormige mondknevel gekneveld worden"],
    category: "bondage",
    level: 2,
    description: "Consensueel een penisvormige gag dragen als knevel- of vernederingsspel. Spreek maat, ademruimte, kokhalsreactie, stopsignaal en directe verwijdering vooraf af.",
  },`],
    [
`  {
    id: "gag_rubber",
    name: "Rubber gag",
    aliases: ["Mondknevel (rubber)"],
    category: "bondage",
    level: 2,
    description: "Rubberen mondknevel in diverse vormen. Comfortabeler dan acryl maar vereist check op rubber-allergie.",
    safetyNote: "Een gag belemmert spreken en kan de luchtweg beïnvloeden. Spreek een non-verbaal stopsignaal af en laat de drager nooit alleen.",
  },`,
`  {
    id: "gag_rubber_give",
    name: "Rubber gag — applying",
    aliases: ["Rubber gag aanbrengen", "Iemand een rubber mondknevel omdoen"],
    category: "bondage",
    level: 2,
    description: "Een partner consensueel een rubber gag laten dragen. Controleer materiaalgevoeligheid, pasvorm en comfort en spreek een betrouwbaar non-verbaal stopsignaal af.",
    safetyNote: "Een gag belemmert spreken en kan de luchtweg beïnvloeden. Laat de drager nooit alleen en verwijder direct bij benauwdheid, paniek of een materiaalreactie.",
  },
  {
    id: "gag_rubber_receive",
    name: "Rubber gag — wearing",
    aliases: ["Rubber gag dragen", "Met een rubber mondknevel gekneveld worden"],
    category: "bondage",
    level: 2,
    description: "Consensueel een rubber gag dragen. Spreek materiaalgevoeligheid, pasvorm, een non-verbaal stopsignaal en directe verwijdering vooraf af.",
    safetyNote: "Een gag belemmert spreken en kan de luchtweg beïnvloeden. Stop direct bij benauwdheid, paniek of een materiaalreactie en laat je nooit alleen met de gag.",
  },`],
    [
`  {
    id: "suspension_rechtop",
    name: "Upright suspension",
    aliases: ["Ophangen (rechtop)"],
    category: "bondage",
    level: 3,
    description: "Rechtop gedeeltelijk of volledig van de grond hangen met daarvoor geschikte bondage-uitrusting.",
    safetyNote: "Suspension vraagt aantoonbare techniek, geschikte ankerpunten, noodgereedschap en voortdurende controle op zenuw- en doorbloedingsproblemen. Laat niemand alleen hangen.",
  },`,
`  {
    id: "suspension_rechtop_give",
    name: "Upright suspension — rigging",
    aliases: ["Rechtop suspension geven", "Iemand rechtop ophangen"],
    category: "bondage",
    level: 3,
    description: "Een partner rechtop gedeeltelijk of volledig suspenderen met daarvoor geschikte bondage-uitrusting. Dit is een technische handeling die training, belastbare ankerpunten en actief toezicht vereist.",
    safetyNote: "Suspension vraagt aantoonbare techniek, geschikte ankerpunten, noodgereedschap en voortdurende controle op zenuw- en doorbloedingsproblemen. Laat niemand alleen hangen.",
  },
  {
    id: "suspension_rechtop_receive",
    name: "Upright suspension — being suspended",
    aliases: ["Rechtop suspension ontvangen", "Rechtop opgehangen worden"],
    category: "bondage",
    level: 3,
    description: "Rechtop gedeeltelijk of volledig gesuspendeerd worden met daarvoor geschikte bondage-uitrusting. Bespreek ervaring, steunpunten, signalen en een direct reddingsplan vooraf.",
    safetyNote: "Suspension vraagt een ervaren rigger, geschikte ankerpunten, noodgereedschap en voortdurende controle op zenuw- en doorbloedingsproblemen. Blijf nooit alleen hangen.",
  },`],
    [
`  {
    id: "suspension_ondersteboven",
    name: "Inverted suspension",
    aliases: ["Ophangen (ondersteboven)"],
    category: "bondage",
    level: 4,
    description: "Ondersteboven gedeeltelijk of volledig van de grond hangen met daarvoor geschikte bondage-uitrusting.",
    safetyNote: "Inverted suspension belast circulatie en positie extra. Vereist ervaren begeleiding, een direct reddingsplan en voortdurende observatie; laat niemand alleen hangen.",
  },`,
`  {
    id: "suspension_ondersteboven_give",
    name: "Inverted suspension — rigging",
    aliases: ["Inverted suspension geven", "Iemand ondersteboven ophangen"],
    category: "bondage",
    level: 4,
    description: "Een partner ondersteboven gedeeltelijk of volledig suspenderen. De extra circulatie- en positierisico's maken dit uitsluitend geschikt voor aantoonbaar ervaren rigging met een direct reddingsplan.",
    safetyNote: "Inverted suspension belast circulatie en positie extra. Vereist ervaren techniek, geschikte ankerpunten, noodgereedschap en voortdurende observatie; laat niemand alleen hangen.",
  },
  {
    id: "suspension_ondersteboven_receive",
    name: "Inverted suspension — being suspended",
    aliases: ["Inverted suspension ontvangen", "Ondersteboven opgehangen worden"],
    category: "bondage",
    level: 4,
    description: "Ondersteboven gedeeltelijk of volledig gesuspendeerd worden. Bespreek ervaring, medische/lichamelijke aandachtspunten, signalen en het directe reddingsplan vooraf.",
    safetyNote: "Inverted suspension belast circulatie en positie extra. Doe dit alleen met ervaren begeleiding, een direct reddingsplan en voortdurende observatie; blijf nooit alleen hangen.",
  },`],
    [
`  {
    id: "suspension_horizontaal",
    name: "Horizontal suspension",
    aliases: ["Ophangen (horizontaal)"],
    category: "bondage",
    level: 4,
    description: "Horizontaal gedeeltelijk of volledig van de grond hangen met meerdere steunpunten.",
    safetyNote: "Suspension vraagt aantoonbare techniek, geschikte ankerpunten, noodgereedschap en voortdurende controle op zenuw- en doorbloedingsproblemen. Laat niemand alleen hangen.",
  },`,
`  {
    id: "suspension_horizontaal_give",
    name: "Horizontal suspension — rigging",
    aliases: ["Horizontale suspension geven", "Iemand horizontaal ophangen"],
    category: "bondage",
    level: 4,
    description: "Een partner horizontaal gedeeltelijk of volledig suspenderen met meerdere steunpunten. Verdeel belasting zorgvuldig en gebruik alleen geschikte uitrusting, ankerpunten en een vooraf geoefend reddingsplan.",
    safetyNote: "Suspension vraagt aantoonbare techniek, geschikte ankerpunten, noodgereedschap en voortdurende controle op zenuw- en doorbloedingsproblemen. Laat niemand alleen hangen.",
  },
  {
    id: "suspension_horizontaal_receive",
    name: "Horizontal suspension — being suspended",
    aliases: ["Horizontale suspension ontvangen", "Horizontaal opgehangen worden"],
    category: "bondage",
    level: 4,
    description: "Horizontaal gedeeltelijk of volledig gesuspendeerd worden met meerdere steunpunten. Spreek comfort, belasting, signalen, ervaring en een direct reddingsplan vooraf af.",
    safetyNote: "Suspension vraagt een ervaren rigger, geschikte ankerpunten, noodgereedschap en voortdurende controle op zenuw- en doorbloedingsproblemen. Blijf nooit alleen hangen.",
  },`],
    [
`  {
    id: "opsluiting_kooi",
    name: "Cage confinement",
    aliases: ["Opsluiting in kooi"],
    category: "bondage",
    level: 3,
    description: "Tijdelijk verblijven in een kooi als afgesproken vorm van beperking of rolspel.",
    safetyNote: "Zorg voor ventilatie, een directe ontsnappingsroute en regelmatige check-ins. Sluit iemand nooit zonder toezicht of noodontgrendeling op.",
  },`,
`  {
    id: "opsluiting_kooi_give",
    name: "Cage confinement — confining",
    aliases: ["Iemand in een kooi opsluiten", "Kooi-opsluiting geven"],
    category: "bondage",
    level: 3,
    description: "Een partner consensueel tijdelijk in een kooi beperken. Zorg voor ventilatie, comfort, actieve check-ins en een directe noodontgrendeling.",
    safetyNote: "Sluit iemand nooit zonder toezicht of directe ontsnappingsmogelijkheid op. Stop direct bij benauwdheid, paniek, pijn of een noodsituatie.",
  },
  {
    id: "opsluiting_kooi_receive",
    name: "Cage confinement — being confined",
    aliases: ["In een kooi opgesloten worden", "Kooi-opsluiting ontvangen"],
    category: "bondage",
    level: 3,
    description: "Consensueel tijdelijk in een kooi beperkt worden. Spreek duur, check-ins, comfort, stopsignalen en directe noodontgrendeling vooraf af.",
    safetyNote: "Ventilatie, toezicht en een directe ontsnappingsmogelijkheid blijven noodzakelijk. Stop bij benauwdheid, paniek, pijn of een noodsituatie.",
  },`],
    [
`  {
    id: "opsluiting_donker",
    name: "Dark confinement",
    aliases: ["Opsluiting in het donker"],
    category: "bondage",
    level: 3,
    description: "Tijdelijk in een verduisterde ruimte verblijven als afgesproken beperking of sensorisch spel.",
    safetyNote: "Zorg voor ventilatie, een directe uitgang en een werkend non-verbaal signaal. Laat iemand niet zonder toezicht opgesloten.",
  },`,
`  {
    id: "opsluiting_donker_give",
    name: "Dark confinement — confining",
    aliases: ["Iemand in het donker opsluiten", "Donkere opsluiting geven"],
    category: "bondage",
    level: 3,
    description: "Een partner consensueel tijdelijk in een verduisterde ruimte beperken als confinement- of sensorisch spel. Zorg voor ventilatie, toezicht, check-ins en een directe uitgang.",
    safetyNote: "Een betrouwbaar stopsignaal en directe bevrijding zijn verplicht. Stop onmiddellijk bij paniek, benauwdheid, desoriëntatie of een noodsituatie.",
  },
  {
    id: "opsluiting_donker_receive",
    name: "Dark confinement — being confined",
    aliases: ["In het donker opgesloten worden", "Donkere opsluiting ontvangen"],
    category: "bondage",
    level: 3,
    description: "Consensueel tijdelijk in een verduisterde ruimte beperkt worden als confinement- of sensorisch spel. Spreek duur, check-ins, stopsignalen en directe bevrijding vooraf af.",
    safetyNote: "Ventilatie, actief toezicht, een betrouwbaar stopsignaal en een directe uitgang zijn noodzakelijk. Stop bij paniek, benauwdheid of desoriëntatie.",
  },`],
    [
`  {
    id: "opsluiting_kleine_ruimte",
    name: "Small-space confinement",
    aliases: ["Opsluiting in kleine ruimte"],
    category: "bondage",
    level: 3,
    description: "Tijdelijk in een kleine ruimte verblijven als afgesproken vorm van beperking.",
    safetyNote: "Controleer ventilatie, houding, temperatuur en paniekreacties. Een directe uitgang en actief toezicht zijn noodzakelijk.",
  },`,
`  {
    id: "opsluiting_kleine_ruimte_give",
    name: "Small-space confinement — confining",
    aliases: ["Iemand in een kleine ruimte opsluiten", "Kleine-ruimte-opsluiting geven"],
    category: "bondage",
    level: 3,
    description: "Een partner consensueel tijdelijk in een kleine ruimte beperken. Controleer ventilatie, houding, temperatuur en paniekreacties en houd een directe uitgang beschikbaar.",
    safetyNote: "Actief toezicht, een betrouwbaar stopsignaal en onmiddellijke bevrijding zijn noodzakelijk. Stop bij benauwdheid, pijn, oververhitting of paniek.",
  },
  {
    id: "opsluiting_kleine_ruimte_receive",
    name: "Small-space confinement — being confined",
    aliases: ["In een kleine ruimte opgesloten worden", "Kleine-ruimte-opsluiting ontvangen"],
    category: "bondage",
    level: 3,
    description: "Consensueel tijdelijk in een kleine ruimte beperkt worden. Spreek duur, houding, temperatuur, check-ins, stopsignalen en directe bevrijding vooraf af.",
    safetyNote: "Ventilatie, actief toezicht en een directe uitgang zijn noodzakelijk. Stop bij benauwdheid, pijn, oververhitting of paniek.",
  },`],
  ];
  for (const [oldBlock, newBlock] of pairs) {
    const id = oldBlock.match(/id: "([^"]+)/)?.[1] ?? "catalog-item";
    text = replaceOnce(text, oldBlock, newBlock, id);
  }
  return text;
});

edit("lib/directionality.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`  { conceptId: "gag_tape", giveId: "gag_tape_give", receiveId: "gag_tape_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },`,
`  { conceptId: "gag_tape", giveId: "gag_tape_give", receiveId: "gag_tape_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_opblaasbaar", giveId: "gag_opblaasbaar_give", receiveId: "gag_opblaasbaar_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_penisvorm", giveId: "gag_penisvorm_give", receiveId: "gag_penisvorm_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_rubber", giveId: "gag_rubber_give", receiveId: "gag_rubber_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },`,
"remaining gag pairs");
  text = replaceOnce(text,
`  { conceptId: "hood", giveId: "hood_give", receiveId: "hood_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },`,
`  { conceptId: "hood", giveId: "hood_give", receiveId: "hood_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "suspension_rechtop", giveId: "suspension_rechtop_give", receiveId: "suspension_rechtop_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "suspension_ondersteboven", giveId: "suspension_ondersteboven_give", receiveId: "suspension_ondersteboven_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "suspension_horizontaal", giveId: "suspension_horizontaal_give", receiveId: "suspension_horizontaal_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "opsluiting_kooi", giveId: "opsluiting_kooi_give", receiveId: "opsluiting_kooi_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "opsluiting_donker", giveId: "opsluiting_donker_give", receiveId: "opsluiting_donker_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "opsluiting_kleine_ruimte", giveId: "opsluiting_kleine_ruimte_give", receiveId: "opsluiting_kleine_ruimte_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },`,
"suspension confinement pairs");

  text = replaceOnce(text,
`  gag_tape: "Tape gag",
  blindfold: "Blindfold",`,
`  gag_tape: "Tape gag",
  gag_opblaasbaar: "Inflatable gag",
  gag_penisvorm: "Penis-shaped gag",
  gag_rubber: "Rubber gag",
  blindfold: "Blindfold",`,
"gag labels");
  text = replaceOnce(text,
`  hood: "Hood / sensory deprivation hood",
  sound_deprivation: "Sound deprivation",`,
`  hood: "Hood / sensory deprivation hood",
  suspension_rechtop: "Upright suspension",
  suspension_ondersteboven: "Inverted suspension",
  suspension_horizontaal: "Horizontal suspension",
  opsluiting_kooi: "Cage confinement",
  opsluiting_donker: "Dark confinement",
  opsluiting_kleine_ruimte: "Small-space confinement",
  sound_deprivation: "Sound deprivation",`,
"suspension confinement labels");

  text = replaceOnce(text,
`  "gag_tape",
  "blindfold",`,
`  "gag_tape",
  "gag_opblaasbaar",
  "gag_penisvorm",
  "gag_rubber",
  "blindfold",`,
"retire gag singles");
  text = replaceOnce(text,
`  "hood",
  "sound_deprivation",`,
`  "hood",
  "suspension_rechtop",
  "suspension_ondersteboven",
  "suspension_horizontaal",
  "opsluiting_kooi",
  "opsluiting_donker",
  "opsluiting_kleine_ruimte",
  "sound_deprivation",`,
"retire suspension confinement singles");
  return text;
});

edit("lib/questionnaireMetadata.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`    "suspension_rechtop", "suspension_ondersteboven",
    "suspension_horizontaal",`,
`    "suspension_rechtop_give", "suspension_rechtop_receive",
    "suspension_ondersteboven_give", "suspension_ondersteboven_receive",
    "suspension_horizontaal_give", "suspension_horizontaal_receive",`,
"rope suspension topic");
  text = replaceOnce(text,
`  gags: ["gag_ball_give", "gag_ball_receive", "gag_bit_give", "gag_bit_receive", "gag_tape_give", "gag_tape_receive", "gag_opblaasbaar", "gag_penisvorm", "gag_rubber"],`,
`  gags: [
    "gag_ball_give", "gag_ball_receive", "gag_bit_give", "gag_bit_receive",
    "gag_tape_give", "gag_tape_receive", "gag_opblaasbaar_give", "gag_opblaasbaar_receive",
    "gag_penisvorm_give", "gag_penisvorm_receive", "gag_rubber_give", "gag_rubber_receive",
  ],`,
"gag topic");
  return text;
});

edit("lib/storeCore.ts", (source) => {
  let text = replaceOnce(source, "export const STORE_PERSIST_VERSION = 22;", "export const STORE_PERSIST_VERSION = 23;", "store v22");
  if (!text.includes("migrateStoredDirectionalityV22")) throw new Error("V22 migration ontbreekt");
  text = text.replaceAll("migrateStoredDirectionalityV22", "migrateStoredDirectionalityV23");
  return text;
});

edit("__tests__/directionality.test.ts", (source) => {
  let text = source.replaceAll("migrateStoredDirectionalityV22", "migrateStoredDirectionalityV23");
  text = replaceOnce(text, "expect(DIRECTIONAL_KINK_PAIRS).toHaveLength(34);", "expect(DIRECTIONAL_KINK_PAIRS).toHaveLength(43);", "pair count 34");
  text = replaceOnce(text,
`      "spreader_bar", "hogtie", "mummification", "straitjacket", "gag_tape", "hood",
    ]) {`,
`      "spreader_bar", "hogtie", "mummification", "straitjacket", "gag_tape", "hood",
      "gag_opblaasbaar", "gag_penisvorm", "gag_rubber",
      "suspension_rechtop", "suspension_ondersteboven", "suspension_horizontaal",
      "opsluiting_kooi", "opsluiting_donker", "opsluiting_kleine_ruimte",
    ]) {`,
"retired completion ids");
  text = replaceOnce(text,
`    expect(partnerDirectionalKinkId("hood_receive")).toBe("hood_give");`,
`    expect(partnerDirectionalKinkId("hood_receive")).toBe("hood_give");
    expect(partnerDirectionalKinkId("gag_rubber_give")).toBe("gag_rubber_receive");
    expect(partnerDirectionalKinkId("suspension_rechtop_receive")).toBe("suspension_rechtop_give");
    expect(partnerDirectionalKinkId("opsluiting_kooi_give")).toBe("opsluiting_kooi_receive");`,
"completion partner mappings");
  text = replaceOnce(text,
`    expect(restraintIds).toContain("spreader_bar_receive");
  });`,
`    expect(restraintIds).toContain("spreader_bar_receive");
    const suspensionIds = searchAllKinks("upright suspension").map((kink) => kink.id);
    expect(suspensionIds).toContain("suspension_rechtop_give");
    expect(suspensionIds).toContain("suspension_rechtop_receive");
  });`,
"completion search");
  text = replaceOnce(text,
`  it("drops the old ambiguous answer instead of copying it to either direction", () => {`,
`  it("houdt de resterende gag-, suspension- en confinementacties expliciet zonder inferentie", () => {
    const ids = [
      "gag_opblaasbaar_give", "gag_opblaasbaar_receive", "gag_penisvorm_give", "gag_penisvorm_receive",
      "gag_rubber_give", "gag_rubber_receive", "suspension_rechtop_give", "suspension_rechtop_receive",
      "suspension_ondersteboven_give", "suspension_ondersteboven_receive", "suspension_horizontaal_give", "suspension_horizontaal_receive",
      "opsluiting_kooi_give", "opsluiting_kooi_receive", "opsluiting_donker_give", "opsluiting_donker_receive",
      "opsluiting_kleine_ruimte_give", "opsluiting_kleine_ruimte_receive",
    ];
    for (const id of ids) {
      expect(QUESTIONNAIRE_FOLLOW_UPS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_PROGRESSION_EDGES.some(([parent, child]) => parent === id || child === id)).toBe(false);
    }
    expect(questionnaireDirectionalKinkIdForPerspective("gag_rubber_give", "submissive")).toBe("gag_rubber_receive");
    expect(questionnaireDirectionalKinkIdForPerspective("suspension_rechtop_receive", "dominant")).toBe("suspension_rechtop_give");
    expect(questionnaireDirectionalKinkIdForPerspective("opsluiting_kooi_give", "submissive")).toBe("opsluiting_kooi_receive");
  });

  it("drops the old ambiguous answer instead of copying it to either direction", () => {`,
"completion invariant test");
  text = replaceOnce(text,
`    expect(restraintRetired.hood).toBeUndefined();
  });`,
`    expect(restraintRetired.hood).toBeUndefined();
    const completionRetired = stripDeprecatedDirectionalEntries({
      gag_opblaasbaar: { status: "yes", comment: "oud gecombineerd" },
      suspension_rechtop: { status: "maybe", comment: "oud gecombineerd" },
      opsluiting_kooi: { status: "hard_no", comment: "oud gecombineerd" },
    });
    expect(completionRetired.gag_opblaasbaar).toBeUndefined();
    expect(completionRetired.gag_opblaasbaar_give).toBeUndefined();
    expect(completionRetired.gag_opblaasbaar_receive).toBeUndefined();
    expect(completionRetired.suspension_rechtop).toBeUndefined();
    expect(completionRetired.opsluiting_kooi).toBeUndefined();
  });`,
"completion retired cleanup");
  text = replaceOnce(text, "expect(STORE_PERSIST_VERSION).toBe(22);", "expect(STORE_PERSIST_VERSION).toBe(23);", "persist version 22");
  text = replaceOnce(text,
`  it("laat v22 state ongemoeid door dezelfde migratieboundary", () => {
    const profile = ownProfile("dominant", { spreader_bar_give: { status: "yes", comment: "expliciet" } });
    const migrated = migrateStoredDirectionalityV23({ profiles: [profile] }, 22);
    expect(migrated.profiles?.[0].entries.spreader_bar_give?.status).toBe("yes");
  });`,
`  it("migreert v22 completion-antwoorden zonder een kant te verzinnen", () => {
    const profile = ownProfile("dominant", {
      suspension_rechtop: { status: "yes", comment: "oud gecombineerd" },
      praise_kink: { status: "maybe", comment: "blijft" },
    });
    const migrated = migrateStoredDirectionalityV23({ profiles: [profile] }, 22);
    expect(migrated.profiles?.[0].entries.suspension_rechtop).toBeUndefined();
    expect(migrated.profiles?.[0].entries.suspension_rechtop_give).toBeUndefined();
    expect(migrated.profiles?.[0].entries.suspension_rechtop_receive).toBeUndefined();
    expect(migrated.profiles?.[0].entries.praise_kink?.status).toBe("maybe");
  });

  it("laat v23 state ongemoeid door dezelfde migratieboundary", () => {
    const profile = ownProfile("dominant", { suspension_rechtop_give: { status: "yes", comment: "expliciet" } });
    const migrated = migrateStoredDirectionalityV23({ profiles: [profile] }, 23);
    expect(migrated.profiles?.[0].entries.suspension_rechtop_give?.status).toBe("yes");
  });`,
"v22 v23 migration boundary");
  return text;
});

edit("__tests__/kinks.test.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`  "hood_give", "hood_receive",
] as const;`,
`  "hood_give", "hood_receive",
  "gag_opblaasbaar_give", "gag_opblaasbaar_receive",
  "gag_penisvorm_give", "gag_penisvorm_receive",
  "gag_rubber_give", "gag_rubber_receive",
  "suspension_rechtop_give", "suspension_rechtop_receive",
  "suspension_ondersteboven_give", "suspension_ondersteboven_receive",
  "suspension_horizontaal_give", "suspension_horizontaal_receive",
  "opsluiting_kooi_give", "opsluiting_kooi_receive",
  "opsluiting_donker_give", "opsluiting_donker_receive",
  "opsluiting_kleine_ruimte_give", "opsluiting_kleine_ruimte_receive",
] as const;`,
"completion directional ids");
  text = replaceOnce(text,
`const RETIRED_POST_V2_DIRECTIONAL_IDS = [
  "sound_deprivation",
  ...RETIRED_HISTORICAL_IMPACT_DIRECTIONAL_IDS,
  ...RETIRED_HISTORICAL_BONDAGE_DIRECTIONAL_IDS,
] as const;`,
`const RETIRED_HISTORICAL_BONDAGE_COMPLETION_IDS = [
  "gag_opblaasbaar", "gag_penisvorm", "gag_rubber",
  "suspension_rechtop", "suspension_ondersteboven", "suspension_horizontaal",
  "opsluiting_kooi", "opsluiting_donker", "opsluiting_kleine_ruimte",
] as const;

const RETIRED_POST_V2_DIRECTIONAL_IDS = [
  "sound_deprivation",
  ...RETIRED_HISTORICAL_IMPACT_DIRECTIONAL_IDS,
  ...RETIRED_HISTORICAL_BONDAGE_DIRECTIONAL_IDS,
  ...RETIRED_HISTORICAL_BONDAGE_COMPLETION_IDS,
] as const;`,
"completion retired ledger");
  text = replaceOnce(text, "expect(KINKS).toHaveLength(324);", "expect(KINKS).toHaveLength(333);", "catalog count 324");
  text = replaceOnce(text,
`      ...RETIRED_HISTORICAL_BONDAGE_DIRECTIONAL_IDS,
    ].sort());`,
`      ...RETIRED_HISTORICAL_BONDAGE_DIRECTIONAL_IDS,
      ...RETIRED_HISTORICAL_BONDAGE_COMPLETION_IDS,
    ].sort());`,
"completion retired audit set");
  return text;
});

edit("docs/directionality-catalog-audit.md", (source) => replaceOnce(source,
`## Questionnaire-keuzes`,
`## Release E — gag, suspension en confinement completion

De resterende high-confidence bondage-handelingen met een letterlijke complementaire partnerkant zijn nu eveneens directioneel:

- Inflatable gag, penis-shaped gag en rubber gag — aanbrengen / dragen.
- Upright, inverted en horizontal suspension — riggen / gesuspendeerd worden.
- Cage, dark en small-space confinement — iemand beperken / zelf beperkt worden.

Deze negen concepten krijgen role affinity uitsluitend als compacte questionnaire-prioriteit. Ze krijgen geen sibling-inference, canonical probe of progression. De drie suspensionvormen zijn technische alternatieven, geen automatische ladder; confinementvormen en gagtypes zijn eveneens alternatieven.

Bewust nog niet gesplitst: chastity, collar/leash, breast bondage en gas-mask play. Daar combineert de huidige single nog controle/symboliek, anatomy-context of een objectfetish met de concrete partnerhandeling. Eerst het concept zelf aanscherpen, pas daarna eventueel directionality.

## Questionnaire-keuzes`,
"Release E docs"));

edit("docs/directionality-role-affinity.md", (source) => replaceOnce(source,
`Na de Impact-uitbreiding is ook een high-confidence restraint-slice uitgevoerd: spreader bar, hogtie, mummification, straitjacket, tape gag en hood zijn expliciete give/receive-paren met dezelfde role-affinitygrens. Chastity, collar/leash, suspension en overige gag-/confinementvarianten blijven kandidaat maar niet automatisch goedgekeurd; daar moet eerst de catalogusbetekenis of praktische counterpart scherper worden.`,
`Na de Impact-uitbreiding volgden twee high-confidence bondage-slices. Spreader bar, hogtie, mummification, straitjacket, tape gag en hood zijn expliciete give/receive-paren; daarna zijn ook inflatable/penis-shaped/rubber gag, upright/inverted/horizontal suspension en cage/dark/small-space confinement gepaird. Voor al deze paren blijft role affinity uitsluitend questionnaire-prioriteit. Chastity, collar/leash, breast bondage en gas-mask play blijven kandidaat maar vragen eerst een scherpere catalogusbetekenis of praktische counterpart.`,
"role affinity completion docs"));

edit("planned-changes.md", (source) => {
  let text = source;
  text = replaceOnce(text,
`The audited Impact extension splits caning, crop, paddling, whipping, belt, face slapping, punching/thudding and trampling. The subsequent high-confidence restraint slice splits spreader bar, hogtie, mummification, straitjacket, tape gag and hood. None gains progression or canonical inference. Chastity, collar/leash, suspension and remaining confinement/gag candidates stay item-by-item work, not a bulk split.`,
`The audited Impact extension splits caning, crop, paddling, whipping, belt, face slapping, punching/thudding and trampling. Two high-confidence bondage slices then split spreader bar, hogtie, mummification, straitjacket, tape gag, hood, the remaining three gag types, all three suspension positions and all three confinement forms. None gains progression or canonical inference. Chastity, collar/leash, breast bondage and gas-mask play stay item-by-item editorial work, not a bulk split.`,
"active catalog ledger");
  text = replaceOnce(text,
`The audited
Impact instrument extension and the high-confidence restraint slice (spreader
bar, hogtie, mummification, straitjacket, tape gag and hood) follow that same
contract. Remaining directional candidates stay item-by-item editorial work and
must not be bulk split or inferred from \`profile.role\`.`,
`The audited
Impact instrument extension and both high-confidence bondage slices (restraints,
gag variants, suspension positions and confinement forms) follow that same
contract. Remaining directional candidates stay item-by-item editorial work and
must not be bulk split or inferred from \`profile.role\`.`,
"matching ledger");
  return text;
});

console.log("Release E transform klaar.");
