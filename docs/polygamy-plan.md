# Polygamy — profielperspectieven en UX-herbouw

## Doel

Maak profielcreatie en -bewerking eenvoudiger, terwijl een Switch twee duidelijk gescheiden perspectieven kan bijhouden. Verminder navigatieclutter, maak veiligheidscontext zichtbaar en laat de vragenlijst aansluiten op wat iemand werkelijk wil invullen.

## Productregels

1. De primaire profielrichting is `Dominant` of `Submissive`.
2. `Beide kanten` maakt twee gekoppelde profielen met onafhankelijke antwoorden.
3. Een niet-getoond onderwerp is altijd `nog niet beoordeeld`, nooit impliciet `nee`.
4. Bestaande specialistische rollen blijven leesbaar als legacy metadata, maar zijn geen primaire richting meer.
5. Een gedeeld profiel blijft read-only en behoudt zijn eigen bronbevestiging.
6. Een profielgroep is lokale organisatie; ieder perspectief blijft afzonderlijk deelbaar en ondertekend.

## Datamodel

Optionele velden op `Profile`:

- `legacyRole`: bewaart een vroegere specialistische rol wanneer een primaire richting wordt gekozen;
- `personGroupId`: koppelt perspectieven van dezelfde persoon;
- `perspective`: `dominant` of `submissive`;
- `questionnaireSetup`: preset, interesseclusters en schemaversie.

Legacyprofielen zonder deze velden blijven exact werken zoals voordien.

## Creatieflow

1. Naam of alias.
2. Dominant, Submissive of Beide kanten.
3. Interesseclusters kiezen.
4. Omvang kiezen: Snel, Gebalanceerd of Volledig.
5. Bij Beide kanten worden twee profielen aangemaakt; de gebruiker kiest zelf welke eerst wordt ingevuld.

## Adaptieve vragenlijst

- `Snel`: compacte kern en gekozen interesses.
- `Gebalanceerd`: bredere selectie plus ontdekking buiten gekozen interesses.
- `Volledig`: volledige catalogus.
- Bestaande antwoorden blijven altijd zichtbaar, ook wanneer de preset later kleiner wordt.
- Zoeken kan altijd door de volledige catalogus.

## UX-opruiming

- Verwijder `Vergelijk` en `Scène` uit de bovenste navigatie.
- Verwijder `Rondleiding opnieuw starten` uit Instellingen.
- Vervang basic emoji’s in Instellingen door Phosphor-iconen.
- Gebruik één duidelijke sluitroute per sheet; geen dubbele knop rechtsboven wanneer een footeractie bestaat.
- Herbouw Profiel bewerken in dezelfde visuele taal als Profiel maken.
- Maak `Eerst vragen` en `Eerste keer` zichtbaar als afspraken, los van secundaire contexttags.
- Scroll de spotlight in stap 2 automatisch naar de volledige kinkkaart.

## Migratie en compatibiliteit

- Geen automatische koppeling op basis van gelijke namen.
- Bestaande profielen krijgen niet stil een perspectief toegewezen.
- Back-upherstel bewaart `legacyRole`, `personGroupId`, `perspective` en `questionnaireSetup` uitsluitend voor eigen, niet-geïmporteerde profielen. Gedeelde profielen kunnen deze lokale organisatievelden niet injecteren.
- QR-deling blijft per profiel; `personGroupId` wordt niet als identiteit of toestemming behandeld.

## Testpoorten

- Dominant/Submissive-touchdoelen komen overeen met hun zichtbare positie.
- Beide kanten maakt exact twee gekoppelde profielen.
- Antwoorden veranderen nooit het siblingprofiel.
- Presetwissels verwijderen geen antwoorden.
- Niet-getoonde kinks tellen niet als `nee`.
- Legacyprofielen blijven leesbaar en deelbaar.
- Spotlightstap 2 toont de volledige kinkkaart binnen de bruikbare viewport.
- Instellingen passen op een normale iPhone zonder interne hoofdscroll.
