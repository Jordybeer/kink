# Security/privacy/PWA delta-audit — 18 augustus 2026

## Doel en bron van waarheid

Deze audit vervolgt:

- `docs/release-candidate-audit-2026-08-17.md`;
- `security-audit-challenge.md`;
- `docs/audit-corrections-2026-08-18.md`;
- `docs/ux-consent-a11y-deepdive-2026-08-17.md`.

De oudere documenten blijven historische snapshots. Dit document herschrijft ze niet achteraf alsof alle observaties op dezelfde commit zijn gedaan.

**Actuele bron van waarheid voor deze delta:** `dev` op commit `49949bda3628e673ff09c58ea706bbe239163b5d`.

Die head bevat inmiddels ook PR #383, #384 en #386. De delta is na de laatste merge opnieuw tegen de actuele `dev`-tree gecontroleerd. De finale #386-head doorliep de volledige CI inclusief browser/device en launch-matrix; de squash-merge naar `dev` behield dezelfde tree.

Deze ronde is read-only voor productcode. De enige wijziging op de auditbranch is dit document.

## Waarom de oude auditbranch niet meer de juiste werkbasis is

`claude/release-candidate-audits-2yi1nt` is inmiddels gedivergeerd van `dev`: de branch bevat historische audit- en fixcommits die deels via latere PR's in `dev` zijn geland, terwijl `dev` daarna verder is gegaan.

Voor nieuwe conclusies telt uitsluitend de actuele `dev`-tree. De oude branch blijft nuttig als auditspoor, niet als releasebron.

## Delta sinds de onafhankelijke security challenge

De onafhankelijke challenge vond twee nieuwe Medium-bevindingen en nuanceerde een eerder als opgelost beschreven importprobleem:

- `KS-PRIV-003`: volledige datawipe ruimde niet alle Serwist/runtime-caches op;
- `KS-SEC-004`: PIN-setup accepteerde 4–8 cijfers, terwijl het lockscreen na vier cijfers verifieerde;
- `KS-SEC-002`: reeds opgeslagen onveilige `bdsmtestUrl`-waarden konden de nieuwe sanitizer overleven.

Op huidige `dev` zijn deze drie punten aantoonbaar gesloten in productcode.

## Bevindingenmatrix op actuele `dev`

| ID | Actuele status | Delta-oordeel |
|---|---|---|
| KS-SEC-001 | Gesloten | Security headers/CSP staan nog in `next.config.ts`. Geen regressie gevonden in de delta. |
| KS-SEC-002 | **Gesloten** | Nieuwe import/share-data wordt gesanitized en bestaande opgeslagen `bdsmtestUrl` wordt via store-migratie v25 opgeschoond. |
| KS-PRIV-001 | Gesloten | Profielpayloads blijven fragment-gebaseerd; de eerder verwijderde querytransportvorm is niet teruggekeerd in de onderzochte delta. |
| KS-PRIV-002 | Gesloten en aangescherpt | `localStorage`, `sessionStorage` en relevante runtime-caches worden verwijderd; precache blijft voor offline app-herstel. |
| KS-PRIV-003 | **Gesloten in code** | Wipe gebruikt `runtimeCachesToPurge()` en verwijdert elke Cache Storage bucket behalve caches waarvan de naam `precache` bevat. |
| KS-SEC-004 | **Gesloten met compatibiliteitspad** | Nieuwe PINs zijn exact vier cijfers; bestaande 5–8-cijferige PINs blijven ontgrendelbaar via een expliciete legacy-vervolgstap. |
| KS-PWA-001 | **Open — Medium** | Geen `navigator.storage.persist()` gevonden. Durability/storage-eviction blijft een product- en platformrisico. |
| KS-SEC-003 | **Open — Low / geaccepteerd risico** | Legacy ongezouten SHA-256-hashes worden nog geverifieerd; succesvolle verificatie migreert de hash nog niet automatisch naar PBKDF2. |
| KS-SUP-001 | Gesloten | Geen aanwijzing in deze delta dat de eerder verwijderde ongebruikte dependency is teruggekeerd. |

## 1. KS-PRIV-003 — runtime cache wipe opnieuw beoordeeld

### Huidige implementatie

`DestroyAllSheet` wist:

1. `localStorage`;
2. `sessionStorage`;
3. alle Cache Storage-namen die `runtimeCachesToPurge()` teruggeeft.

`runtimeCachesToPurge()` gebruikt bewust een deny-by-default strategie voor runtime-caches:

- alle cache-namen worden verwijderd;
- alleen namen met `precache` blijven staan.

Dat is robuuster dan een vaste lijst van Serwist-cache-namen, omdat een Serwist-upgrade nieuwe runtime buckets kan introduceren zonder dat de destroy-flow hoeft te worden bijgewerkt.

### Oordeel

**Gesloten in code.**

De eerdere challenge was terecht: alleen `kinksync-pages` verwijderen dekte niet de volledige runtime-cachelaag. De huidige implementatie adresseert precies die foutklasse.

### Wat nog handmatig bewezen moet worden

Repository-inspectie kan niet bewijzen dat een echte browser na een volledig opgebouwde PWA-sessie exact de verwachte caches toont. De hardware/browser-gate blijft daarom:

- online dynamische routes bezoeken;
- Cache Storage vooraf inspecteren;
- `Vernietig alle data` uitvoeren;
- bevestigen dat alleen de app/precache overblijft;
- offline herladen;
- bevestigen dat geen oude profiel-/scène-route uit runtime-cache terugkomt.

Dit is verificatie van de fix, geen resterende codebevinding.

## 2. KS-SEC-004 — PIN-semantiek opnieuw beoordeeld

### Nieuw PIN-contract

`lib/appLockPin.ts` definieert één bron:

- `APP_LOCK_PIN_LENGTH = 4`;
- nieuwe invoer wordt eerst naar cijfers genormaliseerd en daarna tot vier cijfers begrensd;
- nieuwe PINs zijn alleen geldig wanneer ze exact vier cijfers bevatten.

De setup en het lockscreen importeren dezelfde constante.

### Legacy contract

De vorige bug kan bestaande 5–8-cijferige PIN-hashes hebben achtergelaten. Die gebruikers mogen niet buiten hun lokale data worden gesloten.

`AppLock` doet daarom het volgende:

1. verifieert de eerste vier cijfers;
2. een mislukte poging telt mee voor de bestaande rate-limit;
3. daarna wordt een expliciete legacy-vervolgstap aangeboden;
4. de gebruiker kan tot acht cijfers invoeren en expliciet bevestigen;
5. bij acht cijfers wordt automatisch opnieuw geverifieerd.

### Oordeel

**Gesloten.**

Dit is beter dan alleen “vanaf nu exact vier cijfers”, omdat ook het reeds gemaakte compatibiliteitsprobleem wordt afgevangen.

### Resterende nuance

De legacy-vervolgstap is compatibiliteitscode. Zodra redelijkerwijs geen installaties met 5–8-cijferige PINs meer bestaan, is verwijderen wenselijk. Dat is onderhoud/hardening, geen actuele launchbevinding.

## 3. KS-SEC-002 — bestaande `bdsmtestUrl`-waarden opnieuw beoordeeld

### Huidige migratie

`storeCore.ts` bevat `migrateStoredBdsmtestUrlV25()`.

Voor stores van vóór versie 25:

- elk profiel met een `bdsmtestUrl` wordt opnieuw door `sanitizeBdsmtestUrl()` gehaald;
- een geldige toegestane URL blijft staan;
- een ongeldige URL wordt uit het profiel verwijderd;
- de huidige persistversie is 25.

De migratie wordt in de Zustand `migrate()`-keten daadwerkelijk aangeroepen.

### Oordeel

**Gesloten.**

De onafhankelijke challenge had gelijk dat alleen nieuwe import- en editpaden beveiligen onvoldoende was. De huidige migratie sluit ook het historische opslagpad.

## 4. KS-PWA-001 — durability blijft open

### Feitelijke stand

Op huidige `dev` is nog geen aanroep gevonden van:

`navigator.storage.persist()`

KinkSync blijft local-first zonder serveraccount of synchronisatie. Verlies van browseropslag kan daardoor onder meer profielen, contracten, scènes en lokale eigendomssleutels raken.

