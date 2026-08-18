# Release candidate audit — security, privacy en PWA (2026-08-17)

Read-only doorlichting van de release candidate op `main` (`118c0de`), gevolgd
door de fixes die klein en bewijsbaar regressievrij waren. Meetlat: de negen
invarianten uit `SECURITY.md` en de conflictvolgorde uit `UI-principles.md`.

**Baseline vóór elke wijziging:** 600 unit tests groen, `npm run build` groen,
`npm audit` 0 vulnerabilities.

**Baseline ná de fixes:** 605 unit tests groen, build groen, productie
PWA/offline-suite 16/16 groen, `npm audit` 0 vulnerabilities.

---

## Wat er niet is

De opdracht noemde een sim/Supabase-laag. Die bestaat niet in deze repo: geen
dependency, geen client, geen `.env*`, geen `sim_*.mjs` in de tree of in de
historie, en geen enkele `fetch()` naar welke externe host dan ook. Er is dus
niets te auditen en niets dat per ongeluk productiedata kan aanraken. Draait er
een sim-laag buiten deze repo, dan is die volledig ongeaudit.

---

## Bevindingen

### KS-SEC-001 — geen enkele security header

- **Severity:** High
- **Categorie:** Security headers / defense in depth
- **Locatie:** `next.config.ts`, plus de afwezigheid van `middleware.ts` en `vercel.json`
- **Status:** **opgelost in deze audit**

**Bewijs:** `const nextConfig: NextConfig = { turbopack: {}, devIndicators: false };`
Geen `headers()`, nergens een CSP, `X-Frame-Options`, `Referrer-Policy` of
`Permissions-Policy`.

**Impact:** De app was frameable. KinkSync kent knoppen die niet terug te draaien
zijn: alle data wissen, toestemming intrekken, een contract tekenen. Zulke
knoppen horen niet onzichtbaar in andermans iframe te hangen. Daarnaast had een
XSS-sink geen enkele rem gehad, en niets dwong de belofte af dat er niets naar
buiten gaat.

**Fix:** `SECURITY_HEADERS` in `next.config.ts`. De twee die er het meest toe
doen: `frame-ancestors 'none'` tegen clickjacking, en `connect-src 'self'` dat de
kernbelofte van het product voor het eerst door de browser laat afdwingen in
plaats van door de afwezigheid van code.

**Bewust nog niet gedaan:** een strikte `script-src`. Next zet zijn eigen inline
bootstrap in het document, dus dat vraagt nonces via middleware, en middleware
raakt elke route tegelijk. Geen ingreep voor een release candidate. Zolang die er
niet is doen `object-src 'none'`, `base-uri 'self'` en `form-action 'self'` het
werk. Nonce-CSP staat als post-launch werk genoteerd.

**Verificatie:** `curl -sI` op `/`, `/profile` en `/sw.js` geeft alle vijf headers
terug. De volledige productie-PWA/offline-suite blijft 16/16 groen mét CSP,
inclusief de test die bewijst dat achtergrondwerk geen lokale record-id's naar de
origin stuurt.

---

### KS-SEC-002 — `bdsmtestUrl` omzeilt de protocolvalidatie op de importgrens

- **Severity:** Medium *(oorspronkelijk als High/blocker gerapporteerd, zie corrections.md)*
- **Categorie:** Onvolledige inputvalidatie op een vertrouwensgrens
- **Locatie:** `lib/sanitizeProfile.ts:156`, `components/BdsmtestScores.tsx:95`, `components/sheets/ProfileEditSheet.tsx:111`
- **Status:** **opgelost in deze audit**

**Bewijs:** De allowlist stond alleen in de edit-sheet, die uitsluitend eigen
invoer bewaakt. De sanitizer voor onvertrouwde import deed alleen
`clamp(r.bdsmtestUrl, 200)`. Het veld reist mee in de v3-deelpayload
(`lib/profileShareV3.ts:157`) en zit in `projectProfileConsent`
(`lib/consentProof.ts:215`), dus een vreemde URL is **geldig ondertekend**,
passeert `verifyProfileConsent` en komt nooit in quarantaine. Daarna landt hij in
`<a href={url}>`.

