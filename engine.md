# Dynamic Questionnaire — motorcontract v2

> Status: PR #299 leverde de causale motorkern. De gestapelde catalogus- en
> funnel-PR's voeren dit contract nu uit. De volledige catalogusaudit,
> beslismatrix en toevoegingen staan in
> [`docs/catalog-v2-contract.md`](docs/catalog-v2-contract.md).

## Hoogste invariant

**KinkSync mag slim zijn over welke vraag volgt. Nooit over welk antwoord
waarschijnlijk volgt.**

Daaruit volgen vier strikt gescheiden verantwoordelijkheden:

- **Coverage** meet wat expliciet gevraagd en beantwoord is.
- **Conversation** kiest een prettig, gevarieerd moment voor iedere vraag.
- **Expansion** opent één lokale vraag na één expliciet positief antwoord.
- **Prediction** bestaat niet.

Geen combinatie van antwoorden, role, perspective, BDSMtest-score, category,
topic of cluster mag een verborgen voorkeur, identiteit, motivatie of volgend
antwoord produceren.

## Implementatiestatus

PR #299 leverde de pure selectieonderdelen, statussemantiek, pinned canonical
probes, provenance en anti-monopoly. De funnel-slice bouwt daarop zonder de
causale veiligheidsgrens te veranderen:

1. Dynamic heeft een inspecteerbaar basisplan van 44 anchors over alle 19
   user-facing categorieën;
2. Discover gebruikt de volledige actieve onbeantwoorde catalogus als
   doorlopende, user-exitable pool;
3. `Meer uit deze categorie` is een ephemeral lokale intent;
4. `Later` en category-navigatie schrijven geen status;
5. volledige uitleg en `safetyNote` openen inline op dezelfde kaart;
6. de pre-launch store normaliseert het oude budgetmodel naar één
   Dynamic/Deep Dive-runtime zonder entries te wijzigen.

## Canonieke statussemantiek

| Status | Betekenis | Coverage | Expansion | Negatief signaal |
| --- | --- | --- | --- | --- |
| `yes` | Heel graag | telt | sterk positief | nee |
| `willing` | Ja | telt | positief | nee |
| `maybe` | Misschien | telt | geen | nee |
| `no` | Voor hen | telt | geen | nee |
| `hard_no` | Harde grens | telt | geen | ja, uitsluitend lokaal |
| skip / Later | Nog niet beantwoord | telt niet | geen | nee |

`no / Voor hen` is bereidheid voor de partner, geen afwijzing. Het sluit niets,
vertraagt niets en wordt nooit door een bulk-skip ingevuld.

Een `hard_no` mag alleen een expliciet directioneel target beïnvloeden. Eén hard
limit blijft neutraal voor ordering. Pas twee of meer hard limits waarvan de
expliciete follow-up-edges op exact hetzelfde target uitkomen mogen dat target
later zetten via `Math.max(0, count - 1)`. Topic-, category-, related- en
broad-cluster-metadata doen niet mee aan deze negatieve telling.

## Productmodel

### Dynamic

Dynamic is de standaard en heeft geen vooraf beloofd vragenaantal.

Bij het starten wordt één deterministisch `CoveragePlan` gebouwd uit:

1. een kleine vaste core/safety-set;
2. de vaste basisanchors van de actieve catalogus;
3. extra anchors voor interests die de gebruiker zelf heeft gekozen.

De denominator verandert daarna niet door antwoorden. Een `yes` kan een probe
openen, maar voegt geen coverage-anchor toe. Iedere expliciete status telt
gelijkwaardig als coverage; skip niet.

Dynamic is klaar wanneer:

1. alle IDs in het `CoveragePlan` een expliciete status hebben;
2. alle geldige canonical probes afgehandeld zijn;
3. een verplichte interleave tussen twee probes voldaan is wanneer een geldige
   non-probe beschikbaar is.

Geen confidence-score, “engine weet genoeg”-model of bewegende denominator.

