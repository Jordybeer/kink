# Munch Punch — protocol- en code-audit

Datum: 5 augustus 2026  
Basis: `dev` / `cd9492de8a2a23976c4fc02e0b1ffabf4521befb`  
Werkbranch: `foxtail`

## Privacygrens

KinkSync koppelt geen profielen, namen, verificatiecodes of eigendomssleutels aan deelnemers. Een geldige inzending wordt op het hosttoestel ontsleuteld, meteen opgeteld en daarna niet als individueel antwoord bewaard. Alleen roommetadata, totalen, het aantal inzendingen en hashes tegen exacte replay blijven lokaal staan.

Dit is geen onzichtbaarheidsmantel voor de fysieke ruimte. Mensen kunnen zien wie een QR scant, een scherm fotograferen of sociaal proberen af te leiden wie wat antwoordde. Exact dezelfde response-QR kan worden geweigerd, maar zonder accounts of identiteiten kan KinkSync geen perfecte één-persoon-één-stem-garantie geven.

## Bestaande bouwstenen

- `lib/contractQr.ts` biedt begrensde multi-QR-framing met vaste headers, checksums en volgorde-onafhankelijke assemblage.
- `components/QRScanner.tsx` gebruikt `getUserMedia`, `jsQR`, frame-deduplicatie en een plakfallback.
- `lib/crypto.ts` gebruikt Web Crypto en AES-GCM, maar is wachtwoordgericht en past niet bij een anonieme room.
- `components/sheets/EncryptedBackupSheets.tsx` exporteert expliciet profielen, contracten, contractreeksen en profiel-eigendomssleutels. Een aparte Munch Punch-store blijft daardoor buiten normale backups.
- `lib/offlineRoutes.ts` en de service-worker-warmup maken vaste routes beschikbaar na één online appstart.

## Protocolkeuze

De host maakt per room een tijdelijke ECDH P-256-sleutelpaar. De join-QR bevat alleen de publieke roomsleutel, room-ID, vervaltijd en prompt-ID's. Elke deelnemer maakt voor de inzending een eigen tijdelijke ECDH-sleutel, leidt lokaal een AES-256-GCM-sleutel af en toont één versleutelde response-QR. Alleen de host-private-key kan de response ontsleutelen.

De private roomsleutel leeft uitsluitend in `sessionStorage` en wordt bij sluiten of vervallen verwijderd. Daardoor zit hij niet in KinkSync-backups en overleeft hij geen nieuwe browsersessie. Roomtotalen en replayhashes leven in een afzonderlijke lokale Zustand-store.

## QR-capaciteit

De uiteindelijke codepaden zijn uitgevoerd met acht prompts, een roomtitel, echte P-256-sleutelparen, een 12-byte IV, AES-GCM-tag en een willekeurige response-nonce. Daarna zijn de volledige tekenreeksen met foutcorrectie M als QR gemeten:

| Payload | Lengte | QR-versie bij foutcorrectie M | Modules |
| --- | ---: | ---: | ---: |
| Join-link | 371 tekens | 15 | 77 × 77 |
| Versleutelde response | 376 tekens | 15 | 77 × 77 |

Beide passen in één QR. Compressie en multi-QR zijn voor v1 daarom onnodig en zouden extra parser- en herstelrisico toevoegen. De eerdere ruwe envelopschatting was te optimistisch omdat die niet de volledige URL-prefix en authentieke ciphertext-overhead meenam; bovenstaande waarden komen uit een echte encryptie-roundtrip.

## Conflicten en grenzen

1. De bestaande profielscanner is gekoppeld aan profielpayloads en stopt na één compleet resultaat. De submission station krijgt daarom een eigen scanner die na elke geldige inzending doorloopt.
2. Een webapp kan op een volledig onbekende, offline telefoon niet vanaf nul openen. Host en deelnemers moeten KinkSync minstens één keer hebben geladen terwijl de relevante routes konden worden gecachet.
3. Replayhashes blokkeren exact dezelfde QR. Een deelnemer kan met een nieuw tijdelijk sleutelpaar een nieuwe QR maken; dit wordt bewust niet voorgesteld als sterke stemidentiteit.

## Implementatiekaart

- `lib/munchPunchCatalog.ts`: vaste promptcatalogus en antwoordopties.
- `lib/munchPunch.ts`: roommodel, lifecycle, validatie, aggregatie en small-cell suppression.
- `lib/munchPunchCrypto.ts`: join-envelope, ECDH/AES-GCM-response, authenticatie en replayhash.
- `lib/munchPunchStore.ts`: aparte lokale roomstore zonder ruwe responses.
- `components/munch-punch/MunchPunchQr.tsx`: QR-rendering in de bestaande visuele taal.
- `components/munch-punch/MunchPunchScanner.tsx`: doorlopende camera- en plakscanner.
- `app/munch-punch/page.tsx`: hostflow, join-QR, submission station en resultaten.
- `app/munch-punch/join/page.tsx`: profielvrije gastflow.
- `__tests__/munchPunch*.test.ts`: privacy-, lifecycle-, crypto-, replay- en drempeltests.
- `e2e/munch-punch.spec.ts` en offline-routechecks: mobiele en offline regressiepoorten.
