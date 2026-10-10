# KinkSync: consistente identiteit en grenzen van eigen onderwerpen

**Datum:** 2026-10-10  
**Status:** ontwerp ter review; geen productcode gewijzigd  
**Basis:** `dev` @ `cc751e28c1e6c3cff85773bb846e96d056b3eadd`  
**Relevante open PR:** #472 @ `2c254c83a3b3cac4bf2d859fe34f04834857dd63` (niet aanpassen)  
**Werkbranch:** `safety/custom-subject-semantics-20261010`

## 1. Intentie en gebruikersbelofte

Een KinkSync-gebruiker moet erop kunnen vertrouwen dat een eigen onderwerp, een uitgesproken grens en een eventuele afspraak tijdens het traject Person → Relationship → Agreement dezelfde expliciete betekenis houden.

**Doel:** voorkom dat gelijknamige maar onafhankelijke onderwerpen automatisch als gedeeld worden behandeld, dat eigen harde grenzen onder algemene bespreekpunten terechtkomen, of dat notities/relatiegeheugen zich hechten aan het verkeerde onderwerp.

**Vaste constraints:** geen impliciete consent; privacyfilter vóór interpretatie; geen automatische koppeling op naam of rol; bestaande ondertekende documenten, QR-protocollen en bewijsketens intact; local-first en offline blijven geldig. De semantiek volgt `PRODUCT.md`, `philosophy.md`, `directie.md`, `UI-principles.md`.

## 2. Vastgestelde huidige codepaden

1. `lib/compareV2.ts` koppelt eigen onderwerpen alleen als **ID én exacte naam** overeenkomen; anders zijn ze `unpaired`. De bestaande unit-test in `__tests__/compare.test.ts` vereist dat twee onafhankelijk gemaakte gelijknamige onderwerpen niet gematcht worden.
2. `app/contract/page.tsx` groepeert dezelfde eigen onderwerpen via `name.trim().toLowerCase()`, en kan daardoor onafhankelijke antwoorden samenvoegen.
3. In die contractpagina classificeren custom-onderwerpen alleen als `shared` of `discuss`; een `hard_no` wordt daar niet naar `hardLimits` / `hardLimitDetails` geleid.
4. `app/contract/page.tsx` en `components/contract/ContractSection.tsx` identificeren bewerkbare notities en opengeklapte editors met `scope + item.name`. Gelijknamige rijen kunnen elkaar daardoor beïnvloeden.
5. `lib/compareDiscussionMemory.ts` correleert de inhoud van een contract met een besproken vergelijkingsfeit via genormaliseerde onderwerpnaam, omdat `ContractVersionContent` geen bron-ID van een onderwerp bevat. Dit is een apart pad waar gelijknamige onderwerpen nog ambigu kunnen zijn.
6. `lib/matching.ts` gebruikt deels andere classificaties dan `classifyStatusPair()`; catalogus-brede consolidatie zonder afzonderlijke regressieanalyse is onveilig.
7. De drie betreffende codepaden `app/contract/page.tsx`, `lib/compareV2.ts` en `lib/compare.ts` hebben identieke blobs op `dev` en PR #472. Dit is bestaande schuld, niet bewezen redesignregressie.

Dit zijn broncodebevindingen, nog geen tegen de huidige code uitgevoerde nieuwe regressietests.

## 3. Afgewogen oplossingen

**A. Patch alleen de contractpagina.** Kleine wijziging, maar dubbele classificatie en naamgebaseerde notities/relatiegeheugen blijven; afgewezen.

**B. Gedeelde interpretatie, afzonderlijke contractprojectie met expliciete bronidentiteit (gekozen).** `buildCompareModel()` en `classifyStatusPair()` leveren zichtbare feiten voor custom-onderwerpen. Een kleine pure `projectCustomContractEvidence()`-functie vormt deze feiten om tot bestaande contractsecties, en blijft leesbaar/testbaar zonder React.

**C. Alle vergelijking, contracten, scènes en historische data herstructureren.** Brede wijziging, geen gecontroleerde fix; afgewezen.

## 4. Semantisch contract

### 4.1 Bronnen en identiteit

- Een eigen onderwerp is geankerd aan een specifieke `(profileId, customKinkId, name)`. De titel alleen is nooit koppelbewijs.
- Koppeling tussen twee personen is uitsluitend toegestaan wanneer hun zichtbare eigen onderwerpen dezelfde `id + name` hebben, volgens het bestaande Compare-v2-contract. Niet overeenkomende IDs, ondanks gelijke titels, blijven **twee afzonderlijke eenzijdige feiten**.
- Een identieke ID met een afwijkende naam vormt **geen** bewezen match. Bestaande legacy-hulpfuncties die namen samenvoegen mogen dit contract niet omzeilen.
- `profileA.id === profileB.id` levert geen contractprojectie op; waar nodig blijft de bestaande pagina-selectiegate leidend.
- De status van het onderwerp wordt uitsluitend gelezen na `visibleStatus` / `comparableEntry`. Verborgen data mag ook niet via aantallen, eigen-ID, ontbrekende tegenpartij, hard-limit-tekst of source metadata lekken.

