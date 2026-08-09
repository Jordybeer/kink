# Dynamic Questionnaire — motorcontract en catalogusverdieping

> Status: vastgesteld ontwerp voor vervolgwerk. De motor uit PR #299 blijft de
> basis; catalogusuitbreiding en de UX-correcties hieronder zijn niet stilletjes
> onderdeel van die reeds gebouwde implementatie.

## Hoogste invariant

**KinkSync mag slim zijn over welke vraag volgt. Nooit over welk antwoord
waarschijnlijk volgt.**

Daarom bestaan er vier gescheiden verantwoordelijkheden:

- **Coverage** meet uitsluitend wat expliciet gevraagd en beantwoord is.
- **Conversation** vlecht vragen prettig en gevarieerd door elkaar.
- **Expansion** opent één lokale deur na een expliciet positief antwoord.
- **Prediction** bestaat niet. Die kamer blijft op slot en de sleutel gaat niet
  onder de deurmat.

## Productmodel

### Dynamic

Dynamic bouwt een vooraf bepaald, monotone basisprofiel zonder vast
vragenbudget. De basis is klaar wanneer:

1. alle IDs uit het vaste `CoveragePlan` expliciet beantwoord zijn;
2. alle nog geldige canonical probes afgehandeld zijn;
3. een verplichte interleave-vraag tussen twee probes is afgehandeld wanneer er
   zo'n niet-probe beschikbaar is.

Iedere expliciete status telt als coverage. Skip telt niet. Een positief
antwoord kan één lokale vervolgdeur openen, maar verandert de denominator
nooit.

De eindtekst spreekt daarom over **basis gelegd** of **brede dekking**, nooit
over een compleet mens of een volledig kinkprofiel.

### Verder ontdekken

`Meer ontdekken` wordt uiteindelijk een tijdelijke doorlopende Discover-intent,
geen micro-wave van soms maar twee of drie kaarten.

- alle nog onbeantwoorde, expliciet aangewezen discovery-anchors zijn kandidaat;
- broad clusters en topics houden de stapel gevarieerd;
- echte probes worden ertussen gevlochten;
- de gebruiker kan altijd stoppen;
- wanneer de discovery-pool op is, verschijnt opnieuw het checkpoint.

Er komt geen verborgen confidence-score en geen willekeurig budget van acht of
twaalf vragen. De gebruiker bepaalt hoe lang de ontdekking duurt; de motor
bepaalt alleen de prettigste volgorde.

### Deep Dive

Deep Dive belooft letterlijk de volledige actieve catalogus. Ordering mag slim
zijn, maar geen enkele kink wordt door antwoorden, perspectief, topics, clusters
of hard limits onbereikbaar.

Deep Dive toont de objectieve teller `Catalogus: X / Y beoordeeld`. Alleen hier
betekent het einde werkelijk dat iedere actieve catalogus-ID expliciet langs is
geweest.

## Canonieke statussemantiek

| Status | Betekenis | Coverage | Expansion |
| --- | --- | --- | --- |
| `yes` | Heel graag | telt | sterk positief |
| `willing` | Ja | telt | positief |
| `maybe` | Misschien | telt | neutraal |
| `no` | Voor hen | telt | neutraal |
| `hard_no` | Harde grens | telt | enige negatieve status |
| skip | Later | telt niet | geen |

`no / Voor hen` is nooit een afwijzing en sluit geen branch. Voor ieder vast
target telt de engine uitsluitend `hard_no`-antwoorden op expliciete
directionele `source -> target`-edges. Eén zo'n antwoord is neutraal voor de
volgorde; de effectieve penalty is `Math.max(0, count - 1)`. Topic-, related- en
broad-cluster-metadata doen niet mee aan die targetgebonden telling.

## Metadata: dun en streng

`lib/kinks.ts` blijft de catalogus, geen gigantische psychologie-ontology.

### Broad cluster

Alleen voor conversation diversity en anti-monopoly. Een antwoord propageert
nooit automatisch over een cluster.

### Topic

Alleen voor spacing. Het voorkomt dat drie bijna gelijke kaarten als een
seksuele mitrailleur achter elkaar afgaan.

### Related

Expliciete symmetrische inhoudelijke nabijheid. Alleen positieve antwoorden
mogen hiermee ordering beïnvloeden. Een hard limit propageert er nooit over.

### Follow-up

Expliciete directionele inhoudelijke voortzetting `A -> B`. De toets is:

> Kan B zonder uitspraak over de gebruiker inhoudelijk als verdere vraag na A
> worden uitgelegd?

Bij twijfel bestaat de edge niet.

### Canonical follow-up

Iedere positieve source heeft deterministisch hoogstens één pinned target.

