# KinkSync prelaunch-audit — 2026-08-07

Status: **NO-GO voor publieke launch** totdat alle P0/P1 launch-blockers hieronder gesloten en opnieuw geverifieerd zijn.

> **Close-out 2026-08-08:** deze statusregel hoort bij de auditfreeze van 7 augustus. De actuele release-candidate status, gesloten findings en finale CI/devicebewijzen staan in **§14** onderaan dit document.

Doelplatform: **mobile first** — geïnstalleerde PWA en mobiele browser zijn primair; tablet en desktop zijn secundair.

Deze audit is de bron van waarheid voor de launch-hardening. Een finding wordt pas op `DONE` gezet nadat de kwetsbare of defecte route opnieuw is bewezen, de fix regressiedekking heeft, de relevante suite groen is en de GitHub-checks zijn bevestigd.

## 1. Scope en bewijs

De audit combineert:

- volledige repository-review van de actuele `dev`-bron, inclusief app-, component-, lib-, test-, config- en PWA-oppervlak;
- eerdere security-discovery over alle 294 geïnventariseerde review-items;
- mobiele en desktop Playwright-repetitie in GitHub Actions;
- offline/PWA-tests en statische route-inspectie;
- dependency-audit via `npm audit --omit=dev`;
- inspectie van routehiërarchie, modals/sheets, z-indexlagen, padding/spacing-primitieven en navigatie;
- review van backup/import, QR-overdracht, camera, lokale opslag, profielownership en contract/consent-protocol;
- verificatie van de open launch-hardening PR's.

Baseline op moment van opslaan: `dev` = `2e3b2d4c272d66cb223bc187275703f158c1cb64`.

### Open hardeningwerk bij auditfreeze

| PR | Onderwerp | Status in deze audit |
| --- | --- | --- |
| #284 | Next/dependency guardrails | Core groen; nog te landen en audit opnieuw draaien |
| #285 | E2E-repetitie herstellen | 206 groen / 2 Munch Punch op eigen branch |
| #286 | Munch Punch volledig verwijderen | Core groen; 2.225 regels weg; nog te landen |
| #273 | consent-hardening automation | Oudere parallelle branch; apart beoordelen vóór merge |
| #274 | profile-trust mobile polish | Oudere parallelle branch; apart beoordelen vóór merge |

## 2. Executive verdict

KinkSync heeft een verrassend sterke fundering voor een volledig client-side privacyproduct: local-first opslag, doelbewuste QR/import-overdracht, encrypted backups, profile ownership keys, signed consent-data, quarantine voor beschadigde gedeelde profielen, een echte offline strategie, mobiele touchtargets en een inmiddels bruikbare CI-kern.

Maar de kernbelofte van KinkSync is niet “mooie kinklijst”; het is **vertrouwen in gevoelige consentdata**. Daardoor zijn een paar bugs automatisch launch-blockers ook al crasht de UI niet. Op dit moment kunnen verborgen antwoorden alsnog in contractdata terechtkomen, kan een app-lock via een directe URL worden omzeild, en zijn enkele cryptografische trust boundaries te veel gebaseerd op data uit dezelfde onbetrouwbare envelope/backup die ze proberen te bewijzen.

**Launch readiness: ongeveer 6/10 qua product/engineering, maar formeel NO-GO.** De resterende P0/P1's zijn smal genoeg om gericht op te lossen; er is geen fundamentele rewrite nodig.

## 3. Wat al goed zit

### Product en UX

- De kernflow is logisch mobile-first: profiel → delen/ontvangen → vergelijken → contract → scène.
- `PageShell` geeft de meeste pagina's één horizontale mobiele basis (`px-4`) en expliciete breedtetiers.
- Touchdoelen zijn op kritieke controls meestal 44 px of groter.
- De huidige visuele hiërarchie gebruikt een consistente display/body-verdeling en statuskleuren hebben naast kleur ook tekst/iconografie.
- De homepage is inmiddels teruggebracht tot de kern in plaats van elke feature even zwaar te presenteren.
- Munch Punch wordt in #286 geschrapt: productfocus omhoog, aanvalsvlak omlaag, twee routes en een volledige tijdelijke crypto/store-stack minder.

### Data en privacy-architectuur

- Geen account/backend-datamodel; gevoelige profieldata leeft primair in lokale browseropslag.
- Gedeelde profielkopieën kunnen cryptografisch worden gecontroleerd en beschadigde imports hebben een quarantinepad.
- Eigen profielen hebben een P-256 ownership/consent-proef en imports worden gesanitized.
- v3/v4 profielshares hebben tegenwoordig expliciete encoded/inflated size-limieten; de eerdere brede verdenking “alle profiel-QR's zijn onbegrensd” is op de actuele code **niet** meer geldig.
- Backups zijn wachtwoordversleuteld en normale shared imports worden niet stil als eigen profiel behandeld.
- Contract QR heeft multipart-aantallen begrensd en checksums voor transportintegriteit.