### 4.2 Classificatie

Voor **bewezen gepaarde custom**-onderwerpen gelden de statusparen uit `classifyStatusPair()`:

- `shared` of `complementary` → `shared` in de contractvoorbereiding als gespreksbasis, nooit als toestemming.
- `soft` → `softLimits`.
- `discuss` → `discuss`.
- `conflict` of `limit` → `hardLimits` én `hardLimitDetails`, met correcte herkomst: A, B of beiden.

Voor **niet gepaarde custom**-onderwerpen:

- Zichtbare `hard_no` → `hardLimits` en `hardLimitDetails`, ook als de ander geen publiek antwoord heeft. De andere kant blijft `status: null` zonder privé-informatie te suggereren.
- Elke andere zichtbare status → afzonderlijke `discuss`-rij; **nooit shared** en nooit ingevuld antwoord voor de andere persoon.
- Geen zichtbaar antwoord → geen rij.
- Beide kanten private → geen rij en geen aantalsignaal; één publiek + één privaat antwoord → alleen het publieke feit.

Onderwerpen uit de gewone catalogus blijven in deze slice in hun huidige classificatiepad. Expliciet níet alle `kinkMatchScore`-gevallen stil naar Compare-v2 migreren. Verschillen zoals `willing + willing` worden uitsluitend voor de custom-projectie conform Compare-v2 behandeld; een bestaande catalogusbrede betekeniswijziging vraagt een eigen ontwerpbesluit.

### 4.3 Bronidentiteit in contractvoorbereiding

De pure projectie produceert per detail naast de presentatiegegevens een **stabiele bronkey** uit `kind`, de betrokken `profileId`s en hun daadwerkelijke `kinkId`s. Gebruik een deterministische tuple-encoding (bijv. `JSON.stringify`), geen titelgebaseerde sleutel.

- In de editor gebruiken `ContractSection` en `contractNotes` die bronkey voor React keys, het openzetten van editors en de notities per partij.
- De zichtbare titel blijft behouden. Voor twee gelijknamige onafhankelijke items maakt de presentatie met een rustige herkomstvermelding duidelijk dat het afzonderlijke onderwerpen zijn. Geen nieuwe badges of grote visuele redesign.
- Een naamswijziging mag een oude notitie niet naar een ander onderwerp kopiëren; de identiteit blijft leidend. Bij wisseling van A/B verliest geen notitie stil de eigenaar.

### 4.4 Relatiegeheugen en versiegebonden bronverwijzing

De huidige naamgebaseerde overeenkomst in `relevantAgreementMeaning()` is niet voldoende voor nieuwe gelijknamige rijen. Voor **nieuw** opgeslagen contractversies krijgt `ContractKinkDetail` en, wanneer nodig voor harde-grens-koppeling, `ContractHardLimit` een **optionele, getypeerde bronreferentie**:

- `sourceKind: "catalog" | "custom"`.
- `sourceAId?: string`; `sourceBId?: string` koppelen uitsluitend zichtbare expliciete bronentries aan de betreffende `ContractParticipant.profileId`.
- Geen bron-ID voor een verborgen/ontbrekende zijde. Geen inferred pair.
- In het relatiegeheugen krijgt matching op zulke nieuwe source-referenties voorrang en vereist zij exacte persoon+entry-identiteit. Een niet-overeenkomende nieuwe bronreferentie mag **niet** alsnog op naam matchen.
- Historische contractversies zonder die velden behouden hun bestaande naamgebaseerde *read-only* compatibiliteitsinterpretatie; vermeld die ambiguïteit in tests/documentatie, zonder retroactieve migratie.
- `schema: 1` blijft voor dit optionele uitbreidingspad behouden **alleen mits** regressies bewijzen dat alle bestaande protocol- en leesconsumenten optionele velden tolereren; bij mislukken van die tests wordt dit deel afzonderlijk gesplitst naar een expliciet versioned vervolgontwerp en gaat het niet stil mee.

Geen nieuwe automatische agreement-toestemming. Geen contractstatus- of consentbeslissing op basis van deze referenties.

### 4.5 Historische bewijzen

- Geen mutatie van reeds opgeslagen `ContractVersionContent`, hashes, handtekeningen of oude PDF-artefacten.
- Nieuwe velden maken alleen deel uit van nieuw opgestelde inhoud en worden **vóór** hashing/ondertekening vastgezet.
- Na tekenen/activeren zijn bronreferenties onveranderlijk onderdeel van de ondertekende payload; PDF, QR en herstel blijven exact op de inhoud van die versie gebaseerd.
- Als semantische wijzigingen in de composer een historische rij veranderen, gebeurt dat alleen bij het nieuw opstellen van een **nieuwe versie**, niet door bestaande documentinhoud opnieuw te projecteren.

## 5. Componentgrenzen / geraakte bestanden

