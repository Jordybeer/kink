# Bevestigde bron en vastgelegde toestemming zonder server

KinkSync gebruikt lokale ECDSA P-256-handtekeningen via Web Crypto. Er is geen account, backend of centrale identiteitsdienst.

## Wat wordt bewezen

- Een eigen profiel krijgt op het toestel een publiek/privaat sleutelpaar zodra het voor het eerst wordt gedeeld of voor een scène wordt vastgezet.
- Alleen de private sleutel kan een geldige nieuwe profielversie maken.
- De publieke sleutel, versie, vorige proof-hash, inhoudshash en handtekening reizen mee met het gedeelde profiel.
- Een ontvanger controleert de handtekening vóór een ondertekend profiel wordt geïmporteerd.
- Een bestaande bron accepteert alleen een opvolgende versie met dezelfde sleutel en een geldige verwijzing naar de vorige proof.
- De vier-woordennaam is een leesbaar label. De profielcode en cryptografische sleutel blijven de technische identiteit.

## Wat niet wordt beweerd

- `Bron bevestigd` is geen wettelijke identiteitscontrole.
- De eerste import koppelt een bron volgens trust-on-first-use; vergelijk de leesbare naam in persoon wanneer dat belangrijk is.
- Digitale bevestiging bewijst niet dat iemand zonder druk handelde.
- Toestemming kan altijd later mondeling of non-verbaal worden ingetrokken.

## Backups

Versleutelde backups bevatten de private eigendomssleutels. Daardoor blijven eigen profielen na herstel bewerkbaar en behouden zij dezelfde bronidentiteit. Gedeelde profielen blijven read-only. Een ondertekend profiel zonder de bijpassende private sleutel wordt nooit automatisch als eigen profiel hersteld. Wie zowel backup als wachtwoord bezit, bezit ook die lokale identiteit.

## Scènes

Een vastgezette scène bewaart de ondertekende profielversies én de exacte setlist, intensiteiten, notities en het safeword. Iedere logregel moet niet alleen wiskundig geldig zijn, maar ook ondertekend zijn door een profielsleutel die werkelijk bij de scène hoort. Daarna wordt de setlist read-only. Latere wijzigingen en intrekkingen worden als nieuwe, ondertekende regels aan de hashketen toegevoegd.

De interface maakt onderscheid tussen twee zaken:

- **Profielbron bevestigd:** de opgeslagen profielantwoorden komen uit de vermelde sleutelketen.
- **Scène-afspraak vastgezet door …:** de exacte sessie-afspraak is ondertekend door de genoemde lokale profielsleutel(s).

Een geïmporteerd, bevestigd partnerprofiel is niet automatisch een aparte live bevestiging van die partner voor iedere nieuwe sessie. KinkSync zegt dat daarom niet.

## Lokale grens

Een hashketen detecteert gewijzigde regels, onbevoegde ondertekenaars en onderbroken of herschikte gebeurtenissen. Zonder externe server kan een volledig toestel of volledige backup echter worden teruggezet naar een oudere, op zichzelf geldige kopie. Bij belangrijke afspraken bieden twee onafhankelijke toestelkopieën of een versleutelde backup extra controle.
