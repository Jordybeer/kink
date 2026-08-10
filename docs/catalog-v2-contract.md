# Cataloguscontract v2 — audit, beslismatrix en uitvoerplan

> Status: inhoudelijke audit op `dev` na PR #299. Dit document is het contract
> voor de catalogus- en funnel-PR's die hierna volgen. Het wijzigt zelf nog geen
> profielantwoord, matching-score of questionnaire-runtime.

## 1. Besluit in één alinea

KinkSync krijgt één actieve, pre-launch catalogus met Engelse community-termen
als kinknaam, Nederlandse uitleg en Nederlandse zoekaliassen. Ongewijzigde
betekenissen houden hun bestaande ID. Echte doublures verdwijnen uit de actieve
lijst; samengestelde vragen worden alleen gesplitst wanneer iemand de delen
redelijkerwijs verschillend kan beantwoorden. Bij zo'n split wordt nooit een
oud antwoord naar nieuwe kinderen gekopieerd: dat zou een antwoord infereren.
Dynamic blijft een deterministische basis, Discover wordt een doorlopende pool
van alle nog onbeantwoorde catalogusitems, Deep Dive blijft exhaustief en
`Meer uit deze categorie` wordt een tijdelijke, expliciete lokale intent.

De hoogste invariant blijft:

> **KinkSync mag slim zijn over welke vraag volgt. Nooit over welk antwoord
> waarschijnlijk volgt.**

## 2. Feiten uit de audit

De audit is uitgevoerd op de actuele `dev`-catalogus en alle directe
consumenten daarvan.

| Onderdeel | Huidige toestand | Gevolg |
| --- | --- | --- |
| Actieve catalogus | 266 IDs in 16 categorieën | Groot genoeg dat browse- en funnelstructuur belangrijker worden dan een vlakke lijst |
| Dynamic basis | 20 vaste coverage-anchors | De basis kan terecht snel klaar zijn, maar voelt te dun als Discover daarna nauwelijks verdergaat |
| Canonical expansion | 11 pinned source-target mappings | “Eén probe per positief antwoord” begrenst causale verdieping; het is niet op zichzelf de reden dat Discover na 2–3 kaarten stopt |
| Discover | Eén onbeantwoorde anchor per broad cluster | Na voltooide basis zijn maximaal zeven eerste-wave-kaarten mogelijk en door eerdere antwoorden vaak slechts 2–3 |
| Full search | Doorzoekt naam, categorie en Nederlandse beschrijving over alle 266 IDs | Blijft mode-onafhankelijk en moet aliases meenemen |
| Matching | Vergelijkt uitsluitend dezelfde kink-ID aan beide kanten | Directionele splits zoals pegging geven/ontvangen vragen een afzonderlijk matchingbesluit |
| Actuele QR-share | v3 gebruikt expliciete kink-IDs | Veilig bij append, rename en reorder |
| Oude compacte QR | v2 decodeert posities aan de hand van de actuele `KINKS`-volgorde | Moet vóór catalogusreorder losgekoppeld worden via één immutable legacy-volgordetabel of pre-launch verwijderd worden |
| Sanitize/import | Bewaart ook onbekende entry-IDs | Een gepensioneerde ID kan rauw bewaard blijven zonder hem als een nieuwe betekenis te tonen |

### Geverifieerde inhoudelijke problemen

- `recording` en `filmen_prive` zijn feitelijk doublures.
- `deep_throat` en `deepthroat` overlappen; de tweede mengt deep throat met
  facefucking, waarop iemand verschillend kan antwoorden.
- `breeding_creampie` mengt een fantasie met een fysieke handeling.
- `luiers_gebruik` mengt wetting en messing, plus opgelegde motivatie
  (ageplay/vernedering).
- `facesitting` mengt face-sitting met breath restriction/smothering.
- `feet` mengt neutrale lichaamsfocus met worship.
- `trampling` en `trampling_voeten` beschrijven vrijwel dezelfde handeling en
  onderscheiden vooral een veronderstelde motivatie.
- `cuckolding / hotwifing` en `sharing / group play` mengen dynamieken waarbij
  vernedering, partnerdeling en groepsseks niet hetzelfde antwoord hoeven te
  krijgen.
- `little_space` mengt psychologische headspace met “leeftijdsspel (tiener)”.
- `furry` mengt een mogelijke identiteit/community met erotisch fursuit play.
- meerdere beschrijvingen schrijven een Dom/sub-rol, vernederingsmotief of
  “diepere vorm” toe terwijl de activiteit op zichzelf neutraler beschreven kan
  worden.
- `capture_scene`, eerder verdacht, is op de actuele branch wél correct
  beschreven en is geen doublure.

## 3. Dun catalogusmodel

De catalogus krijgt hoogstens twee nieuwe contentvelden:

```ts
type KinkCategoryId =
  | "impact"
  | "bondage"
  | "power"
  | "rituals"
  | "discipline"
  | "roleplay"
  | "sensation"
  | "exhibition"
  | "media"
  | "group_partner"
  | "body_focus"
  | "materials_scent"
  | "pet_play"
  | "fluids"
  | "toys"
  | "penetration"
  | "aftercare"
  | "appearance"
  | "adult_ageplay";

interface Kink {
  id: string;
  name: string;                 // Engelse community-term
  aliases?: readonly string[];  // Nederlandse en gangbare zoektermen
  category: KinkCategoryId;     // stabiele navigatiesleutel, geen displaycopy
  level: 1 | 2 | 3 | 4;        // browse/deep-dive ordering, nooit propagation
  description: string;         // Nederlandse neutrale uitleg
  safetyNote?: string;          // optioneel: fysiek, privacy of third-party consent
}
```

