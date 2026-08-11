# Directionele kinkvragen — implementatieplan

> **Hoogste invariant:** profielperspectief bepaalt de context waarin iemand antwoordt, nooit automatisch wie iets geeft of ontvangt.

Dit document is het directionality-contract én de roadmap voor verdere uitbreiding. De eerste Pegging-vertical-slice is inmiddels daadwerkelijk geïmplementeerd; verdere directionele catalogusuitbreiding blijft bewust item-per-item toekomstwerk.

## Implementatiestatus — 10 augustus 2026

De Pegging-vertical-slice staat op `dev`:

- PR #308: `pegging_give` en `pegging_receive`, flat entries, pair-metadata, directe pairflow wanneer beide siblings zelfstandig eligible zijn, search/sharing/sanitize/store-migratie en verwijdering van het oude ambigue `pegging`-antwoord zonder inference;
- PR #309: complementaire matching `give ↔ receive`, directionele compare-rijen, categoriepercentages, filters, concrete hard limits en behoud van `Voor hen`/privacy-semantiek;
- Dominant/Submissive blijft uitsluitend profielcontext en heeft geen invloed op de gekozen handelingrichting;
- de Pegging-varianten zijn bewust geen canonical expansion-targets.

Nog niet automatisch uitgerold naar andere kinks: iedere volgende directionele kandidaat vereist dezelfde item-per-item audit.

### Switch delen

Een Switch blijft intern twee onafhankelijke answer maps houden, maar is extern één identiteit. Delen/exporteren bundelt daarom het Dominant- en Submissive-perspectief in één overdracht. De koppeling wordt door beide bestaande profieleigendomssleutels ondertekend; twee losse geldige profielen mogen nooit achteraf als één Switch kunnen worden samengeplakt. De interne `personGroupId` reist niet mee. Import leidt een eigen lokale group-ID af uit de bevestigde profiel-ID's en sleutels, en herstelt daarmee de twee perspectieven als één lokaal gegroepeerde persoon zonder antwoorden tussen de kanten te kopiëren.

## Waarom dit nodig is

`Dominant`, `Submissive` en `Beide kanten` zijn expliciete profielperspectieven. Ze zeggen iets over de context waarin de gebruiker het profiel invult, maar niet over de fysieke richting van iedere handeling.

Een Dominant kan bijvoorbeeld pegging ontvangen en daarbij dominant blijven. Een Submissive kan pegging geven als service. Daarom zijn deze mappings verboden:

- Dominant → geven;
- Submissive → ontvangen;
- Switch → pas dan beide richtingen vragen.

Richting moet altijd uit een expliciet antwoord komen.

## Doelmodel

### Concept versus vraagvariant

Een directionele kink krijgt één inhoudelijk concept en twee afzonderlijk antwoordbare vraagvarianten.

Voorbeeld:

```text
concept: pegging
variant A: pegging_give     — Pegging geven
variant B: pegging_receive  — Pegging ontvangen
```

Beide varianten krijgen een eigen bestaande `KinkEntry` met de normale statussemantiek:

- `yes` = Heel graag;
- `willing` = Ja;
- `maybe` = Misschien;
- `no` = Voor hen;
- `hard_no` = Harde grens.

Er komt geen speciaal directioneel antwoordobject bovenop `KinkEntry`. Flat entries houden store, sharing, sanitize, snapshots en debugging eenvoudig.

### Dunne pair-metadata

Directionele siblings worden alleen gegroepeerd met expliciete metadata, bijvoorbeeld conceptueel:

```ts
{
  conceptId: "pegging",
  giveId: "pegging_give",
  receiveId: "pegging_receive",
}
```

Deze metadata betekent uitsluitend dat twee zelfstandige vragen samen twee kanten van hetzelfde handelingconcept vormen. Ze voorspelt geen antwoord, rol, motivatie of voorkeur.

Ontbrekende pair-metadata betekent geen directionele behandeling.

## Questionnaire-UX

### Eén lokale continuation, daarna ademruimte

Conversation gebruikt voortaan het mentale momentum van de gebruiker zonder een topic-tunnel te bouwen:

1. als een independently eligible sibling/complement bestaat, komt die direct eerst;
2. anders mag na `Heel graag` of `Ja` maximaal één canonical follow-up van exact die bron direct volgen;
3. na zo'n sibling of directe follow-up is een topic break verplicht wanneer een ander geldig onderwerp beschikbaar is;
4. verdere positieve verdieping blijft pending en kan later terugkomen.

Een directionele sibling is geen inhoudelijke voorspelling maar de tweede expliciete as van hetzelfde concept. Diaper wearing bewijst dat een complement ook een andere participatie-as kan hebben: `zelf dragen ↔ partner draagt`, zonder die posities artificieel `Geven/Ontvangen` te noemen.

`related` beïnvloedt uitsluitend ranking en opent nooit eligibility. Alleen de versioned canonical source→target-edge mag een nieuwe probe openen.

### Geen automatische koppeling

KinkSync mag nooit automatisch hetzelfde antwoord op beide kanten zetten.

Een optionele snelle actie zoals `Zelfde antwoord voor beide` is alleen acceptabel na een expliciete tik van de gebruiker. De standaard blijft twee onafhankelijke antwoorden.

### Perspective bepaalt nooit een antwoord — eligibility mag wel zuinig zijn

Iedere directionele kant blijft een zelfstandig mogelijk antwoord. Dominant of Submissive vult nooit een sibling in, maakt hem nooit `no` en kopieert geen status.

Voor **rol-neutrale** directionele concepten (zoals Pegging, fisting of rimming) mag perspective geen kant wegfilteren. Als beide kanten onafhankelijk eligible zijn, kunnen beide expliciet gevraagd worden.

Voor **expliciet role-bound** directionele concepten geldt een aparte questionnaire-policy. Buiten Deep Dive blijft de guided flow aan de perspective-aligned kant: Dominant krijgt de give-kant, Submissive de receive-kant. De tegenovergestelde kant wordt niet als negatief ingevuld en wordt niet verwijderd; ze is alleen Deep-Dive-eligible binnen de guided questionnaire. Een Switch krijgt de aligned kant vanzelf in elk van zijn twee onafhankelijke perspectives. Handmatige catalogussearch blijft wel volledig expliciet toegankelijk.

Role-bound is eigen metadata en mag nooit stilzwijgend uit questionnaireAffinity worden afgeleid. De eerste audited set omvat high-confidence impact, fysieke restraints, gags, suspension en confinement. Blindfold, hood en sound deprivation behouden voorlopig alleen hun compacte affinity en worden niet hard role-bound gemaakt.

Voor **role-neutrale** directionele concepten (zoals Pegging, fisting, rimming, worship en massage) filtert perspective geen kant weg. Als beide kanten onafhankelijk eligible zijn, kunnen beide expliciet gevraagd worden. Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn.

## Engine-regels

### Pairflow is Conversation, geen inference

Een sibling krijgt geen hogere prioriteit omdat de engine denkt dat de gebruiker de andere kant waarschijnlijk leuk vindt. De sibling wordt alleen direct erna gepland omdat beide reeds zelfstandig eligible vragen van hetzelfde expliciete concept zijn.

### Canonical expansion blijft intact

De bestaande invariant blijft:

> één expliciet positief source-answer kan maximaal één gepinde canonical expansion target openen.

Pairflow mag daar geen tweede probe naast smokkelen.

Daarom geldt voor Release A van directionality:

- pair-siblings mogen direct na elkaar wanneer beide al door coverage, Discover, Deep Dive, category intent of een andere onafhankelijke reden eligible zijn;
- een canonical probe naar één directionele variant maakt de sibling niet automatisch eligible;
- directionele varianten worden aanvankelijk niet als nieuwe canonical targets toegevoegd totdat die interactie afzonderlijk is geaudit.

Zo blijft causaliteit volledig traceerbaar.

## Matching

Voor Pegging is directionele matching in PR #309 als aparte matching-slice geïmplementeerd nadat questionnaire/store/sharing in PR #308 stabiel waren. Nieuwe directionele pairs moeten hetzelfde gescheiden patroon volgen.

Voor een expliciet pair wordt complementair vergeleken:

```text
mijn give    ↔ jouw receive
mijn receive ↔ jouw give
```

Niet:

```text
Dominant ↔ Submissive
```

