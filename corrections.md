# corrections.md — mistake log

Read at session start. Never repeat a logged mistake. Append new entries when something goes wrong.

Format: `## YYYY-MM-DD — <short title>` then what went wrong and the rule to follow instead.

---

## 2026-08-11 — De voortgang at de onderkant van de vraagkaart op

**What went wrong:** De dedicated Questions-route kreeg boven de triagekaart een volledige voortgangsheader met label, infoknop, balk en percentage. Op iPhone Safari bleef daardoor te weinig verticale ruimte over: de statuskeuzes waren zichtbaar, maar `Eerst vragen`, `Eerste keer` en `Later` vielen onder de fold. De kaart zelf was niet te groot; dubbele chrome stal de viewport.

**Rule:** Een gefocuste one-question-per-screen flow krijgt een expliciet viewportbudget. Globale/routechrome mag de primaire kaart niet onder de fold duwen. Stop compacte voortgang in bestaande navigatiechrome, laat detailtellers op de kaart zelf staan en bewijs op een 390×844 mobiele viewport dat de onderste primaire affordances zonder scroll zichtbaar zijn. Scroll blijft alleen fallback voor echt korte schermen en uitgeklapte details.

---

## 2026-08-08 — Dependency-setup zat in de verkeerde speelkamer

**What went wrong:** Na het aantrekken van `worktree-arousal` bleef de shell in de hoofdcheckout hangen en liet daar `npm ci` los — braaf commando, verkeerde speelkamer. Die run faalde ook omdat npm zijn standaardcache onder `/root/.npm` niet kon aanmaken. Er zijn geen tracked bestanden gewijzigd, maar de geïsoleerde-worktreegrens werd operationeel wel overschreden.

**Rule:** Klik de riem vast vóór iedere install-, test-, build- en edit-opdracht: zet `workdir` expliciet op de actieve worktree en laat `git branch --show-current` bewijzen dat de shell in de juiste kamer zit. Geef npm in deze sandbox expliciet een schrijfbare cache buiten de repository; de standaardcache onder `/root/.npm` blijft verboden terrein.

---

## 2026-08-05 — PR-metadata werd per ongeluk als repositorybestand behandeld

**What went wrong:** Bij het bijwerken van de PR-beschrijving werd de contents-API aangeroepen met een nieuw tijdelijk pad in plaats van de pull-requestmetadata-API. Daardoor verscheen kort een betekenisloos bestand op de featurebranch. Het bestand is onmiddellijk verwijderd en heeft de producttree niet veranderd.

**Rule:** Titel, body, base en reviewstatus van een PR worden uitsluitend via de pull-request-API gewijzigd. Gebruik `create_file`/`update_file` alleen wanneer het bedoelde eindresultaat werkelijk een repositorybestand is; controleer vóór iedere write dat resource-type en toolnaam overeenkomen.

---

## 2026-07-28 — Twee schrijvende workflowtriggers botsten op dezelfde branch

**What went wrong:** Een tijdelijke transform-workflow luisterde tegelijk naar `push` en `pull_request synchronize`. Eén stagingcommit startte daardoor twee identieke schrijvers. Beide doorliepen tests en build; de eerste pushte de bewezen productcommit, de tweede werd terecht als non-fast-forward geweigerd.

**Rule:** Een workflow die naar zijn eigen featurebranch schrijft krijgt exact één triggerpad. Gebruik voor een open same-repo PR uitsluitend `pull_request: synchronize`, of uitsluitend `push`, maar nooit beide. Een afgewezen tweede push is geen codefout: controleer eerst of de andere run dezelfde bewezen commit al heeft geland.

---

## 2026-07-28 — Een QR-header mag de payload niet als scheidingsteken behandelen