- maximaal één target per source, ooit;
- geen fallback naar een tweede neighbor;
- target al beantwoord betekent capaciteit opgebruikt;
- meerdere sources mogen hetzelfde target nomineren;
- één target verschijnt maximaal één keer als pending probe;
- runtime provenance bewaart alle geldige sources;
- ontbrekende of ongeldige metadata betekent nul propagation.

Een bestaande canonical mapping wijzigen is een semantische datamigratie, geen
onschuldig metadatafeestje. Nieuwe mappings vanaf bestaande oude sources krijgen
dezelfde zware review, omdat ze afgeronde profielen opnieuw kunnen openen.

De huidige allowlist heet `canonical-follow-ups@1` en is exact:

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

Een source die niet in deze versie staat heeft geen canonical target. Een nieuwe
catalogusentry mag dus wel zonder edge landen, maar kan probes, provenance of de
heropening van een afgerond profiel pas beïnvloeden nadat een nieuwe mapping
expliciet is vastgepind, gereviewd en geversioneerd. Ook vóór een nieuwe chain
wordt toegevoegd geldt die poort; catalogusvolgorde of runtime-score kiest nooit
een vervangend target.

## Gespreksritme

De scheduler bekijkt na ieder antwoord opnieuw alle open verplichtingen:
coverage, gekozen interests, discovery en geldige probes uit alle eerdere
expliciete antwoorden.

Globaal geheugen, lokale oorzaak:

```text
Golden shower = yes
Trampling = maybe
Safety/core-vraag
Watersports-probe
Andere cluster
```

Niet toegestaan:

```text
Golden shower = yes + Trampling = yes
=> waarschijnlijk vernedering
```

Een positieve probe mag zelf één canonical target nomineren. Die nieuwe probe
wordt pas getoond nadat minimaal één geldige niet-probe is getoond, tenzij geen
geldige niet-probe meer bestaat.

## Perspective

Dominant en Submissive zijn expliciet gekozen antwoordperspectieven, geen
voorkeurssignalen.

Perspective mag formulering of een ondubbelzinnig directionele tie-break
beïnvloeden. Het mag nooit kinks verwijderen, dekking verkleinen, antwoorden
invullen of aannemen dat een Dominant of Submissive bepaalde activiteiten wil.
De twee profielentries blijven volledig onafhankelijk.

## Cataloguscontract

De huidige catalogus telt 266 kinks. De funnel maakt een grotere catalogus
bruikbaar, maar is geen vrijbrief voor catalogusconfetti.

Een nieuwe kink wordt alleen toegelaten wanneer:

1. iemand redelijkerwijs anders kan antwoorden dan op het dichtstbijzijnde
   bestaande item;
2. dat verschil een werkelijk gesprek, grens of verwachting verandert;
3. de activiteit neutraal beschreven kan worden zonder motivatie, identiteit of
   psychologie toe te schrijven;
4. de entry uitsluitend volwassen en consensueel geformuleerd kan worden;
5. het meer is dan een cosmetische materiaal- of instrumentvariant.

De praktische lakmoesproef:

> Kan iemand hier `yes` op antwoorden en op het dichtstbijzijnde bestaande item
> `hard_no`, zonder zichzelf tegen te spreken?

Golden shower ontvangen versus urine inslikken slaagt. Rode versus zwarte leren
polsboeien krijgt geen eigen troon.

## Bestaande overlap eerst bewaken

De catalogus heeft enkele inhoudelijke doublures of samengestelde labels:

- `deep_throat` en `deepthroat`;
- `recording` en `filmen_prive`;
- `cuckolding / hotwifing` mengt vernederende en niet-vernederende partnerdeling;
- `sharing / group play` overlapt met `trio / groepsseks`;
- sommige brede entries combineren handelingen waarop grenzen sterk kunnen
  verschillen.

Bestaande IDs worden niet verwijderd, samengevoegd of stilletjes herdoopt. Oude
antwoorden behouden hun betekenis. Overlap krijgt spacing en redactionele
review; geen dubbel wordt plots een verplicht Dynamic-anchor.

## Eerste hoogvertrouwen-uitbreiding

Deze 31 kandidaten voegen zelfstandig bespreekbare grenzen toe en verdienen een
eerste inhoudelijke catalogusreview.

### Sensation en materiaal

1. Erotische massage zonder rollenspel
2. Zachte aanraking / veren
3. Vibratiespel
4. Geluidsdeprivatie
5. Wetlook / natte kleding zonder urinecomponent
6. Borst- of tepelpumping
7. Genitale pumping

### Toys en penetratie

8. Prostaatmassage
9. Prostaatmilking
10. Seksmachine / fucking machine
11. Plug langdurig dragen

### Worship en geur

12. Breast worship
13. Hand worship
14. Armpit worship
15. Zweet / lichaamsgeur
16. Gedragen ondergoed aanbidden, los van alleen ruiken

