# UI/UX-, consent- en accessibility deep dive (2026-08-17)

Volledige read-only doorlichting van de release candidate op
`claude/release-candidate-audits-2yi1nt` (`c6a9d8d`). Geen codewijzigingen, geen
commits, geen configuratie aangeraakt.

Dit is het enige UX-, consent- en accessibility-document voor deze release
candidate. Een eerdere, ondiepere pass is erin opgegaan en daarna verwijderd; de
bevindingen daaruit staan hier gededupliceerd, en de bevindingen uit de diepere
pass zijn als *(nieuw in deze ronde)* gemarkeerd. De securitykant leeft apart in
`docs/release-candidate-audit-2026-08-17.md` en overlapt hier nergens mee.

`UI-principles.md` is bindend, met de conflictvolgorde: consent en veiligheid en
privacy (1) → begrijpelijkheid en leesbaarheid (2) → stabiele interactiegeometrie
(3) → hiërarchie en rust (4) → expressiviteit en decoratie (5) → dichtheid en
snelheid (6).

**Methode.** Elke bevinding komt uit code, uit contrast berekend op de echte
tokens, of uit meting over de echte catalogus van 344 kinks. Niets komt uit een
screenshot of uit smaak. Waar een bevinding pas op hardware definitief te
bevestigen is, staat dat expliciet per bevinding.

**Themacontext.** KinkSync is dark-only. Er is geen `prefers-color-scheme` en geen
tweede palet; het blok dat op een licht thema lijkt is `@media print` voor de
contract-PDF (contrast daar 9,74:1 en 18,88:1 op wit). Alle contrastcijfers
hieronder gelden voor de midnight-default.

---

## KS-UX-001 — veiligheidsnotities staan achter een tap

**ID:** KS-UX-001
**Severity:** High
**Flow en exacte locatie:** Questionnaire, per vraag. `components/TriageDeck.tsx:166` (`data-testid="safety-disclosure"`); bron `lib/kinks.ts`, 96 kinks met `safetyNote`
**Observeerbaar bewijs:** De notitie zit uitsluitend in een bottom sheet. Op de kaart staat één knop van 48px met schildicoon en het woord "Veiligheid", meer niet. Wat achter die knop zit:

> "Er bestaat geen betrouwbare veilige manier om zuurstof of bloedtoevoer via de hals te beperken."

> "Dit is onomkeerbaar en brengt risico op infectie, zenuwschade en bloedoverdracht mee."

> "Een slapend persoon kan niet in het moment bijsturen. Behandel twijfel als geen toestemming."

De vijf antwoordknoppen staan direct onder die dichte knop, in dezelfde grid. Er is geen gate, geen markering van zwaarte, en geen onderscheid tussen een notitie over etiquette en een notitie over onomkeerbaar letsel.
**Geschonden UI-principe:** #8, letterlijk: *"Essentiële context die nodig is om een bewuste keuze te maken, wordt niet verborgen achter een disclosure. Een concise essence moet op zichzelf voldoende zijn voor een eerste, veilige en betekenisvolle keuze."*
**Gebruikersconsequentie:** Iemand kan "Ja" antwoorden op wurgen zonder ooit te lezen dat er geen veilige methode bestaat. Dat antwoord reist door naar compare, scene planning en een cryptografisch ondertekend contract, waar het als geïnformeerde instemming leest en als zodanig bewaard blijft.
**Conflictprioriteit:** De notitie zit achter een tap om de vaste zeven-rijen grid heel te houden. Stabiele geometrie (3) wint hier van veiligheid (1). Precies de ruil die de doctrine verbiedt.
**Kleinste veilige verbetering:** Splits `safetyNote` in één inline zin plus de volledige tekst. De detail-slot rij is al 48px en staat er al; toon daar bij een safetyNote die ene zin in plaats van alleen het woord "Veiligheid". Geen nieuwe rij, geen verschuiving, geen alarmkleur.
**Acceptatiecriteria:** Voor elke kink met `safetyNote` is minstens één zin veiligheidscontext zichtbaar zonder interactie, op 320px en 375px, boven de antwoordknoppen. De grid-rijhoogtes blijven ongewijzigd. E2e-test op drie hoog-risico kinks.
**Vereist echte-device of screen-reader verificatie:** nee voor het bestaan, ja voor de leesbaarheid van de inline zin op 320px
**Launch-impact:** must fix. Voor notities over onomkeerbaar of levensbedreigend letsel argumenteerbaar blocker.

---

## KS-UX-002 — de hard limit is het slechtst leesbare label van de zes

**ID:** KS-UX-002
**Severity:** High
**Flow en exacte locatie:** Questionnaire, antwoordkeuze. `components/StatusOptionRows.tsx:26-31`; tokens `app/globals.css:32-37`
**Observeerbaar bewijs:** Berekend op de echte tokens. Actief label, 14px semibold, op de eigen gemengde achtergrond:

| Status | Contrast | AA 4.5:1 |
|---|---|---|
| curious | 6,51:1 | ✓ |
| maybe | 5,98:1 | ✓ |
| willing | 5,32:1 | ✓ |
| yes | 4,92:1 | ✓ |
| no | 4,58:1 | ✓ |
| **hard_no** | **4,04:1** | **zakt** |

De oorzaak staat expliciet in de code: `danger` krijgt 17% kleurmenging waar de rest 19% krijgt, en `#ef4444` heeft van de zes de laagste luminantie. Dit is de enige contrastfout in de hele app: `--hard-no` als tekst haalt elders wel 4,84:1 (op surface2) en 4,92:1 (SafewordRibbon), en de focusring haalt 4,72–5,15:1.
**Geschonden UI-principe:** #10 (*"Grenzen moeten onmiddellijk herkenbaar zijn"*) tegenover prioriteit 2. WCAG 2.2 AA 1.4.3.
**Gebruikersconsequentie:** De status die het zwaarst weegt is het moeilijkst te lezen, juist bij fel omgevingslicht, een gedimd scherm of verminderd contrastzicht. Iemand die zijn hard limits terugleest krijgt de slechtste bevestiging van allemaal.
**Conflictprioriteit:** De ingetogen behandeling komt uit principe 10, dat op prioriteit 5 staat. Leesbaarheid staat op 2. Een lager principe verzwakt hier een hoger.
**Kleinste veilige verbetering:** Til de menging voor `danger` naar hetzelfde niveau als de rest (19%), of licht `--hard-no` één tint op. De dashed border blijft, de glow blijft laag, de alarmkleur komt niet terug.
**Acceptatiecriteria:** Alle zes actieve labels halen minstens 4,5:1. Een unit-test berekent de ratio's uit de tokens zodat een latere kleurtweak dit niet stil terugdraait.
**Vereist echte-device of screen-reader verificatie:** nee
**Launch-impact:** must fix.