**Waarom geen XSS:** React 19.2.4 blokkeert `javascript:`-URL's zelf. In
`node_modules/react-dom/cjs/react-dom-client.production.js` staat letterlijk
`"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"`.
Wat overblijft is zeker en reëel: een geïmporteerd profiel kon de knop
"Origineel resultaat openen" naar een willekeurig domein wijzen terwijl de UI
bdsmtest.org suggereert.

**Waarom het telde:** dit brak invariant 6. Erger nog, de cryptografische laag
keurde de payload goed, dus alle bestaande verdediging keek er langs.

**Fix:** `sanitizeBdsmtestUrl()` in `lib/profileSanitizePrimitives.ts`, aangeroepen
vanuit de sanitizer én de edit-sheet, zodat de twee deuren nooit uit elkaar
kunnen lopen. De regex is exact die van de edit-sheet, dus geen enkele URL die de
app ooit accepteerde verandert van gedrag.

**Verificatie:** 4 nieuwe tests in `__tests__/sanitizeProfile.test.ts` dekken
geldige links, vreemde protocollen, look-alike domeinen en een geïmporteerd
profiel dat de link probeert binnen te smokkelen.

---

### KS-PRIV-001 — `?p=` liet een profiel naar de server reizen

- **Severity:** Medium
- **Categorie:** Privacy / disclosure aan de origin
- **Locatie:** `lib/parseSharePaste.ts:41`
- **Status:** **opgelost in deze audit**

**Bewijs:** De parser accepteerde `url.searchParams.get("p")`, expliciet
vastgelegd in `__tests__/parseSharePaste.test.ts:8`. Tegelijk documenteert
`app/robots.ts:11-13` het tegenovergestelde als eigenschap van de app: *"een
gedeeld profiel reist in het URL-fragment, dat nooit een server bereikt."* De
generator klopte altijd al: `lib/profileQr.ts:75` maakt uitsluitend `#p3=`.

**Impact:** Een profiel in de querystring gaat mee naar de server. Het staat in
accesslogs, in de cachesleutel van de runtime-paginacache en in elke `Referer`
die daarna vertrekt. Precies wat het fragment-ontwerp moest voorkomen.

**Waarom het telde:** een privacybelofte die technisch niet klopt is ernstiger
dan een ontbrekende belofte, want gebruikers nemen er beslissingen op.
`UI-principles.md` #11: geen verborgen verzending.

**Fix:** `?p=` wordt niet meer geaccepteerd. Compat-kost is nul: `git log -S`
bevestigt dat de app deze vorm nooit heeft gegenereerd. Wie nog een oude link
heeft plakt de code zelf; de losse payload wordt verderop gewoon herkend, en daar
is een test voor.

---

### KS-PRIV-002 — "Vernietig alle data" wiste maar één la

- **Severity:** Low
- **Categorie:** Privacy / onvolledige verwijdering
- **Locatie:** `components/sheets/DestroyAllSheet.tsx:16`
- **Status:** **opgelost in deze audit**

**Bewijs:** `localStorage.clear()` en verder niets, onder een knop die
"permanent" en "alle" belooft. Bleven staan: `sessionStorage` met `app_unlocked`
en `HOME_PROFILE_DISCLOSURES`, plus de runtime-paginacache die bezochte URL's als
sleutel bewaart.

**Impact:** Geen antwoorden, geen profielinhoud, geen aantoonbaar disclosure-pad.
Dit ging om de belofte, niet om de data.

**Fix:** `sessionStorage.clear()` plus het opruimen van elke runtime-cache. De
precache van de service worker blijft juist wél staan: wie offline alles wist en
herlaadt, moet nog steeds een werkende app terugkrijgen in plaats van een wit
scherm.

