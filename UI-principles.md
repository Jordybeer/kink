# KinkSync UI Principles

KinkSync is geen productivity app, geen klinische intake en geen flashy kink-themed gimmick.

De interface moet **privé, menselijk, sensueel en bewust ontworpen** aanvoelen, zonder dat expressiviteit ooit ten koste gaat van consent, veiligheid, privacy, begrijpelijkheid, leesbaarheid of rust.

Deze principes zijn de vaste ontwerpdoctrine voor KinkSync. Ze gelden voor nieuwe UI, bestaande UI die wordt aangepast, componenten, flows, copy, motion, responsive gedrag en visuele audits.

---

## 1. Intimate by default

KinkSync gaat over persoonlijke dingen. De UI moet daarom standaard warm, discreet en nabij aanvoelen.

Gebruik zachte donkere surfaces, menselijke copy, royale touch targets en rustige composities. Intimiteit komt uit **toon, materiaal, typografie en aandacht**, niet uit expliciete decoratie.

De gebruiker moet het gevoel hebben:

**“Dit is mijn private space.”**

Niet:

**“Ik vul een formulier in.”**

---

## 2. Use many hues, few visual weights

KinkSync mag kleurrijk zijn.

Categorieën, statussen en betekenis mogen elk hun eigen hue hebben. Maar kleur betekent niet automatisch nadruk.

Gebruik veel verschillende tinten binnen slechts enkele duidelijke gewichtsniveaus:

- **Primary** — de vraag, kernactie of belangrijkste keuze.
- **Secondary** — context en relevante ondersteunende controls.
- **Tertiary** — metadata, progress, utility en uitleg.

Een scherm mag dus vijf kleuren bevatten zonder vijf dingen tegelijk te laten roepen.

---

## 3. Expressive in color, restrained in structure

De persoonlijkheid zit in kleur, typography, micro-depth en copy.

De structuur zelf blijft rustig.

Geen layouts die voortdurend van vorm veranderen, controls die onverwacht verplaatsen of elementen die aandacht vragen omdat ze kunnen animeren.

**Het skelet is voorspelbaar. De surface mag karakter hebben.**

---

## 4. Organised by hierarchy

Niet alles wat belangrijk is, hoeft even prominent te zijn.

Elke pagina moet onmiddellijk duidelijk maken:

- Wat ben ik hier aan het doen?
- Wat vraagt nu mijn aandacht?
- Wat kan ik daarnaast nog doen?

Hiërarchie komt eerst uit ruimte, formaat, positie en contrast. Borders, badges en kleur zijn ondersteunend — niet de enige manier om structuur te maken.

De primaire actie of keuze moet binnen ongeveer een halve seconde herkenbaar zijn.

---

## 5. Stable interaction geometry

Herhaalde interacties horen lichamelijk voorspelbaar te worden.

Als iemand tientallen of honderden questionnaire-items beantwoordt, moeten antwoordknoppen, afspraken en navigatie zo veel mogelijk op dezelfde plaats blijven.

Dynamische tekst mag die motorische kaart niet voortdurend herschikken.

**Content changes. Controls stay put.**

Scrollen is prima waar inhoud daarom vraagt, maar nooit als toevallige oplossing voor een instabiele basislayout.

---

## 6. Reflection over throughput

KinkSync is geen checklist die zo snel mogelijk af moet.

De interface mag ademruimte hebben. Antwoordopties mogen groot zijn. Een vraag mag even blijven hangen.

Optimaliseer niet op “meer items per viewport” wanneer dat de ervaring gehaast maakt.

De gebruiker moet ruimte voelen om te denken:

**“Wat vind ik hiervan?”**

Niet:

**“Hoe snel krijg ik dit weg?”**

---

## 7. Motion must earn its place

Animatie moet feedback geven, oriëntatie behouden of een overgang begrijpelijk maken.

Nooit animeren omdat beweging “premium” zou ogen.

Goede motion is:

- lokaal;
- kort;
- tactiel;
- voorspelbaar;
- comfortabel bij herhaling.

Een gekozen antwoord mag reageren. Een knop mag licht indrukken. Een sheet mag duidelijk binnenkomen.

Het hele scherm hoeft daarvoor niet te faden, flitsen of verschuiven.

Reduced Motion moet volledig gerespecteerd worden, maar de standaardervaring moet al comfortabel zijn.

---

## 8. Reveal depth without disturbing the surface

De hoofdinterface toont wat nodig is om een bewuste beslissing te nemen.

Verdieping hoort beschikbaar te zijn zonder de primaire flow te vervormen.

Gebruik bijvoorbeeld:

- concise two-line essences;
- `Uitleg & voorbeelden`;
- bottom sheets;
- detail layers;
- category explainers.

Extra context mag uitgebreid zijn, maar moet **bovenop** de stabiele interface verschijnen in plaats van de interface open te duwen.

### Essentiële context blijft zichtbaar

Essentiële context die nodig is om een bewuste keuze te maken, wordt **niet verborgen achter een disclosure**.

Een concise essence moet op zichzelf voldoende zijn voor een eerste, veilige en betekenisvolle keuze.