Rol/perspectief wordt dus nooit gebruikt als proxy voor richting.

### Statussemantiek verandert niet

De bestaande compatibilityregels blijven leidend per concrete variant. Alleen de pairing van de vergeleken IDs verandert voor expliciete directionele concepten.

`Voor hen` blijft bereidheid voor de partner en mag niet als afwijzing worden geïnterpreteerd.

## Welke kinks splitsen?

Niet ieder werkwoord verdient automatisch `give/receive`.

Een bestaande kink wordt alleen directioneel gesplitst wanneer:

1. iemand redelijkerwijs `yes` op geven en `hard_no` op ontvangen kan antwoorden, of omgekeerd;
2. dat verschil relevant is voor grenzen of matching;
3. de richting objectief in de handeling zit en niet uit rol, psychologie of motivatie wordt afgeleid;
4. beide varianten zelfstandig begrijpelijk blijven.

### Vertical slices — uitgevoerd

**Pegging** blijft de referentie-vertical-slice. Release B breidt hetzelfde bewezen model conservatief uit naar rol-neutrale handelingen waarvan de twee kanten onafhankelijk betekenisvol zijn.

Waarom:

- directionele betekenis is helder;
- geven en ontvangen kunnen sterk verschillende grenzen hebben;
- het huidige samengestelde antwoord is aantoonbaar onvoldoende voor complementaire matching;
- het is een goede end-to-end testcase voor questionnaire, sharing, import, compare en matching.

De eerste catalogusaudit daarna splitst uitsluitend high-confidence rol-neutrale handelingen: Golden shower (bestaande twee IDs worden nu echt complementair), anal sex, anal fingering, anal/vaginal fisting, deep throat, rimming en footjob. De oude enkelvoudige IDs starten pre-launch bewust onbeantwoord; er wordt niets naar siblings gekopieerd.

Release C bewijst role-affinity op een beperkte keten van bestaande Dynamic-anchors en directe semantische vervolgen; latere Impact- en Bondage-audits hebben dat model item voor item uitgebreid zonder progression of answer inference. Release F maakt de tweede as expliciet: body/vulva/cock/ass/boot worship, erotic/prostate massage, pet training/grooming en diaper changing zijn directioneel maar **role-neutraal** en krijgen dus geen questionnaireAffinity. Remote toys en sex machine blijven apart totdat hun coverage- en catalogussemantiek ondubbelzinnig is.

## Pre-launch migratie

Er is nog geen publieke launch, dus clean code heeft voorrang boven complexe legacy-emulatie.

Voor een bestaande samengestelde kink zoals het huidige pegging-item geldt:

- behoud oude profieldata alleen wanneer dat eenvoudig en ondubbelzinnig kan;
- kopieer een bestaand enkel pegging-antwoord **niet** automatisch naar `give` én `receive`;
- nieuwe semantisch gesplitste varianten starten onbeantwoord;
- verwijder daarna de tijdelijke oude samengestelde runtime-route in plaats van permanent drie vormen te ondersteunen.

Een oud antwoord naar beide richtingen kopiëren zou inference zijn.

## Sharing, import en sanitize

Directionele varianten zijn gewone stabiele kink-IDs. Daardoor kunnen de bestaande ID-gebaseerde paden blijven werken.

Acceptatie-eisen:

- export/share bewaart beide varianten onafhankelijk;
- import/sanitize bewaart geldige directionele entries;
- privateResponse blijft per variant werken;
- QR en snapshots hoeven rol niet te kennen om richting te behouden;
- onbekende directionele IDs veroorzaken geen automatische sibling-entry.

## Compare en profieloverzicht

In detailweergaven mogen siblings visueel onder één concept worden gegroepeerd:

```text
Pegging
  Geven      Heel graag
  Ontvangen  Misschien
```

Dat is presentatie, geen geneste opslag.

Search op `Pegging` moet beide varianten vinden. Eventueel kunnen aliases `pegging geven`, `pegging ontvangen`, `peggen`, `strap-on` enzovoort ondersteunen.

## Consent, scenes en contracts

Bestaande toestemming blijft altijd aan de concrete expliciete kink-ID gekoppeld.

Een toestemming voor `pegging_give` is nooit automatisch toestemming voor `pegging_receive`.