---

## KS-UX-003 — de PIN- en back-upvelden hebben geen zichtbare focus *(nieuw in deze ronde)*

**ID:** KS-UX-003
**Severity:** High
**Flow en exacte locatie:** App-lock instellen en versleutelde back-up. `components/sheets/PinFlowSheet.tsx:96,105`; `components/sheets/EncryptedBackupSheets.tsx:160,178,343`
**Observeerbaar bewijs:** Vijf tekstvelden dragen `outline-none` zonder enige vervangende focusstijl. Ze hebben geen `focus-ring` klasse en geen `focus:ring`:

```
className="w-full rounded-xl px-4 py-3 text-sm outline-none tracking-widest text-center"   // PIN, 2×
className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none"                          // back-upwachtwoord, 3×
```

Ter vergelijking: elders in de app staat `outline-none` twintig keer sámen met `focus-ring`, en `app/contract/page.tsx:354` gebruikt netjes `focus:outline-none focus:ring-2`. Deze vijf zijn de uitzondering, en het zijn precies de vijf velden in de security-flows.
**Geschonden UI-principe:** #14 (bereikbare controls). WCAG 2.2 AA 2.4.7 Focus Visible, een directe faal.
**Gebruikersconsequentie:** Wie met een toetsenbord of schakelbediening door de PIN-sheet of de back-upsheet tabt, ziet niet waar hij is. Bij twee visueel identieke velden ("Kies een PIN" en "Herhaal PIN", beide gemaskeerd en gecentreerd) is er geen enkele aanwijzing in welk veld getypt wordt. Een verkeerd ingevoerde herhaling leidt tot een foutmelding die zelf ook niet wordt aangekondigd (zie KS-UX-004).
**Conflictprioriteit:** Prioriteit 2. Het gaat om een security-handeling, dus een fout hier kost de gebruiker toegang tot zijn eigen data.
**Kleinste veilige verbetering:** Voeg de bestaande `focus-ring` klasse toe aan deze vijf velden. Die klasse bestaat al, is elders al twintig keer toegepast, en haalt 4,72–5,15:1 tegen alle achtergronden.
**Acceptatiecriteria:** Alle vijf velden tonen een zichtbare focusindicator bij toetsenbordnavigatie. Een lint-regel of grep in CI die `outline-none` zonder focusvervanging afvangt.
**Vereist echte-device of screen-reader verificatie:** nee, met een toetsenbord in een desktopbrowser te bevestigen
**Launch-impact:** must fix.

---

## KS-UX-004 — gevoelige invoervelden hebben geen naam, en één foutmelding zwijgt *(uitgebreid deze ronde)*

**ID:** KS-UX-004
**Severity:** High
**Flow en exacte locatie:** `components/sheets/PinFlowSheet.tsx:93-108`; `components/sheets/EncryptedBackupSheets.tsx:155-190,337-350`; `components/sheets/DestroyAllSheet.tsx` (bevestigingsveld)
**Observeerbaar bewijs:** Zes invoervelden hebben geen `<label>`, geen `aria-label` en geen `aria-describedby`. Ze leunen volledig op `placeholder`: "Minimaal 4 cijfers", "Herhaal PIN", "Wachtwoord (min. 8 tekens)", "Herhaal wachtwoord", "wis alles". Een placeholder is geen toegankelijke naam, en verdwijnt zodra er iets staat.

Daarbovenop: de PIN-foutmelding is een kale paragraaf zonder live region:

```
{pinError && <p className="text-xs text-center" style={{ color: "var(--hard-no)" }}>{pinError}</p>}
```

terwijl het wachtwoordveld ernaast het wél goed doet (`EncryptedBackupSheets.tsx:188`, `role="alert"`).
**Geschonden UI-principe:** #11 (begrijpelijke gevolgen van acties) en #12. WCAG 2.2 AA 3.3.2 Labels or Instructions, 4.1.2 Name Role Value, en 3.3.1 Error Identification voor de zwijgende PIN-fout.
**Gebruikersconsequentie:** Een screenreadergebruiker die de PIN-sheet opent hoort twee naamloze gemaskeerde velden. Typt hij de herhaling verkeerd, dan verschijnt er een rode regel die niet wordt uitgesproken; hij hoort alleen dat er niets gebeurt bij "PIN opslaan". Bij de back-upsheet gaat het om een wachtwoord dat KinkSync niet kan herstellen, dus een onhoorbare fout kan een onleesbare back-up opleveren. Bij `DestroyAllSheet` gaat het om de enige onomkeerbare handeling in de app.
**Conflictprioriteit:** Prioriteit 1 voor het destroy-veld en het back-upwachtwoord (dataverlies), prioriteit 2 voor de rest.
**Kleinste veilige verbetering:** `aria-label` op elk van de zes velden, `aria-describedby` van het destroy-veld naar de bestaande instructiezin, en `role="alert"` op `pinError` naar het model van `pwError`. Nul visuele verandering.
**Acceptatiecriteria:** Elk gevoelig invoerveld heeft een toegankelijke naam. Elke validatiefout in deze sheets wordt aangekondigd. De placeholders blijven zoals ze zijn.
**Vereist echte-device of screen-reader verificatie:** ja voor de definitieve bevestiging, nee voor het vaststellen van het ontbreken
**Launch-impact:** must fix.

---

## KS-UX-005 — een contract tekenen kan alleen met vrije hand