### PWA en offline

- Service worker + offline warmup zijn echte productfeatures, geen alleen-maar-manifest PWA.
- Er bestaan vaste shells voor lokale profiel- en scèneroutes zodat nieuw lokaal materiaal ook na netwerkverlies kan openen.
- Update UI bestaat voor een wachtende service worker.
- Offline Playwright-dekking controleert cold/offline routes en lokaal aangemaakte records.

### Engineering en release

- De `safe-word check` workflow draait weer.
- `Lint, test and build` is de verplichte kerncheck voor `dev`.
- Actions zijn op commit-SHA gepind en checkout gebruikt `persist-credentials: false` met `contents: read` in de normale CI.
- De stale Playwright-suite is in #285 grotendeels terug in sync gebracht: van 17 unieke failures naar alleen de inmiddels productmatig geschrapte Munch Punch-flow.

## 4. Launch-blockers — eerst sluiten

### P0-01 — Private responses lekken naar contract, PDF en signed QR

**Status:** OPEN — bevestigd op actuele `dev`.

**Ernst:** P0 / privacy + consent integrity.

**Pad:** `app/contract/page.tsx` bouwt `detail` rechtstreeks uit `entry.status`, `comment` en `desire`. `lib/matching.ts` behandelt `privateResponse === true` terecht als niet-beschikbaar voor matching, maar de contractpagina gebruikt daarna ruwe `hasA`/`hasB` en kan diezelfde rij alsnog naar `discuss` sturen. Custom kinks zijn nog breder: daar is `hasA || hasB` genoeg.

Die `discuss`-data wordt niet alleen zichtbaar gerenderd; ze wordt opgenomen in `ContractVersionContent`, gebruikt voor PDF-output en vervolgens deel van de ondertekende contractoverdracht/QR.

**Security invariant:** `privateResponse` mag nooit de eigenaarcontext verlaten — niet direct, niet via inferentie in contractsecties, niet in PDF, niet in een getekende payload.

**Fixrichting:** één canonieke “shareable/contract-visible entry” boundary gebruiken vóór classificatie en vóór het bouwen van `KinkDetail`; regressietest met private status + comment + desire en een zichtbare controle-entry.

### P0-02 — Scene-suggesties kunnen private responses infereren

**Status:** OPEN — bevestigd.

**Ernst:** P0/P1 privacy.

`app/scene/page.tsx` leest voor `mutualKinks`, `spanningKinks` en `topKinks` rechtstreeks de opgeslagen status/gebruiksteller. Er is geen `privateResponse`-filter zoals in `lib/matching.ts`.

**Impact:** een verborgen antwoord kan door labels als “Wederzijds”, “Spanning” of “Meest gebruikt” alsnog worden afgeleid.

**Fixrichting:** dezelfde visibility helper als contract/compare gebruiken; private entries zijn voor cross-profile suggesties equivalent aan “niet beschikbaar”.

### P0-03 — App-lock beschermt alleen home-content, niet de data-routes

**Status:** OPEN — bevestigd.

**Ernst:** P0 privacy op gedeelde/gestolen telefoon.

`AppLock` wordt alleen door `app/page.tsx` gerenderd. `TopNav` verbergt zichzelf wanneer `app_unlocked` ontbreekt, maar pagina-inhoud onder bijvoorbeeld `/profile/<id>`, `/compare`, `/contract`, `/contracts`, `/scenes` en `/timeline` blijft via een directe URL bereikbaar.

**Security invariant:** als app-lock actief is, mag geen gevoelige route zijn children renderen vóór de sessie ontgrendeld is.

**Fixrichting:** lock-gate naar de gedeelde client-shell/layoutboundary tillen; onboarding en unlock zelf moeten expliciet bereikbaar blijven. Test minimaal home + directe profielroute + compare + contract + refresh in standalone/browser.

### P0-04 — Contract-request identiteit is self-anchored aan de ontvangen envelope

**Status:** OPEN — bevestigd; patch contract vereist voordat code wijzigt.

**Ernst:** P0/P1 trust spoofing.

`verifyContractRequest()` controleert een signature tegen de actor/key-data die in dezelfde ontvangen `series`/`proof` zit. Dat bewijst dat de afzender de meegestuurde private key bezit, maar niet dat die key hoort bij de persoon/profile identity die de ontvanger al lokaal kent. `ContractInboxSheet` zoekt vooral het lokale responderprofiel op; de UI meldt daarna dat profielidentiteit cryptografisch gecontroleerd is.

