# Directionele kinkvragen — implementatieplan

> **Hoogste invariant:** profielperspectief bepaalt de context waarin iemand antwoordt, nooit automatisch wie iets geeft of ontvangt.

Dit document beschrijft hoe KinkSync directionele kinks uiteindelijk moet modelleren. Het is bewust een plan, geen huidige runtimebelofte.

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

### Directionele siblings horen direct bij elkaar

De normale Conversation-regel blijft:

> raak een onderwerp aan, ga even ergens anders heen, kom later terug voor echte verdieping.

Directionele siblings zijn hier de uitzondering. `geven` en `ontvangen` zijn geen inhoudelijke verdieping maar twee noodzakelijke assen van dezelfde vraag. Als beide zelfstandig eligible zijn, worden ze direct als paar gesteld:

```text
Pegging — geven
→ antwoord
Pegging — ontvangen
→ antwoord
→ daarna ander onderwerp
```

De tweede kaart kan subtiel worden ingeleid met bijvoorbeeld `En ontvangen?`, zonder het eerste antwoord te kopiëren of te suggereren.

### Geen automatische koppeling

KinkSync mag nooit automatisch hetzelfde antwoord op beide kanten zetten.

Een optionele snelle actie zoals `Zelfde antwoord voor beide` is alleen acceptabel na een expliciete tik van de gebruiker. De standaard blijft twee onafhankelijke antwoorden.

### Alle perspectieven krijgen beide kanten

Dit geldt voor ieder profielperspectief:

- Dominant profiel: geven + ontvangen;
- Submissive profiel: geven + ontvangen;
- `Beide kanten`: twee onafhankelijke profielen, dus elk profiel opnieuw geven + ontvangen.

Dat kan vier verschillende antwoorden voor één persoon opleveren en dat is inhoudelijk correct.

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

Directionele matching hoort in een aparte matching-PR nadat questionnaire/store/sharing stabiel zijn.

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

### Eerste vertical slice

Start uitsluitend met **Pegging**.

Waarom:

- directionele betekenis is helder;
- geven en ontvangen kunnen sterk verschillende grenzen hebben;
- het huidige samengestelde antwoord is aantoonbaar onvoldoende voor complementaire matching;
- het is een goede end-to-end testcase voor questionnaire, sharing, import, compare en matching.

Pas nadat de volledige pegging-slice bewezen stabiel is, wordt de rest van de catalogus geaudit.

Mogelijke latere kandidaten zijn bijvoorbeeld expliciete bondage-, impact-, watersports- of worship-handelingen, maar alleen na item-per-item review. Geen bulktransformatie op basis van categorie of grammatica.

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

1. Audit het huidige pegging-item en alle call-sites.
2. Voeg de twee stabiele IDs en pair-metadata toe.
3. Verwijder het oude samengestelde pegging-item via een eenvoudige pre-launch migratie.
4. Laat questionnaire beide siblings als pairflow tonen wanneer zelfstandig eligible.
5. Werk search, category en overzichtsgroepering bij.
6. Verifieer sharing/import/sanitize/QR/snapshots.
7. Implementeer complementaire pegging-matching in een aparte, kleine matching-slice.
8. Run volledige tests/build/browser-device checks.
9. Dogfood pegging in Dominant-, Submissive- en beide-perspectiefprofielen.
10. Pas daarna beslissen welke andere catalogusitems dezelfde behandeling verdienen.

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
