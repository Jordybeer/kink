import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(text, needle, replacement, label) {
  const first = text.indexOf(needle);
  if (first === -1) throw new Error(`Ontbrekende forge-anchor: ${label}`);
  if (text.indexOf(needle, first + needle.length) !== -1) {
    throw new Error(`Niet-unieke forge-anchor: ${label}`);
  }
  return text.slice(0, first) + replacement + text.slice(first + needle.length);
}

function edit(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (after === before) throw new Error(`Geen wijziging gemaakt in ${path}`);
  write(path, after);
}

const pairAffinity = ", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY";

edit("lib/kinks.ts", (source) => {
  let text = source;
  const replacements = [
    [
`  {
    id: "spreader_bar",
    name: "Spreader bar",
    category: "bondage",
    level: 2,
    description: "Starre stang die armen of benen op afstand houdt. Geeft een gevoel van kwetsbaarheid en expositie. Comfortabele plek en tijdslimiet zijn belangrijk.",
  },`,
`  {
    id: "spreader_bar_give",
    name: "Spreader bar — applying",
    aliases: ["Spreader bar aanbrengen", "Iemand met een spreader bar vastzetten"],
    category: "bondage",
    level: 2,
    description: "Een partner met een spreader bar in een afgesproken positie beperken. Controleer pasvorm, gewrichten en comfort regelmatig en zorg dat losmaken onmiddellijk mogelijk blijft.",
  },
  {
    id: "spreader_bar_receive",
    name: "Spreader bar — wearing",
    aliases: ["Spreader bar dragen", "Met een spreader bar vastgezet worden"],
    category: "bondage",
    level: 2,
    description: "Met een spreader bar in een afgesproken positie beperkt worden. Spreek duur, gewrichtscomfort, check-ins en directe bevrijding vooraf af.",
  },`],
    [
`  {
    id: "hogtie",
    name: "Hogtie",
    category: "bondage",
    level: 3,
    description: "Verbinden van polsen en enkels aan de achterkant van het lichaam. Intensieve positie die de bewegingsvrijheid volledig beperkt. Regelmatige check-ins zijn noodzakelijk.",
  },`,
`  {
    id: "hogtie_give",
    name: "Hogtie — tying",
    aliases: ["Hogtie geven", "Iemand in hogtie binden"],
    category: "bondage",
    level: 3,
    description: "Een partner in een hogtiepositie binden. Bewaak ademhaling, gewrichten en zenuwdruk, houd de duur beperkt en zorg dat snelle bevrijding altijd mogelijk is.",
  },
  {
    id: "hogtie_receive",
    name: "Hogtie — being tied",
    aliases: ["Hogtie ontvangen", "In hogtie gebonden worden"],
    category: "bondage",
    level: 3,
    description: "In een hogtiepositie gebonden worden. Spreek positie, duur, check-ins, stopmomenten en een directe manier om losgemaakt te worden vooraf af.",
  },`],
    [
`  {
    id: "mummification",
    name: "Mummification",
    category: "bondage",
    level: 4,
    description: "Het volledig inbakeren van het lichaam met tape, latex of stof. Geeft een intens gevoel van beperktheid en sensorische overweldiging. Nooit alleen uitvoeren.",
  },`,
`  {
    id: "mummification_give",
    name: "Mummification — wrapping",
    aliases: ["Mummification geven", "Iemand volledig inbakeren"],
    category: "bondage",
    level: 4,
    description: "Een partner grotendeels of volledig in materiaal inbakeren. Dit vereist voortdurende observatie, temperatuur- en circulatiechecks en een vooraf klaarliggend plan voor snelle bevrijding.",
  },
  {
    id: "mummification_receive",
    name: "Mummification — being wrapped",
    aliases: ["Mummification ontvangen", "Volledig ingebakerd worden"],
    category: "bondage",
    level: 4,
    description: "Grotendeels of volledig ingebakerd worden en veel bewegingsvrijheid afstaan. Spreek materiaal, duur, signalen, temperatuurcomfort en onmiddellijke bevrijding vooraf af.",
  },`],
    [
`  {
    id: "straitjacket",
    name: "Straitjacket",
    category: "bondage",
    level: 4,
    description: "Dwangbuis die armen en torso fixeert. Symbool van volledige controle. Altijd een veilig signaal afspreken.",
  },`,
`  {
    id: "straitjacket_give",
    name: "Straitjacket — applying",
    aliases: ["Dwangbuis omdoen", "Iemand in een straitjacket vastzetten"],
    category: "bondage",
    level: 4,
    description: "Een partner consensueel in een straitjacket beperken. Controleer pasvorm, ademruimte en circulatie en spreek een betrouwbaar stopsignaal en directe bevrijding af.",
  },
  {
    id: "straitjacket_receive",
    name: "Straitjacket — wearing",
    aliases: ["Dwangbuis dragen", "In een straitjacket vastgezet worden"],
    category: "bondage",
    level: 4,
    description: "Een straitjacket dragen en arm- en torsobeweging laten beperken. Spreek pasvorm, duur, check-ins, stopsignaal en onmiddellijke bevrijding vooraf af.",
  },`],
    [
`  {
    id: "gag_tape",
    name: "Tape gag",
    category: "bondage",
    level: 2,
    description: "Tape over de mond als knevel. Eenvoudig en visueel impactvol. Zorg dat de neusgangen vrij zijn en gebruik huidvriendelijke tape.",
  },`,
`  {
    id: "gag_tape_give",
    name: "Tape gag — applying",
    aliases: ["Tape gag aanbrengen", "Iemand met tape knevelen"],
    category: "bondage",
    level: 2,
    description: "Een partner met daarvoor geschikt materiaal consensueel een tape gag laten dragen. Spreek een betrouwbaar non-verbaal stopsignaal af, blijf actief controleren en verwijder de gag direct bij ongemak of benauwdheid.",
  },
  {
    id: "gag_tape_receive",
    name: "Tape gag — wearing",
    aliases: ["Tape gag dragen", "Met tape gekneveld worden"],
    category: "bondage",
    level: 2,
    description: "Consensueel een tape gag dragen waardoor spreken beperkt wordt. Spreek een betrouwbaar non-verbaal stopsignaal en directe verwijdering af en stop onmiddellijk bij ongemak of benauwdheid.",
  },`],
    [
`  {
    id: "hood",
    name: "Hood / sensory deprivation hood",
    category: "bondage",
    level: 3,
    description: "Kap over het hoofd die zicht en soms gehoor ontneemt. Intensief sensorisch hulpmiddel. Zorg altijd voor voldoende luchttoevoer.",
  },`,
`  {
    id: "hood_give",
    name: "Hood — applying",
    aliases: ["Hood omdoen", "Sensory deprivation hood aanbrengen"],
    category: "bondage",
    level: 3,
    description: "Een partner consensueel een daarvoor ontworpen hood laten dragen om zintuiglijke input te beperken. Bewaak ademruimte en comfort voortdurend en zorg dat verwijderen direct mogelijk blijft.",
  },
  {
    id: "hood_receive",
    name: "Hood — wearing",
    aliases: ["Hood dragen", "Sensory deprivation hood dragen"],
    category: "bondage",
    level: 3,
    description: "Een daarvoor ontworpen hood dragen die zicht en soms geluid beperkt. Spreek check-ins, een betrouwbaar stopsignaal en onmiddellijke verwijdering af en stop bij ademhalings- of paniekklachten.",
  },`],
  ];
  for (const [before, after] of replacements) text = replaceOnce(text, before, after, before.match(/id: \"([^\"]+)/)?.[1] ?? "catalog");
  return text;
});

edit("lib/directionality.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`  { conceptId: "leather_cuffs", giveId: "leather_cuffs_give", receiveId: "leather_cuffs_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },`,
`  { conceptId: "leather_cuffs", giveId: "leather_cuffs_give", receiveId: "leather_cuffs_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "spreader_bar", giveId: "spreader_bar_give", receiveId: "spreader_bar_receive"${pairAffinity} },
  { conceptId: "hogtie", giveId: "hogtie_give", receiveId: "hogtie_receive"${pairAffinity} },
  { conceptId: "mummification", giveId: "mummification_give", receiveId: "mummification_receive"${pairAffinity} },
  { conceptId: "straitjacket", giveId: "straitjacket_give", receiveId: "straitjacket_receive"${pairAffinity} },`,
"restraint pairs");
  text = replaceOnce(text,
`  { conceptId: "gag_bit", giveId: "gag_bit_give", receiveId: "gag_bit_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },`,
`  { conceptId: "gag_bit", giveId: "gag_bit_give", receiveId: "gag_bit_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_tape", giveId: "gag_tape_give", receiveId: "gag_tape_receive"${pairAffinity} },`,
"tape gag pair");
  text = replaceOnce(text,
`  { conceptId: "blindfold", giveId: "blindfold_give", receiveId: "blindfold_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },`,
`  { conceptId: "blindfold", giveId: "blindfold_give", receiveId: "blindfold_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "hood", giveId: "hood_give", receiveId: "hood_receive"${pairAffinity} },`,
"hood pair");

  text = replaceOnce(text,
`  leather_cuffs: "Leather cuffs",
  gag_ball: "Ball gag",`,
`  leather_cuffs: "Leather cuffs",
  spreader_bar: "Spreader bar",
  hogtie: "Hogtie",
  mummification: "Mummification",
  straitjacket: "Straitjacket",
  gag_ball: "Ball gag",`,
"restraint labels");
  text = replaceOnce(text,
`  gag_bit: "Bit gag",
  blindfold: "Blindfold",`,
`  gag_bit: "Bit gag",
  gag_tape: "Tape gag",
  blindfold: "Blindfold",
  hood: "Hood / sensory deprivation hood",`,
"gag hood labels");

  text = replaceOnce(text,
`  "leather_cuffs",
  "gag_ball",`,
`  "leather_cuffs",
  "spreader_bar",
  "hogtie",
  "mummification",
  "straitjacket",
  "gag_ball",`,
"retired restraints");
  text = replaceOnce(text,
`  "gag_bit",
  "blindfold",
  "sound_deprivation",`,
`  "gag_bit",
  "gag_tape",
  "blindfold",
  "hood",
  "sound_deprivation",`,
"retired gag hood");
  return text;
});

edit("lib/storeCore.ts", (source) => {
  let text = replaceOnce(source, "export const STORE_PERSIST_VERSION = 21;", "export const STORE_PERSIST_VERSION = 22;", "store version 21");
  if (!text.includes("migrateStoredDirectionalityV21")) throw new Error("V21 migration naam ontbreekt");
  text = text.replaceAll("migrateStoredDirectionalityV21", "migrateStoredDirectionalityV22");
  return text;
});

edit("__tests__/directionality.test.ts", (source) => {
  let text = source.replaceAll("migrateStoredDirectionalityV21", "migrateStoredDirectionalityV22");
  text = replaceOnce(text, "expect(DIRECTIONAL_KINK_PAIRS).toHaveLength(28);", "expect(DIRECTIONAL_KINK_PAIRS).toHaveLength(34);", "pair count");
  text = replaceOnce(text,
`      "caning", "cropping", "paddling", "whipping", "belt", "slapping_face", "punching", "trampling",
    ]) {`,
`      "caning", "cropping", "paddling", "whipping", "belt", "slapping_face", "punching", "trampling",
      "spreader_bar", "hogtie", "mummification", "straitjacket", "gag_tape", "hood",
    ]) {`,
"retired test ids");
  text = replaceOnce(text,
`    expect(partnerDirectionalKinkId("trampling_receive")).toBe("trampling_give");`,
`    expect(partnerDirectionalKinkId("trampling_receive")).toBe("trampling_give");
    expect(partnerDirectionalKinkId("spreader_bar_give")).toBe("spreader_bar_receive");
    expect(partnerDirectionalKinkId("hood_receive")).toBe("hood_give");`,
"partner mappings");
  text = replaceOnce(text,
`    expect(caningIds).toContain("caning_receive");
  });`,
`    expect(caningIds).toContain("caning_receive");
    const restraintIds = searchAllKinks("spreader bar").map((kink) => kink.id);
    expect(restraintIds).toContain("spreader_bar_give");
    expect(restraintIds).toContain("spreader_bar_receive");
  });`,
"search pair");
  text = replaceOnce(text,
`  it("drops the old ambiguous answer instead of copying it to either direction", () => {`,
`  it("houdt high-confidence restraints directioneel zonder sibling-inference of nep-escalatie", () => {
    const restraintIds = [
      "spreader_bar_give", "spreader_bar_receive", "hogtie_give", "hogtie_receive",
      "mummification_give", "mummification_receive", "straitjacket_give", "straitjacket_receive",
      "gag_tape_give", "gag_tape_receive", "hood_give", "hood_receive",
    ];
    for (const id of restraintIds) {
      expect(QUESTIONNAIRE_FOLLOW_UPS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_PROGRESSION_EDGES.some(([parent, child]) => parent === id || child === id)).toBe(false);
    }
    expect(questionnaireDirectionalKinkIdForPerspective("spreader_bar_give", "submissive")).toBe("spreader_bar_receive");
    expect(questionnaireDirectionalKinkIdForPerspective("hood_receive", "dominant")).toBe("hood_give");
  });

  it("drops the old ambiguous answer instead of copying it to either direction", () => {`,
"restraint metadata invariant");
  text = replaceOnce(text,
`    expect(impactRetired.trampling).toBeUndefined();
  });`,
`    expect(impactRetired.trampling).toBeUndefined();
    const restraintRetired = stripDeprecatedDirectionalEntries({
      spreader_bar: { status: "yes", comment: "ambigue restraint" },
      hood: { status: "hard_no", comment: "ambigue restraint" },
    });
    expect(restraintRetired.spreader_bar).toBeUndefined();
    expect(restraintRetired.spreader_bar_give).toBeUndefined();
    expect(restraintRetired.spreader_bar_receive).toBeUndefined();
    expect(restraintRetired.hood).toBeUndefined();
  });`,
"retired restraint cleanup");
  text = replaceOnce(text, "expect(STORE_PERSIST_VERSION).toBe(21);", "expect(STORE_PERSIST_VERSION).toBe(22);", "persist version test");
  text = replaceOnce(text,
`  it("laat v21 state ongemoeid door dezelfde migratieboundary", () => {
    const profile = ownProfile("dominant", { caning_give: { status: "yes", comment: "expliciet" } });
    const migrated = migrateStoredDirectionalityV22({ profiles: [profile] }, 21);
    expect(migrated.profiles?.[0].entries.caning_give?.status).toBe("yes");
  });`,
`  it("migreert v21 restraint-antwoorden zonder een kant te verzinnen", () => {
    const profile = ownProfile("dominant", {
      spreader_bar: { status: "yes", comment: "oud gecombineerd" },
      praise_kink: { status: "maybe", comment: "blijft" },
    });
    const migrated = migrateStoredDirectionalityV22({ profiles: [profile] }, 21);
    expect(migrated.profiles?.[0].entries.spreader_bar).toBeUndefined();
    expect(migrated.profiles?.[0].entries.spreader_bar_give).toBeUndefined();
    expect(migrated.profiles?.[0].entries.spreader_bar_receive).toBeUndefined();
    expect(migrated.profiles?.[0].entries.praise_kink?.status).toBe("maybe");
  });

  it("laat v22 state ongemoeid door dezelfde migratieboundary", () => {
    const profile = ownProfile("dominant", { spreader_bar_give: { status: "yes", comment: "expliciet" } });
    const migrated = migrateStoredDirectionalityV22({ profiles: [profile] }, 22);
    expect(migrated.profiles?.[0].entries.spreader_bar_give?.status).toBe("yes");
  });`,
"v21 v22 migration tests");
  return text;
});

edit("__tests__/kinks.test.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`  "trampling_give", "trampling_receive",
] as const;`,
`  "trampling_give", "trampling_receive",
  "spreader_bar_give", "spreader_bar_receive",
  "hogtie_give", "hogtie_receive",
  "mummification_give", "mummification_receive",
  "straitjacket_give", "straitjacket_receive",
  "gag_tape_give", "gag_tape_receive",
  "hood_give", "hood_receive",
] as const;`,
"directional release ids");
  text = replaceOnce(text,
`const RETIRED_POST_V2_DIRECTIONAL_IDS = [
  "sound_deprivation",
  ...RETIRED_HISTORICAL_IMPACT_DIRECTIONAL_IDS,
] as const;`,
`const RETIRED_HISTORICAL_BONDAGE_DIRECTIONAL_IDS = [
  "spreader_bar", "hogtie", "mummification", "straitjacket", "gag_tape", "hood",
] as const;

