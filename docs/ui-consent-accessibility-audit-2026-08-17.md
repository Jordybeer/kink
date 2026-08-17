# UI/UX-, consent- en accessibility-audit (2026-08-17)

Read-only doorlichting van de release candidate tegen `UI-principles.md` en WCAG 2.2 AA.
Bindende conflictvolgorde: consent en veiligheid en privacy → begrijpelijkheid en
leesbaarheid → stabiele interactiegeometrie → hiërarchie en rust → expressiviteit
en decoratie → dichtheid en snelheid.

Alle bevindingen komen uit code, uit berekening op de echte tokens, of uit meting
over de echte catalogus van 344 kinks. Geen enkele bevinding komt uit een
screenshot of uit smaak.

**Themacontext:** KinkSync is bewust dark-only. Er is geen `prefers-color-scheme`
en geen tweede palet; het blok dat op een licht thema lijkt is een `@media print`
blok voor de contract-PDF. Alle contrastberekeningen hieronder gelden dus voor de
midnight-default. De printstijl is los gecontroleerd en zit ruim goed
(`--text2` 9,74:1 en `--text` 18,88:1 op wit).

---

## KS-UX-001 — veiligheidsnotities staan achter een tap

**Severity:** High
**Flow en locatie:** Questionnaire. `components/TriageDeck.tsx:166`, `lib/kinks.ts` (96 kinks met `safetyNote`)

**Observeerbaar bewijs:** De notitie zit uitsluitend in een bottom sheet. Op de
kaart staat alleen een knop met schildicoon en het woord "Veiligheid". Wat achter
die knop zit:

> "Er bestaat geen betrouwbare veilige manier om zuurstof of bloedtoevoer via de hals te beperken."

> "Dit is onomkeerbaar en brengt risico op infectie, zenuwschade en bloedoverdracht mee."

De vijf antwoordknoppen staan direct onder die dichte knop. Niets nodigt uit hem
eerst te openen.

**Relevant UI-principe:** #8, letterlijk: essentiële context wordt niet verborgen
achter een disclosure, en de essence moet op zichzelf volstaan voor een eerste,
veilige keuze. Plus prioriteit 1 boven prioriteit 3.

**Gebruikersconsequentie:** Iemand kan "Ja" antwoorden op wurgen zonder ooit te
lezen dat er geen veilige methode bestaat. Dat antwoord reist door naar compare,
scene planning en een ondertekend contract, waar het als geïnformeerde instemming
leest.

**Waarom dit een hoger principe raakt:** De notitie zit achter een tap om de vaste
zeven-rijen grid intact te houden. Stabiele geometrie (3) wint hier van veiligheid
(1). Precies de ruil die de doctrine verbiedt.

**Kleinste veilige verbetering:** Splits `safetyNote` in één inline zin plus de
volledige tekst. De detail-slot rij is al 48px en staat er al; toon daar bij een
safetyNote één zin in plaats van alleen het woord "Veiligheid".

**Acceptatiecriteria:** Voor elke kink met `safetyNote` is minstens één zin
veiligheidscontext zichtbaar zonder interactie, op 320px en 375px, boven de
antwoordknoppen. Grid-rijhoogtes veranderen niet. E2e-test op drie hoog-risico
kinks.

**Launch-impact:** must fix. Voor notities over onomkeerbaar of levensbedreigend
letsel argumenteerbaar blocker.

---

## KS-UX-002 — de hard limit is het slechtst leesbare label

**Severity:** High
**Flow en locatie:** Questionnaire. `components/StatusOptionRows.tsx:26-31`, tokens `app/globals.css:32-37`

**Observeerbaar bewijs:** Berekend op de echte tokens, actief label 14px semibold
op de eigen gemengde achtergrond:

| Status | Contrast | AA 4.5:1 |
|---|---|---|
| curious | 6,51:1 | ✓ |
| maybe | 5,98:1 | ✓ |
| willing | 5,32:1 | ✓ |
| yes | 4,92:1 | ✓ |
| no | 4,58:1 | ✓ |
| **hard_no** | **4,04:1** | **zakt** |