**Aanvalsmodel:** een aanvaller kan een request construeren dat de naam/profileId van een derde partij claimt maar een eigen sleutel meedraagt. Zonder lokaal trust-anchor voor die actor kan de ontvanger een cryptografisch geldige leugen zien.

**Fixrichting:** actor-key vastpinnen aan een reeds lokaal bekende shared profile/consent proof of een expliciete first-contact verification flow met menselijke vergelijking. Niet stil “trust on first envelope” als “identiteit bevestigd” presenteren.

### P1-05 — Een oud ContractSnapshot opent de scene-gate alsof actuele consent bestaat

**Status:** OPEN — bevestigd.

**Ernst:** P1 consent semantics.

`contractForPair()` in `app/scene/page.tsx` doet alleen een pair-ID match op de legacy `ContractSnapshot[]`. Status, geldigheid, ondertekening en huidige contractseries spelen geen rol. Eén historische snapshot is dus genoeg om “Verbond vereist” te passeren.

**Fixrichting:** gate uitsluitend op een actuele, cryptografisch geldige actieve contractreeks/versie. Legacy snapshots mogen geschiedenis tonen, niet nieuwe consent autoriseren.

### P1-06 — Contractseries uit backup worden structureel, niet cryptografisch geverifieerd

**Status:** OPEN — bevestigd.

**Ernst:** P1 integrity.

`sanitizeContractSeries()` controleert shape, IDs en referentiële consistentie, maar niet de cryptografische event-/versionproofs. `contractStore.restoreSeries()` kiest vervolgens simpelweg de hogere `updatedAt` en kan zo lokaal vertrouwde geschiedenis vervangen door een nieuwere maar gefabriceerde reeks.

**Fixrichting:** vóór restore alle version content hashes, signatures, participant-key binding en event-chain/previous hashes verifiëren. Een ongeldige reeks wordt afgewezen/quarantined; `updatedAt` mag pas na cryptografische geldigheid freshness beslissen.

### P1-07 — Legacy unsigned backup kan editability/ownership promoveren zonder private key

**Status:** OPEN — bevestigd, maar compatibiliteitsbeslissing vereist vóór de fix.

**Ernst:** P1 ownership integrity.

`prepareBackupRestore()` accepteert pre-signing eigen profielen zonder sleutel als `origin: own`. In `storeBackupRestoreSecurity.ts` kan een unsigned legacy “own” backup een bestaand unsigned shared profiel promoveren naar editable ownership, ook zonder cryptografisch eigendomsbewijs.

**Trade-off:** strikt fixen betekent dat echt oude eigen backups zonder ownership key niet automatisch als editable owner kunnen worden hersteld. Dat is veiliger maar breekt een legacy recoverypad.

**Voorkeursrichting voor public launch:** security-first; zonder private key/proof geen ownership-promotie. Bied desnoods expliciete “legacy recovery — onbevestigd” UX in plaats van stil eigendom.

### P1-08 — Production dependency graph heeft actuele advisories

**Status:** OPEN op `dev`; #284 pakt een groot deel aan, daarna opnieuw auditen.

**Ernst:** P1 release hygiene.

Actuele `npm audit --omit=dev` op de baseline meldt **11 entries: 9 high, 1 moderate, 1 low**. De keten bevat o.a. Next 16.2.6, postcss, sharp/Serwist/glob en een DOMPurify-advisory via jsPDF.

#284 brengt Next/eslint-config-next naar 16.3.0 en was bij creatie audit-clean. Omdat advisories in de tussentijd kunnen veranderen, is alleen mergen niet genoeg: `npm audit --omit=dev` opnieuw uitvoeren op de uiteindelijke release candidate.

## 5. Belangrijke bugs / hardening na de P0's

### P1-09 — Backupbestand wordt volledig ingelezen en geparsed zonder voorafgaande file-size cap

**Status:** OPEN — bevestigd.

`app/page.tsx` doet `FileReader.readAsText(file)` en daarna `JSON.parse()` zonder `file.size`-limiet. Na decryptie volgt opnieuw JSON parsing. Een enorme gekozen/imported file kan geheugen/CPU van mobiele Safari uitputten.

**Fixrichting:** harde encrypted/plain importlimieten vóór FileReader/decrypt/parse; duidelijke foutmelding; tests op net-onder/net-boven grens.

### P1-10 — Contract QR complete-frame heeft geen totale inputlimiet vóór base64/JSON parse

**Status:** OPEN — bevestigd.

Multipart QR begrenst `MAX_PARTS`, maar `KSC1:<payload>` kan in `decodeContractEnvelope()` zonder totale encoded/decoded cap door base64-decode en `JSON.parse()` lopen.

**Fixrichting:** één contract-transfer maximum voor single + multipart + paste, vóór allocatie/parse; structurele sanitization blijft daarna nodig.