### Fluid en social

17. Speeksel / drool play, los van spugen als machtsdaad
18. Gehoord worden
19. Seksclub / play-party bezoeken
20. Swinging / partnerruil
21. Partner zien masturberen

### Aftercare

22. Aftercare voor top/Dom
23. Check-in de volgende dag
24. Samen douchen / praktisch opruimen
25. Striemen en gevoelige plekken verzorgen

### Role, pet en adult ageplay

26. Dollification / mannequin play
27. Pettraining / trucjes
28. Pet grooming / borstelen / verzorgen
29. Luier natmaken
30. Luier gebruiken voor ontlasting
31. Luier verschonen

Alle ageplay-items zeggen expliciet dat het uitsluitend om instemmende
volwassenen gaat. Luierplassen en ontlasting blijven apart: een positief antwoord
op het ene zegt niets over het andere.

## Kandidaten voor een tweede review

Niet afgeschoten, wel eerst scherper afbakenen tegen bestaande entries:

- sensorische overbelasting versus seksuele overstimulatie;
- dildo-spel buiten pegging;
- een live publiek versus algemeen bekeken worden;
- partnerdeling zonder vernedering;
- partnerdeling met expliciete vernedering;
- bodypainting versus body writing;
- PVC/vinyl versus latex/rubber;
- hair- en muscle-worship;
- mutual masturbation;
- balloon fetish, giant/microfantasie en zwangerschapsfetisj;
- tranen/crying play, flatulentie, emetofilie en feeder/feedee.

Extremere of gezondheidsgevoelige niches krijgen eerst een afzonderlijke
redactionele en veiligheidsreview. Een funnel kan een slechte vraag verstoppen,
maar maakt haar nog niet goed.

## Funnelplaatsing van nieuwe entries

### Basisdekking

De bestaande denominator groeit niet door een catalogusrelease. Een profiel mag
na een update nooit van 100% naar 76% dekking tuimelen omdat de app nieuwe
zwepen in de kast vond.

### Discovery

Een gespreide subset kan expliciet discovery-anchor worden, bijvoorbeeld
erotische massage, vibratiespel, breast worship, lichaamsgeur, gehoord worden,
play-party, top-aftercare, dollification, pettraining en luier natmaken.

### Expansion

Nieuwe entries krijgen standaard geen edge. Kandidaten voor een volgende,
expliciet gereviewde mappingversie zijn bijvoorbeeld:

```text
prostaatmassage -> prostaatmilking
luier natmaken -> luier verschonen
```

De rest blijft discovery-, zoek- of Deep-Dive-materiaal totdat iedere relatie
afzonderlijk verdedigd is.

### Lokale gebruikerscontrole

Een categorie mag later `Meer uit deze categorie` aanbieden. Dat is een
expliciete gebruikerskeuze, geen inferred interest. De actie maakt geen antwoord
aan en bewaart geen verborgen psychologisch profiel.

## Legacy en catalogusgeneraties

Nieuwe IDs kunnen v1 Quick/Balanced ook zonder tellerwijziging van samenstelling
laten veranderen. Daarom wordt het oude selectie-universum bevroren, niet alleen
het getal 52/104.

- bestaande catalogus-IDs vormen generation 1;
- nieuwe IDs vormen generation 2;
- v1 Quick/Balanced/Full en profielen zonder setup blijven generation 1 gebruiken;
- v2 Deep Dive en full-catalog search bereiken iedere actieve generation;
- iedere reeds beantwoorde entry blijft zichtbaar;
- bestaande IDs en profielentries blijven byte-compatibel.

Dit hoort in een dunne metadata-map buiten `lib/kinks.ts`, niet in een nieuwe
profielontology.

## UX-contract rond de kaart

De huidige kaart blijft visueel herkenbaar en één tik blijft voldoende om een
antwoord vast te leggen. Correcties richten zich op eerlijkheid en herstel:

- categorie-bulk-skip mag nooit `no / Voor hen` invullen;
- kaart-skip heet `Later` en maakt geen entry;
- subsetcategorieën tonen geen misleidende `X / X compleet`;
- de beschrijving krijgt een zichtbare `Lees meer`-affordance;
- antwoordfeedback moet aantoonbaar zichtbaar zijn vóór de volgende kaart;
- snelle correctie laat de laatste tik winnen;
- secundaire tikdoelen halen minimaal 44 px;
- scroll en focus worden op korte iPhones conditioneel hersteld;
- technische lane-labels komen alleen als dogfooding bewijst dat stille
  adaptiviteit nog onbegrijpelijk blijft.

## Backwards compatibility

Geen destructieve migratie. Bestaande v1-setups blijven:

```text
version: 1
preset: quick | balanced | full
```

V2 blijft additief:

```text
version: 2
mode: dynamic | deepDive
```

Alle bestaande kink-IDs, entries, sharing, QR, verification, consent, scenes,
contracts, snapshots, localStorage/Zustand en offline-first gedrag blijven
staan. Compatibility scoring en BDSMtest-signalen veranderen niet.

## Releasepoorten

### Catalogus

- iedere actieve, zoekbare ID heeft een stabiele unieke `id`, niet-lege `name`,
  geldige `category`, `level` 1–4 en een neutrale niet-lege `description`;
- zodra catalogusgeneraties landen, is `generation` eveneens verplichte
  routingmetadata voor iedere actieve ID;
- genormaliseerde naamdoublures falen of staan op een expliciete allowlist;
- iedere nieuwe ID is via search en Deep Dive bereikbaar;
- geen bestaande entry wordt verwijderd of geherinterpreteerd.

Propagation-metadata is afzonderlijk en optioneel: topic, related, follow-up,
canonical target, anchor en direction. Ontbreekt die laag, dan blijft de ID
zichtbaar en zoekbaar, maar veroorzaakt hij exact nul propagation. Een
generation-1-ID blijft bereikbaar via v1 Full, search en v2 Deep Dive; een latere
generation blijft bereikbaar via search en v2 Deep Dive en wordt niet
stilletjes in het bevroren v1 Full-universum geschoven.

### Engine

- ontbrekende metadata geeft exact nul propagation;
- `no / Voor hen` remt niets;
- één `hard_no` remt nog geen branch alsof het herhaling is;
- herhaalde harde grenzen werken alleen op een expliciet gedeeld target;
- één positive source geeft maximaal één canonical probe;
- broad-cluster anti-monopoly en determinisme blijven groen;
- ranking creëert of muteert nooit een profielentry.

### Legacy en integraties

- v1 Quick blijft 52 en behoudt zijn selectie-universum;
- Balanced blijft 104 en behoudt zijn selectie-universum;
- v1 Full blijft exhaustief binnen generation 1;
- v2 Deep Dive bereikt de volledige uitgebreide catalogus over alle actieve
  generations;
- perspective-profielen blijven onafhankelijk;
- export/import/sanitize/sharing/QR verwerken nieuwe IDs;
- een maximaal ingevuld profiel blijft deelbaar via multi-QR;
- offline search en Deep Dive bevatten de uitbreiding.

### UX en toestellen

- dogfood paden met veel `maybe`, veel enthousiasme, veel `hard_no` en gemengde
  topics;
- snelle dubbele statustik is deterministisch;
- beschrijving, modifiers en `Later` zijn begrijpelijk;
- viewportchecks op 320x568, 375x667, 390x844 en 430x932;
- focus, screenreader en reduced motion blijven bruikbaar.

## Aanbevolen releasevolgorde

1. Rond PR #299 af met zijn huidige enginecontract en geldige reviewfixes.
2. Herstel de eerlijke checkpoint-, skip- en categoriebetekenis.
3. Maak Discover doorlopend en gebruikersgestuurd.
4. Bevries het legacy-selectieuniversum.
5. Voeg de hoogvertrouwen-items eerst zonder propagation toe.
6. Audit namen, beschrijvingen, categorieën en veiligheidsframing.
7. Voeg topics en related edges conservatief toe.
8. Voeg uitsluitend onbetwistbare canonical chains toe.
9. Test volledige profielen, sharing, QR en offline.
10. Behandel de tweede kandidatenlijst in een aparte catalogusreview.

## Kritische zelfaudit

Meer catalogus is niet automatisch meer kwaliteit. De funnel verbergt
keuzebelasting, maar elimineert onderhoud, privacygevoeligheid, zoekruis of een
grotere Deep Dive niet.

De eerste brainstorm overschatte bovendien enkele gaten: tentakels, babytaal,
zweet, massage en sploshing zijn al deels in brede entries aanwezig. Verfijning
is alleen gerechtvaardigd wanneer verschillende expliciete statussen zinvol
zijn.

Nieuwe canonical mappings vanaf bestaande oude sources kunnen afgeronde
profielen opnieuw openen. Daarom starten catalogusitems zonder propagation en
krijgt iedere latere edge migratieachtige review.

De eindbeslissing blijft dus bewust saai en veilig:

- eerst 31 inhoudelijk verdedigbare kandidaten reviewen;
- basisdekking niet laten terugvallen;
- Discover rijker maken zonder voorspelling;
- extreme niches pas na afzonderlijke veiligheidsredactie;
- twijfel betekent geen entry of geen edge.

**Coverage meet wat gevraagd is. Expansion volgt wat expliciet gezegd is.
Prediction bestaat niet.**