De oorzaak staat in de code: `danger` krijgt 17% menging waar de rest 19% krijgt,
en `#ef4444` heeft van de zes de laagste luminantie.

**Relevant UI-principe:** #10 tegenover prioriteit 2. WCAG 1.4.3.

**Gebruikersconsequentie:** De status die het zwaarst weegt is het moeilijkst te
lezen, juist bij fel licht, een gedimd scherm of verminderd contrastzicht.

**Waarom dit een hoger principe raakt:** De ingetogen behandeling komt uit
principe 10, dat op prioriteit 5 staat. Leesbaarheid staat op 2. De
terughoudendheid is doorgeschoten tot onder de drempel.

**Kleinste veilige verbetering:** Til de menging voor `danger` naar hetzelfde
niveau als de rest, of licht `--hard-no` een tint op. Dashed border blijft, glow
blijft laag, alarmkleur komt niet terug.

**Acceptatiecriteria:** Alle zes actieve labels halen minstens 4,5:1. Een
unit-test berekent de ratio's uit de tokens zodat een latere kleurtweak dit niet
stil terugdraait.

**Launch-impact:** must fix.

---

## KS-UX-003 — consentnuance valt buiten beeld op kleine schermen

**Severity:** Medium
**Flow en locatie:** Questionnaire. `components/TriageDeck.tsx:156`, `lib/questionnairePresentation.ts:127`

**Observeerbaar bewijs:** De essence krijgt `h-12` bij `leading-4`, dus precies
drie regels, en wordt afgeleid als "de eerste zin van de description", ongeacht
lengte. Gemeten over 344 kinks: op 375px hebben **8 essences** meer dan drie
regels nodig, op 320px **32**. De langste is 207 tekens. Het is systematisch de
staart die wegvalt, en daar zit de afbakening:

> "...zonder te veronderstellen dat je ze zelf wil dragen"
> "...zonder een vaste dominante rol"
> "...zonder automatisch little headspace of een caregiver-dynamiek"

**Relevant UI-principe:** #8 en #14.

**Gebruikersconsequentie:** Op een kleine telefoon leest iemand het voorstel
zonder de clausule die de reikwijdte begrenst. Het antwoord gaat dan over iets
anders dan bedoeld.

**Waarom dit een hoger principe raakt:** De vaste hoogte dient prioriteit 3. Wat
verdwijnt is prioriteit 2, en waar de clausule instemming afbakent prioriteit 1.

**Kleinste veilige verbetering:** Kort de te lange essences in de catalogus in en
verplaats de nuance naar `details`. Nul layoutverandering.

**Acceptatiecriteria:** Geen enkele essence overschrijdt drie regels op 320px. Een
unit-test over de catalogus bewaakt de lengte.

**Launch-impact:** must fix voor de 320px-klasse.

---

## KS-UX-004 — selectie in een sheet bestaat alleen in kleur

**Severity:** Medium
**Flow en locatie:** Alle keuzesheets. `components/ui/Sheet.tsx:126-174` (`SheetOptionItem`)

**Observeerbaar bewijs:** De actieve optie wordt alleen visueel gemarkeerd:
accentkleur op label, accent-achtergrond op icoon, en een bolletje van 2,5px. Geen
`aria-pressed`, geen `aria-selected`, geen `role="radio"`, geen tekstalternatief.

**Relevant UI-principe:** #2 en #12. WCAG 1.4.1 en 4.1.2.

**Gebruikersconsequentie:** Een VoiceOver- of TalkBack-gebruiker hoort een lijst
identieke knoppen en weet niet welke gekozen is. Bij rol-, perspectief- of
profielkeuze betekent dat kiezen zonder te weten wat er stond.

**Waarom dit een hoger principe raakt:** Betekenis die alleen in kleur zit is
expressiviteit (5) die begrijpelijkheid (2) vervangt. In sheets die een profiel
kiezen raakt het prioriteit 1, want de gebruiker weet niet namens wie hij
antwoordt.

**Kleinste veilige verbetering:** `aria-pressed={active}` op de knop in
`SheetOptionItem`. Eén attribuut, nul visuele verandering, dekt alle consumenten.

**Acceptatiecriteria:** Elke `SheetOptionItem` exposeert zijn selectiestatus.
E2e-test op minstens één keuzesheet. Visueel identiek.