**ID:** KS-UX-005
**Severity:** High
**Flow en exacte locatie:** Contract ondertekenen. `components/contract/SignaturePad.tsx:60-96`; sheet in `components/contract/ContractSigningSheet.tsx`
**Observeerbaar bewijs:** De handtekening is een kale `<canvas>` met alleen een `aria-label`. Geen `tabindex`, geen `role`, geen toetsenbordpad. Een grep over `components/contract/` en `lib/contract*.ts` naar een getypt of aangevinkt alternatief levert niets op. Het canvas staat niet in de tabvolgorde en reageert alleen op pointerbewegingen.
**Geschonden UI-principe:** #14 (bereikbare controls) en prioriteit 1, want dit is de handeling die instemming bezegelt. WCAG 2.1.1 en 2.5.7.
**Gebruikersconsequentie:** Wie alleen met een toetsenbord werkt, of geen precieze vrije-handbeweging kan maken, kan een contract niet ondertekenen. Er is geen omweg, geen foutmelding en geen uitleg; het veld reageert simpelweg niet. De terminale handeling van het hele product is voor die gebruiker onbereikbaar.
**Conflictprioriteit:** Prioriteit 1. En het pijnlijke detail: de juridisch en cryptografisch dragende handeling is de ECDSA-handtekening uit `lib/contractProtocol.ts`, niet de tekening. De tekening is ceremonieel. Een gebruiker wordt dus buitengesloten van een consenthandeling door een decoratieve laag, niet door iets wat de handeling nodig heeft.
**Kleinste veilige verbetering:** Zet naast het tekenveld een tweede weg: naam typen plus een expliciete bevestigingsknop, die dezelfde `signContractPayload` aanroept. Cryptografisch identiek, want de sleutel tekent, niet de vinger.
**Acceptatiecriteria:** Een contract is volledig te ondertekenen met alleen een toetsenbord. De resulterende `ContractSignatureProof` is niet te onderscheiden van een getekende. E2e-test die het hele ondertekenpad zonder pointer doorloopt.
**Vereist echte-device of screen-reader verificatie:** nee
**Launch-impact:** must fix.

---

## KS-UX-006 — de volle-opslagwaarschuwing verdwijnt na zes seconden en komt nooit terug

**ID:** KS-UX-006
**Severity:** High
**Flow en exacte locatie:** Elke schrijfactie bij volle opslag. `components/StorageFullNotice.tsx:20-45`; `components/Toast.tsx:22,66`
**Observeerbaar bewijs:** De melding gaat via de toast, die correct `role="status"` draagt. Maar:

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

De boodschap luidt "De opslag zit vol. Je laatste wijziging is niet bewaard", met een actieknop "Maak een back-up". Hij verschijnt één keer per sessie, verdwijnt na zes seconden, en komt daarna niet meer terug.
**Geschonden UI-principe:** #11 (begrijpelijke gevolgen van acties) en #12 (*"Quiet is good. Invisible is not."*). WCAG 2.2 AA 2.2.1 Timing Adjustable.
**Gebruikersconsequentie:** Wie die zes seconden mist, blijft de rest van de sessie antwoorden geven aan een opslag die niets meer bewaart, zonder enige verdere aanwijzing. Bij de volgende start is dat werk weg. Voor een screenreadergebruiker is de kans het grootst dat het misgaat: `role="status"` is polite en onderbreekt niet, dus de melding kan achter lopende spraak in de wachtrij staan terwijl de timer doortikt. De actieknop verdwijnt mee, dus ook het herstelpad.
**Conflictprioriteit:** Prioriteit 1. Dit is stil dataverlies, en `lib/persistStorage.ts` is er expliciet voor gebouwd om precies dat te voorkomen. De wrapper vangt de `QuotaExceededError` netjes op en roept één keer; wat daarna gebeurt maakt die vangst ongedaan.
**Kleinste veilige verbetering:** Geef deze ene toast een persistente variant die niet automatisch sluit. `announced.current` mag blijven zoals hij is, zolang de melding zichtbaar blijft tot iemand hem wegklikt of de back-upactie kiest.
**Acceptatiecriteria:** Bij een `QuotaExceededError` blijft de melding staan tot een expliciete handeling. Een test met een gesimuleerde volle kluis bevestigt dat de melding na zestig seconden nog zichtbaar is.
**Vereist echte-device of screen-reader verificatie:** nee voor de timing, ja om te zien of het op een vol toestel echt werkt
**Launch-impact:** must fix.

---

## KS-UX-007 — sheets zijn onder aan de layout viewport verankerd, het iOS-toetsenbord niet *(nieuw in deze ronde)*

**ID:** KS-UX-007
**Severity:** High
**Flow en exacte locatie:** Elke sheet met tekstinvoer. `components/ui/Sheet.tsx:56` (`className="fixed bottom-0 left-0 right-0"`), `components/VisualViewportBridge.tsx:14-19`. Betrokken sheets: `ProfileEditSheet`, `PinFlowSheet`, `EncryptedBackupSheets`, `DestroyAllSheet`, `SettingsSheet`, `AftercareSheet`, `ProfileCreateSheet`, `ConsentLedgerPanel`
**Observeerbaar bewijs:** De sheet is `position: fixed` met `bottom: 0`. De hoogte wordt netjes begrensd met `--visual-viewport-height`, maar de bridge synchroniseert uitsluitend de hoogte:

```
const nextHeight = Math.round(viewport?.height ?? window.innerHeight);
root.style.setProperty(VISUAL_VIEWPORT_HEIGHT, `${nextHeight}px`);
```

`visualViewport.offsetTop` wordt nergens gelezen; een grep op `offsetTop` in de hele codebase levert nul treffers. Op iOS Safari positioneert `position: fixed` ten opzichte van de layout viewport, die bij een geopend toetsenbord niet krimpt. De sheet wordt dus wel korter, maar blijft verankerd aan de onderkant van de layout viewport, achter het toetsenbord.