Geen motivations, inferred roles, personality traits, confidence, parent/child
ontology of verborgen voorkeursscore.

### Taalcontract

- `name`: herkenbare Engelse community-term waar die bestaat;
- `aliases`: onder meer Nederlandse benaming, spellingvarianten en een
  ingeburgerd acroniem;
- `description`: natuurlijk Nederlands, volwassen, consent-neutraal;
- `safetyNote`: feitelijk en sober, zonder te suggereren dat een risicovolle
  handeling door “ervaring” veilig wordt;
- interne kink-IDs blijven staan wanneer hun betekenis staat; Nederlands in een
  ID is geen reden voor een datamigratie;
- category-ID en user-facing category-label zijn gescheiden. Een label wijzigen
  herschrijft daardoor geen engine-metadata.

### Betekeniscontract

Een item verdient een eigen ID wanneer iemand er `yes` op kan antwoorden en op
het dichtstbijzijnde item `hard_no`, zonder zichzelf tegen te spreken. Materiaal,
locatie of esthetiek krijgt niet automatisch een eigen ID; het verschil moet een
reëel gesprek, grens, risico of verwachting veranderen.

`level` betekent redactionele complexiteit/intensiteit voor browse-order. Het
betekent nooit “deze gebruiker is klaar voor B” en maakt geen follow-up-edge.

## 4. Navigatiecategorieën

De brede engine-clusters blijven uitsluitend Conversation-metadata. De
user-facing categorieën mogen fijner zijn, omdat `Meer uit deze categorie`
anders te grof wordt.

De doelset is:

| Category-ID | User-facing label |
| --- | --- |
| `impact` | Impact Play |
| `bondage` | Bondage |
| `power` | Power Exchange |
| `rituals` | Rituals & Protocols |
| `discipline` | Discipline & Correction |
| `roleplay` | Role Play |
| `sensation` | Sensation Play |
| `exhibition` | Exhibition & Voyeurism |
| `media` | Media & Content |
| `group_partner` | Group & Partner Play |
| `body_focus` | Body Focus & Worship |
| `materials_scent` | Materials & Scent |
| `pet_play` | Pet Play |
| `fluids` | Fluids & Bodily Play |
| `toys` | Toys & Stimulation |
| `penetration` | Oral, Anal & Penetration |
| `aftercare` | Aftercare |
| `appearance` | Appearance & Clothing |
| `adult_ageplay` | Adult Ageplay & Diaper Play |

Categorieën zijn navigatie, geen propagation. `Media & Content`, `Group &
Partner Play` en `Toys & Stimulation` halen inhoudelijk verschillende vragen uit
de huidige brede sexual/social-bak. `Body Focus & Worship` laat thighs, muscles
of feet bestaan zonder worship als motivatie op te leggen.

## 5. Volledige beslismatrix voor de bestaande 266 IDs

Codes:

- **KEEP** — ID en betekenis blijven; copy kan later alleen stilistisch worden
  geharmoniseerd.
- **RENAME** — ID en betekenis blijven; Engelse naam en zoekaliases worden
  vastgelegd.
- **REFINE** — ID blijft; samengestelde of motivationele copy wordt smaller en
  neutraler zonder een nieuw antwoord te verzinnen.
- **MOVE** — alleen navigatiecategorie verandert.
- **SPLIT** — oude samengestelde vraag verlaat de actieve catalogus; nieuwe
  vragen starten onbeantwoord.
- **RETIRE** — echte doublure verlaat de actieve catalogus; rauwe oude entry mag
  bewaard blijven maar wordt niet omgezet.
- **SAFETY** — definitie en veiligheidswaarschuwing worden gescheiden en vóór
  release inhoudelijk nagekeken.

Alle IDs staan hieronder precies één keer: expliciet in een veranderregel of in
de KEEP-lijst van hun huidige categorie.

### Impact Play

**KEEP:** `spanking_hand`, `flogging`, `caning`, `cropping`, `paddling`,
`whipping`, `belt`, `slapping_face`, `punching`, `trampling`, `fire_flogger`,
`body_slapping`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `spanking_implement` | RENAME | Implement spanking |
| `over_de_knie` | RENAME | Over-the-knee (OTK) spanking |
| `rubber_zweep_slapper` | RENAME | Rubber whip / slapper |
| `bullwhip` | RENAME + SAFETY | Bullwhip / long whip |

### Bondage