**Launch-impact:** must fix.

---

## KS-UX-005 — de vastgezette viewport tegenover vergroting

**Severity:** Medium
**Flow en locatie:** Questionnaire. `components/profile/QuestionsScreen.tsx:72-108`

**Observeerbaar bewijs:** Bij mount wordt de hele pagina vastgezet: `body.position
= "fixed"`, `inset: 0`, `overflow: hidden` op zowel root als body. De kaart
eronder heeft een vaste grid van zeven rijen met alleen al `minmax(14.75rem, 1fr)`
voor de antwoordrij.

**Relevant UI-principe:** #14 en #6. WCAG 1.4.4 en 1.4.10.

**Gebruikersconsequentie:** Wie zoom of tekstgrootte op 200% zet houdt een
viewport over waarin de zeven vaste rijen niet passen, terwijl de pagina zelf niet
kan scrollen. Of de onderste rijen bereikbaar blijven hangt volledig af van de
interne scroll van de kaart.

**Waarom dit een hoger principe raakt:** De lock dient prioriteit 3. Wat op het
spel staat is of iemand met beperkt zicht de antwoordknoppen bereikt, prioriteit 2.

**Kleinste veilige verbetering:** Laat de lock los onder een viewport- of
zoomdrempel zodat de pagina bij grote tekst weer normaal scrollt. Standaardgedrag
verandert niet.

**Acceptatiecriteria:** Bij 200% zoom op 375px zijn de vijf antwoordknoppen, de
progressie en de "Later"-knop bereikbaar zonder horizontaal scrollen.

**Launch-impact:** must fix na handmatige bevestiging van de ernst.

---

## KS-UX-006 — stapwissel in de onboarding wordt niet aangekondigd

**Severity:** Low
**Flow en locatie:** Eerste bezoek. `components/onboarding/Onboarding.tsx:155-166`

**Observeerbaar bewijs:** Voortgang staat als tekst (`{step + 1} / {STEP_COUNT}`)
en de balkjes zijn correct `aria-hidden`. Maar de stapinhoud wisselt binnen
`AnimatePresence mode="wait"` met `key={step}` zonder live region en zonder
focusverplaatsing. De dialog houdt een vaste `aria-label="Welkom bij KinkSync"`.

**Relevant UI-principe:** #13 en #4. WCAG 4.1.3.

**Gebruikersconsequentie:** Een screenreadergebruiker drukt op "Verder" en hoort
niets veranderen. Bij de 18+-stap en de privacystap is dat precies de inhoud die
niet gemist mag worden.

**Waarom dit een hoger principe raakt:** De onboarding draagt de
leeftijdsbevestiging en de privacybelofte. Een stap die ongehoord voorbijgaat
heeft die context niet overgedragen, prioriteit 1.

**Kleinste veilige verbetering:** Verplaats focus naar de koptekst van de nieuwe
stap, of zet de stapcontainer in `aria-live="polite"`. Geen visuele wijziging.

**Acceptatiecriteria:** Bij elke stapwissel wordt de nieuwe koptekst
aangekondigd. Handmatig te bevestigen met VoiceOver en TalkBack.

**Launch-impact:** acceptabel risico voor launch, must fix kort daarna.

---

## KS-UX-007 — moduskeuze zit in het overflowmenu

**Severity:** Low
**Flow en locatie:** Questionnaire. `components/profile/QuestionsScreen.tsx:57-62`

**Observeerbaar bewijs:** Dynamic, Discover en Deep Dive krijgen alle drie
`placement: "overflow"`. Alleen "Uitleg antwoordkeuzes" staat als `primary` in
beeld. De actieve modus is wel zichtbaar in de navtitel.

**Relevant UI-principe:** #12: los visuele druk niet op door essentiële
functionaliteit in overflowmenu's te verstoppen.

**Gebruikersconsequentie:** De modus bepaalt welke vragen je krijgt. Wie merkt dat
de lijst niet past moet een overflowmenu vinden. De meeste gebruikers zullen de
standaardmodus uitzitten.