**Correctie na tegen-audit:** de eerste fix ruimde alleen `kinksync-pages` op en
liet de vijftien buckets van Serwists `defaultCache` staan. Zie KS-PRIV-003.

---

### KS-PWA-001 — iOS kan alles wissen zonder dat iemand gewaarschuwd is

- **Severity:** Medium
- **Categorie:** PWA / platformspecifiek dataverlies
- **Locatie:** architectuurbreed
- **Status:** **open — vraagt een productbeslissing en een echt toestel**

**Bewijs:** Alle data leeft in `localStorage`. Er is geen backend en geen sync.
`navigator.storage.persist()` wordt nergens aangeroepen — geverifieerd met grep
over `app/`, `components/` en `lib/`. `app/about/page.tsx:263` waarschuwt wél,
maar over iets anders: dat Safari en de Home Screen-app aparte opslagcontexten
kunnen zijn. Over eviction staat er niets, en op het moment van beslissen
evenmin.

**Impact:** WebKit kan script-writable storage opruimen bij langdurige
inactiviteit voor sites die niet als PWA zijn geïnstalleerd. De vaak genoemde
zeven dagen is een richtlijn, geen garandeerde timer: het werkelijke gedrag hangt
af van browserversie, installatiestatus en of de gebruiker de site als vertrouwd
behandelt. Behandel dit dus als een durabiliteitsrisico, niet als een klok die
afloopt. Wat er bij eviction gebeurt staat wél vast: volledig en onherstelbaar
verlies van profielen, contracten en eigendomssleutels. Zonder eigendomssleutel
is een profiel niet terug te claimen, ook niet als een partner nog een gedeelde
kopie heeft.

**Voorgestelde fix:** `navigator.storage.persist()` aanvragen na het eerste
profiel, plus een waarschuwing voor iOS-gebruikers die niet in standalone-modus
draaien. `lib/clientPlatform.ts` en `components/PwaInstallGuide.tsx` bestaan al en
zijn de logische plek.

**Niet in deze audit gedaan:** dit is nieuwe UI op een privacygevoelig moment. Dat
hoort langs de UI decision gate, niet langs een auditor die haast heeft.

---

### KS-SUP-001 — een ongebruikte dependency

- **Severity:** Low
- **Categorie:** Supply chain
- **Locatie:** `package.json`
- **Status:** **opgelost in deze audit**

**Bewijs:** `html2canvas` stond in `dependencies` met nul verwijzingen in de hele
codebase. Laatste release 2022. `@types/qrcode` stond in `dependencies` in plaats
van `devDependencies`.

**Impact:** Geen runtime-impact; ongebruikte code wordt niet gebundeld. Wel een
onnodige vertrouwensrelatie die bij elke `npm ci` wordt opgehaald en uitgevoerd,
ook in CI. "We gebruiken het niet" is geen verdediging bij een gecompromitteerd
installatiescript.

**Fix:** verwijderd, respectievelijk verplaatst. `npm audit` blijft 0.

---

### KS-SEC-003 — legacy ongezouten PIN-hash

- **Severity:** Low
- **Categorie:** Cryptografie / downgrade-pad
- **Locatie:** `lib/crypto.ts:57`
- **Status:** **open — acceptabel risico**

Nieuwe PIN's gebruiken PBKDF2 met 310.000 iteraties, maar een opgeslagen
64-teken hex SHA-256 wordt nog steeds geaccepteerd, ongezouten en met een
niet-constante-tijd vergelijking. Binnen het gedeclareerde threat model is dit
geen kwetsbaarheid: `SECURITY.md` sluit de aanvaller met leestoegang tot
localStorage expliciet uit. Het blijft een pad dat zwakker is dan de rest van de
crypto-laag, zonder migratie. Voorstel: bij een geslaagde legacy-verificatie
transparant herhashen naar PBKDF2, en het pad na twee releases verwijderen.