Verzwarend: `PinFlowSheet:99` en `EncryptedBackupSheets:162` dragen `autoFocus`, dus het toetsenbord komt onmiddellijk op bij het openen van precies die sheets.
**Geschonden UI-principe:** #14, letterlijk: *"overlays en sheets die op kleine viewports werkelijk passen"* en *"iOS Safari én installed PWA"*. WCAG 2.2 AA 2.4.11 Focus Not Obscured.
**Gebruikersconsequentie:** Op iPhone valt de onderkant van de sheet, waar "PIN opslaan", "Exporteer" en "Vernietig voor altijd" staan, achter het toetsenbord. De gebruiker typt zijn PIN of back-upwachtwoord en kan de bevestigingsknop niet zien of bereiken zonder eerst het toetsenbord te sluiten, wat op een sheet met `autoFocus` niet vanzelfsprekend is.
**Conflictprioriteit:** Prioriteit 2 en 3. Op de destroy-sheet en de back-upsheet raakt het prioriteit 1, want daar hangt dataverlies aan.
**Kleinste veilige verbetering:** Laat `VisualViewportBridge` ook `offsetTop` publiceren en gebruik dat als `bottom`-offset op de sheet, of anker de sheet met `transform: translateY(-offsetTop)`. Eén extra CSS-variabele, geen layoutwijziging wanneer er geen toetsenbord is.
**Acceptatiecriteria:** Op iOS Safari en in de geïnstalleerde PWA blijft de primaire knop van elke sheet met tekstinvoer zichtbaar en tikbaar terwijl het toetsenbord open is, op iPhone SE-formaat en groter.
**Vereist echte-device of screen-reader verificatie:** **ja, verplicht.** De code voorspelt dit gedrag maar alleen een echt iOS-toestel bewijst het.
**Launch-impact:** must fix, na bevestiging op hardware.

---

## KS-UX-008 — consentnuance valt buiten beeld op kleine schermen

**ID:** KS-UX-008
**Severity:** Medium
**Flow en exacte locatie:** Questionnaire, vraagpresentatie. `components/TriageDeck.tsx:156` (`h-12 ... text-xs leading-4`); afleiding in `lib/questionnairePresentation.ts:127`
**Observeerbaar bewijs:** De essence krijgt een vaste hoogte van 48px bij een regelhoogte van 16px, dus precies drie regels. De tekst wordt afgeleid als "de eerste zin van de description", ongeacht lengte. Gemeten over alle 344 kinks met een description: op 375px hebben **8 essences** meer dan drie regels nodig, op 320px **32**. De langste is 207 tekens. Het is systematisch de staart die wegvalt, en daar zit juist de afbakening:

> "...zonder te veronderstellen dat je ze zelf wil dragen"
> "...zonder een vaste dominante rol"
> "...zonder automatisch little headspace of een caregiver-dynamiek"

**Geschonden UI-principe:** #8 en #14.
**Gebruikersconsequentie:** Op een kleine telefoon leest iemand het voorstel zonder de clausule die de reikwijdte begrenst. Het antwoord gaat dan over een ander voorstel dan bedoeld, en dat antwoord reist mee naar compare en contract.
**Conflictprioriteit:** De vaste hoogte dient prioriteit 3. Wat verdwijnt is prioriteit 2, en waar de clausule instemming afbakent prioriteit 1.
**Kleinste veilige verbetering:** Kort de acht respectievelijk tweeëndertig te lange essences in de catalogus in en verplaats de nuance naar `details`. Nul layoutverandering, nul risico.
**Acceptatiecriteria:** Geen enkele essence overschrijdt drie regels op 320px. Een unit-test over de catalogus bewaakt de lengte zodat een nieuwe kink dit niet opnieuw introduceert.
**Vereist echte-device of screen-reader verificatie:** ja, om de werkelijke regelafbreking op 320px te bevestigen
**Launch-impact:** must fix voor de 320px-klasse, acceptabel op 375px en breder.

---

## KS-UX-009 — de questionnaire heeft geen paginakop *(nieuw in deze ronde)*

**ID:** KS-UX-009
**Severity:** Medium
**Flow en exacte locatie:** Questionnaire. `components/profile/QuestionsScreen.tsx` (nul `<h1>`), vraagtitel als `<h3>` in `components/TriageDeck.tsx:155`
**Observeerbaar bewijs:** Alle andere routes hebben precies één `<h1>`: `/`, `/compare`, `/contract`, `/contracts`, `/scenes`, `/timeline`, `/quarantine`, `/about`, plus `ProfileScreen` en `SceneDetailScreen`. `QuestionsScreen` heeft er nul. Het eerste kopniveau op die pagina is de `<h3>` met de kinknaam. Alleen de foutstaten van die pagina hebben wél een `<h1>`, via `EmptyState`.
**Geschonden UI-principe:** #4 (*"Elke pagina moet onmiddellijk duidelijk maken: wat ben ik hier aan het doen?"*). WCAG 2.2 A 1.3.1 Info and Relationships.
**Gebruikersconsequentie:** Een screenreadergebruiker die op kop navigeert, landt midden in de langste flow van de app op een niveau-3 kop met een kinknaam, zonder paginacontext en zonder te horen voor welk profiel hij antwoordt. Antwoorden namens het verkeerde profiel is een consentprobleem, geen navigatieprobleem.
**Conflictprioriteit:** Prioriteit 2, met een uitloper naar 1 vanwege de profielverwarring.
**Kleinste veilige verbetering:** Een visueel verborgen `<h1>` op `QuestionsScreen` die de profielnaam en de modus noemt, en de vraagtitel naar `<h2>`. De navtitel toont die informatie al visueel (`Vragenlijst · Dynamic`), dus er verandert niets aan het beeld.
**Acceptatiecriteria:** `QuestionsScreen` heeft precies één `<h1>` die het profiel noemt, en de kopniveaus lopen zonder sprong. Een e2e-test controleert de koppenstructuur.
**Vereist echte-device of screen-reader verificatie:** ja voor de beleving, nee voor de structuur
**Launch-impact:** must fix.

---

## KS-UX-010 — selectie in een keuzesheet bestaat alleen in kleur

**ID:** KS-UX-010
**Severity:** Medium
**Flow en exacte locatie:** Alle keuzesheets. `components/ui/Sheet.tsx:126-174` (`SheetOptionItem`)
**Observeerbaar bewijs:** De actieve optie wordt uitsluitend visueel gemarkeerd: accentkleur op het label, accent-achtergrond op het icoon, en een bolletje van 2,5px. Geen `aria-pressed`, geen `aria-selected`, geen `role="radio"`, geen tekstueel alternatief. De knop is een kale `<button>` met alleen zijn label als toegankelijke naam.
**Geschonden UI-principe:** #2 (*"kleur betekent niet automatisch nadruk"*). WCAG 2.2 A 1.4.1 Use of Color en 4.1.2 Name Role Value.
**Gebruikersconsequentie:** Een VoiceOver- of TalkBack-gebruiker hoort een lijst identieke knoppen en kan niet horen welke al gekozen is. Bij rolkeuze, perspectiefkeuze en profielselectie betekent dat opnieuw kiezen zonder te weten wat er stond.
**Conflictprioriteit:** Betekenis die alleen in kleur zit is expressiviteit (5) die begrijpelijkheid (2) vervangt. In sheets die een profiel kiezen raakt het prioriteit 1, want de gebruiker weet dan niet namens wie hij antwoordt.
**Kleinste veilige verbetering:** `aria-pressed={active}` op de knop in `SheetOptionItem`. Eén attribuut, nul visuele verandering, dekt alle consumenten in één keer.
**Acceptatiecriteria:** Elke `SheetOptionItem` exposeert zijn selectiestatus. E2e-test op minstens één keuzesheet. Visueel identiek aan nu.
**Vereist echte-device of screen-reader verificatie:** ja voor bevestiging, nee voor het ontbreken
**Launch-impact:** must fix.