**Waarom dit een hoger principe raakt:** Dit blijft binnen prioriteit 4 tegenover
6, en de actieve modus is zichtbaar. Genoteerd als spanning, niet als schending.

**Kleinste veilige verbetering:** Maak de navtitel `Vragenlijst · Dynamic` zelf
tapbaar en laat die het modusmenu openen.

**Acceptatiecriteria:** De moduswissel is bereikbaar vanaf een zichtbaar element.

**Launch-impact:** post-launch.

---

## KS-UX-008 — een contract tekenen kan alleen met vrije hand

**Severity:** High
**Flow en locatie:** Contract ondertekenen. `components/contract/SignaturePad.tsx:60-96`, `components/contract/ContractSigningSheet.tsx`

**Observeerbaar bewijs:** De handtekening is een kale `<canvas>` met alleen een
`aria-label`. Geen `tabindex`, geen `role`, geen toetsenbordpad, en nergens in
`components/contract/` of `lib/contract*.ts` een getypt of aangevinkt alternatief.
Het canvas staat niet in de tabvolgorde.

**Relevant UI-principe:** #14 (bereikbare controls) en prioriteit 1, want tekenen
is de handeling die instemming bezegelt. WCAG 2.1.1 en 2.5.7.

**Gebruikersconsequentie:** Wie alleen met een toetsenbord werkt of geen precieze
vrije-handbeweging kan maken, kan het contract niet ondertekenen. De terminale
handeling van het hele product is voor die gebruiker onbereikbaar. Er is geen
omweg en geen foutmelding; het veld reageert simpelweg niet.

**Waarom dit een hoger principe raakt:** De cryptografische binding is de
ECDSA-handtekening uit `lib/contractProtocol.ts`, niet de tekening. De tekening is
ceremonieel. Een gebruiker wordt dus buitengesloten van een consenthandeling door
een decoratieve laag, niet door iets dat de handeling nodig heeft.

**Kleinste veilige verbetering:** Voeg naast het tekenveld een tweede weg toe:
naam typen plus een expliciete bevestigingsknop, die dezelfde
`signContractPayload` aanroept. Cryptografisch identiek, want de sleutel tekent,
niet de vinger.

**Acceptatiecriteria:** Een contract is volledig te ondertekenen met alleen een
toetsenbord. De resulterende `ContractSignatureProof` is niet te onderscheiden van
een getekende. E2e-test die het hele ondertekenpad zonder pointer doorloopt.

**Launch-impact:** must fix.

---

## KS-UX-009 — de volle-opslagwaarschuwing verdwijnt na zes seconden en komt nooit terug

**Severity:** High
**Flow en locatie:** Elke schrijfactie bij volle opslag. `components/StorageFullNotice.tsx:20-45`, `components/Toast.tsx:22,66`

**Observeerbaar bewijs:** De melding gaat via de toast, die correct `role="status"`
draagt. Maar:

```
const DISMISS_MS = 6000;
timer.current = setTimeout(() => setToast(null), DISMISS_MS);
```

en in de notice:

```
const announced = useRef(false);
if (announced.current) return;
announced.current = true;
```

De boodschap is "De opslag zit vol. Je laatste wijziging is niet bewaard", met een
actieknop "Maak een back-up". Hij verschijnt één keer per sessie, verdwijnt na zes
seconden, en komt daarna nooit meer terug.

**Relevant UI-principe:** #11 (begrijpelijke gevolgen van acties) en #12 (quiet is
good, invisible is not). WCAG 2.2.1 Timing Adjustable.

**Gebruikersconsequentie:** Wie die zes seconden mist, blijft de rest van de
sessie antwoorden geven aan een opslag die niets meer bewaart, zonder enige
verdere aanwijzing. Bij de volgende start is dat werk weg. Voor een
screenreadergebruiker is de kans dat hij het mist het grootst: `role="status"` is
polite en onderbreekt niet, dus de melding kan achter lopende spraak in de wachtrij
staan terwijl de timer doortikt. De actieknop verdwijnt mee.

**Waarom dit een hoger principe raakt:** Dit is stil dataverlies, en de code zegt
zelf dat dat nooit mag gebeuren: `lib/persistStorage.ts` is er expliciet voor
gebouwd om precies dit te voorkomen. De wrapper vangt de fout netjes op en roept
één keer; wat daarna gebeurt maakt die vangst ongedaan. Prioriteit 1.

