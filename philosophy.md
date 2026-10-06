# KinkSync Philosophy

> Een duurzame gids voor productbeslissingen, informatiearchitectuur en interactieontwerp.
>
> Deze tekst beschrijft de samenhang achter KinkSync: niet alleen wat een scherm moet doen, maar waarom het product bepaalde soorten betekenis uit elkaar houdt.
>
> Bij conflict geldt de bronvolgorde uit `PRODUCT.md`: expliciete consent-, safety- en privacycontracten gaan voor, daarna expliciet goedgekeurde duurzame productbeslissingen, daarna `PRODUCT.md`. Deze filosofie vult die bronnen aan en overschrijft ze niet. Voor visuele regels blijft `UI-principles.md` bindend. Voor directionele onderwerpen blijft `directie.md` het technische semantiekcontract.

---

## 1. KinkSync gaat niet over kinkdata

KinkSync bevat profielen, een grote catalogus, statussen, vergelijkingen, scènes, contracten, notities en lokale geschiedenis. Het is verleidelijk om daaruit te concluderen dat het product vooral een manier is om veel gevoelige data netjes te beheren.

Dat is niet het doel.

KinkSync helpt mensen betekenis expliciet te maken op momenten waarop betekenis gemakkelijk door elkaar loopt.

Een persoon kan iets aantrekkelijk vinden zonder het vandaag te willen doen. Iets kan bespreekbaar zijn zonder afgesproken te zijn. Iets kan in het algemeen gewenst zijn maar in één relatie niet passen. Een profiel kan gedeeld zijn zonder dat het toestemming geeft. Een eerder gesprek kan relevant blijven zonder permanente toestemming te worden.

De software moet deze verschillen beschermen.

Daarom is de kernvraag bij ieder ontwerp niet:

> Hoe krijgen we alle informatie op het scherm?

maar:

> Welke betekenis probeert de gebruiker hier te begrijpen of uit te spreken?

De interface volgt die betekenis. Het datamodel mag precies en rijk zijn. De mentale taak hoeft dat niet te zijn.

---

## 2. De catalogus is infrastructuur; de mens is het product

`PRODUCT.md` organiseert KinkSync rond vier menselijke productconcepten:

1. **Person**
2. **Relationship**
3. **Agreement**
4. **Moment**

Daaronder ligt een vijfde laag die geen menselijke waarheid is, maar vocabulaire en infrastructuur:

5. **Catalogus**

De catalogus beschrijft waarover iemand kan nadenken. Hij bevat concepten, concrete varianten, richting, beschrijvingen, zoektermen, categorieën en veiligheidsinformatie.

De catalogus weet niet wat een persoon wil.

De vier menselijke lagen beschrijven verschillende scopes van betekenis.

### Person

Een profiel beschrijft wat één persoon expliciet over zichzelf heeft aangegeven.

Hier horen persoonlijke voorkeuren, grenzen, ervaring, actieve nieuwsgierigheid, persoonlijke context en zichtbaarheid.

Een persoon is geen samenvatting van een relatie en geen verzameling scène-afspraken.

### Relationship

Een vergelijking beschrijft wat zichtbaar wordt wanneer twee expliciete perspectieven naast elkaar worden gelegd.

Hier horen overlap, verschillen, grenzen, gesprekspunten en relatiegebonden geheugen zoals `Besproken`.

Een relatie mag de persoonlijke profielen niet herschrijven.

### Agreement

Een overeenkomst beschrijft wat twee mensen expliciet met elkaar hebben afgesproken op een niveau dat langer kan meegaan dan één moment.

Een agreement is geen afgeleide compatibiliteitsscore en geen automatische vertaling van profielstatussen. Het is onderhandelde betekenis.

### Moment

Een scène of concreet moment beschrijft wat voor die situatie is gepland, afgesproken, uitgevoerd of nadien gereflecteerd.

Hier horen voorwaarden, intensiteit, voorbereiding, safety, aftercare en de concrete toestemmingscontext van dat moment.

### De fundamentele regel

> Betekenis mag vooruit reizen, maar mag niet stil van soort veranderen.

Een persoonlijke voorkeur kan aanleiding zijn voor een gesprek.

Een gesprek kan aanleiding zijn voor een agreement of moment.

Een moment kan aanleiding zijn voor nieuwe zelfkennis.

Maar de software mag geen van die overgangen behandelen alsof de volgende betekenis al vaststaat.

---

## 3. Eén stukje informatie heeft één eigenaar

Iedere betekenis hoort bij de kleinste scope waarin zij waar is.

Dat levert deze vuistregel op:

| Betekenis | Eigenaar |
| --- | --- |
| Wat is Flogging? | Catalogus |
| Ik vind Flogging ontvangen misschien interessant | Person |
| Wij hebben Flogging besproken | Relationship |
| Wij hebben afgesproken dat Flogging binnen deze dynamiek onder voorwaarden past | Agreement |
| Vanavond doen we Flogging zacht tot midden en vermijden we zone X | Moment |