**What went wrong:** De eerste multi-QR-parser gebruikte `split(".")` voor de volledige tekenreeks en verwachtte exact vijf delen. De v3-payload begint zelf met `3r.` of `3d.`, waardoor de eerste QR een extra punt bevatte en als ongeldig werd afgewezen. De regressietest stopte de productcommit vóór de build.

**Rule:** Parse een transportheader begrensd en behandel alles na het laatste vaste headerveld als opaque payload. Gebruik geen onbeperkte `split()` wanneer dezelfde delimiter legaal in de payload kan voorkomen. Test altijd het eerste én laatste chunk met echte formaatprefixen, plus uit-volgorde en dubbele delen.

---

## 2026-07-28 — Een redundant icoon maakte de informatie niet redundant

**What went wrong:** De opdracht was om het redundante info-icoon op de kinkkaart te vervangen door het privé-oogje. Dat werd te breed geïnterpreteerd als toestemming om ook de achterliggende `InfoSheet` uit de flow te verwijderen. De trigger was redundant; de inhoud bleef waardevol.

**Rule:** Wanneer een affordance wordt vervangen, behandel trigger en bestemming als twee aparte beslissingen. Verwijder alleen het expliciet genoemde icoon of bedieningselement. Behoud de achterliggende informatie of actie en geef die een nieuwe, semantische ingang — hier: tikken op kinknaam of beschrijving — tenzij de eigenaar ook expliciet vraagt de inhoud te schrappen.

---

## 2026-07-27 — De klik kende de nieuwe kamer, de oude voordeur niet

**What went wrong:** De local-first PR canonicaliseerde oude `/profile/<id>`- en `/scenes/<id>`-links alleen wanneer een klik binnen een reeds geladen app werd onderschept. Het profielaanmaakformulier gebruikte bovendien nog rechtstreeks `router.push('/profile/<id>')`. Een koude Safari/PWA-documentnavigatie naar zo'n nieuw, nooit gewarmd ID passeert geen kliklistener en vroeg de service worker om een document dat niet in de cache bestond. iOS toonde daarom “This page couldn’t load”, ondanks dat de lokale data en de vaste shell beschikbaar waren.

**Rule:** Backward compatibility voor documentroutes hoort in de service worker, niet alleen in een DOM-clickhandler. Iedere legacy dynamische profiel- of scèneroute moet bij netwerkfalen de vaste geprecachete shell krijgen; die shell leest het ID client-side uit óf de querystring óf het actuele pathname. De offline-e2e moet records pas na de netwerkknip toevoegen en vervolgens hun oude URL rechtstreeks openen, zodat per-ID warming de test niet vals groen kan maken.

---

## 2026-07-27 — De vaste profieldeur droeg de buildtijd-ID naar binnen

**What went wrong:** De nieuwe `/profile?id=<id>`-shell las `searchParams` in een server page en gaf daaruit een Promise aan het client-profielscherm. De service worker cachet één statisch `/profile`-document met `ignoreSearch`; dat document was tijdens build/warming zonder `id` gerenderd. Bij een echte offline Safari-navigatie bleef de zichtbare URL wel `?id=…` bevatten, maar de gehydrateerde component ontving de ingebakken lege buildtijd-ID en toonde “Profiel niet gevonden”. Tegelijk kon de harde documentnavigatie plaatsvinden zodra React het nieuwe profiel zag, vóór Zustand persist het profiel aantoonbaar naar `localStorage` had geschreven. Beide fouten leiden op toestel tot hetzelfde scherm. Unit-, TypeScript- en buildpoorten konden dit niet zien; alleen de fysieke toestelpoort legde het bloot.

**Rule:** Een query-shell waarvan één gecachet HTML-document meerdere lokale records bedient, moet de record-ID client-side uit de actuele `window.location`/`useSearchParams()` lezen. Geef nooit server-gerenderde `searchParams` door als recordidentiteit wanneer de documentcache querystrings negeert. Voor een harde navigatie na een lokale create moet bovendien eerst worden bewezen dat precies die nieuwe ID in de persisted store staat. De koude offline e2e moet de pagina na netwerkknip én reload openen; zonder uitvoerbare browserbinary blijft de PR draft tot een echt toestel dit bewijst.