### P2-11 — Camera kan na cleanup alsnog een late stream activeren

**Status:** OPEN — bevestigd in gedeelde `QRScanner`.

`getUserMedia()` is async. Als de sheet sluit voordat de promise resolveert, draait cleanup terwijl `streamRef` nog null is. De latere `.then()` zet daarna alsnog de stream en start scanning.

**Impact:** camera-indicator/track kan blijven lopen nadat de gebruiker de scanner al sloot.

**Fixrichting:** cancelled/generation token; late stream onmiddellijk stoppen; test met handmatig uitgestelde `getUserMedia` promise.

### P2-12 — Offline warmup stuurt lokale record-ID's naar de hosting-origin

**Status:** OPEN — privacy-design issue.

`OfflineCacheWarmup` bouwt dynamische routes met lokale profile-, scene- en contractseries/version-ID's en vraagt die via de service worker aan. De gevoelige antwoorden zelf gaan niet mee, maar stabiele lokale identifiers kunnen zo in origin/CDN-requestlogs belanden.

Dit wringt met de absolute README-belofte “Nothing phones home.”

**Fixrichting:** waar mogelijk alleen vaste offline shells precachen en lokale IDs client-side resolven. Voor contractroutes óf een vaste shell invoeren óf de privacycopy expliciet maken. Voorkeur: techniek fixen, copy daarna exact houden.

### P2-13 — Er is geen repository `SECURITY.md`

**Status:** OPEN.

Voor een publieke repository die gevoelige consent/privacydata verwerkt ontbreekt een disclosurekanaal, supported-version policy en korte instructie voor privé melden van kwetsbaarheden.

**Fixrichting:** minimale `SECURITY.md`: ondersteunde versie, private disclosure route, geen gevoelige PoC-data in publieke issues, responstermijn zonder onrealistische SLA.

## 6. UI/UX-audit

### Goed

- Mobile-first touchdoelen en safe-area gebruik zijn zichtbaar in nav/sheets.
- `PageShell` voorkomt een groot deel van willekeurige horizontale paddingdrift.
- Top/bottom navigatie hebben een simpele mobiele rolverdeling; gefocuste subroutes krijgen terugnavigatie.
- Statusvocabulaire is grotendeels gecentraliseerd in `lib/statusLabels.ts`.
- Phosphor-only icon guard voorkomt de eerdere emoji/iconmix.
- Reduced-motion helpers bestaan en veel framer-motion interacties gebruiken de gedeelde motionconfig.
- De UI heeft een echte empty-state/onboarding flow en niet alleen gevulde-fixture schermen.

### Minder goed / inconsistent

#### UX-01 — Twee Sheet-primitieven leven naast elkaar

Er bestaan zowel `components/Sheet.tsx` als `components/ui/Sheet.tsx`. Ze gebruiken dezelfde z-lagen (150/151) maar verschillen in portalgedrag, scroll/drag semantics, radius en padding (`px-6` versus `px-4`, verschillende top/bottom spacing).

**Risico:** fixes voor focus, drag, iOS scroll of stacking landen makkelijk in één primitive en niet in de andere. Dit is een echte “merge/consolidate”-kandidaat, maar pas na launch-blockers omdat een sheet-rewrite brede regressiekans heeft.

#### UX-02 — Z-index werkt, maar is een verspreid magic-number systeem

Geobserveerde lagen: nav 40, lokale overlays 50/60, sheets 150/151, toast/context 200, enkele page/FAB overlays 300, quarantine banner 350, backup 400, update/PIN 500 en integrity blocker 1000.

Er is op statische inspectie **geen bewezen globale z-index collision**, maar de schaal staat verspreid over componenten en inline styles. Een nieuwe overlay kan dus makkelijk boven/onder de verkeerde laag belanden.

**Verbetering:** centrale layer tokens (`nav`, `sheet`, `toast`, `blocking`, `integrity`) nadat de huidige modalflows visueel zijn vastgelegd.

#### UX-03 — Padding is overwegend consistent, maar uitzonderingen bouwen eigen page shells

De standaard is mobiel `px-4`; Scene gebruikt bewust een eigen `max-w-2xl mx-auto px-4` en contract/andere brede views gebruiken andere `PageShell` widths. Dat is op zichzelf goed. Het risico zit vooral in modals/sheets waar `p-4`, `px-6`, `24px 16px` en directe inline waarden naast elkaar bestaan.

**Verbetering:** geen grote spacing-refactor vóór launch; alleen aantoonbare crush/overflow fixen. Daarna spacing tokens voor sheet/body/footer.

#### UX-04 — Testnamen en fixtures liepen achter op de huidige UI