Wanneer een veld in meerdere rijen tegelijk lijkt te passen, is dat een waarschuwing.

Het product moet dan onderzoeken of het veld:

- te breed geformuleerd is;
- context uit een diepere scope naar boven trekt;
- een afgeleide waarheid opslaat als bronwaarheid;
- of twee verschillende betekenissen onder één label probeert te bewaren.

Dit principe voorkomt dat `KinkEntry` langzaam een verzamelbak wordt voor voorkeur, consent, scènevoorwaarden, relatiegeheugen en historie.

---

## 4. Consent is geen eigenschap van een profiel

Een profiel kan zeggen:

- Heel graag
- Ja
- Misschien
- Voor hen
- Harde grens

Dat zijn persoonlijke uitspraken over voorkeur en grens.

Geen van de positieve statussen betekent:

> Hiervoor is op dit moment toestemming gegeven.

Dat onderscheid heeft gevolgen voor de hele architectuur.

Een control zoals `Eerst vragen` lijkt voorzichtig, maar kan een ongewenste implicatie creëren: dat bij onderwerpen zonder die markering opnieuw vragen minder noodzakelijk zou zijn.

Een control zoals `Alleen voor afgesproken scène` lijkt genuanceerd, maar iedere concrete scène hoort juist expliciete afspraken te hebben.

Daarom hoort consent niet als extra permanente vlag aan een algemene voorkeur te worden gehangen.

> Een profiel helpt een gesprek beginnen. Een relatie onthoudt wat besproken is. Een agreement legt gezamenlijke afspraken vast. Een moment legt vast wat voor die situatie geldt.

Ook `Besproken` is geen consent. Het betekent alleen dat de betrokken personen het onderwerp in hun relatiecontext hebben besproken.

Een contract of scène mag profielinformatie als bron gebruiken, maar moet de concrete betekenis opnieuw expliciet maken.

---

## 5. Privacy is geen contexttag

Privacy kent in KinkSync twee fundamenteel verschillende betekenissen die nooit door elkaar mogen lopen.

### Zichtbaarheid van informatie

`privateResponse` betekent dat het persoonlijke antwoord zelf privé blijft.

Dit is een structurele vertrouwensgrens.

Een privé antwoord mag niet via sharing, Compare, afgeleide labels, scenes, contracts, tellingen of andere output aan een ander worden prijsgegeven.

### Context van een handeling

Een uitspraak zoals `alleen in privésfeer` zegt iets over waar of onder welke omstandigheden een activiteit passend voelt.

Dat is geen dataprivacy.

De twee mogen daarom nooit automatisch naar elkaar worden gemigreerd of als synoniemen worden behandeld.

> Privacy van informatie beschermt wat de software onthult. Context beschrijft wanneer een handeling passend voelt.

De eerste is architectuur. De tweede is menselijke nuance.

### Privacy filtert vóór presentatie

Presentatiegroepering mag nooit eerst alle antwoorden combineren en daarna proberen privé-informatie eruit te poetsen.

Eerst wordt bepaald welke gegevens voor deze ontvanger of surface zichtbaar mogen zijn. Pas daarna mag de UI groeperen, tellen, samenvatten of vergelijken.

Dat geldt ook voor conceptgroepering.

Als één directionele variant publiek is en de sibling privé, mag de publieke surface niet verraden dat die private sibling bestaat, beantwoord is of een bepaalde status heeft.

---

## 6. Een persoonlijk antwoord moet klein blijven

Een persoonlijk antwoord hoort alleen gegevens te dragen waarvoor de zin

> Dit zegt iets over mijn eigen perspectief op dit concrete onderwerp

duidelijk waar is.

De kern is de expliciete status.

Daaromheen kunnen persoonlijke details bestaan die daadwerkelijk betekenis toevoegen:

- actieve nieuwsgierigheid;
- ervaring;
- een persoonlijke notitie;
- zichtbaarheid.

Context die alleen voor één relatie, agreement of moment geldt, hoort niet permanent in de persoonlijke entry thuis.

### Status blijft de primaire uitspraak

De vijf statussen blijven de kern:

- Heel graag
- Ja
- Misschien
- Voor hen
- Harde grens

Andere eigenschappen veranderen die status niet stil.

### Nieuwsgierig betekent actieve toekomstige verkenning

De nieuwsgierige ster heeft een specifieke betekenis:

> Dit wil ik actief eens verkennen of proberen in de toekomst.

Dat is niet hetzelfde als `Misschien`.

`Misschien` zegt iets over de huidige voorkeur of bereidheid: onzeker, afhankelijk van context of nog niet duidelijk.

`Nieuwsgierig` zegt iets over intentie: ik wil hier actief meer mee doen, over leren, bespreken of het ooit proberen.

