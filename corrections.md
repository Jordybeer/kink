# corrections — fouten en twijfels eerlijk vastgelegd

## Gemaakte fouten

### KinkRow dubbele `style` prop (session 2026-05-28)
Eerste edit verwijderde `overflow-hidden` uit className en voegde `style={{ overflow: "clip" }}` toe als apart prop. Tweede edit voegde `overflow: "clip"` toe aan het bestaande style-object. Resultaat: twee `style` props op hetzelfde element — React negeert de eerste stilletjes. Vereiste een derde edit om op te lossen.
**Oorzaak:** target-line gelezen, niet het volledige element.

### Contract page: meerdere lees-rondes voor structuurbegrip (session 2026-05-28)
De fragment-herstructurering (`<main>` → `<>`) kostte 4 afzonderlijke reads om de open/sluit-structuur te begrijpen. Een enkele `smart_outline` call vooraf had dit teruggebracht tot één ronde.
**Oorzaak:** direct beginnen met editen zonder de bestandsstructuur in kaart te brengen.

---

## Kwaliteitszorgen (niet geverifieerd)

### CategorySection focus-ring gedrag na nested-button fix
De outer `<button>` is vervangen door een `<div>`. De `focus-ring` class zit nu op de inner accordion `<button>`. Tab-volgorde lijkt correct, maar dit is niet visueel getest — met name of het focus-outline zichtbaar blijft op het volledige headerblok of alleen op de tekst.

### Contract page JSX balans na fragment-edit
De herstructurering (`<BottomNav />` en ceremony uit `<main>`) is via string-matching gedaan in een 800-regelig bestand. Build slaagt, maar subtiele whitespace- of indentatieproblemen zijn niet uitgesloten. Structuur is nagelopen via `grep` op `</main>` en `</>` — niet via volledige visuele inspectie.

### Compare mobiele samenvatting: kleurgebruik `discussCount`
`discussCount` gebruikt `var(--maybe)` (oranje/amber) als kleur. Dit is de "misschien"-statuspil kleur, niet een intuïtieve kleur voor "te bespreken". Kan verwarrend zijn naast de andere statuskleurcodes.

### BottomNav safe-area padding gedrag
`paddingBottom: "env(safe-area-inset-bottom)"` toegevoegd aan de `<nav>`. Op apparaten zonder notch is de waarde `0px` — geen probleem. Op iPhone met home indicator werkt dit correct. Niet getest of dit de `py-3` op de linkjes visueel verstoort op notch-apparaten (de linkjes erven de padding van de nav, niet andersom).