const RETIRED_POST_V2_DIRECTIONAL_IDS = [
  "sound_deprivation",
  ...RETIRED_HISTORICAL_IMPACT_DIRECTIONAL_IDS,
  ...RETIRED_HISTORICAL_BONDAGE_DIRECTIONAL_IDS,
] as const;`,
"retired bondage ledger");
  text = replaceOnce(text, "expect(KINKS).toHaveLength(318);", "expect(KINKS).toHaveLength(324);", "catalog count");
  text = replaceOnce(text,
`      ...RETIRED_HISTORICAL_IMPACT_DIRECTIONAL_IDS,
    ].sort());`,
`      ...RETIRED_HISTORICAL_IMPACT_DIRECTIONAL_IDS,
      ...RETIRED_HISTORICAL_BONDAGE_DIRECTIONAL_IDS,
    ].sort());`,
"historical retired set");
  return text;
});

edit("docs/directionality-role-affinity.md", (source) => {
  return replaceOnce(source,
`Caning, crop, paddling, whipping, belt, face slapping, punching, trampling, spreader bar, hogtie, mummification, straitjacket, chastity, tape/andere gags, hood, collar/leash, suspension en verdiepende bondage blijven kandidaat maar niet automatisch goedgekeurd. Hun directionality is vaak duidelijk; de vraag is vooral of de catalogusgranulariteit en questionnairewaarde een split rechtvaardigen.`,
`Na de Impact-uitbreiding is ook een high-confidence restraint-slice uitgevoerd: spreader bar, hogtie, mummification, straitjacket, tape gag en hood zijn expliciete give/receive-paren met dezelfde role-affinitygrens. Chastity, collar/leash, suspension en overige gag-/confinementvarianten blijven kandidaat maar niet automatisch goedgekeurd; daar moet eerst de catalogusbetekenis of praktische counterpart scherper worden.` ,
"role affinity deferred paragraph");
});

edit("docs/directionality-catalog-audit.md", (source) => {
  return replaceOnce(source,
`## Questionnaire-keuzes`,
`## Release D — high-confidence bondage/restraints

Na de Impact-uitbreiding zijn zes handelingen item voor item goedgekeurd omdat geven en ontvangen praktisch onafhankelijk zijn en complementaire matching de betekenis verandert:

- Spreader bar — aanbrengen / dragen.
- Hogtie — binden / gebonden worden.
- Mummification — inbakeren / ingebakerd worden.
- Straitjacket — aanbrengen / dragen.
- Tape gag — aanbrengen / dragen.
- Hood — aanbrengen / dragen.

Alle zes gebruiken role affinity uitsluitend voor compacte questionnaire-prioriteit. De opposite sibling blijft onbekend en bereikbaar. Er komen bewust geen follow-up-, canonical-probe- of progression-edges bij: deze restraints zijn geen betrouwbare escalatieladder en een voorkeur voor één kant zegt niets over de andere.

Chastity, collar/leash en suspension blijven buiten deze slice. Hun huidige catalogusitems combineren nog betekenissen (dragen, keyholding/controle, symboliek, leiden of technische suspensionvarianten) die eerst scherper moeten worden voordat één give/receive-pair eerlijk is.

## Questionnaire-keuzes`,
"release D audit");
});