Daarom mag nieuwsgierigheid als secundair persoonlijk signaal blijven bestaan, zolang de hele productervaring dezelfde betekenis gebruikt.

Nieuwsgierigheid:

- verandert de status niet;
- is geen consent;
- opent niet automatisch een scène;
- is geen aanbeveling van de software;
- mag wel nuttig zijn voor een persoonlijke filter zoals `Wil ik verkennen`;
- mag, wanneer publiek gedeeld, rustige context geven in Compare.

Als de ster in de toekomst geen concrete taak meer heeft buiten decoratie, moet zijn bestaansrecht opnieuw worden beoordeeld.

### Ervaring hoort bij het concrete onderwerp

Ervaring mag per concrete topicvariant bestaan.

Voor een directioneel concept kunnen de antwoorden dus verschillen:

```text
Flogging
Geven       ervaren
Ontvangen   nog geen ervaring
```

Ervaring hoort niet automatisch aan Dominant, Submissive of een andere profielrol te worden gekoppeld.

Een profielperspectief beschrijft relationele context. Het voorspelt niet welke concrete handelingen iemand heeft uitgevoerd of in welke richting.

Een algemene profielervaring zoals `beginner` of `gevorderd` kan als zelfbeschrijving blijven bestaan, maar mag geen per-topic ervaring invullen of vergrendelen.

Per-topic ervaring blijft optioneel en secundair. Zij hoeft niet in de primaire questionnaire te staan.

### `Eerste keer` is geen tweede ervaringsmodel

Een losse tag `eerste keer` overlapt semantisch met het bestaande ervaringsveld.

De duurzame richting is één ervaringstaal, niet twee concurrerende mechanismen.

Legacydata mag veilig worden gelezen en bewaard, maar nieuwe first-party UI hoort `Eerste keer` niet als aparte agreement-tag te blijven schrijven.

---

## 7. Onzekerheid is betekenis, geen defect

KinkSync moet mensen niet dwingen om zekerheid te simuleren.

`Misschien` is een volwaardig antwoord.

Nieuwsgierigheid kan bestaan zonder zekerheid.

Ervaring kan onbekend of nog afwezig zijn.

Een onderwerp kan worden overgeslagen.

Een antwoord kan later veranderen.

De software moet dit ondersteunen zonder de gebruiker te belonen voor kunstmatige volledigheid.

Daarom is completion nooit belangrijker dan eerlijke ambiguïteit.

> Een onvolledig maar eerlijk profiel is waardevoller dan een volledig profiel vol geforceerde keuzes.

---

## 8. Expliciet voor inference

KinkSync mag relaties tussen data begrijpen zonder voorkeuren te voorspellen.

Dat onderscheid is cruciaal.

Het systeem mag weten dat twee concrete vragen bij één directioneel concept horen.

Het mag niet concluderen dat iemand die één kant leuk vindt de andere kant waarschijnlijk ook leuk vindt.

Het systeem mag weten dat een profielperspectief Dominant of Submissive is.

Het mag daaruit niet afleiden wie een concrete handeling geeft of ontvangt.

Het systeem mag weten dat twee onderwerpen inhoudelijk verwant zijn.

Het mag een antwoord niet van de ene naar de andere kopiëren.

> Structuur mag worden afgeleid. Betekenis voor de gebruiker niet.

Dit is de reden waarom directionele onderwerpen intern zelfstandige entries blijven, ook wanneer de UI ze als één menselijk concept toont.

---

## 9. Concepten voor mensen, entries voor precisie

Een belangrijk architectuurprincipe is:

> De opslag mag atomair zijn terwijl de presentatie menselijk groepeert.

Voor bijvoorbeeld Flogging kunnen intern twee expliciete antwoorden bestaan:

- geven;
- ontvangen.

Die onafhankelijkheid is belangrijk voor privacy, sharing, Compare, scenes, agreements en consent.

Maar de gebruiker hoeft daarom niet twee bijna identieke catalogusregels te zien.

De UI mag tonen:

```text
Flogging
Geven       Heel graag
Ontvangen   Misschien
```

zonder een genest antwoordobject in de store te introduceren.

Dit principe geldt uitsluitend waar expliciete metadata de relatie vastlegt.

Geen stringheuristiek, suffixdetectie of vermoedelijke clustering mag runtimebetekenis creëren.

Bij bijzondere participatieassen moet de menselijke taal de werkelijke betekenis volgen. `Zelf dragen` en `Partner draagt` worden niet geforceerd tot `Geven` en `Ontvangen`.

### Groepering is presentatie, geen migratie

Een conceptadapter mag bepalen hoe bestaande concrete entries samen worden weergegeven.

Hij mag niet:

- status kopiëren;
- een ontbrekende sibling aanmaken;
- privacy samenvoegen;
- ervaring samenvoegen;
- nieuwsgierigheid samenvoegen;
- notities samenvoegen;
- consent aan een concept in plaats van een concrete variant hangen.

---

## 10. Taxonomie is infrastructuur, geen bestemming

Categorieën zijn nuttig voor:

- redactionele ordening;
- zoeken;
- browse;
- uitleg;
- veiligheidscontext.

Maar een categorie is niet automatisch de manier waarop een mens zijn eigen profiel begrijpt.

Als een catalogus veel categorieën heeft, betekent dat niet dat de interface evenveel primaire navigatiekeuzes moet tonen.

Een gebruiker die zijn profiel leest vraagt eerder:

- Wat vind ik heel graag?
- Wat zijn mijn grenzen?
- Waar twijfel ik nog over?
- Wat wil ik actief verkennen?
- Wat wil ik bespreken?

dan:

- In welke cataloguscategorie valt dit?

Daarom mag taxonomie zichtbaar worden wanneer zij de taak helpt en verdwijnen wanneer zij alleen de interne structuur van het systeem weerspiegelt.

### Geen uniforme behandeling van ongelijke groepen

Een groep met één relevant antwoord verdient geen disclosure alleen omdat een categorie bestaat.

Een groep met enkele items kan direct leesbaar zijn.

Een grote groep kan zoeken, filtering of progressive disclosure nodig hebben.

Eenzelfde component voor iedere categoriegrootte is geen echte consistentie wanneer de taak fundamenteel verschilt.

> Consistentie betekent een voorspelbaar model, niet identieke chrome rond ongelijke inhoud.

### Geen nieuwe taxonomie voordat de bestaande ruis is verminderd

Nieuwe macrothema's of supercategorieën mogen pas worden toegevoegd wanneer conceptgroepering, zoeken en status-first presentatie bewezen onvoldoende zijn.

Eerst duplicatie en presentatie oplossen. Daarna opnieuw beoordelen hoeveel navigatietaxonomie werkelijk nodig is.

---

## 11. De vragenlijst is een reflectieruimte, geen editor

De primaire taak van de vragenlijst is:

> Wat vind ik hiervan?

Daarom toont de questionnaire hoofdzakelijk de informatie die nodig is om die ene keuze bewust te maken:

- onderwerp;
- concrete richting of participatie;
- korte betekenis;
- essentiële veiligheidscontext;
- vijf statussen;
- mogelijkheid om later terug te komen;
- directe maar rustige privacycontrole.

Secundaire metadata hoort de primaire keuze niet te verdringen.

Nieuwsgierigheid, ervaring, notities en andere nuance kunnen later in de topic-editor worden aangevuld.

De vragenlijst wordt daardoor niet oppervlakkiger. Hij wordt preciezer in zijn taak.

### Eén beslissing tegelijk

Een herhaalde questionnaire-flow moet motorisch leerbaar zijn.

Bij een directioneel concept is daarom de voorkeur:

```text
Flogging
Geven · 1 van 2

[ vijf statussen ]
```

gevolgd door dezelfde geometrie:

```text
Flogging
Ontvangen · 2 van 2

[ vijf statussen ]
```

Niet tien gelijktijdige statuscontrols op één scherm.

### Privacy blijft direct bereikbaar

Privacy is belangrijk genoeg om tijdens het beantwoorden beschikbaar te blijven.

Maar privacy is geen zesde status en geen concurrerende hoofdactie.

### Safety staat vóór geometrische perfectie

Essentiële veiligheidscontext die nodig is om een betekenisvolle keuze te maken mag niet uitsluitend achter een disclosure zitten.

De vaste questionnaire-layout is waardevol, maar staat lager dan consent, veiligheid en begrijpelijkheid.

Een korte essentiële waarschuwing mag de ideale geometrie doorbreken wanneer dat nodig is.

Verdiepende uitleg kan daarna in een detail-sheet leven.

---

## 12. Profiel lezen en profiel beheren zijn verschillende mentale modi

Een profiel heeft als leestaken:

- wie is deze persoon;
- wat zegt die persoon expliciet over zichzelf;
- waar liggen grenzen;
- wat valt op;
- welke context is relevant.

Een profiel is geen CMS.

Daarom horen catalogusbeheer, filters, custom-topicbeheer en bulkbewerking niet permanent tussen de profielinhoud.

### Read mode

Read mode is person-first.

Mogelijke hoofdstructuur:

- identiteit;
- grenzen;
- voorkeuren;
- relevante publieke context.

Status is doorgaans een sterkere leesas dan categorie.

### Edit mode

Edit mode is een werkplaats.

Daar horen identiteit, questionnaire-instellingen en duidelijke toegang tot persoonlijke onderwerpen.

### Onderwerpen verdient een eigen surface

Een grote topic-editor moet niet als derde lange stap in een algemene profielsheet worden gepropt.