Er bestaan backup/exportpaden en PWA/offline-infrastructuur, maar dat is niet hetzelfde als een storage-persistence verzoek of een gegarandeerde backup vóór betekenisvolle data ontstaat.

### Oordeel

**Open — Medium.**

Dit is geen aangetoonde exploit en ook geen gegarandeerde “na X dagen wordt alles gewist”-timer. Het is een durability-risico dat zwaarder weegt doordat de architectuur bewust geen backend heeft.

### Aanbevolen productbeslissing

De veilige vervolgstap is:

1. best-effort `navigator.storage.persist()` aanvragen wanneer API/platform dat ondersteunt;
2. de uitkomst nooit als garantie presenteren;
3. op iOS/browsermodus een duidelijke backup/installatieboodschap tonen wanneer die informatie relevant is;
4. echte Safari/PWA-devicechecks gebruiken om de precieze UX te bepalen.

Geen productcode in deze audit aangepast, omdat dit nieuwe UX rond een privacy- en durabilitybeslissing introduceert.

## 5. KS-SEC-003 — legacy SHA-256 PIN-hash blijft bestaan

`verifyPin()` accepteert nog steeds twee opslagformaten:

- modern: salted PBKDF2 met 310.000 iteraties;
- legacy: 64-teken hex SHA-256 zonder salt.

Het moderne PBKDF2-pad gebruikt een byte-accumulatorvergelijking. Het legacy-pad vergelijkt de berekende hexstring rechtstreeks met `===`.

### Oordeel

**Open — Low / acceptabel binnen het huidige threat model.**

Er is in deze delta geen bewijs gevonden dat dit van Low naar Medium/High promoveert. Een aanvaller moet al toegang hebben tot lokale opgeslagen state, een situatie die `SECURITY.md` niet als beschermd aanvallermodel behandelt.

### Hardening-pad

Na een succesvolle legacy-verificatie:

1. PIN opnieuw hashen met `hashPin()`;
2. moderne PBKDF2-hash terugschrijven;
3. legacy pad pas verwijderen wanneer de compatibiliteitsperiode voorbij is.

Dit verkleint de hoeveelheid downgradecode zonder gebruikers buiten te sluiten.

## 6. Security headers/CSP — geen regressie, wel dezelfde harde grens

`next.config.ts` bevat nog steeds onder meer:

- `frame-ancestors 'none'`;
- `X-Frame-Options: DENY`;
- `object-src 'none'`;
- `base-uri 'self'`;
- `form-action 'self'`;
- `connect-src 'self'`;
- `Referrer-Policy: no-referrer`;
- `X-Content-Type-Options: nosniff`.

Productie gebruikt nog `script-src 'self' 'unsafe-inline'` en `style-src 'self' 'unsafe-inline'`.

### Oordeel

Geen nieuwe securityfinding in deze delta.

De bestaande auditcorrectie blijft belangrijk: `connect-src 'self'` is geen universele “niets kan ooit naar buiten”-garantie, en `unsafe-inline` betekent dat dit geen strict nonce/hash-CSP is.

Nonce-CSP blijft post-launch hardening tenzij een concrete sink of regressie de prioriteit verandert.

## 7. Delta van de nieuwe `/docs`-bestanden

### `docs/audit-corrections-2026-08-18.md`

Dit bestand hoort leidend te blijven wanneer oudere auditteksten botsen met latere verificatie. Vooral deze correcties zijn terecht:

- historische testtotalen horen bij verschillende commits;
- alleen CI op een exacte actuele head is releasebewijs;
- CSP-taal mag niet breder zijn dan wat de directives werkelijk afdwingen;
- lange legacy-PINs moeten compatibel blijven;
- WCAG-levels en classificaties zijn gecorrigeerd;
- iOS keyboard-issues mogen pas na echte-device-validatie als bewezen WCAG-fout worden geclassificeerd.

### `docs/ux-consent-a11y-deepdive-2026-08-17.md`

De security-audit verandert de UX-scope niet, maar de historische statuslijst is inmiddels door nieuwere code ingehaald.

**Al vóór #384 opgelost maar nog als open vermeld:**

- `KS-UX-013`: huidige `DestroyAllSheet` heeft zowel een expliciete toegankelijke naam als `aria-describedby` naar de instructietekst. De productcode bevat dus precies de beschreven minimale fix.