Contracts, scene-entries en snapshots moeten directionele siblings dus als afzonderlijke consent-objecten behandelen, ook wanneer de UI ze onder één concept groepeert.

## Tests

### Questionnaire

- Dominant krijgt zowel give als receive wanneer beide eligible zijn;
- Submissive krijgt eveneens beide;
- Switch-profielen blijven onafhankelijk;
- give-answer muteert receive niet;
- receive-answer muteert give niet;
- siblings worden direct na elkaar gesteld wanneer beide al eligible zijn;
- pairflow creëert geen extra canonical probe;
- één sibling als probe maakt de andere niet automatisch eligible;
- `Later` creëert geen antwoord voor sibling of source.

### Matching

- mijn give vergelijkt met partner receive;
- mijn receive vergelijkt met partner give;
- role/perspective verandert pairing niet;
- hard limit werkt op de concrete richting;
- `Voor hen` houdt de bestaande publieke betekenis;
- non-directionele kinks behouden exact hun huidige matching.

### Integratie

- sharing round-trip bewaart beide richtingen;
- sanitize bewaart beide geldige entries;
- private flags blijven onafhankelijk;
- compare toont de juiste complementaire kant;
- contracts/scenes verwarren siblings niet;
- offline gedrag blijft volledig lokaal;
- geen backend, auth of package nodig.

## Implementatievolgorde

Uitgevoerd voor Pegging:

1. huidig pegging-item en call-sites geaudit;
2. twee stabiele IDs en pair-metadata toegevoegd;
3. oud samengesteld pegging-item via prelaunch-migratie verwijderd zonder antwoorden te kopiëren;
4. questionnaire pairflow toegevoegd wanneer beide siblings zelfstandig eligible zijn;
5. search en directionele compare-weergave bijgewerkt;
6. sharing/import/sanitize en concrete IDs geverifieerd;
7. complementaire pegging-matching in een aparte matching-slice geïmplementeerd;
8. volledige tests/build/browser-device/PWA-offline checks groen.

Vervolg:

9. Pegging verder dogfooden in Dominant-, Submissive- en beide-perspectiefprofielen;
10. pas daarna item-per-item beslissen welke andere catalogusitems dezelfde behandeling verdienen.

## Zelfreview en optimalisaties

### Afgewezen: directionele velden in één `KinkEntry`

`statusGive/statusReceive` lijkt compact, maar maakt vrijwel iedere consumer speciaal: sanitize, sharing, matching, compare, contracts en UI moeten dan twee statussen in één record begrijpen. De repository heeft historisch al zulke directionele velden gekend en ze later bewust teruggebracht naar één status. Niet opnieuw reanimeren.

### Afgewezen: rol als default

Dom→give en Sub→receive vermindert vragen maar introduceert precies de inference die KinkSync probeert te vermijden. Ook een `correctie achteraf` maakt de initiële aanname niet acceptabel.

### Afgewezen: alleen Switch beide richtingen vragen

Daarmee blijven Dominant en Submissive verkeerd beperkt. Directionality is eigendom van de kink, niet van Switch.

### Geoptimaliseerd: siblings direct na elkaar

De eerdere algemene spacingregel was hier te rigide. Voor echte directionele siblings verlaagt contextbehoud de cognitieve belasting en maakt het verschil tussen geven en ontvangen expliciet. De gewone staged expansion blijft voor inhoudelijke vervolgvragen bestaan.

### Geoptimaliseerd: eerst één vertical slice

Geen massale `give/receive`-refactor. Pegging bewijst het volledige systeem met minimale catalogusradius. Als het model daar niet schoon blijft, wordt het niet over tientallen kinks uitgerold.

## Definitief contract

- **Perspective zegt vanuit welke relationele context iemand antwoordt.**
- **Direction zegt welke kant van de concrete handeling iemand beoordeelt.**
- De twee mogen elkaar nooit voorspellen.
- Directionele siblings zijn aparte expliciete antwoorden.
- Siblings mogen als één UX-paar direct na elkaar verschijnen.
- Pairflow is geen expansion en koopt geen extra probe.
- Matching wordt alleen voor expliciete pairs complementair.
- Ontbrekende directionele metadata betekent geen speciale behandeling.