edit("planned-changes.md", (source) => {
  let text = source;
  text = replaceOnce(text,
`The original Pegging product gate and Release B role-neutral catalog audit are shipped. Release C proves role-affinity on a deliberately small impact/bondage vertical slice: explicit pairs remain fully independent, while only compact Dynamic coverage may choose the perspective-aligned sibling. The opposite side stays unknown and reachable. The audited Impact extension now splits caning, crop, paddling, whipping, belt, face slapping, punching/thudding and trampling; none gains progression or canonical inference. Remaining bondage candidates stay item-by-item work, not a bulk split.`,
`The original Pegging product gate and Release B role-neutral catalog audit are shipped. Release C proves role-affinity on a deliberately small impact/bondage vertical slice: explicit pairs remain fully independent, while only compact Dynamic coverage may choose the perspective-aligned sibling. The opposite side stays unknown and reachable. The audited Impact extension splits caning, crop, paddling, whipping, belt, face slapping, punching/thudding and trampling. The subsequent high-confidence restraint slice splits spreader bar, hogtie, mummification, straitjacket, tape gag and hood. None gains progression or canonical inference. Chastity, collar/leash, suspension and remaining confinement/gag candidates stay item-by-item work, not a bulk split.`,
"catalog active directionality ledger");
  text = replaceOnce(text,
`The audited
Impact instrument extension follows that same contract. Remaining directional
candidates stay item-by-item editorial work and must not be bulk split or
inferred from \`profile.role\`.`,
`The audited
Impact instrument extension and the high-confidence restraint slice (spreader
bar, hogtie, mummification, straitjacket, tape gag and hood) follow that same
contract. Remaining directional candidates stay item-by-item editorial work and
must not be bulk split or inferred from \`profile.role\`.`,
"explicit matching ledger");
  return text;
});

edit("corrections.md", (source) => source + `

## 2026-08-11 — Een oude dev-head verborg parallel gemergd werk

**What went wrong:** Na het afronden van de Questions-viewportfix werd een eerder opgehaalde \`dev\`-head gebruikt om het volgende directionalitywerk te kiezen. Intussen waren parallel PR #321, #322 en #323 geland. Daardoor leek de al uitgevoerde Impact-split opnieuw open werk en stopte de uitvoering onnodig midden in de audit.

**Rule:** In deze parallelle repository is een branchstatus alleen geldig op het moment van lezen. Vlak vóór elke nieuwe fase altijd in één verse check actuele \`dev\`, recente PR's en de bedoelde featurebranch ophalen; een eerder in dezelfde sessie gelezen SHA is geen startbewijs.
`);

console.log("Bondage/restraint directionality forge klaar.");
