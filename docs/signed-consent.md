# Bevestigde toestemming zonder server

KinkSync gebruikt lokale ECDSA P-256-handtekeningen via Web Crypto. Er is geen account, backend of centrale identiteitsdienst.

## Wat wordt bewezen

- Een eigen profiel krijgt op het toestel een publiek/privaat sleutelpaar zodra het voor het eerst wordt gedeeld of voor een scène wordt vastgezet.
- Alleen de private sleutel kan een geldige nieuwe toestemmingsversie maken.
- De publieke sleutel, versie, vorige proof-hash, inhoudshash en handtekening reizen mee met het gedeelde profiel.
- Een ontvanger verifieert de handtekening vóór een ondertekend profiel wordt geïmporteerd.
- Een bestaande bron accepteert alleen een opvolgende versie met dezelfde sleutel en een geldige verwijzing naar de vorige proof.
- De leesbare drie-woordennaam is uitsluitend een menselijke fingerprint. De 60-bit profielcode en cryptografische sleutel blijven de technische identiteit.

## Wat niet wordt beweerd

- `Bron bevestigd` is geen wettelijke identiteitscontrole.
- De eerste import koppelt een bron volgens trust-on-first-use; vergelijk de bronnaam in persoon wanneer dat belangrijk is.
- Digitale bevestiging bewijst niet dat iemand zonder druk handelde.
- Toestemming kan altijd later mondeling of non-verbaal worden ingetrokken.

## Backups

Versleutelde backups bevatten de private eigendomssleutels. Daardoor blijven eigen profielen na herstel bewerkbaar en behouden zij dezelfde bronidentiteit. Gedeelde profielen blijven read-only. Wie zowel backup als wachtwoord bezit, bezit ook die lokale identiteit.

## Scènes

Een vastgezette scène bewaart de ondertekende profielversies én de exacte setlist, intensiteiten, notities en het safeword. Daarna wordt de setlist read-only. Latere wijzigingen en intrekkingen worden als nieuwe, ondertekende regels aan een hashketen toegevoegd. De oorspronkelijke snapshot wordt nooit overschreven.