De oorspronkelijke advisory Actions-run gaf 34 failures = 17 unieke stale scenario's over mobile/desktop. #285 bracht dit terug naar 206/2, waarbij alleen Munch Punch echt defect was. Dat is inhoudelijk goed nieuws, maar toont dat E2E te lang advisory/rood mocht blijven.

**Fixrichting:** #286 landen, #285 daarop actualiseren, rehearsal volledig groen krijgen en daarna pas required maken na een paar stabiele runs.

## 7. Paginastructuur en hiërarchie

### Publieke/gebruikersroutes op baseline

- `/` — hub/onboarding/import/settings
- `/profile` en `/profile/[id]` — profiel
- `/compare` — vergelijking
- `/contract` — legacy/compose contractflow
- `/contracts` — contractoverzicht
- `/contracts/[seriesId]` — contractreeks
- `/contracts/[seriesId]/history` — historiek
- `/contracts/[seriesId]/versions/[versionId]` — immutable versie
- `/scene` — scene builder
- `/scenes` — scenes
- `/scenes/[id]` en `/scenes/view` — scene detail/compatibiliteit
- `/timeline` — geschiedenis
- `/about` — privacy/trust-uitleg
- `/quarantine` — beschadigde gedeelde profielen
- `/offline` — offline fallback
- `/munch-punch` + `/munch-punch/join` — **worden verwijderd in #286**

### Hiërarchisch oordeel

De informatiearchitectuur is functioneel, maar `/contract` naast `/contracts/...` en `/scene` naast `/scenes/...` zijn twee generaties routeontwerp door elkaar. Dat is niet launch-blocking zolang navigatie/backlinks kloppen, maar het vergroot mentale en testcomplexiteit.

**Na launch:** documenteer canonieke create/list/detail-routepatronen en migreer legacy aliases alleen met redirects/compatibiliteitstests.

## 8. PWA/browser/mobile oordeel

### Wat sterk is

- iOS/PWA wordt als primaire surface behandeld in projectregels.
- Manifest, Apple web-app metadata, service worker, offline fallback en updateflow zijn aanwezig.
- Offline scenario's zijn daadwerkelijk geautomatiseerd.
- Hydrationguards (`_hasHydrated`/`useHasHydrated`) zijn een expliciete architectuurregel.

### Wat vóór launch nog op echte devices moet

Automatisering kan WebKit-details niet volledig vervangen. Release candidate handmatig controleren op ten minste:

1. kleinste primaire iPhone viewport;
2. grote iPhone/Pro Max viewport;
3. iPad Pro portrait + landscape;
4. recente Samsung Galaxy/Chrome;
5. iOS Safari én geïnstalleerde standalone PWA.

Per device: onboarding, lock/unlock, profiel aanmaken/import/export, QR camera sluiten/heropenen, compare, contract sign/scan, scene gate, PDF export, offline cold start, update banner, keyboard/zoom, safe areas, rotation en return-from-background.

### Handmatige accessibility gate

- VoiceOver spotcheck op onboarding, profielstatussen, sheets en contract signing;
- reduced-motion controle;
- focus trap + Escape op desktop/tablet;
- 200% tekst/zoom waar browser dit ondersteunt;
- geen essentiële informatie uitsluitend via kleur.

## 9. Data lifecycle en privacycopy

### Sterk

- lokale opslag en encrypted export/import passen bij het privacydoel;
- shared profile integrity is zichtbaar voor de gebruiker;
- about/onboarding leggen trust zonder echte ID-check redelijk begrijpelijk uit;
- permanent verwijderen is expliciet destructief.

### Moet scherper

- README “Nothing phones home” is te absoluut zolang offline warmup record-ID's naar de origin routeert.
- Leg duidelijk uit dat “cryptografisch bevestigd” betekent “dezelfde sleutel/bron”, niet “burgerlijke identiteit geverifieerd”. Dit is extra belangrijk bij de contract inbox.
- Backup recovery moet onderscheid maken tussen “data teruggevonden” en “ownership bewezen”.
- Oude contractgeschiedenis mag nooit impliciet actuele toestemming betekenen.

## 10. Test- en CI-gate

### Huidige kern

- lint + unit + build: verplicht;
- Playwright mobile + desktop: advisory;
- offline Playwright: lokaal, niet per PR;
- #285 herstelt de stale browserfixtures;
- #286 verwijdert de enige overgebleven echte Munch Punch failure en de feature zelf.

### Launchgate

Voor RC moet gelden:

- 0 P0/P1 security/privacy findings open;
- `npm audit --omit=dev`: geen ongeaccepteerde production high/critical advisories;
- lint: 0 errors; bestaande warnings getrieerd, security/reliability warnings niet genegeerd;
- unit: volledig groen;
- build: volledig groen;
- Playwright mobile + desktop: volledig groen op minstens drie opeenvolgende relevante PR/RC-runs;
- offline suite: volledig groen op RC;
- handmatige WebKit/PWA matrix afgetekend;
- backup restore matrix: nieuw→nieuw, oud→nieuw, duplicate, corrupt, wrong password, huge file, missing owner key;
- contract QR matrix: first contact, bekende partner, gemanipuleerde actor key, verlopen request, replay, gewijzigde content, pause/resume/stop.