`Uitleg & voorbeelden` bevat verdieping, voorbeelden, terminologie, uitzonderingen en aanvullende nuance — nooit de enige cruciale informatie.

---

## 9. Human before clinical

Precisie is belangrijk. Klinische taal is niet automatisch preciezer.

Schrijf alsof een geïnformeerd mens iets gevoeligs helder uitlegt aan een ander mens.

Vermijd onnodig academische, medische of bureaucratische formuleringen.

Wel:

**“Hier draait het vooral om…”**

Niet zonder reden:

**“Deze activiteit omvat de toepassing van…”**

De toon mag speels, warm of licht provocerend zijn waar dat past, zolang betekenis en consent nooit ambigu worden.

---

## 10. Consent and limits deserve clarity, not alarm

Grenzen moeten onmiddellijk herkenbaar zijn.

Maar KinkSync behandelt een harde grens niet alsof de applicatie een foutmelding heeft gekregen.

Gebruik semantiek, duidelijke labels en een eigen visuele treatment — bijvoorbeeld restrained red en dashed styling — zonder agressieve alarmkleur of dramatische motion.

**Serious ≠ scary.**

---

## 11. Privacy should feel structural

Privacy is geen badge die achteraf op de UI wordt geplakt.

Het moet merkbaar zijn in hoe features werken:

- lokale data;
- expliciete sharing;
- duidelijke private states;
- geen onverwachte inference;
- geen verborgen verzending;
- begrijpelijke gevolgen van acties.

Een privacygevoelige handeling mag iets meer frictie krijgen wanneer die frictie betekenisvol vertrouwen creëert.

---

## 12. Secondary does not mean hidden

Favorite, hide, agreements, safety, progress en skip hoeven niet de blik te domineren.

Maar ze moeten wel voorspelbaar beschikbaar blijven.

Los visuele druk niet op door essentiële functionaliteit in overflowmenu's te verstoppen.

**Quiet is good. Invisible is not.**

---

## 13. Teach once, reinforce gently

Leg terugkerende concepten niet op iedere vraag opnieuw volledig uit.

Gebruik category-level uitleg en eenmalige terminology learning om gebruikers vertrouwd te maken met begrippen.

Daarna mag de interface ervan uitgaan dat de gebruiker iets geleerd heeft — zonder daar nieuwe voorkeuren of conclusies uit af te leiden.

Herhaling mag herkenning geven, geen informatievermoeidheid.

---

## 14. Mobile-native, not desktop-shrunk

De primaire ervaring wordt ontworpen voor een telefoon in één hand.

Dat betekent:

- bereikbare controls;
- ruime hit areas;
- rekening houden met safe areas;
- iOS Safari én installed PWA;
- korte visuele routes;
- geen hover-afhankelijke interacties;
- overlays en sheets die op kleine viewports werkelijk passen.

Desktop mag ruimer worden. Mobile bepaalt de fundamentele interactielogica.

---

## 15. Character through restraint

KinkSync mag herkenbaar zijn.

Aubergine, indigo, warme semantic hues, editorial typography, subtiele glow, tactiele controls en eigenzinnige copy mogen samen een duidelijke identiteit vormen.

Maar karakter hoeft niet overal tegelijk zichtbaar te zijn.

**Een goed KinkSync-scherm voelt ontworpen zonder voortdurend te laten zien dát het ontworpen is.**

---

# Prioriteitsvolgorde bij conflict

Wanneer principes met elkaar botsen, geldt deze volgorde:

1. **Consent, veiligheid en privacy**
2. **Begrijpelijkheid en leesbaarheid**
3. **Stabiele interactiegeometrie**
4. **Hiërarchie en rust**
5. **Expressiviteit en decoratie**
6. **Dichtheid en snelheid**

Geen visueel effect, compactere layout of snellere flow mag een hoger principe ondermijnen.

Deze volgorde is beslissend bij ontwerpconflicten. Een lager principe mag nooit als argument worden gebruikt om een hoger principe te verzwakken.

---

# UI decision gate

Voor **elke nieuwe UI-beslissing, component of feature** vragen we vóór implementatie en opnieuw vóór afronding:

- Voelt dit privé, warm en menselijk?
- Is de primaire actie of keuze binnen een halve seconde herkenbaar?
- Blijven herhaalde controls op een voorspelbare plaats?
- Voegt kleur betekenis of sfeer toe zonder onnodig visueel gewicht?
- Is noodzakelijke consent- en veiligheidscontext duidelijk?
- Blijft essentiële functionaliteit beschikbaar zonder dominant te worden?
- Voelt dit natuurlijk op een telefoon die met één hand wordt gebruikt?

Als een antwoord **nee** is, is de UI nog niet klaar tenzij een hoger principe uit de conflictvolgorde bewust voorrang vereist.

---

# Korte doctrine

> **Intimate by default.**  
> **Use many hues, few visual weights.**  
> **Organised by hierarchy.**  
> **Expressive in color, restrained in structure.**  
> **Stable in interaction, deliberate in motion.**  
> **Human in language, explicit in consent.**  
> **Private by architecture.**  
> **Reflective, never rushed.**
