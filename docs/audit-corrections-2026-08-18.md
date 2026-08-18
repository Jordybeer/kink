# Auditcorrecties — 18 augustus 2026

Dit addendum is leidend wanneer het botst met
`docs/release-candidate-audit-2026-08-17.md`,
`docs/ux-consent-a11y-deepdive-2026-08-17.md` of
`security-audit-challenge.md`.

De oudere documenten zijn snapshots van opeenvolgende auditmomenten. Ze zijn
bewust niet herschreven alsof alle observaties tegelijk op dezelfde commit zijn
gedaan. Voor een mergebeslissing telt alleen de CI op de actuele PR-head.

## 1. Chronologie en testbewijs

- `118c0de` is de publieke release-baseline waarop de eerste audit begon.
- De eerste baseline had 600 groene unit tests.
- `041ed1a30bdd071a6a55b5a9494929ebee4eb706` is een latere audit-snapshot waarop
  605 unit tests en de WebKit-launchmatrix lokaal groen waren.
- Latere aantallen zoals 617 horen bij nóg latere tussenstaten. Ze zijn geen
  bewijs voor de uiteindelijke PR-head.
- Daarom mogen 600, 605 en 617 niet naast elkaar gelezen worden als uitslagen van
  één exacte commit. De GitHub Actions-run op de actuele PR-head is de enige
  release-gate.

## 2. CSP: wat de browser wel en niet afdwingt

De eerdere formulering dat `connect-src 'self'` de volledige belofte “er gaat
niets naar buiten” door de browser afdwingt, was te breed.

De huidige policy beperkt onder meer connection-API's zoals `fetch`, XHR,
WebSocket, EventSource en `sendBeacon` tot dezelfde origin. Andere directives
hebben hun eigen, smallere taak, waaronder `frame-ancestors 'none'`,
`object-src 'none'`, `base-uri 'self'` en `form-action 'self'`.

Productie gebruikt nog `script-src 'self' 'unsafe-inline'`. Dat is bewust geen
strict CSP. Nonces/een strictere script-policy blijven post-launch hardening.

De conclusie dat KinkSync geen applicatiedata naar externe hosts verstuurt komt
uit code-inspectie en tests; niet uit de onjuiste aanname dat `connect-src` elke
mogelijke vorm van uitgaand verkeer of navigatie blokkeert.

## 3. KS-SEC-004: bestaande lange PINs zijn niet meer opgegeven

De release-audit schreef na de eerste fix nog dat een vóór die fix opgeslagen
5–8-cijferige PIN onbruikbaar bleef en hooguit een pre-launch testtoestel kon
raken. Na public launch is dat geen aanvaardbare aanname.

De vervolgfix houdt twee contracten uit elkaar:

- nieuwe PINs zijn exact vier cijfers;
- bestaande 5–8-cijferige hashes blijven ontgrendelbaar via een expliciete
  legacy-vervolgstap in `AppLock`.

Een mislukte eerste viercijferpoging telt mee voor de bestaande rate-limit. De
legacy-route geeft dus geen onbeperkte gratis viercijferpogingen. Unit- en E2E-
tests dekken zowel de normale viercijferroute als een opgeslagen zescijferige
PIN.

De PIN-setup normaliseert bovendien eerst naar cijfers en begrenst daarna. Een
paste als `12-34` wordt `1234`, niet `123`.

## 4. UX/WCAG-correcties op de audittekst

Deze punten corrigeren de classificatie in de UX-audit; ze betekenen niet dat
alle bijbehorende productbevindingen in PR #382 worden opgelost.

- WCAG 2.2 SC 2.2.1, 3.3.1, 3.3.2 en 4.1.2 zijn **Level A**. Een algemeen doel
  van WCAG 2.2 AA omvat die A-criteria, maar maakt de criteria zelf niet AA.
- Een `aria-label` kan een programmatically determined name leveren voor 4.1.2,
  maar lost 3.3.2 niet automatisch op. Labels of instructies voor invoer moeten
  ook aan gebruikers worden gepresenteerd; daarom mag KS-UX-004 niet als volledig
  opgelost worden beschouwd alleen omdat `aria-label` is toegevoegd.
- WCAG 2.5.7 gaat over functionaliteit die dragging vereist en verlangt een
  gelijkwaardige single-pointerroute zonder dragging. Alleen toetsenbordtoegang
  is daarvoor niet automatisch voldoende. Voor KinkSync moet eerst worden
  vastgesteld welke functionaliteit de optionele handgeschreven PDF-signature
  werkelijk draagt; de cryptografische contractondertekening is een aparte flow.
- Een door het iOS-toetsenbord bedekte knop is op zichzelf nog geen bewezen
  schending van 2.4.11. Dat criterium gaat over een component met keyboard focus
  die volledig wordt verborgen door author-created content. Tot echte-device-
  validatie is KS-UX-007 daarom een UX/device-risico, geen bewezen 2.4.11-fout.

## 5. Netwerktaal in onboarding/audit

“Volledig offline” en “vrij van uitgaande requests” zijn te absoluut wanneer de
hosting nog appcode en updates serveert. De preciezere productbelofte is:

**Werkt offline. Je antwoorden vertrekken niet.**

Daarbij moet testbewijs expliciet zeggen welke netwerk-API's en disclosurepaden
zijn onderzocht, in plaats van één grep op `fetch()` gelijk te stellen aan alle
mogelijk netwerkverkeer.

## 6. Wat dit addendum niet doet

Het verandert geen scopebeslissing voor de resterende UX/a11y-bevindingen en
claimt geen echte-devicebewijs dat niet bestaat. Het doel is uitsluitend dat
historische audittekst niet als actuele waarheid wordt gelezen wanneer latere
code, review of verificatie haar heeft ingehaald.