---

## KS-UX-011 — de vastgezette viewport tegenover vergroting

**ID:** KS-UX-011
**Severity:** Medium
**Flow en exacte locatie:** Questionnaire. `components/profile/QuestionsScreen.tsx:72-108`
**Observeerbaar bewijs:** Bij mount wordt de hele pagina vastgezet: `overflow: hidden` en `height: 100%` op root én body, plus `body.position = "fixed"` met `inset: 0`. De kaart eronder heeft een vaste grid van zeven rijen waarvan alleen de antwoordrij al `minmax(14.75rem, 1fr)` claimt. De kaart zelf heeft `overflow-y-auto`, de pagina niet.
**Geschonden UI-principe:** #14 en #6. WCAG 2.2 AA 1.4.4 Resize Text en 1.4.10 Reflow.
**Gebruikersconsequentie:** Wie zoom of tekstgrootte op 200% zet, houdt een viewport over waarin de zeven vaste rijen niet passen, terwijl de pagina zelf niet kan scrollen. Of de onderste rijen, inclusief progressie en de "Later"-knop, bereikbaar blijven hangt volledig af van de interne scroll van de kaart.
**Conflictprioriteit:** De lock dient prioriteit 3. Wat op het spel staat is of iemand met beperkt zicht de antwoordknoppen bereikt, prioriteit 2.
**Kleinste veilige verbetering:** Laat de lock los onder een viewport- of zoomdrempel zodat de pagina bij grote tekst weer normaal scrollt. Het standaardgedrag verandert niet.
**Acceptatiecriteria:** Bij 200% zoom op 375px zijn de vijf antwoordknoppen, de progressie en de "Later"-knop bereikbaar zonder horizontaal scrollen.
**Vereist echte-device of screen-reader verificatie:** **ja, verplicht.** De ernst is niet uit code af te leiden.
**Launch-impact:** must fix na bevestiging op hardware.

---

## KS-UX-012 — "Volledig offline" belooft meer dan de architectuur waarmaakt *(nieuw in deze ronde)*

**ID:** KS-UX-012
**Severity:** Medium
**Flow en exacte locatie:** Onboarding, privacystap. `components/onboarding/Onboarding.tsx:441`
**Observeerbaar bewijs:** De privacystap zegt:

> "Al jouw data blijft standaard op jouw toestel. **Volledig offline. Privacy voorop.**"

`/about` is aantoonbaar zorgvuldiger over hetzelfde onderwerp (`app/about/page.tsx:370`):

> "De hosting serveert wel de appcode en updates, maar bewaart geen KinkSync-profielaccount."

Technisch is de app inderdaad vrij van uitgaande requests, dat is in fase 2 geverifieerd: nul `fetch()` naar een externe host, fonts self-hosted, geen analytics. Maar de app-origin serveert wel code en updates, en die requests staan in de logs van de hosting. "Volledig offline" dekt dat niet.
**Geschonden UI-principe:** #11, letterlijk: privacy moet merkbaar zijn in hoe features werken, met *"geen verborgen verzending"* en *"begrijpelijke gevolgen van acties"*.
**Gebruikersconsequentie:** De gebruiker ontmoet "Volledig offline" op zijn eerste sessie en zal `/about` misschien nooit lezen. Wie die belofte letterlijk neemt, denkt dat er geen enkel netwerkverkeer bestaat, ook niet naar de app zelf. Dat is een verkeerd mentaal model op precies het onderwerp waarop dit product vertrouwen vraagt.
**Conflictprioriteit:** Prioriteit 1. Een privacybelofte die technisch niet helemaal klopt is ernstiger dan een ontbrekende belofte, want gebruikers nemen er beslissingen op.
**Kleinste veilige verbetering:** Vervang "Volledig offline" door een formulering die de werkelijkheid dekt en even sterk blijft, in de trant van "Werkt offline. Je antwoorden vertrekken niet." De inhoudelijke belofte blijft, de overclaim verdwijnt.
**Acceptatiecriteria:** Geen enkele onboardingclaim gaat verder dan wat `/about` en `SECURITY.md` waarmaken. Een reviewer vergelijkt beide teksten naast elkaar.
**Vereist echte-device of screen-reader verificatie:** nee
**Launch-impact:** must fix. Dit is copy, dus goedkoop, en het raakt de kernbelofte.

---

## KS-UX-013 — het bevestigingsveld van "Vernietig alle data" heeft geen label

**ID:** KS-UX-013
**Severity:** Medium
**Flow en exacte locatie:** Destructieve actie. `components/sheets/DestroyAllSheet.tsx`
**Observeerbaar bewijs:** Het veld waarin "wis alles" getypt moet worden heeft alleen een `placeholder`. Geen `<label>`, geen `aria-label`, geen `aria-describedby` naar de instructiezin erboven. De sheet zelf is wél netjes gelabeld, en het veld heeft wél `focus-ring`. Zie ook KS-UX-004; dit veld is de ernstigste instantie van dat patroon en staat daarom apart.
**Geschonden UI-principe:** #11 en #12. WCAG 2.2 AA 3.3.2 en 4.1.2.
**Gebruikersconsequentie:** Een screenreadergebruiker hoort een naamloos tekstveld in de enige onomkeerbare flow van de app. De placeholder verdwijnt bovendien zodra er iets staat, dus wie halverwege de instructie kwijtraakt kan die niet terughalen.
**Conflictprioriteit:** Prioriteit 1. Het frictie-ontwerp is bewust en goed: de doctrine zegt dat een privacygevoelige handeling extra frictie mag krijgen als die frictie vertrouwen schept. Maar frictie die je niet kunt horen is geen frictie, dat is een blokkade.
**Kleinste veilige verbetering:** `aria-label` op het veld plus `aria-describedby` naar de bestaande instructiezin. Nul visuele verandering.
**Acceptatiecriteria:** Het veld heeft een toegankelijke naam en een beschrijving die de vereiste zin noemt. De placeholder blijft.
**Vereist echte-device of screen-reader verificatie:** ja voor bevestiging
**Launch-impact:** must fix.