---

## 2026-07-26 — Een handmatig herbouwde package.json brak vóór de code begon

**What went wrong:** Om Vitest tijdelijk vóór de Vercel-productiebuild te laten lopen, werd `package.json` via de contents-API volledig herschreven. Daarbij schoof `jsqr` onbedoeld van `^1.4.0` naar `^1.4.1`, terwijl `package-lock.json` onveranderd bleef. `npm ci` stopte daardoor onmiddellijk. Omdat de Vercel-status alleen “failure” toonde, leek de nieuwe local-first architectuur verdacht en volgden meerdere onnodige isolatiebuilds.

**Rule:** Bij een tijdelijke scriptwijziging mag geen dependencyregel worden gereconstrueerd uit geheugen of een oudere fetch. Vergelijk `package.json` byte-voor-byte met de branchbasis, wijzig uitsluitend de bedoelde scriptregel en controleer vóór push dat `git diff -- package.json package-lock.json` geen dependency- of lockfileverschil bevat. Een build die vóór de normale compileduur faalt krijgt eerst een manifest/lockfile-alibi voordat architectuurcode wordt teruggedraaid.

---

## 2026-07-23 — De offline-wachthond opende eerst zelf elke deur

**What went wrong:** De productie-mode offline e2e bezocht vóór het uitschakelen van het netwerk iedere route online. Daarmee bewees hij alleen runtime-cache-na-eerste-bezoek, terwijl de bedoelde PWA-eigenschap was dat de hele lokale app na één online start beschikbaar blijft. De `/offline` fallback maakte de regressie vriendelijker zichtbaar, maar veranderde elke nog niet bezochte pagina in een feitelijke “verbind eerst”-poort.

**Rule:** Een offline-first regressietest mag online alleen de startpagina openen. Daarna moeten alle vaste routes, opgeslagen profielroutes, opgeslagen scèneroutes en App Router-tabnavigatie offline werken. Alleen werkelijk onbekende dynamische routes mogen naar de offline fallback vallen.

---

## 2026-07-11 — A green suite that never ran the code: the stale-server mirage

**What went wrong:** A full e2e run reported 178 passed while one of its tests (`ui-audit` DNA bar) *cannot* pass against dev's code — the asserted `aria-label` only exists on main. `playwright.config.ts` had `reuseExistingServer: true`, so the run almost certainly latched onto a stale dev server left on :3000 by an earlier session, and "verified" old code. Compounding it, the test's seed used v8-era kink ids that no longer exist, so its content assertions passed vacuously on an empty overview.

**Rule:** A verification run must own its server. Run gate-keeping e2e with `CI=1` (config now sets `reuseExistingServer: !process.env.CI`) or confirm nothing is listening on the port first (`ss -ltnp | grep :3000`). And when a spec guards seeded content, assert the *count* ("5 beoordeeld"), never the mere presence of a word that also appears in the empty state.

---

## 2026-07-11 — PIN mid-onboarding summoned the lock screen, wizard woke up amnesiac

**What went wrong:** Onboarding's PIN step called `setAppLockPin(hash)`, which flipped `appLockEnabled` in the store. `HomeContent`'s lock effect saw the flip, checked a `useRef` **snapshot** of `sessionStorage.app_unlocked` taken at mount (false on a fresh install), and set `lockState = "locked"`. The lock gate renders *before* the onboarding gate, so `<Onboarding>` unmounted, its local `step` state died, and after unlocking the wizard restarted at slide one. This bug had been fixed before and was reintroduced — the e3c5494 fix only covered re-navigation, and the Phase 17 monolith split preserved the stale-ref pattern.