---

## Wat standhield

Actief gecontroleerd, geen bevinding. Dit hoort in het verslag omdat het de
zwaarste beloften van het product draagt.

- **Nul uitgaande requests.** Geen enkele `fetch()` naar een externe host. Fonts
  worden door `next/font/google` bij build-time zelf gehost. Geen analytics, geen
  telemetrie, geen third-party scripts.
- **`privateNote` verlaat het toestel nooit.** Expliciet gestript in
  `lib/shareProfile.ts:36`, afwezig uit de v3-payload.
- **`privateResponse` houdt elke disclosure-grens.** Gecontroleerd in compare,
  matching, snapshots, trends, PDF's, tekstexport en de ondertekende
  consentprojectie. `lib/profileSnapshot.ts:62` verzwijgt zelfs de privacy-
  transitie zelf. Invariant 1 houdt stand.
- **Invariant 7.** `buildOfflineWarmupRoutes()` retourneert uitsluitend statische
  shells, dus achtergrondwarming en prefetch dragen geen lokale record-id's naar
  de origin. Door een e2e-test afgedekt. Let op de reikwijdte: dit gaat over
  *achtergrondgedrag*. Gewone navigatie naar `/profile/<id>` stuurt die URL
  uiteraard wel naar de origin, zoals elke navigatie dat doet.
- **Invariant 8.** De generatieteller in `components/QRScanner.tsx` stopt ook
  laat-resolvende camerastreams.
- **Invariant 4.** `components/contract/ContractInboxSheet.tsx:85-96` weigert elk
  verzoek waarvan de actor niet lokaal geverifieerd is.
- **Invariant 3.** Eigendom vraagt een lokale privésleutel die aan
  `consentProof.keyId` hangt; sleutelconflicten worden conflicten, geen
  overnames.
- **Errorboundaries lekken niets.** Geen stacktrace in beeld, niets naar buiten.
- **Quota-afhandeling.** `lib/persistStorage.ts` vangt `QuotaExceededError` en
  laat de vorige goede staat staan in plaats van stil te verliezen.
- **Avatarsanitizer.** Raster-only allowlist; SVG wordt geweigerd.
- **CI.** Gepinde action-SHA's, `persist-credentials: false`,
  `permissions: contents: read`, `npm audit --audit-level=high`, en drie aparte
  suites inclusief een productie-PWA-rehearsal.

---

## Tweede ronde: bevindingen uit de onafhankelijke tegen-audit

`security-audit-challenge.md` daagde dit rapport uit en vond twee dingen die ik
had gemist. Beide zijn tegen de code geverifieerd en opgelost.

### KS-SEC-004 — een PIN die je jezelf niet meer kunt vertellen

- **Severity:** **Blocker** *(de tegen-audit classificeerde dit als Medium; zie hieronder waarom dat te laag is)*
- **Locatie:** `components/sheets/PinFlowSheet.tsx:44,93`, `components/AppLock.tsx:11,60,63`
- **Status:** **opgelost**

**Bewijs:** `PinFlowSheet` accepteerde 4 tot 8 cijfers (`maxLength={8}`,
validatie alleen `< 4`, placeholder "Minimaal 4 cijfers"). `AppLock` hield er
`PIN_LENGTH = 4` op na: het tekent vier bolletjes, weigert een vijfde cijfer
(`if (digits.length >= PIN_LENGTH) return`) en verifieert zodra er vier staan.
Twee schermen die hetzelfde getal apart bijhielden.