---

## KS-UX-014 — de knop die het wachtwoord toont is te klein *(nieuw in deze ronde)*

**ID:** KS-UX-014
**Severity:** Low
**Flow en exacte locatie:** Versleutelde back-up. `components/sheets/EncryptedBackupSheets.tsx:166,183,349`
**Observeerbaar bewijs:** `className="absolute right-3 top-1/2 -translate-y-1/2 focus-ring rounded-lg p-0.5"` rond een icoon van 16px. Dat is 2px padding aan elke kant, dus een tikdoel van ongeveer 20×20px. WCAG 2.2 AA 2.5.8 vraagt 24×24px, of voldoende tussenruimte. De knop staat absoluut gepositioneerd binnen het invoerveld, dus de ruimte-uitzondering gaat hier niet op. Ter vergelijking: de sluitknop in `SignaturePad.tsx:202` gebruikt `p-1` rond een icoon van 18px en haalt daarmee wél 26px.
**Geschonden UI-principe:** #14 (ruime hit areas). WCAG 2.2 AA 2.5.8 Target Size (Minimum).
**Gebruikersconsequentie:** Wie zijn back-upwachtwoord wil controleren voordat hij een onherstelbaar versleuteld bestand aanmaakt, moet een doel van 20px raken, naast een invoerveld dat bij een misser het toetsenbord opent. Precies de gebruiker met minder fijne motoriek loopt hier vast.
**Conflictprioriteit:** Prioriteit 2, met een uitloper naar 1: een wachtwoord dat niet gecontroleerd kan worden, kan een onleesbare back-up opleveren.
**Kleinste veilige verbetering:** `p-0.5` naar `p-2`, of een expliciete `min-h-11 min-w-11` op de knop. Het icoon blijft even groot; alleen het tikdoel groeit.
**Acceptatiecriteria:** Alle drie de toon/verberg-knoppen halen minstens 24×24px, bij voorkeur 44px.
**Vereist echte-device of screen-reader verificatie:** nee
**Launch-impact:** acceptabel risico voor launch, must fix kort daarna.

---

## KS-UX-015 — de stapwissel in de onboarding wordt niet aangekondigd

**ID:** KS-UX-015
**Severity:** Low
**Flow en exacte locatie:** Eerste bezoek. `components/onboarding/Onboarding.tsx:155-166`
**Observeerbaar bewijs:** De voortgang staat als tekst (`{step + 1} / {STEP_COUNT}`) en de balkjes zijn correct `aria-hidden`, dat deel is goed gedaan. Maar de stapinhoud wisselt binnen `AnimatePresence mode="wait"` met `key={step}` zonder live region en zonder focusverplaatsing. De dialog houdt een vaste `aria-label="Welkom bij KinkSync"` die niet meebeweegt.
**Geschonden UI-principe:** #13 en #4. WCAG 2.2 AA 4.1.3 Status Messages.
**Gebruikersconsequentie:** Een screenreadergebruiker drukt op "Verder" en hoort niets veranderen. Bij de 18+-stap en de privacystap is dat precies de inhoud die niet gemist mag worden.
**Conflictprioriteit:** Prioriteit 1, want de onboarding draagt de leeftijdsbevestiging en de privacybelofte. Een stap die ongehoord voorbijgaat heeft die context niet overgedragen.
**Kleinste veilige verbetering:** Verplaats focus naar de koptekst van de nieuwe stap, of zet de stapcontainer in `aria-live="polite"`. Geen visuele wijziging.
**Acceptatiecriteria:** Bij elke stapwissel wordt de nieuwe koptekst aangekondigd.
**Vereist echte-device of screen-reader verificatie:** ja
**Launch-impact:** acceptabel risico voor launch, must fix kort daarna.

---

## KS-UX-016 — de moduskeuze van de questionnaire zit in het overflowmenu

**ID:** KS-UX-016
**Severity:** Low
**Flow en exacte locatie:** Questionnaire. `components/profile/QuestionsScreen.tsx:57-62`
**Observeerbaar bewijs:** Dynamic, Discover en Deep Dive krijgen alle drie `placement: "overflow"`. Alleen "Uitleg antwoordkeuzes" staat als `primary` in beeld. De actieve modus is wel zichtbaar in de navtitel (`Vragenlijst · ${modeLabel}`).
**Geschonden UI-principe:** #12: *"Los visuele druk niet op door essentiële functionaliteit in overflowmenu's te verstoppen."*
**Gebruikersconsequentie:** De modus bepaalt welke vragen je krijgt en hoeveel. Wie merkt dat de lijst niet past bij wat hij zoekt, moet een overflowmenu vinden. De meeste gebruikers zullen dat niet ontdekken en de standaardmodus uitzitten.
**Conflictprioriteit:** Blijft binnen prioriteit 4 tegenover 6, en de actieve modus is zichtbaar. Genoteerd als spanning, niet als schending.
**Kleinste veilige verbetering:** Maak de navtitel `Vragenlijst · Dynamic` zelf tapbaar en laat die het modusmenu openen. Geen nieuwe chrome, wel een zichtbaar aangrijpingspunt.
**Acceptatiecriteria:** De moduswissel is bereikbaar vanaf een zichtbaar element.
**Vereist echte-device of screen-reader verificatie:** nee
**Launch-impact:** post-launch.

---

# A. Flow-by-flow vertrouwensbeoordeling