De basisset bevat 44 expliciete anchors over alle 19 user-facing categorieën.
Meerdere anchors bestaan alleen waar één kaart aantoonbaar een te brede kamer
zou vertegenwoordigen. Het aantal volgt uit die controlelijst, niet uit een
marketingbudget. Zelfgekozen interests kunnen vooraf vastgelegde extra anchors
toevoegen; antwoorden nooit.

### Discover

Discover wordt een tijdelijke doorlopende intent, geen micro-wave.

- alle actieve, nog onbeantwoorde catalogusitems zijn kandidaat;
- onderverkende categorieën en broad clusters krijgen eerst ruimte;
- Conversation blijft topical echo en cluster-monopolie voorkomen;
- expliciete lokale relaties mogen kandidaten rangschikken;
- de gebruiker ziet altijd `Genoeg voor nu`;
- de flow stopt pas wanneer de gebruiker uitstapt of de actieve catalogus op is;
- er wordt geen interest-, confidence- of predictionstate bewaard.

Discover kan dus dezelfde totale pool bereiken als Deep Dive. Het contract is
anders: Discover stuurt op breadth met een vrije uitgang; Deep Dive belooft
exhaustiviteit.

### Deep Dive

Deep Dive betekent letterlijk:

> Toon uiteindelijk iedere actieve catalogus-ID.

Ordering blijft deterministisch, adaptief en gevarieerd. Geen hard limit,
perspective, topic, cluster, ontbrekende metadata of eerder antwoord mag een ID
onbereikbaar maken.

De teller is feitelijk: `Catalogus: X / Y beoordeeld`.

### Meer uit deze categorie

Een user-facing categorie krijgt een expliciete lokale ontsnappingsroute. Deze
intent is ephemeral en maakt geen antwoord of verborgen interest aan.

```ts
type QuestionnaireIntent =
  | { kind: "dynamic" }
  | { kind: "discover" }
  | { kind: "category"; category: string }
  | { kind: "deepDive" };
```

De category-pool bevat alle actieve, nog onbeantwoorde IDs uit die categorie.
Een buiten-categorie probe blijft geldig, maar wacht tot de gebruiker terugkeert
naar Dynamic, Discover of Deep Dive. Zo doet `Meer uit deze categorie` precies
wat het label belooft.

## Metadata: dun, expliciet en sparse

`lib/kinks.ts` blijft de catalogus en wordt geen psychologie-ontology.

### User-facing category

Alleen voor browse en de lokale category-intent. Een antwoord propageert er
nooit over.

### Broad cluster

Alleen voor Conversation diversity en anti-monopoly.

### Topic

Alleen voor spacing. Het voorkomt dat bijna dezelfde kaarten direct achter
elkaar komen. Zelfde topic betekent nooit automatisch related.

### Related

Een expliciete symmetrische inhoudelijke nabijheid. Positieve antwoorden mogen
hiermee lokale ordering ondersteunen. Related opent geen probe en draagt nooit
een hard limit over.

### Follow-up

Een expliciete directionele inhoudelijke voortzetting `A -> B`. De toets is:

> Kan B zonder uitspraak over de gebruiker inhoudelijk als verdere vraag na A
> worden uitgelegd?

Bij twijfel bestaat de edge niet.

### Canonical follow-up

Iedere positieve source heeft hoogstens één pinned target, ooit.

- geen fallback naar een tweede neighbor;
- target al beantwoord betekent capaciteit opgebruikt;
- meerdere sources mogen hetzelfde target nomineren;
- één target verschijnt maximaal één keer als pending probe;
- runtime provenance bewaart alle geldige sources;
- ontbrekende of ongeldige metadata betekent propagation nul;
- runtime-score, catalogusvolgorde en later toegevoegde edges veranderen de
  mapping nooit.

Een bestaande mapping wijzigen is een semantische datamigratie, geen metadata-
opruiming. Nieuwe catalogusitems landen standaard zonder propagation.

## Canonical allowlist @1

De huidige pinned set blijft exact:

```text
spanking_hand             -> spanking_implement
rope_bondage              -> shibari
handcuffs                 -> leather_cuffs
rules_protocols           -> rituelen_protocols
ochtend_avondritueel      -> rituelen_protocols
orgasm_control            -> orgasm_denial
exhibitionism             -> being_watched
voyeurism                 -> watching_others
watersports_geven         -> watersports_ontvangen
geur_scent_fetish         -> panty_sniffing
petplay_puppy             -> petplay_harnas
```