**KEEP:** `rope_bondage`, `shibari`, `handcuffs`, `leather_cuffs`,
`spreader_bar`, `hogtie`, `mummification`, `straitjacket`, `chastity`,
`gag_ball`, `gag_bit`, `gag_tape`, `blindfold`, `hood`, `collar_leash`,
`sleepsack`, `predicament_bondage`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `gag_opblaasbaar` | RENAME + SAFETY | Inflatable gag |
| `gag_penisvorm` | RENAME | Penis-shaped gag |
| `gag_rubber` | RENAME | Rubber gag |
| `borsten_afbinden` | RENAME + SAFETY | Breast bondage |
| `gasmasker` | RENAME + SAFETY | Gas-mask play; copy mag geen veilige luchtstroom veronderstellen |
| `suspension_rechtop` | RENAME + SAFETY | Upright suspension |
| `suspension_ondersteboven` | RENAME + SAFETY | Inverted suspension |
| `suspension_horizontaal` | RENAME + SAFETY | Horizontal suspension |
| `opsluiting_kooi` | RENAME + SAFETY | Cage confinement |
| `opsluiting_donker` | RENAME + SAFETY | Dark confinement |
| `opsluiting_kleine_ruimte` | RENAME + SAFETY | Small-space confinement |
| `vacuumbed` | RENAME + SAFETY | Vacuum bed |

### Power Exchange

**KEEP:** `dominance_submission`, `master_slave`, `owner_pet`,
`humiliation_verbal`, `degradation`, `praise_kink`, `objectification`,
`orgasm_denial`, `service`, `financial_domination`, `brat_tamer`, `rough_sex`,
`dirty_talk`, `joi`, `keyholding`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `forced_orgasm` | REFINE + SAFETY | Forced-orgasm play; weigering in de scène nooit verwarren met ingetrokken consent |
| `orgasm_control` | REFINE | Orgasm control / permission; rolneutrale formulering |
| `facesitting` | SPLIT + SAFETY | ID blijft Face-sitting; nieuw `smothering` alleen na aparte safety-review |
| `spreekverbod` | RENAME | Speech restriction |
| `oogcontact_beperkingen` | RENAME | Eye-contact rules |
| `dienen_als_meubel` | RENAME | Human furniture |
| `badkamer_controle` | RENAME + SAFETY | Bathroom control |
| `dienen_asbak` | RENAME + SAFETY | Human ashtray play |
| `lifestyle_247` | RENAME + REFINE | 24/7 D/s; revocability expliciet |
| `titels_aanspreekvormen` | RENAME | Titles & forms of address |
| `overstimulatie` | RENAME | Overstimulation |
| `geruineerd_orgasme` | RENAME | Ruined orgasm |
| `free_use` | RENAME + SAFETY | Free use; bestaat al, geen nieuwe ID |
| `erotische_hypnose` | RENAME + SAFETY | Erotic hypnosis; “mind tricks” is geschrapt |

### Rituals & Protocols

**KEEP:** `collaring`, `rules_protocols`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `knielen_ritueel` | RENAME | Kneeling ritual |
| `rituelen_protocols` | RENAME | Daily rituals & protocols |
| `ochtend_avondritueel` | RENAME | Morning & evening ritual |
| `begroetingsritueel` | RENAME | Greeting ritual |
| `verantwoordingsdagboek` | RENAME | Accountability journal |
| `positietraining` | RENAME | Position training |
| `wachttraining` | RENAME | Waiting training |
| `diensttraining` | RENAME | Service training |
| `inspectie_ritueel` | RENAME | Inspection ritual |
| `eetritueel` | RENAME | Feeding ritual |
| `toestemmingsprotocol` | RENAME + SAFETY | Permission protocol; scene-permission vervangt nooit consent |
| `spraakprotocol` | RENAME | Speech protocol |
| `hoog_protocol` | RENAME | High protocol |
| `orgasme_op_commando` | RENAME | Orgasm-on-command training |

### Discipline & Correction

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `punishment` | RENAME + REFINE | Punishment framework; alleen afgesproken correctie |
| `in_de_hoek_staan` | RENAME | Corner time |
| `straf_standjes` | RENAME | Stress positions |
| `strafregels_schrijven` | RENAME | Writing lines |
| `verplichte_reflectie` | RENAME | Reflection & apology |
| `privileges_intrekken` | RENAME | Withholding agreed privileges |
| `strafklusjes` | RENAME | Punishment chores |
| `speeltijd_ontzegd` | RENAME | Withholding playtime |
| `avondklok_straf` | RENAME | Curfew / early bedtime |
| `opgelegde_stilte` | RENAME | Imposed silence |
| `strafoefeningen` | RENAME + SAFETY | Physical punishment exercises |
| `orgasme_uitstel_straf` | RENAME | Orgasm delay as punishment |
| `strafspanking` | RENAME | Punishment spanking |
| `strafessay` | RENAME | Punishment essay |
| `mondzeep` | RENAME + SAFETY | Soap-in-mouth play; aparte toxiciteitsreview vereist |

### Role Play

**KEEP:** `cnc`, `interrogation`, `capture_scene`, `teacher_student`,
`boss_employee`, `doctor_patient`, `strangers_scene`, `uniforms`,
`fantasy_monster`, `primal_play`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `masseur_client` | RENAME | Masseur / client roleplay; erotische massage zelf wordt apart |
| `sekswerker_client` | RENAME | Sex-worker / client roleplay |
| `somnofilie` | RENAME + SAFETY | Consensual sleep play; voorafgaande afspraken zijn herroepbaar |

### Sensation Play