**Rule:** Enabling the app lock must never lock out the person who just enabled it. (1) Any flow that calls `setAppLockPin` while the user is present sets `sessionStorage.app_unlocked = "1"` *before* the store write. (2) The lock effect reads `sessionStorage` **live**, never a mount-time ref/snapshot — session flags raised mid-session must be honoured. (3) The regression test lives in `e2e/new-user.spec.ts` ("pin instellen gooit de wizard niet terug naar slide één") — it was proven red against the broken code; keep it green.

---

## 2026-07-10 — The watchdog was asleep: e2e specs rot silently

**What was found:** Phase 30's "guard" (`new-user.spec.ts`) was 4/5 failing on dev *before any change* — the PIN step (added June 3) and the L-01 age-gate fix had changed the onboarding flow, and nobody re-ran the spec. It sat broken for five weeks while unit tests stayed green.

**Rule:** When a user flow changes, run its e2e spec in the same session and fix it in the same commit. And before trusting any spec as a regression guard, run it against unchanged code first — a failing baseline means the spec, not your change, is the suspect.

## 2026-07-09 — "Regression" reports need a git alibi before agreement

**What nearly went wrong:** The owner reported compare-page badges "losing kink colors" as a regression. It pattern-matched perfectly to the evening's refactors (status labels had just been centralised in that exact file). Agreeing on vibes would have sent the session hunting a regression in commits that were innocent.

**What the history showed:** `git show` on `StatusBadge` across `d2e8f69`, `629419b`, and the pre-June-16 revision proved the badges had *always* worn person colours — a standing design decision from the compare redesign, never a break. The critique was still right (fixed as Phase 27a); the framing was not.

**Rule:** When anything is called a regression — by the owner, a test, or your own gut — trace the exact lines through git history *before* agreeing or acting. Answer with the alibi: "changed in X / never existed / broke in Y." A design flaw and a regression get different treatment: flaws get a design pass, regressions get a revert-or-fix against the last good commit.

## 2026-07-09 — Backlog claims drift from the code they describe

**What went wrong:** Phase 24b's ledger note said `hard_no` drifted between "Grens" (app) and "Harde grens" (contract PDF) — implying the contract was the outlier. The code said the opposite: six of eight surfaces (including the status explainer that *defines* the vocabulary) said "Harde grens"; the two newest triage components were the strays. The fix direction only came out right because the code was re-read at execution time.

**Rule:** Backlog/plan entries are hypotheses, not facts. Before executing any phase written in an earlier session, re-verify its claims against the live code — especially claims about which side of an inconsistency is canonical.

## 2026-06-22 — Phase 10: ambient animation misfired

**What went wrong:** Replaced the working `ks-shimmer` wordmark animation with a trailing cursor `_` pulsing at 1.8s, opacity 1 → 0.22. It read as a notification dot, not ambient motion. PR #219 was opened and then closed same evening.

**Specific failures:**
- Cycle 3× too fast (1.8s vs the original 5.5s shimmer)
- Opacity swing of 78% — way too deep for "subtle"
- Terminal-cursor motif clashed with the Cormorant Garamond editorial wordmark
- Killed the original shimmer instead of coexisting with it

**Rule:** Ambient motion on brand elements must use ≥ 3s cycle and ≤ 30% opacity swing. Don't replace existing brand motion — coexist with it. Match the design vocabulary of the surface.

---

## 2026-06-20 — Chart denominator double-counted soft limits

**What went wrong:** `app/compare/page.tsx` manually computed `discussCount` by absorbing `counts.soft` into it. `ContractTrendsChart` then added `soft` again in its denominator (`match + discuss + soft + hard`), double-counting soft limits and deflating `verbond %` for every contract saved after the change.

**Rule:** Keep four disjoint buckets: `matchCount`, `softLimitCount`, `discussCount`, `hardLimitCount`. Never collapse `soft` into `discuss`. The chart's denominator sums all four — they must be mutually exclusive.