## 11. Efficiëntste uitvoervolgorde

### Fase A — Maak de meetlat betrouwbaar

1. Land #286 Munch Punch removal.
2. Land #284 dependency/Next guardrails, daarna production audit opnieuw.
3. Rebase/update #285 op nieuwe `dev`, verwijder de oude Munch-navverwachting en bewijs volledige browserrepetitie groen.
4. Houd `Lint, test and build` required; promote Playwright pas na stabiele groene runs.

### Fase B — Sluit privacy/consent stop-ship bugs

5. P0-01 + P0-02: één private-response visibility boundary voor contract + scene, met regressietests.
6. P0-03: app-lock naar root client boundary; directe-route regressietests.
7. P0-04: contract actor identity lokaal ankeren; spoof-test eerst rood, daarna groen.
8. P1-05: scene gate op actieve/geverifieerde contractstate.

### Fase C — Restore/import trust hardenen

9. P1-06: contractseries cryptografisch valideren vóór restore/freshness.
10. P1-07: legacy unsigned ownership policy beslissen en afdwingen.
11. P1-09/P1-10: resource caps voor files + contract QR/paste.
12. P2-11: camera late-resolution lifecycle fix.

### Fase D — Privacy en release hygiene

13. P2-12: dynamische offline warmup IDs minimaliseren/elimineren; privacycopy opnieuw controleren.
14. P2-13: `SECURITY.md` toevoegen.
15. Dependency audit nogmaals op de geïntegreerde RC.
16. Open oude branches #273/#274 inhoudelijk vergelijken met inmiddels gelande security/UI-code; alleen orthogonale bewezen changes meenemen.

### Fase E — Mobile/PWA release candidate

17. Volledige Playwright + offline suite.
18. iPhone klein + groot, iPad Pro en recente Galaxy smoke matrix.
19. iOS Safari + standalone PWA: PDF, QR-camera, keyboard/zoom, background/resume, service-worker update.
20. VoiceOver + reduced motion spotcheck.
21. Geen P0/P1 open + alle launchgates groen → launch candidate GO.

## 12. Bewust níet vóór launch refactoren

Deze punten zijn echt, maar hebben een slechter risk/reward-profiel zolang consent/security nog open staat:

- alle z-indexes in één sweep tokenizen;
- alle spacing/padding normaliseren;
- `/contract` en `/contracts` routearchitectuur volledig samenvoegen;
- beide Sheet-primitieven in één grote refactor vervangen;
- brede desktop redesign;
- nieuwe sociale/group features toevoegen.

De app hoeft niet architectonisch perfect te zijn om te launchen. Hij moet eerst **privacy-correct, consent-correct, herstelbaar en voorspelbaar op mobiel** zijn.

## 13. Samenvatting

### Goods

Sterke local-first basis, echte offline/PWA-investering, bruikbare crypto primitives, goede mobiele touch/typografie-fundering, signed/shared data-integrity en opnieuw actieve CI.

### Bads

Private-response disclosure, direct-route app-lock bypass, self-anchored contract identity, historical-contract scene bypass, onvoldoende geverifieerde contract-backuprestore en een production dependency graph met actuele advisories.

### Kan beter

Input-size caps, camera lifecycle, privacyvriendelijker offline warmup, één Sheet-primitief, centrale layer tokens, minder legacy route-dubbeling en een security disclosure policy.

### Launchadvies

**Vandaag: NO-GO.** Niet omdat de app instabiel of onaf is, maar omdat de resterende fouten precies de claims raken waarop een gebruiker KinkSync moet kunnen vertrouwen. Sluit Fase A–D, laat Fase E volledig groen lopen en beoordeel dan opnieuw. De hoeveelheid werk is beheersbaar; een rewrite is niet gerechtvaardigd.

---

## Statusledger