**Kleinste veilige verbetering:** Laat deze ene toast niet automatisch
verdwijnen, of geef hem een persistente variant die pas sluit na een expliciete
handeling. `announced.current` mag blijven, zolang de melding zichtbaar blijft tot
iemand hem wegklikt.

**Acceptatiecriteria:** Bij een `QuotaExceededError` blijft de melding staan tot de
gebruiker hem sluit of de back-upactie kiest. Een unit- of e2e-test met een
gesimuleerde volle kluis bevestigt dat de melding na zestig seconden nog zichtbaar
is.

**Launch-impact:** must fix.

---

## KS-UX-010 — het bevestigingsveld van "Vernietig alle data" heeft geen label

**Severity:** Medium
**Flow en locatie:** Destructieve actie. `components/sheets/DestroyAllSheet.tsx`

**Observeerbaar bewijs:** Het invoerveld waarin "wis alles" getypt moet worden
heeft alleen een `placeholder`. Geen `<label>`, geen `aria-label`, geen
`aria-describedby` naar de instructiezin erboven. De sheet zelf is wel netjes
gelabeld.

**Relevant UI-principe:** #11 (begrijpelijke gevolgen) en #12. WCAG 3.3.2 en 4.1.2.

**Gebruikersconsequentie:** Een screenreadergebruiker die deze sheet opent, hoort
een naamloos tekstveld. Een placeholder verdwijnt bovendien zodra er iets staat,
dus wie halverwege de instructie kwijtraakt kan hem niet terughalen. Dit is de
enige onomkeerbare handeling in de app.

**Waarom dit een hoger principe raakt:** Het frictie-ontwerp is bewust en goed:
de doctrine zegt dat een privacygevoelige handeling extra frictie mag krijgen als
die frictie vertrouwen schept. Maar frictie die je niet kunt horen is geen
frictie, het is een blokkade.

**Kleinste veilige verbetering:** Een `aria-label` op het veld plus
`aria-describedby` naar de bestaande instructiezin. Nul visuele verandering.

**Acceptatiecriteria:** Het veld heeft een toegankelijke naam en een beschrijving
die de vereiste zin noemt. Placeholder blijft zoals hij is.

**Launch-impact:** must fix.

---

# A. De vijf best uitgevoerde patronen

1. **De vaste zeven-rijen grid van de vraagkaart.** `gridTemplateRows: "44px 56px
   48px 48px minmax(14.75rem,1fr) 88px 44px"` is principe 5 in zijn zuiverste
   vorm. Na honderd vragen is dat een motorische kaart in plaats van een
   leesoefening.

2. **`StatusOptionRows` als geheel.** `aria-pressed`, `role="group"`, elke status
   gedragen door glyph én label én kleur, dashed border voor hard limits in plaats
   van alarmrood, `motion-reduce` op elke transitie, en opnieuw tikken
   deselecteert.

3. **De privacy-architectuur van `privateResponse`.** `comparableEntry` retourneert
   een lege vorm in plaats van een gemaskeerde waarde, en `profileSnapshot`
   verzwijgt zelfs de privacy-transitie zodat een verandering niet verraadt wat er
   stond.

4. **De focus trap.** `lib/useFocusTrap.ts` focust bewust de dialog zelf in plaats
   van de eerste knop, met een comment die uitlegt waarom: iOS Safari zou anders de
   sheet halverwege openscrollen. Focus wordt hersteld bij sluiten. Escape werkt.