**Waarom Blocker en niet Medium:** wie de uitnodiging van dat woord "minimaal"
aannam en vijf tot acht cijfers koos, kon daarna nooit meer naar binnen.
`verifyPin("1234", hash("12345"))` faalt altijd, en het slot accepteert het
vijfde cijfer niet. Er is geen vergeten-PIN-pad in `AppLock`, biometrie is
optioneel en apart, en de enige uitweg is browseropslag wissen. Dat kost ook de
profielen, de contracten en de ECDSA-eigendomssleutels, en die laatste zijn niet
opnieuw te genereren: een gedeeld profiel is daarna permanent niet meer te
claimen. Totaal, onomkeerbaar dataverlies, veroorzaakt door een feature te
gebruiken zoals de interface hem aanbood, in een app zonder serverzijde om iets
terug te halen. Dat is geen must-fix maar een reden om niet te launchen.

**Fix:** `lib/appLockPin.ts` met `APP_LOCK_PIN_LENGTH` en `isValidAppLockPin`.
Beide schermen lezen nu dezelfde constante; `PinFlowSheet` dwingt exacte lengte
af en `AppLock` tekent er evenveel. 4 tests in `__tests__/appLockPin.test.ts`.

**Restrisico:** een PIN van meer dan vier cijfers die vóór deze fix is opgeslagen
blijft onbruikbaar, want de lengte is niet uit de PBKDF2-hash af te leiden. De
app is pre-launch, dus dat raakt hooguit een testtoestel. Wie er een heeft: wis
de opslag of gebruik biometrie.

### KS-PRIV-003 — "alles wissen" liet vijftien caches staan

- **Severity:** Medium
- **Locatie:** `app/sw.ts`, `components/sheets/DestroyAllSheet.tsx`
- **Status:** **opgelost**

**Bewijs:** De destroy-flow verwijderde alleen `kinksync-pages`. Serwists
`defaultCache` zet er nog vijftien naast: `apis`, `next-data`, `others`,
`cross-origin`, `next-image`, `static-*` en de google-fonts-buckets. Die houden
verzoeksleutels vast als `/profile/<id>` en `/scenes/<id>`. Geen antwoorden, wel
welke profielen en scènes hebben bestaan, en dat overleefde "wis alles".

**Fix:** `runtimeCachesToPurge()` in `lib/offlineRoutes.ts` keert de logica om:
alles gaat eruit behalve de precache, herkend aan het woord `precache` in
`serwist-precache-v2-<scope>`. Namen hardcoderen zou betekenen dat een
Serwist-upgrade er stilletjes eentje bij zet die niemand opruimt. 3 tests in
`__tests__/offlineRoutes.test.ts`, waaronder één die een verzonnen toekomstige
bucket opruimt.

### KS-SEC-002 — nu pas volledig gesloten

De tegen-audit merkte terecht op dat `sanitizeBdsmtestUrl` de importdeur sloot
maar niet de la waar oude import al in lag. `migrate` in `lib/storeCore.ts` deed
versie-gebonden transformaties en draaide nergens de sanitizer over opgeslagen
profielen.

**Fix:** `migrateStoredBdsmtestUrlV25`, met `STORE_PERSIST_VERSION` op 25. 5
tests in `__tests__/bdsmtestUrlMigration.test.ts`.

Terzijde, gevonden tijdens deze fix: de guard van `migrateStoredDirectionalityV24`
hing aan `STORE_PERSIST_VERSION` in plaats van aan zijn eigen versienummer. Elke
toekomstige bump zou die migratie stil opnieuw over al gemigreerde data hebben
laten lopen. Nu gepind op 24.

### Waar de tegen-audit langs dit rapport schiet

Twee punten in de "false positives"-sectie gaan over claims die hier niet
gemaakt zijn. Er staat nergens iets over `Access-Control-Allow-Origin: *`. En de
React-versie is hier gebruikt om KS-SEC-002 te **verlagen** van High naar
Medium, niet om een bevinding op te blazen; dat staat ook zo in `corrections.md`.

Wél terecht overgenomen: de zeven-dagenclaim bij KS-PWA-001 is bijgesteld naar
een durabiliteitsrisico in plaats van een klok, en de invariant-7-formulering is
afgebakend tot achtergrondgedrag in plaats van alle URL-verkeer.