| ID | Status | PR/commit | Verificatie |
| --- | --- | --- | --- |
| A-guardrails | IN PROGRESS | #284 | Core groen; merge + reaudit nodig |
| A-e2e | IN PROGRESS | #285 | 206/2 op pre-removal branch |
| A-munch-removal | IN PROGRESS | #286 | Core groen; merge nodig |
| P0-01 private contract data | OPEN | — | bronpad bevestigd |
| P0-02 private scene inference | OPEN | — | bronpad bevestigd |
| P0-03 app-lock direct routes | OPEN | — | bronpad bevestigd |
| P0-04 contract actor binding | OPEN | — | trust boundary bevestigd |
| P1-05 scene consent gate | OPEN | — | pair-only snapshot gate bevestigd |
| P1-06 contract restore proofs | OPEN | — | shape-only restore bevestigd |
| P1-07 unsigned legacy ownership | OPEN | — | compatibiliteitsbeslissing nodig |
| P1-08 production deps | OPEN | #284 | huidige dev: 11 audit entries |
| P1-09 backup size cap | OPEN | — | FileReader/JSON path bevestigd |
| P1-10 contract QR size cap | OPEN | — | single-frame path bevestigd |
| P2-11 camera late stream | OPEN | — | async cleanup race bevestigd |
| P2-12 offline ID metadata | OPEN | — | dynamic warmup routes bevestigd |
| P2-13 SECURITY.md | OPEN | — | bestand ontbreekt |

---

## 14. Close-out — 2026-08-08

Deze sectie is de actuele laag bovenop de historische auditfreeze. De oorspronkelijke findingteksten blijven bewust ongewijzigd zodat oorzaak, risico en fixrichting niet achteraf worden herschreven.