**KEEP:** `wax_play`, `ice_play`, `knife_play`, `needle_play`, `fire_play`,
`wartenberg_wheel`, `pinching`, `scratching`, `biting`, `tickling`,
`hair_pulling`, `marking`, `deep_throat`, `fire_cupping`, `fear_play`, `figging`,
`ballbusting`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `choking` | REFINE + SAFETY | Breath restriction / neck pressure; geen “ervaren = veilig”-copy |
| `scarification` | SPLIT + SAFETY | Scarification en branding eerst apart redactioneel toetsen |
| `tepelklemmen_zacht` | RENAME + SAFETY | Light nipple clamps |
| `tepelklemmen_hard` | RENAME + SAFETY | Intense nipple clamps |
| `tepelgewichten` | RENAME + SAFETY | Nipple weights |
| `geslacht_klemmen` | RENAME + SAFETY | Genital clamps |
| `geslacht_gewichten` | RENAME + SAFETY | Genital weights |
| `celpopping` | RENAME + SAFETY | Cell popping |
| `naaldjes_borst_buik` | RENAME + SAFETY | Decorative needle play |
| `naaldjes_intiem` | RENAME + SAFETY | Intimate needle play |
| `artistiek_snijden` | RENAME + SAFETY | Decorative cutting |
| `violet_wand_basis` | RENAME + SAFETY | Violet wand (external) |
| `violet_wand_tepels` | RENAME + SAFETY | Violet wand (breasts / nipples) |
| `violet_wand_intiem` | RENAME + SAFETY | Violet wand (genitals) |
| `powerbox_basis` | RENAME + SAFETY | E-stim / TENS (external) |
| `powerbox_intiem` | RENAME + SAFETY | Intimate e-stim |
| `shockcollar_prive` | RENAME + SAFETY | Shock collar (private) |
| `shockcollar_publiek` | RENAME + SAFETY | Shock collar (public) |
| `voedselspel` | RENAME | Food play / sploshing |

### Exhibition & Voyeurism

**KEEP:** `exhibitionism`, `voyeurism`, `public_play`, `watching_others`,
`being_watched`, `glory_hole`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `dogging` | REFINE + SAFETY | Outdoor sex / dogging; onwetende derden nooit onderdeel van consent |
| `recording` | REFINE + MOVE | Private sexual recording → Media & Content |
| `webcam` | MOVE + SAFETY | Private webcam / streaming → Media & Content |
| `cuckolding` | SPLIT + MOVE | Cuckolding en hotwifing niet als één motivatie; naar Group & Partner Play |
| `voyeur_sharing` | RENAME + REFINE + MOVE | Partner sharing; niet hetzelfde als algemene groepsseks |
| `spiegelspel` | RENAME | Mirror play |
| `remote_toy_publiek` | RENAME + MOVE | Remote-controlled toy in public → Toys & Stimulation |
| `filmen_prive` | RETIRE | Doublure van de bestaande private-recording-entry; geen antwoordkopie |
| `trio_groepsseks` | RENAME + MOVE | Threesome / group sex → Group & Partner Play |

### Body Focus & Worship

**KEEP:** `body_worship`, `footjob`, `cock_worship`, `ass_worship`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `feet` | RENAME + REFINE | Foot focus / fetish; worship niet opleggen |
| `stocking_worship` | REFINE | Stocking / lingerie worship; onderscheid met algemene lingerie-focus bewaken |
| `hoge_hakken_aanbidding` | RENAME + REFINE | High-heel focus; niet automatisch worship |
| `vagina_aanbidding` | RENAME + REFINE | Vulva / pussy worship; anatomisch en rolneutraal |
| `voetgeur` | RENAME | Foot scent |
| `trampling_voeten` | RETIRE | Motivationele doublure van de bestaande trampling-entry; topic-metadata kan beide browse-contexten dragen |
| `voeten_in_gezicht` | RENAME + REFINE | Feet on face; geen submissive rol aannemen |
| `voeten_in_mond` | RENAME | Feet / toes in mouth |
| `voet_vernedering` | RENAME | Foot humiliation |
| `voetslaaf` | RENAME + REFINE | Ongoing foot service; geen identiteit afleiden |
| `laarzen_aanbidding` | RENAME | Boot / shoe worship |

### Materials & Scent

**KEEP:** `leather`, `latex_rubber`, `lingerie`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `geur_scent_fetish` | RENAME + REFINE | Scent focus; blijft brede neutrale entry |
| `panty_sniffing` | RENAME | Worn-underwear scent |
| `kniekousen_fetish` | RENAME | Knee-high sock focus; huidige typefout verdwijnt |

### Pet Play

**KEEP:** `petplay_collar_id`, `petplay_puppy`, `petplay_kitten`,
`petplay_pony`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `furry` | REFINE | Fursuit play; geen furry-identiteit als kink invullen |
| `petplay_harnas` | RENAME | Pet harness / muzzle |
| `petplay_oortjes` | RENAME | Animal ears |
| `petplay_leiband` | RENAME | Pet leash |
| `petplay_geluiden` | RENAME | Animal sounds |
| `petplay_kom` | RENAME | Pet bowl |
| `fox_tail_plug` | RENAME | Tail plug |
| `petplay_kooi` | RENAME + SAFETY | Pet crate / cage |
| `petplay_kattenbak` | RENAME + SAFETY | Litter-box play |

### Fluids & Bodily Play