`Onderwerpen` mag inhoudelijk bij profielbewerking horen, maar krijgt een eigen mobiele surface voor:

- zoeken;
- filteren;
- concepten;
- custom onderwerpen;
- richting of participatie;
- status;
- details.

Zo blijft het leesprofiel menselijk en krijgt beheer de ruimte die het nodig heeft.

---

## 13. Topicbeheer is concept-first

De topic-editor moet de menselijke concepten tonen, niet de atomische opslag als lange inventarislijst.

Voor een directioneel concept kan een rij bijvoorbeeld zijn:

```text
Flogging
Geven · Heel graag
Ontvangen · Misschien
```

Tik op het concept en toon de concrete varianten afzonderlijk.

Per variant kunnen persoonlijke details bestaan:

- status;
- wil verkennen;
- ervaring;
- notitie;
- privé.

Die details blijven variant-specifiek.

Een `privé`-keuze op geven mag ontvangen niet verbergen.

Een ervaringskeuze op ontvangen mag geven niet veranderen.

### Search vóór taxonomie

Wanneer de gebruiker weet wat hij zoekt, is zoeken sneller en cognitief lichter dan categorieën doorlopen.

Browse en categoriecontext blijven nuttig voor ontdekking, maar hoeven niet de primaire beheer-IA te zijn.

---

## 14. Compare is een gesprek, geen oordeel

Compare hoort geen oordeel te produceren over de kwaliteit van een relatie.

Het maakt expliciete informatie naast elkaar begrijpelijk.

De belangrijkste relationele vragen zijn:

- Waar is duidelijke overlap?
- Waar zijn complementaire wensen?
- Waar zit onzekerheid?
- Waar verschillen we?
- Waar is een harde grens?
- Wat hebben we nog niet besproken?

### Compare is read-only voor Person

Een gebruiker mag in Compare geen profielantwoord van zichzelf of een partner stil aanpassen.

Wanneer een persoonlijk antwoord moet veranderen, gaat de gebruiker naar dat profiel.

Compare mag wel relatiegebonden toestand opslaan, zoals `Besproken`.

### `Besproken` betekent alleen besproken

`Besproken` is relationship state.

Het betekent niet:

- toegestaan;
- afgesproken;
- veilig;
- permanent geldig;
- automatisch geldig voor een volgende scène.

### Persoonlijke context mag helpen zonder de relatie over te nemen

Wanneer zichtbaar en bewust gedeeld, kan Compare rustige context tonen zoals:

- wil verkennen;
- nog geen ervaring;
- persoonlijke notitie.

Maar zulke context blijft eigendom van het profiel.

Compare leest haar. Compare herschrijft haar niet.

---

## 15. Agreement is onderhandelde betekenis

Een agreement is geen mooiere export van Compare.

Het is een nieuwe betekenislaag.

Profielstatussen en Compare kunnen relevante gesprekspunten aandragen, maar een agreement moet laten zien wat twee mensen daadwerkelijk hebben vastgelegd.

Dat betekent dat agreement-specifieke voorwaarden niet teruggeschreven worden naar algemene profielentries.

Een later gewijzigde persoonlijke voorkeur verandert ook niet stil een historisch agreement.

Geschiedenis moet geschiedenis blijven.

### Afgeleide classificatie heeft één semantische bron nodig

Wanneer meerdere surfaces dezelfde statusparen interpreteren, moeten zij uiteindelijk op één expliciet semantiekcontract leunen.

Twee engines die dezelfde statussen verschillend classificeren zijn een risico, vooral wanneer één ervan agreements of consentdocumenten voedt.

Consolidatie mag pas gebeuren na regressiebewijs dat betekenis identiek blijft.

---

## 16. Moment is concreet en tijdelijk

Een scène is de plaats voor concrete voorwaarden.

Niet:

`scène specifiek` als permanente profieltag.

Wel:

```text
Flogging
Intensiteit: zacht tot midden
Duur: 10 min
Voorwaarde: niet op onderrug
Notitie: check-in na eerste minuut
```

Een nieuw moment mag profielinformatie gebruiken als gespreksstart, maar voorwaarden moeten bewust voor dat moment worden gekozen.

### Geen impliciete erfenis van consentachtige tags

Nieuwe SceneItems horen geen retired profielvoorwaarden automatisch te erven alsof ze voor deze scène bevestigd zijn.

Bestaande opgeslagen of vastgezette scenes blijven historische waarheid en mogen niet achteraf worden herschreven.

---

## 17. De oude contexttags zijn een overgang, geen toekomstmodel

De huidige code kent onder meer:

- `vraag eerst`;
- `eerste keer`;
- `alleen privé`;
- `scène specifiek`.

De duurzame richting is dat nieuwe first-party UI deze vier niet meer als algemene topicvoorwaarden schrijft.

### Waarom

`vraag eerst` probeert consent op Person-niveau te modelleren.