| Flow | Oordeel | Waarom |
|---|---|---|
| **Eerste bezoek en onboarding** | Sterk, met één overclaim | Warm, menselijk, zonder vaagheid. "Een match is nooit automatisch consent" staat er expliciet, en de PIN wordt eerlijk aangeprezen tegen "nieuwsgierige vingers" in plaats van tegen aanvallers, wat exact klopt met `SECURITY.md`. Alleen "Volledig offline" (KS-UX-012) gaat te ver, en stapwissels zwijgen voor screenreaders (KS-UX-015). |
| **Questionnaire en herhaalde keuzes** | Uitzonderlijk sterk in geometrie, zwak in veiligheidscontext | De vaste zeven-rijen grid is het beste stuk interactie-ontwerp in dit product. Niets springt, niets herschikt, controls blijven staan bij variabele copy. Maar de veiligheidsnotitie zit achter een tap (KS-UX-001), de nuance kapt af op 320px (KS-UX-008), er is geen paginakop (KS-UX-009) en het hard-limit label is het slechtst leesbaar (KS-UX-002). |
| **Consent, limits en agreements** | Sterk | Hard limits krijgen een eigen dashed treatment zonder alarmsfeer, precies zoals principe 10 vraagt. "Toestemming intrekken" is één directe knop zonder bevestigingsdialoog, en dat is juist goed: consent intrekken hoort geen frictie te hebben. De ledger legt wijziging en intrekking als nieuwe regel vast en zegt dat ook. `ProfileTrust` is eerlijk over wat een handtekening niet bewijst. |
| **Detail layers en informatiearchitectuur** | Gemengd | Sheets duwen de hoofdinterface niet open: ze zijn `fixed`, hebben een eigen scrollcontainer, `overscroll-contain` en een maxHeight op de visual viewport. Oriëntatie blijft heel. Maar twee keer zit essentiële context achter een tap waar dat niet mag (KS-UX-001, KS-UX-008), en de category explainer perkt zichzelf voorbeeldig in ("Ze vult niets voor je in"). |
| **Privacygevoelige acties** | Sterk in architectuur, zwak in toegankelijkheid | `privateResponse` houdt elke grens tot in de PDF-export, en `profileSnapshot` verzwijgt zelfs de privacy-transitie zelf. Maar de velden die die privacy bewaken (PIN, back-upwachtwoord, destroy-bevestiging) zijn naamloos (KS-UX-004, KS-UX-013), zonder zichtbare focus (KS-UX-003), met te kleine hulpknoppen (KS-UX-014). |
| **States en herstel** | Gemengd | Loading (`role="status"`), toast (`role="status"`), errorboundaries zonder stacktrace en zonder schuldtoewijzing ("Niet jouw schuld"), 404 en offline met een duidelijke volgende stap: allemaal goed. De uitzondering is ernstig: de volle-opslagmelding verdwijnt na zes seconden en komt nooit terug (KS-UX-006), en de PIN-fout wordt niet aangekondigd (KS-UX-004). |
| **Mobile gedrag** | Onbewezen op het punt dat het meest telt | Touch targets halen 2.5.8 ruim (`TopNav` 40px, deck-utilities 44px), safe areas zitten overal in de sheets, de bottom nav krijgt `padding-bottom` op `main`. Maar sheets met tekstinvoer zijn verankerd aan de layout viewport terwijl het iOS-toetsenbord dat niet is (KS-UX-007), en de questionnaire zet de pagina vast tegenover zoom (KS-UX-011). |
| **Accessibility breed** | Fundament staat, afwerking ontbreekt | Focus trap, escape, focusherstel, `aria-pressed` op alle statusknoppen, `aria-current` op nav, reduced-motion contract met eigen test: dat is meer dan de meeste apps hebben. Wat ontbreekt zit geconcentreerd in de security-sheets en in één paginakop. |

# B. Confirmed consent-, privacy- en accessibility blockers

**Geen bevestigde blockers.**

Eén kandidaat: **KS-UX-001**. Voor de deelverzameling veiligheidsnotities die onomkeerbaar of levensbedreigend letsel beschrijven (wurgen, snijden, naalden, permanente markering) is argumenteerbaar dat "Ja" kunnen antwoorden zonder de waarschuwing gezien te hebben een launch tegenhoudt. Ik markeer hem bewust niet als blocker: de informatie is aanwezig, gelabeld en één tap weg, niet afwezig. Of dat genoeg is, is een menselijke beslissing en geen auditorsoordeel. **Leg die vraag expliciet neer voor de launch in plaats van hem impliciet te laten.**

Alles onder A dat "must fix" heet, is must fix en geen blocker.

# C. Interactiegeometrie en verborgen essentiële context

**Interactiegeometrie: bijna vlekkeloos.** Dit is het sterkste deel van de app en verdient het om zo te blijven.

- De vraagkaart gebruikt `gridTemplateRows: "44px 56px 48px 48px minmax(14.75rem,1fr) 88px 44px"`. Elke rij is vast; variabele copy kan niets verschuiven.
- `StatusOptionRows` gebruikt `grid-rows-5` met `h-full`, dus de vijf antwoordknoppen houden dezelfde hoogte ongeacht labellengte, en de hint staat `whitespace-nowrap`.
- Skip, progressie, agreements en de utilities rechtsboven hebben elk hun eigen vaste rij of hoek.
- Validatie, detailcontent en progressie kunnen de motorische kaart niet herschikken, want ze wonen in sheets of in vaste rijen.

Twee uitzonderingen, allebei aan de randen: de essence kan bij 32 van de 344 kinks over zijn vaste 48px heen lopen op 320px (KS-UX-008), en de vaste geometrie zelf wordt een probleem zodra iemand inzoomt (KS-UX-011).

**Verborgen essentiële context: drie plekken.**

1. `safetyNote` achter een tap terwijl de antwoordknoppen er direct onder staan (KS-UX-001). Dit is de zwaarste.
2. De afbakenende clausule van een essence die op 320px buiten de drie regels valt (KS-UX-008).
3. De selectiestatus in keuzesheets, die alleen in kleur bestaat en dus voor een deel van de gebruikers helemaal niet zichtbaar is (KS-UX-010).

# D. Wat goed werkt en expliciet niet veranderd moet worden