**KEEP:** `spitting`, `scat`, `cum_play`, `squirting`, `swallowing`,
`menstrual_play`, `snowballen`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `watersports_geven` | RENAME | Giving a golden shower |
| `watersports_ontvangen` | RENAME | Receiving a golden shower |
| `urine_intiem` | RENAME + SAFETY | Urine in mouth / ingestion; blijft los van golden shower |
| `plas_merken` | RENAME | Urine marking |
| `plas_desperation` | RENAME + SAFETY | Bladder control / desperation |
| `buiten_plassen` | RENAME + SAFETY | Outdoor urination / piss exhibition |
| `plas_in_kleding` | RENAME + REFINE | Wetting clothes; “gedwongen” niet in de basisnaam |
| `plas_slaaf` | RENAME + REFINE | Toilet service / toilet-slave play |
| `bloed_play` | RENAME + SAFETY | Blood play |
| `katheters_urethral` | RENAME + SAFETY | Catheter / urethral play |
| `klysma_reiniging` | RENAME + SAFETY | Enema for preparation / cleaning |
| `klysma_straf` | RENAME + SAFETY | Enema control / punishment play |
| `breeding_creampie` | SPLIT + SAFETY | `breeding_fantasy` en `creampie`; geen statuskopie naar beide |
| `lactatie` | RENAME + REFINE | Lactation play |

### Oral, Anal & Penetration

**KEEP:** `anal_sex`, `anal_fingering`, `butt_plug`, `anal_beads`,
`fisting_anal`, `fisting_vaginal`, `sounding`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `pegging` | SPLIT — BESLISPOORT | Pegging giving en pegging receiving; complementary matching eerst beslissen |
| `rimmen` | RENAME | Rimming |
| `dubbele_penetratie` | RENAME | Double penetration |
| `anale_training` | RENAME | Anal training |
| `deepthroat` | SPLIT / RETIRE | De bestaande losse Deep-throat-entry blijft; gecontroleerd facefucking krijgt alleen een aparte ID als safety/copy slaagt |

### Aftercare

**KEEP:** `aftercare_physical`, `aftercare_verbal`, `aftercare_alone`,
`aftercare_food`, `aftercare_journaling`.

De huidige generieke aftercare-items blijven voor beide perspectieven belangrijk.
Nieuwe vragen mogen specifieke ontvangers of timing benoemen, maar perspective
mag het antwoord nooit invullen.

### Appearance & Clothing

**KEEP:** `body_writing`, `maskers`.

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `hoge_hakken_dragen` | RENAME | Wearing high heels |
| `korset_dragen` | RENAME | Corset wearing |
| `penisring_cockring` | RENAME + SAFETY | Cock-ring wearing |
| `erotisch_dansen_prive` | RENAME | Erotic dancing (private) |
| `kleding_commando` | RENAME + REFINE | Clothing rules |
| `leren_kleding_dragen` | RENAME | Leather clothing |
| `rubber_latex_kleding` | RENAME + SAFETY | Latex / rubber clothing |
| `uitdagende_kleding_prive` | RENAME + REFINE | Sexualized clothing (private); stigmatiserende term verdwijnt |
| `verplicht_nudisme_prive` | RENAME + REFINE | Nudity rule (private) |
| `korset_middelafname` | RENAME + SAFETY | Waist training |
| `uitdagende_kleding_publiek` | RENAME + SAFETY | Sexualized clothing (public) |
| `verplicht_nudisme_publiek` | RENAME + SAFETY | Nudity rule (club / designated venue) |
| `erotisch_dansen_publiek` | RENAME + SAFETY | Erotic dancing for an audience |
| `crossdressing_mtf` | RENAME + REFINE | Feminine presentation / crossdressing; geen gender van de persoon aannemen |
| `crossdressing_ftm` | RENAME + REFINE | Masculine presentation / crossdressing; geen gender van de persoon aannemen |
| `sissificatie` | RENAME + REFINE | Sissification / consensual feminization; apart van neutrale presentatie |

### Adult Ageplay & Diaper Play

| ID | Actie | Doelnaam / notitie |
| --- | --- | --- |
| `little_speelgoed` | RENAME + REFINE | Childlike comfort & play; gedrag/activiteiten, niet automatisch headspace |
| `ddlg_mdlb_dynamiek` | RENAME + REFINE | Caregiver / little dynamic; inclusiever en uitsluitend volwassenen |
| `little_space` | RENAME + REFINE | Little headspace; psychologische toestand los van “kinderlijke activiteiten” |
| `baby_infantiliteit` | RENAME + REFINE | Adult-baby roleplay / infantilism |
| `fopspeen_fles` | RENAME | Pacifier / baby bottle play |
| `luiers_dragen` | RENAME + REFINE | Diaper wearing; geen ageplay-, controle- of vernederingsmotief opleggen |
| `luiers_gebruik` | SPLIT + SAFETY | Diaper wetting en diaper messing; changing wordt eigen vraag, geen statuskopie |

## 6. Nieuwe catalogusitems

Nieuwe IDs landen standaard zonder topic, related, follow-up of canonical
mapping. Ze zijn dan wel zoekbaar, zichtbaar via Discover, lokaal browsebaar en
bereikbaar in Deep Dive. Metadata ontbreekt betekent propagation nul.

### Release A — hoog vertrouwen