Actuele `dev` na launch-hardening: `123cd02d2a3a9834c624c6931f126aa2a297fafe` (PR #296).

### 14.1 Findingledger na herverificatie

| ID | Actuele status | Geland | Bewijs / resultaat |
| --- | --- | --- | --- |
| A-guardrails | DONE | #284 · `1cacd52` | Next 16.3.0; dependency guardrails; finale audit 0 vulnerabilities |
| A-e2e | DONE | #285 · `cf3abd2` + #296 · `123cd02` | stale suite hersteld; browser/device rehearsal is nu een harde gate |
| A-munch-removal | DONE | #286 · `299529e` | Munch Punch volledig verwijderd; ~2.225 regels en bijbehorend oppervlak weg |
| P0-01 private contract data | DONE | #288 · `c320f81` | private responses worden vóór contract/PDF/signed transfer begrensd + regressiedekking |
| P0-02 private scene inference | DONE | #288 · `c320f81` | private responses uitgesloten van cross-profile scene-suggesties |
| P0-03 app-lock direct routes | DONE | #289 · `89c339f` | gevoelige routes delen de lock-boundary; directe-route regressies gedekt |
| P0-04 contract actor binding | DONE | #290 · `fdbb99f` | ontvangen actor identity wordt aan lokaal bekende identity/key-data geankerd |
| P1-05 scene consent gate | DONE | #291 · `301587b` | historische snapshot alleen autoriseert geen nieuwe scene meer |
| P1-06 contract restore proofs | DONE | #292 · `3583fc4` | contractseries worden cryptografisch geverifieerd vóór restore/freshness |
| P1-07 unsigned legacy ownership | DONE | #293 · `3ad5b07` | dataherstel blijft mogelijk; unsigned legacy data verzint geen editable ownership |
| P1-08 production deps | DONE | #284 + #296 | finale `npm audit --audit-level=high` en `npm audit --omit=dev`: 0 vulnerabilities |
| P1-09 backup size cap | DONE | #294 · `08f87bb` | bestandsgrootte begrensd vóór volledige read/parse |
| P1-10 contract QR size cap | DONE | #294 · `08f87bb` | totale transferlimiet vóór base64/JSON allocatie/parse |
| P2-11 camera late stream | DONE | #295 · `9324070` | generation-token/cleanup; stale of mislukte streams laten geen actieve track achter |
| P2-12 offline ID metadata | DONE | #295 · `9324070` | warmup gebruikt vaste routes; ID-dragende links prefetch uit; regressie bewaakt background requests |
| P2-13 SECURITY.md | PENDING | — | root policy ontbreekt nog; vereist expliciete policy-review/goedkeuring vóór schrijven |

Er staan daarmee **geen P0- of P1-findings meer open** uit deze audit.

### 14.2 Finale launch-gate — GitHub Actions run #44

Run `31261363566` draaide op PR #296 head `f2586d6d5a470ba3271d0a27e4822bf25dac3eae`; die PR is na volledig groen resultaat squash-gemerged als `123cd02`.

- core: dependency audit, lint, **379/379 unit-tests** en Next/Serwist productiebuild groen;
- reguliere browserrehearsal: **222/222 Playwright-tests** groen in Chromium/WebKit;
- productie-PWA/offline: **16/16** groen, met Service Worker-owned netwerkrequests expliciet afgebroken tijdens offline simulatie;
- launch-device smoke: **5/5** groen;
- artifact `device-smoke-screenshots`: **25 screenshots** = 5 kernroutes × 5 deviceprofielen, gekoppeld aan exact dezelfde PR-head;
- Vercel preview status op de finale head: Ready.

De offline-harness is tijdens deze close-out strenger gemaakt: `context.setOffline(true)` wordt niet als enige bewijs gebruikt; Service Worker-owned requests worden eveneens afgebroken. Daardoor kan een `NetworkFirst` route de testserver niet stiekem als vangnet gebruiken.

### 14.3 Device- en visuele beoordeling

Geautomatiseerde profielen:

| Profiel | Engine / emulatie | Visuele uitkomst |
| --- | --- | --- |
| iPhone 17 | WebKit · 402×681 viewport · DPR 3 | geen launch-blocking overflow, clipping of CTA-overlap gezien |
| iPhone 17 Pro Max | WebKit · 440×763 viewport · DPR 3 | idem; langere content en bottom controls blijven bruikbaar |
| iPad Pro 11 portrait | WebKit · 834×1194 | stabiel; bewust smalle mobile-first contentkolom met veel vrije ruimte |
| iPad Pro 11 landscape | WebKit · 1194×834 | stabiel; veel vrije ruimte, functioneel maar geen tablet-specifieke luxe-layout |
| Galaxy S26 Ultra-class | Chromium · 360×780 · DPR 4 | geen launch-blocking overflow, clipping of CTA-overlap gezien |

De 25 full-page screenshots van home, profiel, compare, contract en scene zijn visueel bekeken. De smalle centrale kolom op iPad is een **postlaunch polishpunt**, geen functionele blocker.

Belangrijk: dit zijn browser/device-emulaties. Ze bewijzen layout, browsergedrag en geautomatiseerde flows, **niet** fysieke hardware, echte camera-permissions, iOS installed-PWA lifecycle, notch/safe-area gedrag of VoiceOver.

### 14.4 Extra bugs die de gate zelf ving

De launch-gate vond tijdens het harden nog drie zaken die niet als oorspronkelijke audit-ID waren genummerd:

1. offline profielcreatie kon na een persistence-timeout opnieuw `createPerspectiveProfiles()` aanroepen en zo een duplicaat maken; #296 bewaart de pending profiel-ID, blokkeert re-entrancy en maakt de retry expliciet `Opslaan opnieuw`;
2. een offline shell-test vertrouwde eerst op een vaste 300 ms hydration-wacht; hij wacht nu op de echte route-marker en faalt als de shell niet hydrateert;
3. één PDF filename unit-fixture parseerde een date-only string als UTC en was daardoor timezone-afhankelijk; de fixture gebruikt nu een lokale middagdatum.

### 14.5 Wat nog vóór een publieke launch op echte hardware moet

De software-releasecandidate is technisch **GO**, maar publieke launch blijft **CONDITIONAL GO** totdat de korte menselijke/device gate is afgevinkt:

1. fysieke iPhone: Safari én geïnstalleerde PWA — onboarding, lock/unlock, QR camera permission/close/reopen, keyboard/zoom, safe areas, background/resume en Service Worker update;
2. fysieke iPhone: minimaal één volledige contract sign/scan + PDF export;
3. VoiceOver spotcheck op onboarding, profiel, sheets en contract signing; reduced-motion spotcheck;
4. bij voorkeur één actuele fysieke Samsung/Chrome smoke voor camera, keyboard en installed-PWA gedrag;
5. root `SECURITY.md` publiceren nadat de exacte disclosurepolicy expliciet is goedgekeurd.

### 14.6 Geactualiseerde readiness

**Engineering/product release candidate: ~9/10 en technisch GO.** De oorspronkelijke 6/10 NO-GO is substantieel veranderd: alle P0/P1's zijn gesloten, productie-dependencies auditen schoon en de browser/PWA/device-gates blokkeren voortaan regressies.

**Publieke launch: CONDITIONAL GO.** Het resterende risico zit niet meer in een bekende P0/P1 uit deze audit, maar in twee bewust niet-geclaimde oppervlakken: fysieke iOS/Android hardwaregedrag en disclosure/governance via `SECURITY.md`.

### 14.7 Efficiënte voortgangsvolgorde vanaf hier

1. `SECURITY.md` exact reviewen en na expliciete goedkeuring toevoegen.
2. Eén fysieke iPhone installed-PWA/Safari walkthrough inclusief camera + PDF + VoiceOver.
3. Eén fysieke Samsung/Chrome smoke als er een toestel beschikbaar is.
4. Pas daarna `dev → main` als public-release promotion; niet eerder alleen omdat emulatie groen is.
5. Postlaunch: Sheet-primitieven consolideren, z-index layer tokens introduceren, routehiërarchie `/contract(s)` en `/scene(s)` normaliseren, en tablet/desktop whitespace verfijnen.

Die volgorde maximaliseert launchzekerheid zonder vlak voor release een brede UI-architectuurrefactor te riskeren.
