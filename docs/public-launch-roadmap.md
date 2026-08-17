# KinkSync — Public Launch Roadmap

> **Status:** release-reference, herijkt op 12 augustus 2026  
> **Baseline:** `dev` @ `8e26b3f` na integratie van PR’s #330, #331, #334 en #337  
> **Scope:** catalogus, questionnaire en directionality zijn bevroren voor de publieke launch  
> **Doel:** één logische route van de huidige prelaunch-state naar een publieke release, zonder de bestaande privacy-, consent- of mobile-first garanties opnieuw open te breken.

Dit document is **geen tweede backlog**. `planned-changes.md` blijft het werklog met ideeën en fases. Deze roadmap bepaalt alleen de volgorde, afhankelijkheden en harde exit-gates voor de publieke launch.

## Actuele integratiestatus

Op deze baseline zijn alle bewegende product-PR’s naar `dev` geïntegreerd en
stond geen nieuwe PR naar `dev` open. De releasebasis telt 344 actieve
catalogusitems, 53 expliciete directionele pairs, 45 vaste Dynamic-anchors en
canonical mapping v6 met 24 geaudite edges.

Immutable bewijs op exact `8e26b3f`:

- [344 catalogusitems](https://github.com/Jordybeer/kink/blob/8e26b3fe2c4b29ef53aa339007483a844dfa8eb6/__tests__/kinks.test.ts#L207-L214);
- [53 pairs en 45 anchors](https://github.com/Jordybeer/kink/blob/8e26b3fe2c4b29ef53aa339007483a844dfa8eb6/__tests__/directionality.test.ts#L64-L104);
- [mapping v6 met alle 24 edges](https://github.com/Jordybeer/kink/blob/8e26b3fe2c4b29ef53aa339007483a844dfa8eb6/__tests__/questionnaire.test.ts#L229-L260);
- [complementaire matching en compare](https://github.com/Jordybeer/kink/blob/8e26b3fe2c4b29ef53aa339007483a844dfa8eb6/__tests__/directionalMatching.test.ts#L39-L140);
- [snapshots, Scene, QR, consent en private-response-boundary](https://github.com/Jordybeer/kink/blob/8e26b3fe2c4b29ef53aa339007483a844dfa8eb6/__tests__/directionalityIntegration.test.ts#L36-L154);
- [directionele Contract-output](https://github.com/Jordybeer/kink/blob/8e26b3fe2c4b29ef53aa339007483a844dfa8eb6/e2e/contract.spec.ts#L112-L128).

De launch-scope freeze is nu actief:

- geen nieuwe brede directionality-, catalogus- of questionnaire-slices;
- alleen een bewezen P0/P1, consent/privacyregressie of expliciet goedgekeurde
  semantische correctie mag deze surfaces vóór launch nog openen;
- Fase 0 is de enige actieve close-outlane; Fase 1 blijft geblokkeerd tot de Fase 0-exit gate groen is.

---

## 1. Executive route

De fundamentele productarchitectuur is release-candidate. De resterende weg is geen feature-marathon maar een gecontroleerde close-out:

```text
scope freeze (actief)
        ↓
meetlat/testharnas → Soft Gate → XSS/CSP → finale UI/UX-pass
        ↓
final security/durability delta-audit
        ↓
fysieke device gate → release governance → dev/main promotion
        ↓
production smoke → PUBLIC LAUNCH
```

### Launchfilosofie

1. **Geen nieuwe grote productfeatures op het kritieke pad.**
2. **Mobile-first en installed PWA blijven de primaire surfaces.**
3. **Geen regressie om architectonische schoonheid te winnen.** Brede refactors zijn postlaunch tenzij een concrete launchbug ze noodzakelijk maakt.
4. **De laatste hardwaretest gebeurt pas op software die inhoudelijk releasewaardig is.** Niet eerst een oude onboarding testen en daarna de Soft Gate herschrijven.
5. **CI-groen is bewijs van gedrag dat daadwerkelijk getest wordt, niet van visuele of menselijke correctheid die de test nooit heeft geassert.**
6. **KinkSync mag installatie als durabilitymaatregel behandelen, nooit als security boundary.** XSS/same-origin JavaScript blijft een aparte vertrouwensgrens.

---

## 2. Wat al als fundering geldt

Deze onderdelen worden niet opnieuw ontworpen tenzij een latere gate een concrete regressie bewijst:

- local-first architectuur zonder backend/accountdatabase;
- encrypted export/import en restore-hardening;
- app-lock op de gevoelige routeboundary;
- signed profile/consent primitives en contract actor binding;
- private-response boundaries;
- contract lifecycle en cryptografisch gecontroleerde restore;
- QR transport, multipart profielsharing en import quarantine;
- productie-PWA/offline routearchitectuur;
- enforcing core/browser/device/PWA CI-gates;
- `SECURITY.md` en expliciete trust boundaries;
- Dynamic, Discover en Deep Dive op de dedicated Questions-route met 45 vaste monotone coverage-anchors;
- rustige handmatige catalogusfilters op de profielpagina, zonder questionnaire-state te muteren;
- 53 expliciete directionele pairs en een aparte complementaire participatielaag, centraal doorgevoerd in matching, compare, contract, scene, QR, snapshots, consent en privacyregressies.

Referentie: `docs/prelaunch-audit-2026-08-07.md`, `engine.md`, `directie.md`, `SECURITY.md`.

---

## 3. Integratie afgerond: launch-scope freeze actief

PR’s #330, #331, #334 en de gerichte #337-follow-up zijn op de baseline
geïntegreerd. Questionnaire en cataloguseditor hebben ieder één duidelijke
surface; de guided role-policy schrijft geen antwoorden; canonical follow-ups
blijven affirmative-only; diaper-participatie is expliciet complementair zonder
fake give/receive.

Tot de publieke launch geldt:

1. geen bulktransformaties of nieuwe directionele splits op taalpatronen;
2. geen nieuwe questionnaire-inference, role-proxy of expansion zonder
   versioned, edge-voor-edge audit;
3. geen cataloguswijziging zonder downstream controle van matching, compare,
   contract, scene, share, snapshots en consent;
4. gevonden ideeën die geen P0/P1 of expliciet goedgekeurde semantische
   correctie zijn gaan naar postlaunch.

---

# FASE 0 — Release-meetlat betrouwbaar maken

**Doel:** vóór we meer screenshots, Soft Gate-QA of polish vertrouwen, moet de testomgeving de huidige app werkelijk representeren.

**Status op de baseline:** actief. De domeinstore staat op persistversie 24,
terwijl `e2e/fixtures.ts` nog versie 20 en het verwijderde ID
`breath_play` seedt. De device-smoke gebruikt nog hoofdzakelijk overflow en
`body.innerText.length > 30`; dit is dus nog geen betrouwbare exit-gate.

### Werk

- Update centrale E2E-fixtures naar de actuele persistversie en actuele storevorm.
- Seed alleen geldige huidige IDs en assert expliciet hoeveel content geladen moet zijn; geen vacuously-green specs.
- Device-smokes krijgen route-specifieke readiness-assertions, niet alleen `body.innerText.length > 30`.
- Screenshots pas nemen nadat relevante hydration/animatie/contentstate aantoonbaar klaar is.
- Behoud CI-eigendom van de server; geen `reuseExistingServer` in gatekeeping runs.
- Controleer dat huidige screenshotmatrix minstens bevat:
  - home;
  - profile overview;
  - profile edit/questionnaire;
  - compare;
  - contract compose;
  - contract overview/detail;
  - scene create/detail/list;
  - settings/backup;
  - sharing/scanning;
  - representative empty/error/locked/private states.

### Exit gate

- Fixtureversie = live storeversie.
- Geen bekende stale IDs of migration side effects in seeddata.
- Een bewust lege/half-gerenderde kritieke route laat de smoke falen.
- Core + device + PWA gates groen op de vernieuwde meetlat.

**Waarom eerst:** de finale UI/UX-pass is waardeloos als een lege profielpagina nog steeds een groene screenshot kan opleveren.

---

# FASE 1 — Soft Gate PWA v1 afronden

**Doel:** browsergebruik blijft mogelijk, maar niemand kan ongemerkt waardevolle lokale consent/profiledata opbouwen in een fragiele browsercontainer zonder duidelijke durability-keuze.

**Status op de baseline:** gedeeltelijk uitgevoerd en geblokkeerd tot de Fase 0-exit gate. De vroege install-event
capture, centrale broker, iOS/iPadOS-classifier, native installatiesheet en
aparte `kinksync-install-prompt-policy` bestaan. Home onderhoudt daarnaast
nog een eigen deferred prompt, UA-check, listener en
`installPromptDismissed`-rendergate. Browser → standalone checkpoint/restore
vóór onboarding is nog niet bewezen.

## 1A. Runtime classifier en install-event broker

Behoud de vroege `beforeinstallprompt` capture in de root, maar maak hem de echte bron voor de UI in plaats van daarnaast nog een los Home-refpad te onderhouden.

Runtime moet post-hydration en niet-persistent classificeren:

- browser vs standalone;
- iOS/iPadOS vs Android vs other;
- Safari vs Chrome (`CriOS`) vs other iOS browser vs likely in-app browser;
- native install prompt beschikbaar vs manual install;
- readiness/confidence zonder raw UA-string op te slaan.

Standalone gebruikt minstens:

- `(display-mode: standalone)`;
- Apple `navigator.standalone === true` fallback.

Re-evalueer minimaal bij:

- `pageshow` / BFCache restore;
- terugkeer naar visible;
- display-mode change indien beschikbaar;
- `appinstalled` zonder te doen alsof de huidige browsertab daardoor standalone wordt.

## 1B. Gate-policy losmaken van gevoelige domeindata

Vervang het permanente `installPromptDismissed: true` model.

De gate-policy is kleine aparte state en bevat geen profielen, contracten of private keys. Conceptueel alleen zaken als:

- tijdelijk snooze/acknowledgement;
- last shown;
- policy schema version;
- laatst waargenomen runtime mode.

**Niet doen:** raw browserfingerprint of volledige UA persistent bewaren.

`Klaar` mag op iOS nooit betekenen “installatie bevestigd”. Alleen een latere echte standalone launch bewijst standalone mode.

## 1C. Browser-risk UX

Browser mode krijgt een compacte, niet-panikerige durability-indicatie.

Principes:

- read-only/exploratie blijft vrij;
- de eerste betekenisvolle lokale mutatie kan de Soft Gate uitleg tonen;
- doorgaan in browser blijft mogelijk na expliciete tijdelijke acknowledgement;
- high-value acties krijgen een sterkere checkpoint dan een filter of preview;
- geen misleidende zeven-dagen-countdown;
- standalone krijgt geen Safari-ITP-waarschuwing, wel gewone backupgezondheid.

De Soft Gate blijft een **data-loss control**, geen autorisatie- of securitymechanisme.

## 1D. Browser → standalone datamigratie

Dit is de belangrijkste durability-flow.

### Geen betekenisvolle browserdata

1. install guidance;
2. gebruiker voegt KinkSync toe;
3. standalone launch;
4. runtime bevestigt standalone;
5. normale onboarding.

### Wel betekenisvolle browserdata

1. detecteer bestaande profielen/contracten/owner keys/scenes;
2. bied vóór installatie een encrypted export/checkpoint aan;
3. toon browser-specifieke installinstructie;
4. standalone eerste start biedt **Restore bestaande KinkSync-data** vóór gewone onboarding;
5. import herstelt en toont aantallen profielen/contracten/ownership keys;
6. pas daarna normale appflow.

De bestaande import/restorelogica wordt hergebruikt; geen tweede backupformaat.

## 1E. Browser-specifieke instructies

- iOS Safari: Share → Add to Home Screen;
- iOS Chrome: Chrome Share → Add to Home Screen;
- other iOS: generieke Share guidance + open-in-Safari fallback wanneer nodig;
- likely in-app browser: eerst “Open in browser”; geen onbruikbare installstappen tonen;
- Android met captured prompt: native install CTA;
- Android zonder prompt: manual install guidance;
- standalone: geen installatieguide.

Geen vaste pijlen naar een specifieke toolbarpositie; browserchrome verschuift per versie/orientation.

## 1F. Soft Gate tests

Minimaal:

- iPhone Safari UA;
- iPhone Chrome `CriOS`;
- iPad desktop-style UA;
- Android Chrome;
- likely in-app webview fixture;
- standalone media query;
- `navigator.standalone`;
- install event vóór Home mount;
- install event na hydration;
- single-use prompt clearing;
- BFCache `pageshow`;
- `appinstalled` verandert browsertab niet naar standalone;
- een gewone dismissal wordt nooit stilzwijgend permanent; alleen expliciet `Niet meer vragen` zet `neverAsk`;
- browserdata → export → fresh standalone → restore vóór onboarding;
- SSR/client eerste snapshot geeft geen hydration mismatch.

### Exit gate

- Geen bekende browsermisclassificatie in de ondersteunde fixtures.
- Vroege install-event capture wordt werkelijk door de CTA geconsumeerd.
- Geen permanente “Klaar = nooit meer tonen” toestand.
- Meaningful browserdata heeft een bewezen herstelpad naar standalone.
- Deep routes kunnen de relevante mutation policy niet triviaal omzeilen.
- Unit/build/browser/PWA gates groen.

---

# FASE 2 — Gerichte XSS / injection / CSP audit

**Doel:** de belangrijkste resterende client-only security boundary expliciet beoordelen. Installatie beschermt lokale data niet tegen same-origin JavaScript.

### Auditoppervlak

Zoek en verifieer alle relevante sinks/inputs:

- `dangerouslySetInnerHTML` en de vroege install-event script;
- `innerHTML`/DOM-parserachtige paden;
- URL-constructie en externe links;
- imported/shared profile content;
- comments/private notes/tags/custom kinks;
- QR/paste/import payloads;
- PDF/HTML renderingpaden;
- avatar/data URLs;
- DOMPurify/sanitizergebruik en dependencyversie;
- service-worker responses en navigation fallbacks.

### CSP-beslissing

Na de sink-audit:

- implementeer een zinvolle enforcing CSP wanneer dit zonder fragiele uitzonderingen kan;
- als de vroege inline broker een hash/nonce-aanpak nodig heeft, los dat bewust op;
- geen “security theater” CSP met brede `unsafe-*` uitzonderingen alleen om een checklist groen te maken;
- documenteer expliciet wanneer een specifieke directive technisch wordt uitgesteld.

Neem waar passend ook eenvoudige browserheaders mee, zonder de camera/PWA-flow kapot te maken.

### Dependency hygiene

- `npm audit --omit=dev` op actuele geïntegreerde `dev`;
- geen ongeaccepteerde production high/critical advisories;
- oude Dependabot-PRs tegen `main` niet blind mergen: relevante securityupdates opnieuw op `dev` beoordelen/porten;
- DOMPurify hardening opnieuw beoordelen tegen de actuele lockfile.

### Exit gate

- Geen ongecontroleerde user-controlled HTML/script sink.
- CSP/security-headerbeslissing gedocumenteerd en getest.
- Geen ongeaccepteerde production high/critical advisories.
- Soft Gate, camera, PDF, sharing en offline blijven groen.

---

# FASE 3 — Finale page-by-page UI/UX polish-pass

**Doel:** niet opnieuw ontwerpen, wel het hele huidige product als één interface redigeren.

Deze fase start **na Soft Gate** zodat onboarding/install UX maar één keer finaal wordt beoordeeld.

## Auditmatrix

Per pagina/state controleren:

1. visual hierarchy en page structure;
2. information density;
3. spacing/padding/radii;
4. typografie en icon consistency;
5. CTA-hiërarchie en placement;
6. nav/back/recovery paths;
7. sheets/modals/overlays/focus/z-index;
8. safe-area gedrag;
9. keyboard/zoom/viewport resize;
10. empty/error/loading/private/locked states;
11. mobile compositie;
12. tablet/desktop correctness en lege ruimte;
13. cross-page design language.

## Verplichte surfaces

- onboarding + Soft Gate;
- home, empty + populated;
- profile overview;
- profile edit/questionnaire: Dynamic, Discover, category, Deep Dive;
- share QR + scanner + import preview;
- compare;
- contract compose;
- contract list/detail/history/version/signing/QR;
- scene create/list/detail + consent states;
- settings, PIN/app-lock, encrypted export/import, destroy flow;
- about/trust;
- quarantine;
- offline/update states.

## Scope discipline

**Wel fixen vóór launch:**

- concrete overflow/clipping;
- verkeerde hierarchy;
- onduidelijke of concurrerende primary CTA;
- broken empty/recovery state;
- focus/overlay stacking bugs;
- touch targets;
- ernstige density/readabilityproblemen;
- inconsistent consent/privacycopy;
- mobile keyboard/safe-area bugs.

**Niet refactoren alleen voor schoonheid:**

- beide Sheet-primitieven in één rewrite samenvoegen;
- alle z-indexwaarden in één sweep tokenizen;
- alle spacing naar een nieuw tokensysteem migreren;
- brede tablet/desktop redesign;
- routearchitectuur `/contract` vs `/contracts` volledig herschrijven;
- motiondesign opnieuw uitvinden.

Als de audit een concrete bug in zo'n gebied vindt, fix de bug minimaal; maak er geen systeemmigratie van.

### Accessibility in deze pass

Automatisch waar mogelijk, maar echte toestelchecks blijven later:

- focus trap en focus return;
- duidelijke labels;
- geen essentiële informatie alleen via kleur;
- reduced-motion branches;
- Dynamic Type/tekstgroei zonder clipping;
- minimaal bruikbare touch targets.

### Exit gate

- Geen open launch-blocking UX findings.
- Alle kritieke surfaces hebben actuele, inhoudelijk geldige screenshots.
- Mobile overflow/readiness gate groen.
- Geen brede cosmetische refactor zonder aantoonbare launchwaarde.

---

# FASE 4 — Final integrated security + durability delta-audit

**Doel:** opnieuw een GO verdienen op de code die daadwerkelijk naar hardware-QA gaat.

Dit is geen volledige historische reaudit. Focus op veranderingen sinds de prelaunch-close-out en op subsystemgrenzen.

### Verplicht opnieuw bewijzen

- private responses blijven privé in compare/contract/scene/PDF/share;
- directionality na de parallelle branch is coherent door questionnaire → store → matching → compare → contract → scene → QR → snapshots → consent;
- imported profile integrity/quarantine;
- app-lock direct routes;
- owner-key en signed-consent lifecycle;
- contract identity, pause/resume/stop en replaybescherming;
- backup restore:
  - nieuw → nieuw;
  - oud → nieuw;
  - duplicate;
  - corrupt;
  - wrong password;
  - oversized file;
  - missing/invalid owner key;
- contract QR:
  - first contact;
  - bekende partner;
  - actor-key mismatch;
  - gewijzigd content;
  - verlopen request;
  - replay;
- QR camera open/close/reopen + late stream resolution;
- service worker/offline cold-start/updateflow;
- localStorage/persist errors waar testbaar;
- public privacy/trust copy:
  - lokaal ≠ nooit een hosting request;
  - cryptografisch bevestigd ≠ wettelijke identiteit;
  - historisch contract ≠ actuele consent;
  - installatie ≠ bescherming tegen XSS;
  - backupherstel ≠ automatisch ownership bewijs.

### Exit gate

- 0 open P0/P1 security/privacy/consent findings.
- Production dependency audit schoon of expliciet geaccepteerd zonder high/critical.
- Core + full browser + device + production-PWA suite groen op dezelfde candidate.
- Geen onverklaarde flaky of stale test.

---

# FASE 5 — Fysieke hardware gate

**Doel:** automatisering confronteren met echte WebKit/browser/storage/camera/inputrealiteit.

## Harde primaire gate

Minstens één actuele fysieke iPhone:

### Safari browser

- fresh first visit + onboarding;
- Soft Gate/browser-risk banner;
- profiel maken en antwoorden;
- encrypted export vóór installatie wanneer browserdata bestaat;
- Chrome/Safari install-copy visueel controleren waar relevant;
- QR camera permission, close, reopen;
- keyboard auto-zoom;
- safe areas/notch;
- background → resume;
- Share Sheet return;
- PDF export.

### Installed PWA

- fresh standalone launch;
- runtime werkelijk standalone;
- restore bestaande browserdata vóór onboarding;
- lock/unlock;
- profile + questionnaire;
- scan/import partnerprofiel;
- compare;
- contract sign/scan/lifecycle;
- scene + consent lock;
- PDF;
- offline cold start zonder vooraf elke route te bezoeken;
- service-worker update;
- background/resume;
- camera lifecycle na suspend/resume.

## Sterk aanbevolen secundaire matrix

- kleine + grote iPhone viewport/device indien beschikbaar;
- iPad portrait + landscape;
- recente Samsung/Android Chrome;
- iOS Chrome browserflow;
- minstens één in-app browser voor de escape-instructie.

## Handmatige accessibility gate

- VoiceOver: onboarding, statuskeuzes, Soft Gate, sheets, contract signing;
- reduced motion;
- grotere tekst/zoom;
- focus/keyboard op tablet/desktop waar relevant;
- status/boundaries begrijpelijk zonder alleen kleur.

### Stopregel

Een hardwarebug in storage, offline, consent, QR, camera, lock of datarestore is een releaseblocker. Een puur cosmetisch iPad-whitespaceprobleem is dat niet automatisch.

### Exit gate

Een korte handmatige sign-off noteert per device/browser:

- versie;
- browser/runtime mode;
- doorlopen critical flow;
- gevonden afwijkingen;
- fix/acceptance.

Geen “werkt op mijn telefoon” zonder vastgelegde route.

---

# FASE 6 — Release governance en `dev → main`

**Doel:** de deploymentroute zelf mag niet de laatste bron van onzekerheid zijn.

## 6A. Main beschermen

Vóór de promotion:

- `main` PR-only;
- force pushes uit;
- relevante required checks afdwingen;
- directe production changes alleen via expliciete hotfixroute.

`dev` blijft de speelkamer; `main` wordt de releasebranch.

## 6B. Historie reconciliëren

`main` en `dev` zijn momenteel gedivergeerd. `main` bevat één unieke historische commit (#277), terwijl `dev` veel verder staat.

Voor promotion:

1. semantisch controleren of #277 volledig/equivalent in huidige `dev` aanwezig is;
2. niet blind force-resetten;
3. geen oude code terugmergen alleen om de graph mooier te maken;
4. promotion PR moet exact documenteren hoe de divergence wordt opgelost.

## 6C. Stale automation/dependency PRs opruimen

- Dependabot-PRs die nog tegen oud `main` staan: opnieuw beoordelen tegen RC `dev`;
- relevante security bump porten naar `dev` en door normale gates;
- irrelevante/stale PR sluiten met reden.

## 6D. Promotion PR

De `dev → main` PR bevat **geen nieuwe featureontwikkeling**.

Voor de exacte promotion head:

- lint/unit/build groen;
- full Playwright browser suite groen;
- launch-device smokes groen;
- production PWA/offline groen;
- production dependency audit akkoord;
- geen open reviewthreads;
- hardware sign-off aanwezig;
- release notes / trustcopy actueel.

### Exit gate

Alleen de exact geteste head mag naar `main`.

---

# FASE 7 — Production smoke en public launch

Na merge/deploy van `main` nog één korte productiecontrole op het echte domein.

### Production smoke

- fresh browser load;
- manifest/icon/installability;
- PWA launch;
- offline launch;
- nieuw profiel;
- encrypted backup export + import;
- QR profile roundtrip op tweede toestel;
- compare;
- contract create/sign/QR;
- scene consent;
- PDF;
- update/service-worker gedrag;
- About/Security/trustcopy bereikbaar;
- geen onverwachte network/API afhankelijkheid voor core use.

Als productie anders gedraagt dan de RC-preview: rollback of fix vóór publieke aankondiging.

### Launch GO

KinkSync is pas **PUBLIC LAUNCH GO** wanneer alle volgende voorwaarden tegelijk waar zijn:

- [ ] directionality-stream geïntegreerd en scope frozen;
- [ ] testfixtures/readiness betrouwbaar;
- [ ] Soft Gate + browser→standalone recovery af;
- [ ] XSS/injection/CSP audit gesloten;
- [ ] finale UI/UX-pass gesloten;
- [ ] 0 open P0/P1 security/privacy/consent findings;
- [ ] production dependency audit aanvaardbaar;
- [ ] fysieke iPhone Safari + standalone PWA sign-off;
- [ ] releasebranch/governance op orde;
- [ ] exacte promotion head volledig groen;
- [ ] production smoke groen.

---

## 8. Wat expliciet postlaunch blijft

Tenzij een prelaunch-audit een concreet blockerprobleem bewijst:

- nieuwe sociale/group-room features;
- pair-scoped kink preference overlay;
- bredere Agreement Archive/Evolution View-architectuur;
- FetLife/importuitbreidingen en andere research-heavy external imports;
- directionele catalogusuitbreiding buiten de huidige expliciet geaudite prelaunchscope;
- Sheet-primitives samenvoegen;
- globale z-index tokenisatie;
- brede spacing-tokenrefactor;
- routearchitectuur volledig harmoniseren;
- luxe tablet/desktop redesign;
- motion consolidation / brand micro-polish;
- featurewerk dat de launchfinish opnieuw verplaatst zonder privacy-, consent-, durability- of core-UXwinst.

---

## 9. Harde stopmomenten voor autonome uitvoering

Stop en vraag om een productbeslissing wanneer:

- Soft Gate de gebruiker structureel moet blokkeren in plaats van waarschuwen/checkpointen;
- een high-value mutation policy substantieel strenger wordt dan hierboven beschreven;
- CSP alleen haalbaar lijkt met brede securityverzwakkingen of een grote architectuurrewrite;
- directionality nieuwe scoringsemantiek vereist buiten expliciete complementary matching;
- een legacy migration oude antwoorden naar meerdere nieuwe betekenissen zou moeten kopiëren;
- hardwaregedrag strijdig blijkt met de storage-/standalone-aannames;
- `main`'s unieke #277 semantiek niet aantoonbaar in `dev` aanwezig is;
- een package-install/new dependency nodig lijkt;
- een fix een brede prelaunchrefactor vereist met regressierisico groter dan de bewezen bug.

---

## 10. Bewijs per fase

Elke fase die als DONE wordt gemarkeerd krijgt minimaal:

- PR/commit;
- welke invariant is veranderd of juist behouden;
- relevante unit/e2e/PWA-resultaten;
- eventuele hardwarebewijsnotitie;
- expliciete deferred findings met reden.

Geen fase wordt gesloten op “ziet er goed uit” of “CI was groen” wanneer de relevante eigenschap niet daadwerkelijk door die CI werd getest.

---

## 11. Kortste kritieke pad vanaf nu

Als het parallelle directionality-werk netjes landt, is het resterende kritieke pad:

**meetlat herstellen → Soft Gate → XSS/CSP → UI/UX eindpass → geïntegreerde delta-audit → fysieke iPhone/PWA → release governance → dev→main → production smoke → launch.**

Dat is bewust conservatief op data/consent en agressief in scopecontrole: geen rewrite, geen eindeloze polish, geen nieuw featureseizoen vlak voor de deur opengaat.