---

## A. Bevestigde blockers en highs

Eén blocker en één High, allebei opgelost en geverifieerd:

- **KS-SEC-004 (Blocker)** — de PIN-lengtemismatch die gebruikers permanent
  buitensloot. Gevonden door de onafhankelijke tegen-audit, niet door mij. Dit
  rapport had in de eerste ronde geen blockers gemeld en dat was onterecht.
- **KS-SEC-001 (High)** — geen enkele security header.

De architectuur is op meerdere punten beter dan gebruikelijk: geen backend, geen
externe requests, echte ECDSA-eigendomsbewijzen, een quarantainelaag voor
ongeldige imports, en privacygrenzen die consequent tot in de PDF-export zijn
doorgetrokken. Acht van de negen invarianten uit `SECURITY.md` heb ik in code
kunnen terugvinden en zien standhouden. De negende (invariant 6) had één gat, en
dat is nu dicht.

## B. Handmatige tests die nog nodig zijn

1. Headers verifiëren tegen de echte staging/productie-URL, niet alleen lokaal.
2. Bevestigen dat de CSP niets breekt in Safari en Firefox; hier is alleen
   Chromium getest.
3. iOS Safari: PWA-installatie, storage-eviction, PDF-download in standalone,
   safe areas.
4. Twee fysieke toestellen voor de QR- en contractflow, inclusief
   multi-part-assemblage en camera-timing.
5. Offline-matrix over een echte deploygrens: update-across-deploy en rollback.
6. Storage-inventaris in DevTools vóór en ná "Vernietig alle data" op een echt
   toestel.
7. Branch protection op `main` en private vulnerability reporting controleren.

## C. Niet door AI te bewijzen

- Werkelijke headers in productie achter Vercel.
- Source maps in productie.
- Screenreader-ervaring met VoiceOver en TalkBack.
- Of de app privé en menselijk aanvoelt.
- Echt iOS-gedrag: installatie, storage-eviction bij inactiviteit, safe areas.
- Camera-hardwaregedrag: permissieprompts, oriëntatie, laag licht, scanafstand.
- Gedrag van een geïnstalleerde PWA over meerdere deploys.
- Juridische toereikendheid van de leeftijdsgate en de contract-copy.
- De transitieve dependency-boom op gerichte compromittering; `npm audit` toont
  bekende advisories, geen aanval.

## D. Voorlopige security/privacy go-no-go

**GO, onder voorwaarden.**

Zeven opgeloste bevindingen, geverifieerd met **617 groene unit tests** (was 600
bij aanvang), een groene build, een groene productie-PWA/offline-suite en
`curl`-bewijs van de headers. KS-PWA-001 en KS-SEC-003 blijven open en zijn
allebei bewust doorgeschoven: de eerste vraagt nieuwe UI die langs de UI decision
gate hoort, de tweede valt buiten het gedeclareerde threat model.

Eén les uit de tweede ronde, die zwaarder weegt dan de fixes zelf: de ernstigste
bevinding van dit hele traject kwam niet uit dit rapport maar uit een
onafhankelijke tegen-audit. KS-SEC-004 zat niet in code die ik heb aangeraakt en
niet in een invariant uit `SECURITY.md`; hij zat in twee schermen die hetzelfde
getal apart bijhielden. Een audit die alleen langs de gedeclareerde invarianten
loopt, vindt dat soort dingen niet. Negatieve-padreview hoort daarom een vast
onderdeel te zijn, niet een tweede mening achteraf.

**Voorwaarden voor de knop:**

1. De handmatige tests uit sectie B, in het bijzonder 1 tot en met 4.
2. KS-PWA-001 opgelost, of schriftelijk aanvaard als bekend risico met een
   duidelijke back-up-aansporing in de UI.
3. Een privacyverklaring die klopt met het werkelijke technische gedrag.