Nieuwe relaties worden eerst edge voor edge gereviewd en daarna als nieuwe
versioned allowlist vastgepind. Een mogelijke chain is pas geldig wanneer iedere
stap zelfstandig expliciet positief is. Dat maakt bijvoorbeeld mogelijk:

```text
vraag A = yes -> canonical probe B
andere category/core-vraag
probe B = yes -> canonical probe C
```

Niet toegestaan:

```text
Golden shower = yes + Trampling = yes
=> waarschijnlijk humiliation
```

Globaal geheugen, lokale oorzaak: iedere expansion-vraag moet naar één concrete
positieve source en één expliciete metadata-edge herleidbaar zijn.

## Conversation-regels

De scheduler bekijkt na ieder antwoord alle open obligations opnieuw: core,
interests, coverage, discovery en geldige probes uit eerdere antwoorden.

- maximaal twee vragen uit hetzelfde broad cluster na elkaar wanneer een geldig
  alternatief bestaat;
- geen directe topical echo wanneer een alternatief bestaat;
- na een positieve probe minstens één geldige non-probe vóór de volgende probe,
  tenzij geen non-probe beschikbaar is;
- één lane mag een andere lane niet verhongeren;
- safety/core en expliciet gekozen interests blijven vóór losse relevantie;
- identieke input, metadata en catalogusversie leveren identieke ordering.

Conversation verandert alleen timing. Het creëert geen eligibility, antwoord of
profielentry.

## Perspective

Dominant en Submissive zijn expliciet gekozen antwoordperspectieven, geen
voorkeurssignalen.

Perspective mag:

- formulering aanpassen waar dezelfde vraag vanuit een andere stoel gelezen
  wordt;
- een ondubbelzinnig directionele tie-break ondersteunen.

Perspective mag niet:

- geven/ontvangen invullen;
- kinks verwijderen;
- coverage verkleinen;
- `Dominant -> vermoedelijk impact` of een andere verborgen voorkeur maken;
- entries tussen de twee profielen delen.

Directionele catalogussplits zoals pegging geven/ontvangen vereisen expliciete
vragen. Complementary matching is een apart productbesluit en wordt niet in de
ranking verstopt.

## Pure engine-API

Het grootste deel blijft pure `lib/`-code:

```ts
buildCoveragePlan(...)
derivePendingExpansionProbes(...)
deriveDiscoverCandidates(...)
deriveCategoryCandidates(...)
rankConversation(...)
selectConversationQuestion(...)
getQuestionnaireRuntime(...)
```

Input:

- actieve catalogus en sparse metadata;
- expliciete bestaande entries van één profiel;
- expliciet gekozen interests en perspective;
- ephemeral intent/conversationcontext.

Output is een queue met lanes en provenance. Geen selector muteert het profiel.

## Session state

Geen persistent “AI-model” en geen expansion-ledger. Canonical probes blijven
stateless afleidbaar uit source-status + pinned target + target-status.

Alleen ephemeral Conversation/UX-state is toegestaan, bijvoorbeeld:

```ts
lastShownId
lastWasProbe
skippedThisSession
questionnaireIntent
```

Deze state voorspelt niets en overleeft geen noodzakelijke recompute.

## Catalogus- en antwoordmigratie vóór launch

Er komt één actieve catalogus, geen catalogusgenerations.

- ongewijzigde betekenissen behouden ID en antwoord;
- renames en category moves zijn antwoordneutraal;
- echte splits krijgen nieuwe IDs en starten onbeantwoord;
- een oud samengesteld antwoord wordt nooit naar meerdere nieuwe antwoorden
  gekopieerd;
- duplicate/gepensioneerde entry-IDs mogen rauw bewaard blijven, maar zijn niet
  actief of scorebaar;
- storeversie 18 zet pre-launch Full om naar Deep Dive en Quick/Balanced of een
  ontbrekende setup naar Dynamic; interests en entries blijven staan;