`scène specifiek` probeert Moment-context op Person-niveau te modelleren.

`alleen privé` mengt context met een te algemene boolean en mag zeker niet worden verward met `privateResponse`.

`eerste keer` dupliceert het bestaande ervaringsconcept.

### Legacydata wordt niet achteloos gewist

Deze tags bestaan in sharing, sanitize, scenehistorie en consentgerelateerde paden.

Daarom geldt:

> Stop eerst met nieuwe ambiguïteit schrijven. Verwijder oude betekenis pas wanneer de volledige keten dat veilig toelaat.

Bestaande shared, signed, imported, snapshotted of locked data mag niet stil worden herschreven om een nieuwe UI schoner te maken.

Waar nodig blijft legacydata lossless round-trippen terwijl first-party UI naar het nieuwe model beweegt.

---

## 18. Datamigratie is een betekenisoperatie

Een migratie is niet correct omdat de types compileren.

Een migratie is correct wanneer zij geen nieuwe betekenis verzint en geen oude betekenis stil verandert.

Daarom:

- kopieer geen status naar een semantisch andere entry;
- zet `alleen privé` nooit om naar `privateResponse`;
- maak van een legacy `eerste keer` niet automatisch een brede rol- of profielervaring;
- muteer geen imported of signed profile om het lokale model mooier te maken;
- herschrijf geen locked scene of agreement vanuit nieuwere profielwaarheid;
- gebruik expliciete metadata als bron voor conceptgroepering.

Bij ambiguïteit is behoud zonder inference beter dan een slimme migratie.

---

## 19. Minder zichtbare structuur, meer semantische helderheid

KinkSync mag intern veel weten:

- categorie;
- concept;
- concrete variant;
- directionele sibling;
- questionnaire-affinity;
- search aliases;
- safety metadata;
- status;
- privacy;
- relatiecontext;
- agreementhistorie;
- scenehistorie.

Maar de gebruiker hoeft niet al die assen tegelijk te zien.

De interface toont per taak alleen de structuur die nodig is om de volgende beslissing te begrijpen.

Dat betekent bijvoorbeeld:

### Questionnaire

Concept + concrete variant + status.

### Topicbeheer

Concept + varianten + persoonlijke details.

### Profiel

Mens + grenzen + voorkeuren + relevante context.

### Compare

Twee expliciete perspectieven + gesprekspunten.

### Agreement

Onderhandelde afspraken.

### Moment

Concrete voorwaarden voor nu.

> Goede informatiearchitectuur maakt het model niet onzichtbaar. Zij laat alleen het juiste deel op het juiste moment spreken.

---

## 20. Cognitieve draagkracht is een harde productconstraint

Een grote catalogus is alleen bruikbaar wanneer de interface niet voortdurend van de gebruiker verlangt dat hij de catalogusarchitectuur begrijpt.

Daarom gelden een paar algemene regels.

### Eén primair niveau tegelijk

Toon niet tegelijk:

`thema -> categorie -> concept -> richting -> status -> details`

als navigatieboom.

Een scherm toont één actief niveau en voldoende context om te weten waar je bent.

### Geen disclosure zonder informatiewinst

Een disclosure die één regel verbergt is meestal extra arbeid zonder voordeel.

Progressive disclosure is nuttig wanneer er echte diepte bestaat, niet als standaarddecoratie.

### Geen structurele herhaling als betekenis

Twintig dezelfde containers maken twintig items niet begrijpelijker.

Borders, cards en pills zijn hulpmiddelen, geen vervanging voor hiërarchie.

### Herhaling moet motorisch helpen

Wanneer dezelfde taak vaak wordt uitgevoerd, mogen controls lichamelijk voorspelbaar worden.

De gebruiker hoeft zijn duim niet voor ieder onderwerp opnieuw te leren waar de betekenis woont.

---

## 21. Duimergonomie is onderdeel van semantiek

Op mobiel is plaatsing niet alleen visueel.

Een moeilijk bereikbare primaire keuze voelt minder primair.

Een knop die bij lange copy onder de fold schuift, verandert het feitelijke interactiemodel.

Daarom:

- primaire herhaalde keuzes horen in een stabiele, bereikbare zone;
- touch targets zijn royaal;
- lange inhoud mag scrollen, maar primaire controls mogen niet toevallig verdwijnen;
- safe areas en installed-PWA-gedrag zijn onderdeel van het ontwerp;
- 320px breedte en grotere tekst zijn geen exotische edge cases;
- een flow die alleen op een ideale screenshot klopt is niet af.

---

## 22. Safety mag nooit winnen door verborgen te zijn

Safety verdient nuance.

Niet elk onderwerp heeft dezelfde risicograad en niet ieder safety-detail hoeft de primaire surface te domineren.