**Noodzakelijke kern**
- `lib/compareV2.ts`: bestaande zichtbare pairing/classificatie hergebruiken, geen ongemotiveerde rewrite.
- `lib/contractCustomProjection.ts` (nieuw): pure omzetting van zichtbare custom-facts/unpaired naar conceptsecties met stabiele bronkeys.
- `app/contract/page.tsx`: vervang uitsluitend de naamgebaseerde custom-merge; bind correcte secties en editoridentiteiten.
- `components/contract/ContractSection.tsx`: optionele itemkey voor editor en notitiecallbacks met backward-compatible fallback.
- `lib/contractLifecycle.ts`: optionele metadata op nieuwe contractdetails/hard limits, zonder schema- of lifecycle-wijziging tenzij tests een compatibiliteitsprobleem aantonen.
- `lib/compareDiscussionMemory.ts`: exacte nieuwe source-match met veilige legacy-fallback.

**Tests**
- Nieuwe of uitgebreide unit-tests voor pure contractprojectie en `discussionFingerprint`.
- `e2e/contract.spec.ts`: echte DOM-validatie voor dubbele namen, harde grens, gescheiden notities, privacy, A/B.
- De bestaande `__tests__/compare.test.ts`, `__tests__/contractLifecycle.test.ts`, `__tests__/contractStateMachine.test.ts`, `__tests__/contractHandwriting.test.ts`, privacytests en QR/backup/PDF-tests blijven deel van de regressiepoort.

**Buiten scope:** opnieuw stylen van Home/Compare, thema, onboarding, contractconcepten zonder handtekeningen, algemene catalogusclassificatie, scènes, gegevensmigratie, npm-audit oplossen of PR #472 herwerken.

## 6. Teststrategie: reproduceer eerst

1. Op geïsoleerde worktree/branch vanaf vastgelegd `dev`-SHA, schone dependency-lock en gegarandeerd eigen testserver.
2. Meet bestaande tests als baseline. Leg vervolgens **rode** tests vast voor:
   - aparte ID, zelfde titel, beide positief → geen gedeelde custom-rij;
   - eenzijdige openbare `hard_no` → zichtbare harde grens;
   - openbare versus private custom-antwoord → geen afleiding/lekkage;
   - twee eigen rijen met dezelfde naam → onafhankelijke notities/editorstatus;
   - custom-source metadata en overeenkomst met `Besproken` → alleen relevante regel;
   - A/B-wissel → correcte statuszijde en bronidentiteit;
   - beide ondertekeningsroutes, oude hash/handtekening en QR/PDF/backups → ongewijzigd.
3. Fix één foutketen tegelijk en bevestig red→green; geen bundel cosmetische refactors.
4. Draai volledig `lint`, TypeScript, unit tests, build en de relevante Playwright-tests, mobiel (390×844) en desktop. Vergelijk huidige en nieuwe contractweergave met screenshots in beide thema's als de UI verandert.
5. Herhaal de privacy-, offline-, PWA- en contractprotocolregressies. Laat GitHub en Vercel op **exact dezelfde SHA** controleren. Alleen een afzonderlijk gedocumenteerde bestaande `npm audit`-blokkade mag als blokkade gerapporteerd worden; niet bypassen of claimen dat de releasegate groen is.
6. Geef per issue een compacte bewijsketen: test die vóór fix faalde, fixcommit, test na fix, regressiecontrole. Geen merge zonder voltooide poorten en review.

## 7. Acceptatie

- Dezelfde zichtbare brongegevens geven in Compare en de custom-secties van Contract **geen tegenstrijdige matching of grensinterpretatie**.
- Namen zijn presentatietekst, niet identiteit; notities, nieuwe contractbronnen en nieuwe discussie-invalidering zijn op expliciete bronidentiteit verankerd.
- Geen private response, afgeleid privégegeven of zelfstandig ingevulde tegenpartijstatus lekt.
- Ongetekend en ondertekend blijven onderscheiden; historische contracten, hashes, QR en PDF's wijzigen niet.
- Release met aantoonbaar geteste resultaten op exacte commits; audit failures blijven zichtbaar.
- Op geen enkel moment wordt PR #472 gewijzigd als bijwerking van deze fase.

## 8. Gedocumenteerde risico's en stopcriteria

- De **legacy** overeenkomst tussen historische contractregels en `Besproken` blijft naamgebaseerd zolang oude documenten geen source metadata bevatten. Dit is een onvermijdelijke read-only compatibiliteitsbeperking, geen claim van volledige historische identiteit.
- Indien optionele metadata onverwachts compatibiliteitschecks breken, stopt de ondertekenings-/metadata-slice: behoud eerst de veilige custom-classificatiefix op de geïsoleerde branch en ontwerp daarna een expliciete protocolversie. Geen ongeteste schema-migratie.
- Indien een live test aantoont dat independent equal-name items op een andere wijze bedoeld waren, wijzig niet stil `compareV2`; vraag een semantisch besluit voordat de identiteit verandert.
- Betrouwbaarheid is aantoonbaar met reproducties, niet een percentage of een veronderstelde groene test.

## 9. Implementatie-gates (Superpowers)

1. Ontwerpdocument goedkeuren.
2. Daarna een toetsbaar, file-by-file implementatieplan schrijven en laten beoordelen.
3. Pas daarna productcode aanpassen op deze isolatiebranch met TDD.
4. Onafhankelijke review, CI en visuele controle; PR #472 blijft ongemoeid.