| Voorgestelde ID | Engelse naam | Categorie | Waarom zelfstandig antwoordbaar |
| --- | --- | --- | --- |
| `remote_toy` | Remote-controlled toy play | Toys & Stimulation | Generiek remote spel zonder publieke context |
| `nude_photography` | Nude photography | Media & Content | Naaktfoto's zijn niet hetzelfde als seksuele video |
| `adult_content_creation` | Adult content creation | Media & Content | Publicatie/audience/privacy wijkt fundamenteel af van privéopnames |
| `mutual_masturbation` | Mutual masturbation | Toys & Stimulation | Samen masturberen is geen JOI en geen passief kijken |
| `partner_masturbation_watch` | Watching a partner masturbate | Group & Partner Play | Kan een ander antwoord krijgen dan wederzijdse masturbatie |
| `thigh_focus` | Thigh focus | Body Focus & Worship | Lichaamsfocus zonder worship-motief |
| `muscle_focus` | Muscle focus | Body Focus & Worship | Lichaamsfocus zonder worship-motief |
| `pregnancy_attraction` | Pregnancy attraction | Body Focus & Worship | Specifieke aantrekkingsfocus, los van breeding-fantasie |
| `smeared_makeup` | Smeared makeup | Appearance & Clothing | Zelfstandige visuele esthetiek |
| `crying_tears` | Tears / crying play | Sensation Play | Emotionele/visuele respons met eigen grenzen; safety-copy vereist |
| `vampire_fangs` | Fangs / vampire aesthetic | Role Play | Specifieke esthetiek/prop zonder een identiteit te infereren |
| `erotic_massage` | Erotic massage | Sensation Play | Activiteit zonder masseur/client-rollenspel |
| `vibration_play` | Vibration play | Toys & Stimulation | Breder dan orgasmecontrole of één type toy |
| `sound_deprivation` | Sound deprivation | Sensation Play | Andere zintuiglijke grens dan blindfolding |
| `wetlook` | Wetlook / wet clothing | Materials & Scent | Natte kleding zonder urinecomponent |
| `prostate_massage` | Prostate massage | Oral, Anal & Penetration | Doelgerichte stimulatie, los van generiek anal fingeren |
| `sex_machine` | Sex machine / fucking machine | Toys & Stimulation | Mechanische penetratie heeft eigen controle- en safetygrenzen |
| `drool_play` | Drool / saliva play | Fluids & Bodily Play | Speekselspel zonder spugen als machtsdaad |
| `being_heard` | Being heard | Exhibition & Voyeurism | Auditieve exposure is niet hetzelfde als bekeken worden |
| `play_party` | Play party / sex club | Group & Partner Play | Aanwezigheid in een expliciet consent-context, los van public play |
| `next_day_check_in` | Next-day check-in | Aftercare | Timing en verwachting verschillen van directe verbale aftercare |
| `aftercare_cleanup` | Shared cleanup / shower | Aftercare | Praktische nazorg is zelfstandig bespreekbaar |
| `dollification` | Dollification / mannequin play | Role Play | Eigen rol- en immobiliteitsverwachting |
| `pet_training` | Pet training / tricks | Pet Play | Activiteit los van puppy/kitten/pony-identiteit |
| `pet_grooming` | Pet grooming | Pet Play | Verzorgingsritueel los van training |
| `diaper_wetting` | Diaper wetting | Adult Ageplay & Diaper Play | Verschilt expliciet van dragen en messing |
| `diaper_messing` | Diaper messing | Adult Ageplay & Diaper Play | Verschilt expliciet van wetting |
| `diaper_changing` | Diaper changing | Adult Ageplay & Diaper Play | Verzorgingshandeling met eigen grens |
| `breeding_fantasy` | Breeding fantasy | Fluids & Bodily Play | Fantasie los van ejaculatie/zwangerschapsaantrekking |
| `creampie` | Creampie / internal ejaculation | Fluids & Bodily Play | Fysieke handeling los van breeding-fantasie |

`CNC` en `Free use` staan al in de catalogus en krijgen alleen een naam/copy-
audit. Ze worden niet gedupliceerd.

### Release B — eerst afbakenen, daarna waarschijnlijk toevoegen

| Kandidaat | Beslispunt |
| --- | --- |
| Soft touch / feather play | Eén brede entry of twee materiaalvarianten? |
| Breast / nipple pumping | Afbakenen van clamps en lactation |
| Genital pumping | Aparte safety-review |
| Prostate milking | Afbakenen van prostate massage; mogelijke echte follow-up |
| Swinging / partner swap | Afbakenen van group sex, partner sharing en hotwifing |
| Receiving aftercare as a top/Dom | Formuleer zonder perspective als antwoordproxy te gebruiken |
| Marks / tender-area aftercare | Praktische nazorg versus algemene physical aftercare |
| Body painting | Afbakenen van body writing |
| Sensory overload | Afbakenen van post-orgasm overstimulation |
| Breast focus | Past in neutrale body-focusfamilie; niet automatisch worship |
| Hair focus | Zelfde discipline als thighs/muscles; micro-fragmentatie bewaken |
| Balloon, giant/micro, feeder/feedee, emetophilia, flatulence | Afzonderlijke inhoudelijke en safety-review, niet meeliften op funnelwerk |