5. **"Overlap is geen toestemming" staat inline op de compare-samenvatting**
   (`components/compare/CompareScoreSummary.tsx:157`), met schildicoon, niet achter
   een disclosure. Samen met de category explainer die zichzelf inperkt ("Ze vult
   niets voor je in en verandert geen antwoorden") is dat principe 8 en 13 correct
   toegepast.

# B. De vijf grootste trust-, consent-, privacy- of cohesieproblemen

1. **Veiligheidsnotities achter een tap** (KS-UX-001), 96 kinks waaronder
   onomkeerbare en levensbedreigende.
2. **Stil dataverlies na zes seconden** (KS-UX-009), waar de opslaglaag juist
   gebouwd is om dat te voorkomen.
3. **Tekenen is de enige weg naar een handtekening** (KS-UX-008), terwijl de
   binding cryptografisch is en de tekening ceremonieel.
4. **De hard limit is het slechtst leesbare label** (KS-UX-002), 4,04:1 waar 4,5
   vereist is.
5. **Consentnuance valt buiten beeld op 320px** (KS-UX-003), 32 van 344 essences.

# C. Bevestigde UX/accessibility blockers

**Geen bevestigde blockers.** KS-UX-001 komt het dichtst in de buurt en is
argumenteerbaar blocker voor de veiligheidsnotities die onomkeerbaar of
levensbedreigend letsel beschrijven. Ik markeer hem bewust niet als blocker: de
informatie is aanwezig, gelabeld en één tap weg, niet afwezig. Of dat genoeg is
voor wurgen en snijden is een menselijke beslissing, geen auditorsoordeel. Leg die
vraag expliciet neer voor de launch.

Alles in sectie B is must fix.

# D. Handmatige real-device en screenreadertests die nog nodig zijn

1. **VoiceOver op iOS en TalkBack op Android** door questionnaire, keuzesheets,
   onboarding, de destroy-sheet en het ondertekenpad. KS-UX-004, 006, 008 en 010
   zijn alleen zo definitief te bevestigen.
2. **200% zoom en grote systeemtekst** in de questionnaire. Bepaalt de werkelijke
   ernst van KS-UX-005.
3. **320px fysiek**, niet als emulatie, voor de essence-afkapping.
4. **Het hard-limit label bij fel daglicht** en op een gedimd scherm, naast de vijf
   andere statussen.
5. **Eénhandig gebruik** van de vraagkaart op een groot toestel: zijn de vijf
   antwoordrijen én de utilities rechtsboven met één duim te bereiken?
6. **Geïnstalleerde PWA versus browser**, omdat de bottom nav alleen bestaat onder
   `display-mode: standalone`. Controleer of de browservariant dezelfde
   bestemmingen even bereikbaar houdt.
7. **Reduced motion aan** door de hele deck- en sheetflow. De motion-contracten
   zien er correct uit in code, maar of de standaardervaring zonder reduced motion
   comfortabel blijft bij honderd herhalingen is een gevoelsoordeel.
8. **Sheets bij geopend toetsenbord** op iOS, waar `--visual-viewport-height` het
   werk moet doen.
9. **Een gesimuleerde volle opslag** op een echt toestel, om KS-UX-009 in de
   praktijk te zien.

---

## Wat gecontroleerd is en géén bevinding opleverde

Genoteerd zodat een volgende audit dit niet opnieuw hoeft te doen.

- **Touch targets.** De `h-10 w-10` knoppen in `TopNav` zijn 40×40px en halen WCAG
  2.2 AA 2.5.8 ruim (minimum 24px). De 44px-vuistregel is AAA (2.5.5), geen
  AA-eis. Geen bevinding.
- **Toast-semantiek.** `role="status"` staat er. Alleen de timing is een probleem,
  zie KS-UX-009.
- **Loading state.** `PageShell` gebruikt `role="status" aria-label="Laden"`.
- **Navigatie.** `BottomNav` zet `aria-current="page"`; `main` krijgt
  `padding-bottom: var(--bottom-nav-h)` onder `display-mode: standalone`, dus de
  nav dekt de laatste content niet af.
- **Motion.** `lib/motion.ts` collapst elke transitie naar `duration: 0` bij
  reduced motion en schakelt press-scaling uit; componenten dragen daarnaast
  `motion-reduce:` klassen. Het contract staat in een comment en wordt door
  `lib/motion-contract.test.ts` bewaakt.
- **Printstijl.** Contrast op wit is 9,74:1 en 18,88:1.
- **Thema.** Dark-only by design, geen tweede palet om na te rekenen.
- **`forced-colors`** (Windows High Contrast) wordt nergens afgehandeld. Voor een
  mobile-first PWA marginaal; genoteerd als informatief, niet als bevinding.