---

## 2026-06-20 — Ledger theme contrast failure

**What went wrong:** Ledger `--accent` was set to `#C73E2E` (cochineal) which failed AA contrast (~3.7:1) on all surfaces. `--on-accent` was bone `#F4ECDF` (light on dark), which was also wrong once the accent was brightened.

**Rule:** Check contrast ratios before shipping any colour token. When brightening an accent colour, flip `--on-accent` to dark text (`#160806`) — lighter backgrounds need dark foregrounds.

---

## 2026-06-19 — Worktree letter tracking missed local branches

**What went wrong:** When computing the next alphabetical kink word for a new worktree, only remote branches on `origin` were checked. A local branch (`worktree-inversion`) was missed, causing a letter collision.

**Rule:** Always check both local and remote branches: `git branch -a | grep worktree-`. Never rely on `remotes/origin/` alone.

## 2026-08-05 — De zojuist vastgelegde API-grens werd meteen opnieuw gebroken

**What went wrong:** Meteen na het documenteren van de scheiding tussen PR-metadata en repositorybestanden werd opnieuw `update_file` gebruikt terwijl `update_pull_request` nodig was. Daardoor werd `CLAUDE.md` tijdelijk ingekort. Het bestand is direct volledig hersteld en heeft opnieuw exact zijn oorspronkelijke blob-SHA.

**Rule:** Na een toolverwisseling geen volgende write op routine uitvoeren. Pauzeer, benoem het gewenste resource-type hardop, controleer de volledige toolnaam en argumenten, en voer pas dan exact één mutatie uit. Voor PR-titel of PR-body is de enige toegestane writer `update_pull_request`.

---


## 2026-08-11 — Een gerichte E2E-wijziging herschreef de hele onboardingguard

**What went wrong:** Tijdens PR #318 moest alleen de laatste profiel-create test van drie naar twee stappen. De contents-rewrite verving echter vrijwel `e2e/new-user.spec.ts`, waardoor bewezen onboarding- en PIN-regressieguards verdwenen en CI op oude selectors vastliep.

**Rule:** Voor een gerichte testflowwijziging blijft de rest van het specbestand byte-identiek aan de branchbasis. Controleer altijd de per-file PR patch vóór de gate; als de diff groter is dan de bedoelde test, herstel eerst vanaf `origin/dev` en pas alleen het minimale blok aan.

## 2026-08-11 — Forge vertrouwde op de inspringing van een heel catalogusblok

**What went wrong:** De eerste Impact-forge probeerde acht opeenvolgende catalogusitems als één exact multiline blok te vervangen. YAML-inspringing maakte die assertion fragiel; de workflow stopte veilig vóór enige wijziging, maar de transform was onnodig breed.

**Rule:** Bij catalogusmigraties elk item afzonderlijk ankeren op zijn stabiele ID en exact één object vervangen. Gebruik een count-assertie per item; bundel nooit meerdere zelfstandige catalogusobjecten in één whitespace-gevoelige match.

## 2026-08-11 — Een semantische ID-split liet contracttests met oude namen staan

**What went wrong:** De Impact-transform werkte, maar de eerste echte unitrun vond stale verwachtingen buiten de directionality-tests: cataloguscount/retire-add ledger en twee questionnaire-fixtures gebruikten nog de oude singles. De suite stopte terecht vóór build en commit. Een vervolgrun maakte vervolgens `sound_deprivation` ten onrechte onderdeel van de historische v2-retirementset, terwijl die ID pas post-v2 werd retired.

**Rule:** Bij iedere pre-launch ID-retirement vóór de eerste volledige unitrun expliciet alle testreferenties naar de oude IDs inventariseren. Houd historische compact-catalogusretirements en latere post-v2 retirements als aparte testsets; actieve fixtures moeten naar één concrete nieuwe betekenis worden gezet en hun oorspronkelijke testsemantiek behouden.