1. **De vaste zeven-rijen grid van de vraagkaart.** Niet aanraken. Elke fix voor KS-UX-001 en KS-UX-008 moet binnen de bestaande rijhoogtes passen. Dit is principe 5 in zijn zuiverste vorm en het is zeldzaam goed uitgevoerd.
2. **`StatusOptionRows` als geheel.** `aria-pressed`, `role="group"`, status gedragen door glyph én label én kleur, dashed border voor hard limits in plaats van alarmrood, `motion-reduce` op elke transitie, en opnieuw tikken deselecteert. Alleen het contrastcijfer moet omhoog; het patroon niet.
3. **"Toestemming intrekken" zonder bevestigingsdialoog.** Dat lijkt een ontbrekende safeguard maar is een bewuste en juiste keuze: consent intrekken hoort geen drempel te hebben. Voeg hier geen "weet je het zeker" aan toe.
4. **De privacy-architectuur van `privateResponse`.** `comparableEntry` retourneert een lege vorm in plaats van een gemaskeerde waarde, en `profileSnapshot` verzwijgt de privacy-transitie zelf zodat een verandering niet verraadt wat er stond. Dat laatste is een subtiliteit die bijna niemand bedenkt.
5. **De focus trap.** `lib/useFocusTrap.ts` focust bewust de dialog zelf in plaats van de eerste knop, met een comment die uitlegt waarom: iOS Safari zou anders de sheet halverwege openscrollen. Focus wordt hersteld bij sluiten, Escape werkt. Iemand heeft hier op een echt toestel gekeken.
6. **De zelfinperkende explainers.** "Deze uitleg helpt termen herkennen. Ze vult niets voor je in en verandert geen antwoorden." En "Overlap is geen toestemming" staat inline op de compare-samenvatting met schildicoon, niet achter een disclosure.
7. **Errorcopy.** "Niet jouw schuld. Er ging hier iets onverwachts mis." Plus, in een local-first app precies de juiste geruststelling: "Je profielen, antwoorden en contracten staan nog op dit toestel." Geen stacktrace, geen alarm, geen schuld.
8. **Het reduced-motion contract.** `lib/motion.ts` collapst elke transitie naar `duration: 0` en schakelt press-scaling uit, componenten dragen daarnaast `motion-reduce:` klassen, en `lib/motion-contract.test.ts` bewaakt het.

# E. Geprioriteerde fixlijst

Vijftien punten, in de volgorde waarin ik ze zou aanpakken. De eerste vier zijn samen ongeveer een middag werk en zijn allemaal additief.

| # | ID | Wat | Inspanning |
|---|---|---|---|
| 1 | KS-UX-004 | `aria-label` op zes gevoelige invoervelden plus `role="alert"` op `pinError` | triviaal |
| 2 | KS-UX-003 | `focus-ring` op de vijf velden met kale `outline-none` | triviaal |
| 3 | KS-UX-010 | `aria-pressed` op `SheetOptionItem` | triviaal |
| 4 | KS-UX-002 | `danger`-menging naar 19% of `--hard-no` één tint op, plus tokentest | klein |
| 5 | KS-UX-012 | "Volledig offline" herformuleren naar wat de architectuur waarmaakt | klein |
| 6 | KS-UX-013 | `aria-label` en `aria-describedby` op het destroy-veld | triviaal |
| 7 | KS-UX-009 | Verborgen `<h1>` op `QuestionsScreen`, vraagtitel naar `<h2>` | klein |
| 8 | KS-UX-006 | Volle-opslagmelding persistent maken | klein |
| 9 | KS-UX-014 | Toon/verberg-knoppen naar minstens 24px | triviaal |
| 10 | KS-UX-008 | 32 te lange essences inkorten, nuance naar `details`, plus lengtetest | middel, redactioneel |
| 11 | KS-UX-001 | Inline veiligheidszin in de bestaande detail-slot rij | middel, vraagt ontwerpbeslissing |
| 12 | KS-UX-007 | `offsetTop` publiceren en sheets compenseren | middel, vraagt device-validatie |
| 13 | KS-UX-005 | Getypt handtekeningalternatief naast het tekenveld | middel, vraagt ontwerpbeslissing |
| 14 | KS-UX-011 | Scroll-lock loslaten onder een zoomdrempel | middel, vraagt device-validatie |
| 15 | KS-UX-015 | Focus of live region bij stapwissel in de onboarding | klein |

KS-UX-016 staat bewust niet in de lijst; die is post-launch.

---

## Wat gecontroleerd is en géén bevinding opleverde

Genoteerd zodat een volgende audit dit niet opnieuw hoeft te doen.

- **Contrast breed.** De enige fout is KS-UX-002. Ter controle nagerekend en goed bevonden: `--text` 15,79:1 en `--text2` 7,00:1 op surface; `--hard-no` als tekst 4,84:1 op surface2 en 5,04:1 op surface; de SafewordRibbon 4,92:1; `--accent` 4,72–4,92:1; `--yes` als statustekst 6,49:1; de printstijl 9,74:1 en 18,88:1 op wit.
- **Focusindicator-contrast.** `.focus-ring` gebruikt `box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent)` en haalt 4,72–5,15:1 tegen bg, surface en surface2, ruim boven de 3:1 van 1.4.11.
- **Touch targets.** `TopNav` gebruikt 40×40px en de deck-utilities 44×44px; beide halen 2.5.8 AA (minimum 24px) ruim. De 44px-vuistregel is AAA (2.5.5) en geen AA-eis. Enige uitzondering: KS-UX-014.
- **Koppenstructuur.** Alle acht routes plus `ProfileScreen` en `SceneDetailScreen` hebben precies één `<h1>`. Enige uitzondering: KS-UX-009.
- **Live regions.** Toast, `PageShell` loading, `ConsentLedgerPanel` (zowel `role="alert"` als `role="status"`) en de back-upfout dragen de juiste rollen. Enige uitzondering: `pinError`, zie KS-UX-004.
- **Navigatie.** `BottomNav` zet `aria-current="page"` en bestaat alleen onder `display-mode: standalone`; `main` krijgt daar `padding-bottom: var(--bottom-nav-h)`, dus de nav dekt de laatste content niet af.
- **Sheets duwen de interface niet open.** `position: fixed`, eigen scrollcontainer, `overscroll-contain`, maxHeight op `--visual-viewport-height` en `env(safe-area-inset-bottom)` in de padding. Principe 8 correct uitgevoerd; het enige probleem is de verankering bij een geopend toetsenbord (KS-UX-007).
- **Motion.** Contract in `lib/motion.ts`, bewaakt door `lib/motion-contract.test.ts`, plus `motion-reduce:` klassen op de herhaalde controls.
- **Thema.** Dark-only by design, geen tweede palet om na te rekenen.
- **`forced-colors`** (Windows High Contrast) wordt nergens afgehandeld. Voor een mobile-first PWA marginaal; genoteerd als informatief, niet als bevinding.