### Niet als nieuwe kink toevoegen

| Voorstel | Besluit |
| --- | --- |
| Mind tricks | Door eigenaar geschrapt |
| ENM | Relatie-/afsprakenmodel, geen kink-answer; eventueel als profielterm naast Open relatie/Polyamoreus |
| Long-term butt-plug wear | Bestaande `butt_plug`-copy omvat kort en langdurig dragen; eerst die vraag verbeteren |
| Sweat / body scent | Bestaande brede `geur_scent_fetish` omvat dit al |
| Worn-underwear worship | Huidige lingerie-, stocking- en panty-scent-items eerst ontvlechten |
| Urban-exploring sex | Voorlopig geen aparte ID: te veel overlap met outdoor/public play en locatie/legaliteit is geen voorkeurssignaal |

### Twee echte beslispoorten

1. **Pegging giving/receiving.** De splitsing is inhoudelijk juist en perspective
   mag de richting niet invullen. De huidige matching vergelijkt echter alleen
   dezelfde IDs. Zonder complementmodel ziet `giving=yes` tegenover
   `receiving=yes` geen match. Dit wordt niet stilletjes opgelost in de
   catalogus-PR.
2. **“Auto masturbation”.** De term is niet scherp genoeg om autonoom te
   implementeren: solo masturbation, automated masturbator/toy en autofellatio
   zijn drie andere vragen. Er komt geen ID tot de bedoelde betekenis bevestigd
   is.

## 7. Funnelcontract na de catalogusaudit

### Dynamic

De stopregel blijft inspecteerbaar:

1. alle IDs uit het vooraf gebouwde `CoveragePlan` hebben een expliciete status;
2. alle geldige canonical probes zijn beantwoord;
3. een verplichte non-probe-interleave is voldaan wanneer die kandidaat bestaat.

`CoveragePlan` is een vaste set uit core-anchors, basisanchors en anchors voor
expliciet gekozen interests. Een catalogusrelease wijzigt een lopende
denominator niet door antwoorden. Iedere expliciete status telt; skip niet.

De huidige 20 anchors worden na de categorieherindeling opnieuw geselecteerd.
De nieuwe set raakt minimaal iedere user-facing categorie en de aparte
safety/core-gebieden. Het doel is structurele dekking, niet een gekozen aantal
vragen en niet enthousiasme meten.

### Discover

Discover is geen wave meer.

- pool: alle actieve, nog onbeantwoorde catalogusitems;
- ordering: eerst onderverkende categorieën/broad clusters, daarna rustige
  rotatie; directe expliciete relaties mogen lokaal rangschikken;
- duur: totdat de gebruiker stopt of de catalogus op is;
- checkpoint: altijd een zichtbare `Genoeg voor nu`-uitgang;
- positieve antwoorden mogen dezelfde canonical expansionregels gebruiken;
- er ontstaat geen persistent interest- of confidenceprofiel.

Discover en Deep Dive gebruiken dus mogelijk dezelfde totale pool, maar hebben
een ander contract. Discover belooft breadth en een vrije uitgang; Deep Dive
belooft uiteindelijk exhaustiviteit en toont de catalogusteller.

### Deep Dive

Alle actieve IDs blijven bereikbaar, ongeacht antwoorden, hard limits,
perspective of ontbrekende metadata. Ordering mag dezelfde Conversation-regels
gebruiken; geen enkele score of edge mag eligibility verwijderen.

### Meer uit deze categorie

Dit is een ephemeral, expliciete intent:

```ts
type QuestionnaireIntent =
  | { kind: "dynamic" }
  | { kind: "discover" }
  | { kind: "category"; category: string }
  | { kind: "deepDive" };
```

- pool: alle onbeantwoorde actieve IDs in die categorie;
- geen profielentry of inferred interest bij het openen;
- buiten-categorie probes blijven geldig, maar wachten tot een globale flow;
- `Terug naar Dynamic/Discover` blijft zichtbaar;
- categorie-skip betekent nooit `Voor hen`.

### Expansion blijft lokaal

- één positieve source heeft maximaal één pinned canonical target, ooit;
- geen fallback;
- geen metadata betekent propagation nul;
- broad cluster en category sturen nooit propagation;
- een nieuw catalogusitem krijgt eerst nul edges;
- mogelijke eerste nieuwe canonical mappings worden afzonderlijk
  gereviewd, bijvoorbeeld `remote_toy -> remote_toy_publiek`,
  `luiers_dragen -> diaper_wetting` en later
  `prostate_massage -> prostate_milking`;
- een hard limit op urine ingestion onderdrukt geen golden shower, diaper
  wetting of andere topical sibling.

## 8. Kaart-UX

De huidige overgang is inmiddels 200 ms antwoordfeedback plus 170 ms fade. Dat
is bewust kort maar niet meer de eerder waargenomen ~90 ms; eerst dogfooden,
niet opnieuw op gevoel tunen.

De echte leesbaarheidsfout is dat titel en afgeklemde beschrijving samen een
onzichtbare knop naar een Sheet vormen. Doelgedrag:

- twee regels Nederlandse definitie blijven op de kaart;
- een zichtbare `Lees meer`-actie klapt de volledige uitleg inline open;
- optionele safety-note krijgt een eigen sober blok;
- geen modale contextwissel tijdens de antwoordflow;
- antwoordopties blijven dezelfde één-tikactie;
- bij korte viewports mag de pagina natuurlijk scrollen en houdt de kaart haar
  titel in beeld;