Maar informatie die nodig is om een eerste bewuste keuze te maken moet zichtbaar zijn vóórdat die keuze wordt gemaakt.

De juiste verdeling is:

- essentiële waarschuwing zichtbaar;
- aanvullende context in verdieping;
- geen alarmstijl wanneer rustige duidelijkheid voldoende is.

Serious is not scary. Quiet is not invisible.

---

## 23. Historie is niet hetzelfde als huidige waarheid

KinkSync bewaart snapshots, scenes, agreements en andere tijdgebonden informatie.

Die gegevens hebben waarde omdat ze vertellen wat op dat moment gold.

Een later profielantwoord mag een oud moment niet herschrijven.

Een nieuwe privacykeuze mag historische gedeelde informatie niet magisch doen alsof die nooit bestond, maar nieuwe surfaces mogen uiteraard de huidige privacycontracten respecteren.

Een nieuwe taxonomie mag oude semantiek niet herinterpreteren.

> Verleden data is een verslag. Huidige data is een standpunt. Toekomstige planning is een voorstel.

De software moet die drie tijden niet verwarren.

---

## 24. De productreis is verbonden maar niet lineair

Person, Relationship, Agreement en Moment horen als één productwereld te voelen.

Maar KinkSync is geen funnel.

Een gebruiker mag:

- alleen een profiel voor zichzelf bijhouden;
- een profiel delen zonder ooit een contract te maken;
- vergelijken en alleen praten;
- een scène plannen zonder duurzaam agreement;
- een agreement hebben en later opnieuw vergelijken;
- terugkeren naar een persoonlijk antwoord na nieuwe ervaring.

Goede navigatie toont natuurlijke vervolgstappen zonder ze als verplichte workflow te presenteren.

---

## 25. De software hoort geen autoriteit te spelen

KinkSync mag ordenen, onthouden, vergelijken en helpen formuleren.

Het mag niet doen alsof het weet:

- of twee mensen compatibel zijn;
- of een relatie gezond is;
- wat iemand diep vanbinnen wil;
- of een rol een handeling voorspelt;
- of eerdere toestemming toekomstige toestemming impliceert;
- of een populair patroon op deze persoon van toepassing is.

Wanneer het product berekent of samenvat, moet de uitkomst terug te voeren zijn op expliciete invoer en begrijpelijke regels.

Conversation before verdict blijft de hogere waarde.

---

## 26. Betekenis vóór features

Een feature verdient geen plek omdat zij technisch mogelijk is of ooit gebouwd werd.

Zij moet een duidelijke menselijke taak hebben.

Voor ieder bestaand of nieuw veld vragen we:

1. Welke menselijke uitspraak vertegenwoordigt dit?
2. Bij welke scope hoort die uitspraak?
3. Wie mag haar wijzigen?
4. Wie mag haar zien?
5. Wat gebeurt er als zij ontbreekt?
6. Wat gebeurt er als zij verandert?
7. Reist zij door sharing, Compare, Agreement of Moment?
8. Kan dezelfde betekenis al elders worden uitgedrukt?

Als deze vragen geen helder antwoord hebben, is verwijdering vaak beter dan nog een label.

---

## 27. Huidige duurzame richting voor topicdetails

De beoogde persoonlijke detailset is klein:

### Houden

- `status`
- `privateResponse`
- persoonlijke `comment`
- `curious`, user-facing als duidelijke actieve nieuwsgierigheid
- `experienced`, optioneel en per concrete topicvariant
- `usedInScene` als lokale historie, niet als voorkeur

### Uit first-party topic-UI laten verdwijnen

- `vraag eerst`
- `eerste keer`
- `alleen privé`
- `scène specifiek`

### Apart auditen

- `desire`, omdat het nog door sommige downstream surfaces wordt gelezen maar geen duidelijke actuele primaire invoer meer heeft;
- deprecated `score`;
- generieke vrije `tags`, omdat legacy- en exportcompatibiliteit eerst volledig moeten worden begrepen.

Deze richting is geen toestemming voor een destructieve migratie. De overgang volgt de migratieprincipes hierboven.

---

## 28. Open ontwerpvragen blijven expliciet open

Een filosofie wordt gevaarlijk wanneer zij onzekerheid verstopt.

De volgende vragen zijn bewust nog geen dogma.

### Hoe prominent moet per-topic ervaring worden?

De semantische eigenaar is duidelijk: de concrete persoonlijke topicvariant.

Nog open is hoe vaak mensen dit werkelijk willen invullen en waar het in de UI hoort.

Startpunt: optioneel onder Details, niet in de primaire questionnaire.

### Hoe zichtbaar moet nieuwsgierigheid zijn?

De betekenis is duidelijk: actieve toekomstige verkenning.

Nog te bewijzen is welke surfaces daar echt voordeel uit halen.

Waarschijnlijke nuttige plekken:

- persoonlijke filter `Wil ik verkennen`;
- topicdetails;
- rustige Compare-context wanneer gedeeld.

Niet nuttig:

- een dominante zesde status;
- automatische aanbevelingen;
- impliciete consent.

### Zijn macrothema's nodig?

Misschien.

Maar eerst conceptgroepering, zoeken en status-first presentatie verbeteren.

Pas daarna meten of de twintig interne categorieën nog steeds een browseprobleem veroorzaken.

### Moet `desire` blijven?

Nog niet besloten.

Het veld heeft historische en downstreamconsumers. Het mag pas verdwijnen na een aparte semantische audit van sharing, contracts, PDFs, snapshots en backups.

---

## 29. Praktische beslisgids

Bij een nieuwe feature of redesign doorlopen we deze vragen in volgorde.

### Scope

- Is dit Catalogus, Person, Relationship, Agreement of Moment?
- Probeert deze feature betekenis uit twee scopes in één veld te stoppen?

### Explicietheid

- Heeft de gebruiker dit zelf gezegd?
- Zo niet, is het alleen presentatie/ranking of wordt er betekenis geïnferreerd?

### Consent

- Kan deze UI de indruk wekken dat voorkeur gelijkstaat aan toestemming?
- Kan een relationship-state per ongeluk als agreement worden gelezen?

### Privacy

- Wordt filtering vóór afleiding, telling en presentatie toegepast?
- Kan het bestaan van een privé antwoord indirect worden afgeleid?

### Cognitie

- Welke ene taak voert de gebruiker hier uit?
- Ziet de gebruiker meer hiërarchie dan nodig is?
- Verbergt een disclosure minder informatie dan de interactie kost?

### Ergonomie

- Is de primaire herhaalde actie met één hand comfortabel?
- Blijft zij bereikbaar bij lange copy, kleine viewports en grotere tekst?
- Blijft de motorische geometrie stabiel?

### Historie

- Verandert dit opgeslagen, gedeelde, ondertekende of locked betekenis?
- Is de migratie semantisch verliesloos?
- Zo niet, kunnen we legacydata bewaren zonder haar actief te blijven schrijven?

### Productwaarde

- Welke menselijke taak wordt aantoonbaar makkelijker?
- Als we deze feature verwijderen, welke betekenis gaat werkelijk verloren?

---

## 30. Anti-patronen

De volgende patronen zijn alarmsignalen.

### Database-UI

De schermstructuur volgt tabellen, IDs of categorieën omdat ze technisch bestaan.

### Checkbox-creep

Nieuwe nuance wordt telkens als permanente boolean toegevoegd.

### Consent by inheritance

Een profielveld wordt automatisch een scènevoorwaarde.

### Role inference

Dominant/Submissive of andere identiteit vult concrete richting, voorkeur of ervaring in.

### Taxonomy theatre

Meer categorieën of nesting wordt toegevoegd om een te grote flat list te ordenen zonder eerst semantische duplicatie op te lossen.

### Cardification

Ieder object krijgt een rechthoek om orde te suggereren terwijl hiërarchie, spacing en copy het probleem beter kunnen oplossen.

### Disclosure reflex

Informatie wordt achter een tik gezet alleen om het scherm visueel rustiger te maken.

### Historical rewrite

Nieuwe productlogica herschrijft oude agreements, scenes of signed data alsof die altijd al volgens het nieuwe model bedoeld waren.

### Smart migration

De software gokt wat de gebruiker waarschijnlijk bedoelde en noemt dat databehoud.

---

## 31. Filosofische kern

KinkSync werkt met onderwerpen die persoonlijk, contextueel en veranderlijk zijn.

Daarom moet het product niet proberen alle ambiguïteit uit de mens te verwijderen. Het moet voorkomen dat de software nieuwe ambiguïteit toevoegt.

Een goed KinkSync-scherm doet drie dingen:

1. het laat duidelijk zien welke vraag nu wordt gesteld;
2. het bewaart de scope waarin het antwoord waar is;
3. het maakt een volgende menselijke stap mogelijk zonder die stap alvast namens de gebruiker te nemen.

Daaruit volgen de belangrijkste principes:

> **De mens is het product; de catalogus is infrastructuur.**

> **Eén betekenis heeft één scope.**

> **Voorkeur is geen consent.**

> **Privacy wordt afgedwongen vóór presentatie.**

> **Structuur mag worden afgeleid; persoonlijke betekenis niet.**

> **Atomische opslag mag menselijk worden gegroepeerd.**

> **Onzekerheid mag blijven bestaan.**

> **Historie blijft historie.**

> **De UI toont alleen de complexiteit die de huidige taak nodig heeft.**

> **KinkSync helpt mensen explicieter met elkaar te zijn zonder zelf de autoriteit over hun betekenis te worden.**

Dat is de lat waar toekomstige features, refactors en visuele beslissingen tegen mogen worden gehouden.