**Via #384 geland:**

- `KS-UX-002`: hard-limit labelcontrast krijgt een afzonderlijke, lichtere teksttoken plus regressietest;
- `KS-UX-006`: de opslag-vol waarschuwing is persistent totdat de gebruiker handelt of sluit;
- `KS-UX-009`: `QuestionsScreen` heeft nu een `sr-only` h1 en de vraagtitel is h2;
- `KS-UX-012`: onboarding zegt nu `Werkt offline. Jouw antwoorden vertrekken niet.` in plaats van `Volledig offline`.

**Daarna via #386 geland:**

- onboarding gebruikt een deliberate 236°-kluisschijf met regrip en reduced-motion fallback;
- de grenscopy is verzacht zonder de betekenis van grenzen te verbergen;
- Home heeft een rustige sign-off met expliciete FetLife- en e-maillinks;
- de FetLife-link gebruikt `noopener noreferrer`; beide links zijn expliciete gebruikersacties en introduceren geen stille dataflow of trackingpad.

#384 en #386 wijzigen geen security/PWA-implementatie uit deze delta. De securityconclusies hierboven blijven daarom ongewijzigd op de huidige `dev`-head.

## 8. Nieuwe regressiecheck op post-launch hardening

De recente security/a11y/UX-delta raakt vooral:

- store-migraties;
- PIN-input/verificatie;
- datawipe;
- runtime cachebeleid;
- beveiligde invoervelden;
- security headers;
- UX/a11y-fixes uit #383 en #384;
- onboarding/home-polish uit #386;
- tests en auditdocumentatie.

In deze read-only codepass is geen nieuwe Blocker/High/Medium security- of privacyregressie gevonden die door die wijzigingen zelf is geïntroduceerd.

Dat oordeel is beperkt tot repository-inspectie en reeds uitgevoerde exacte-head CI. Het is geen vervanging voor echte hardware/devicechecks waar die expliciet vereist zijn.

## 9. Exacte resterende gates

### Code/productbeslissing

1. **KS-PWA-001:** expliciet durabilitybeleid bepalen; bij voorkeur best-effort storage persistence plus relevante backup/installatie-UX.
2. **KS-SEC-003:** legacy SHA-256 migratie plannen als post-launch hardening.

### Handmatig/runtime

1. Volledige CI op de exacte te releasen head.
2. Chromium + WebKit + Firefox smoke op diezelfde build.
3. Echte iOS Safari en standalone PWA.
4. Cache Storage vóór/na `Vernietig alle data`.
5. Offline cold start na wipe en na stale Service Worker update.
6. Effectieve headers op app, service worker en manifest.
7. Network trace voor onverwachte third-party/data-bearing requests.
8. Backup/export/import op echt iOS, inclusief volle/drukke storage-context.
9. Normale viercijferige PIN, legacy 5–8-cijferige PIN en biometrische fallback.

## 10. Eindbeoordeling

### Security/privacy

**Geen bevestigde Blocker of High op huidige `dev`.**

De twee Medium-bevindingen uit de onafhankelijke challenge zijn in productcode gesloten. De eerder onvolledige `bdsmtestUrl`-fix is nu ook voor bestaande persisted state gesloten.

Er blijft één Medium over: **PWA/storage durability**. Dat is een reëel architectuurrisico, geen exploit.

### Releasehouding

Voor security/privacy alleen is de huidige tree **CONDITIONAL GO**:

- code-hardening uit de challenge staat erin;
- #383, #384 en #386 zijn meegenomen in de actuele baseline en introduceren in deze codepass geen nieuwe security/privacyfinding;
- #386 is op zijn finale head door lint/test/build, PWA/offline en browser/device/launch gegaan, en de merge naar `dev` behield diezelfde tree;
- toekomstige releasebeslissingen moeten opnieuw CI/devicebewijs gebruiken op de exacte dan actuele kandidaat-head;
- PWA durability moet bewust worden opgelost of expliciet als productrisico worden geaccepteerd.

Dit oordeel blijft een security/privacy-delta. Nieuwe UX-polish na deze baseline moet op zijn eigen actuele head worden beoordeeld en mag niet via historische auditstatus als reeds opgelost worden beschouwd.