- sanitizer/import normaliseert dezelfde oude setupvorm aan de grens; runtime,
  types en instellingen-UI bevatten geen dubbele budgetengine meer;
- de oude positional v2 QR-decoder gebruikt één immutable
  `LEGACY_COMPACT_KINK_IDS_V2`-volgorde; de ongebruikte encoder verdwijnt en
  nieuwe shares blijven ID-gebaseerde v3 payloads;
- huidige v3 sharing/import/sanitize, consent, scenes, contracts en snapshots
  blijven ID-gebaseerd.

Compatibility scoring verandert niet in catalogus- of questionnairewerk.

## Kaart-UX

De huidige antwoordfeedback van 200 ms en fade van 170 ms blijft voorlopig
staan; opnieuw tunen gebeurt alleen na device-dogfood.

De funnel-slice bewaakt:

- zichtbare `Lees meer` klapt de Nederlandse uitleg inline open;
- een optionele `safetyNote` krijgt een apart sober blok;
- geen Sheet/contextwissel midden in de antwoordflow;
- één tik blijft voldoende om een status op te slaan;
- `Later` maakt geen entry;
- category bulk-skip maakt geen `Voor hen`-entries;
- tijdelijke subsets tonen geen misleidende volledigheid;
- `Meer uit deze categorie`, `Genoeg voor nu` en terugkeer naar de globale flow
  blijven expliciet;
- een nieuw profiel met `focus=questionnaire` scrollt ook vóór tour completion
  naar de kaart;
- korte iPhones mogen natuurlijk verticaal scrollen; geen kaart wordt in een te
  klein intern scrollvak geperst.

## Acceptatietests

### Causaliteit

- ranking creëert of muteert geen profile entry;
- `yes` en `willing` kunnen uitsluitend een pinned target openen;
- `maybe` en `Voor hen` openen of sluiten niets;
- één `hard_no` werkt niet als herhaalde branchafwijzing;
- hard limits onderdrukken geen topical siblings;
- ontbrekende metadata geeft exact nul propagation;
- answered/invalid canonical target geeft geen fallback;
- meerdere sources naar één target dedupliceren met volledige provenance.

### Coverage en intents

- alle expliciete statuses tellen als coverage; skip niet;
- denominator beweegt niet door positieve antwoorden;
- Dynamic stopt exact op anchors + probes + geldige interleave;
- Discover blijft kandidaten geven zolang een actieve onbeantwoorde ID bestaat;
- category-intent bevat alleen die categorie en schrijft geen interest;
- Deep Dive bereikt iedere actieve catalogus-ID;
- full-catalog search blijft intent-onafhankelijk.

### Conversation

- non-probe tussen probes waar beschikbaar;
- geen topical echo waar een alternatief bestaat;
- broad-cluster anti-monopoly;
- lane starvation onmogelijk;
- deterministische ordering.

### Integraties

- perspective-profielen blijven onafhankelijk;
- splitmigraties infereren geen antwoord;
- Engelse naam en Nederlandse alias zijn zoekbaar;
- sharing/import/sanitize/QR behouden ID-gebaseerde entries;
- maximale catalogus blijft binnen multi-QR-limieten;
- offline Dynamic, Discover, category-intent, Deep Dive en search werken;
- matching en BDSMtest-signalen blijven onveranderd.

## Releasevolgorde

1. Catalogusmodel, aliases, categoryconstanten en QR-orderontkoppeling.
2. Bestaande catalogus opschonen en hoogvertrouwen-items zonder propagation.
3. Doorlopende Discover, category-intent, eerlijke skip en inline uitleg.
4. Coverage-anchor audit op de definitieve categorieën.
5. Topics en related edges conservatief toevoegen.
6. Nieuwe canonical allowlist pas na volledige edge-audit.
7. Targeted tests, volledige `npm test`, `npm run build`, device-dogfood.

Niet bouwen: predictive mode, backend, authwijziging, nieuw package, giant
ontology, BDSMtest-signalen of stilzwijgende compatibilitywijziging.

**Coverage meet wat gevraagd is. Expansion volgt wat expliciet gezegd is.
Prediction bestaat niet.**