- een nieuw profiel met `focus=questionnaire` scrollt ook vóór voltooiing van de
  tour naar de kaart, zonder de tour onbruikbaar te maken;
- category rows tonen `Meer uit deze categorie`, niet een misleidende complete
  teller voor een tijdelijke subset.

## 9. Pre-launch migratiestrategie

Er komt geen catalogusgeneration-architectuur. Dat lost een niet-bestaand
publiek legacyprobleem op met permanente complexiteit.

- één actieve catalogus;
- ongewijzigde betekenissen behouden ID en entry;
- renames en moves behouden antwoorden vanzelf;
- splits starten met nieuwe onbeantwoorde IDs;
- oude samengestelde/duplicate entries worden niet naar nieuwe antwoorden
  gekopieerd;
- onbekende oude IDs mogen rauw in een profiel blijven zodat er geen
  destructieve dataverwijdering nodig is;
- de storemigratie zet v1 Full om naar v2 Deep Dive en v1 Quick/Balanced of een
  ontbrekende setup naar v2 Dynamic; gekozen interests en alle entries blijven
  staan; daarna verdwijnen de v1-types en dubbele runtime;
- de oude fixed-position v2 QR-decoder gebruikt één immutable
  `LEGACY_COMPACT_KINK_IDS_V2`-snapshot; de ongebruikte v2-encoder verdwijnt en
  nieuwe shares blijven de ID-gebaseerde v3-route gebruiken;
- huidige v3 sharing, consent proofs, snapshots, contracts en scenes blijven
  ID-gebaseerd en krijgen geen inferred antwoordmigratie.

## 10. Implementatievolgorde en releasepoorten

### PR A — catalogusfundament

1. `Kink.aliases` en optionele `safetyNote` toevoegen.
2. Search uitbreiden met aliases.
3. Actieve catalogus loskoppelen van de positional v2-decoder.
4. Stabiele category-IDs en een expliciete category-labelregistry invoeren in
   plaats van displaycopy als engine-key en arrayvolgorde als registry.
5. Validators/tests voor unieke IDs, unieke genormaliseerde namen, aliases,
   categorieën, beschrijvingen en volledige Deep-Dive/search-reachability.

### PR B — bestaande catalogus corrigeren en Release A toevoegen

1. renames/refines/moves uit de matrix;
2. echte duplicates pensioneren en splits als nieuwe onbeantwoorde IDs;
3. Release A-items toevoegen zonder propagation;
4. alle Dutch descriptions en safety-notes inhoudelijk reviewen;
5. metadatareferenties en anchors repareren na category/ID-wijzigingen;
6. full-catalog share/QR/import/offline tests.

### PR C — funnel- en kaart-UX

1. Discover van micro-wave naar doorlopende pool;
2. discriminated runtime intent en lokale category-intent;
3. eerlijke skip-semantiek (`Later` creëert niets; category skip vult nooit
   `Voor hen` in);
4. nieuwe coverage-anchor audit;
5. inline `Lees meer` en optionele safety-note;
6. nieuw-profiel-scroll/focus op korte iPhones;
7. dogfood op 320×568, 375×667, 390×844 en 430×932.

### PR D — propagation metadata

Pas nadat de actieve catalogus inhoudelijk staat:

1. topics voor spacing;
2. related pairs voor positieve lokale ordering;
3. afzonderlijk gereviewde follow-ups;
4. een nieuwe versioned canonical allowlist;
5. edge-by-edge audit: iedere edge moet verdedigbaar zijn zonder uitspraak over
   de persoon achter het antwoord.

### Harde tests

- ranking creëert, verwijdert of muteert nooit entries;
- splitmigraties kopiëren geen status;
- iedere expliciete status telt als coverage; skip niet;
- Dynamic stopt exact op het CoveragePlan + probes;
- Discover blijft kandidaten leveren zolang onbeantwoorde actieve IDs bestaan;
- category-intent lekt niet naar een inferred interest;
- Deep Dive bereikt iedere actieve ID;
- search vindt Engelse naam en Nederlandse alias;
- `no / Voor hen` is neutraal; alleen `hard_no` is negatief;
- topical siblings worden niet door hard limits onderdrukt;
- canonical mapping is pinned en zonder fallback;
- perspective-profielen blijven onafhankelijk;
- matching verandert pas na een expliciet apart besluit;
- v3 sharing/import/sanitize/QR behouden IDs en entries;
- een maximale catalogus blijft binnen de bestaande multi-QR transportlimieten;
- offline search en alle questionnaire-intents werken zonder netwerk.

## 11. Niet bouwen

- geen predictive/suggestive mode in deze release;
- geen combinatie van antwoorden tot verborgen voorkeuren;
- geen BDSMtest-signalen;
- geen topic- of categorie-fallback voor propagation;
- geen backend, authwijziging of package;
- geen giant ontology;
- geen automatische antwoordkopie bij semantic splits;
- geen compatibilitywijziging verstopt in cataloguswerk.

**Coverage meet wat gevraagd is. Expansion volgt wat expliciet gezegd is.
Prediction bestaat niet.**
