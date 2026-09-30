import type { KinkCategory, KinkCategoryId } from "@/types";

export interface KinkCategoryDefinition {
  id: KinkCategoryId;
  label: string;
  aliases: readonly string[];
  questionnaireExplainer: string;
}

/**
 * Stable navigation keys with independently editable display copy. Category
 * identity may steer browse and conversation diversity, never an answer.
 *
 * `materials_scent` remains a legacy type-only category for the pre-migration
 * catalog snapshot, but is intentionally not exposed as a live category.
 */
export const KINK_CATEGORY_DEFINITIONS = [
  { id: "impact", label: "Impact Play", aliases: ["Impactspel"], questionnaireExplainer: "Impact Play draait om afgesproken lichamelijke impact, van zacht en sensueel tot intens. De concrete handeling, intensiteit en richting blijven belangrijker dan een veronderstelde rol." },
  { id: "bondage", label: "Bondage", aliases: ["Bondage & Restraint", "Vastbinden", "Beperking"], questionnaireExplainer: "Bondage & Restraint gaat over bewegingsvrijheid bewust beperken met touw, cuffs, houdingen of andere middelen. Comfort, circulatie, snelle bevrijding en duidelijke stopafspraken blijven leidend." },
  { id: "power", label: "Power & D/s", aliases: ["Power Exchange", "Machtsuitwisseling", "D/s"], questionnaireExplainer: "Power & D/s gaat over vrijwillig afgesproken macht, leiding, service of overgave. Een voorkeur voor één handeling zegt niet automatisch iets over iemands vaste rol of identiteit." },
  { id: "rituals", label: "Rituals & Protocols", aliases: ["Protocols & Rituals", "Rituelen & Training"], questionnaireExplainer: "Protocols & Rituals geeft herhaling, betekenis of structuur aan een afgesproken dynamiek via regels, routines en rituelen. Ze kunnen speels of serieus zijn en hoeven geen permanente machtsverhouding te betekenen." },
  { id: "discipline", label: "Discipline & Correction", aliases: ["Straf & Correctie"], questionnaireExplainer: "Discipline & Correction gebruikt afgesproken consequenties, opdrachten of correcties als onderdeel van spel of dynamiek. Consent en vooraf begrijpelijke grenzen onderscheiden dit van echte bestraffing." },
  { id: "roleplay", label: "Role Play", aliases: ["Rollenspel"], questionnaireExplainer: "Role Play verkent fantasieën via tijdelijk afgesproken rollen of scenario’s. De gespeelde rol is geen uitspraak over iemands identiteit, wensen buiten de scène of dagelijkse relatie." },
  { id: "interaction", label: "Interaction & Chemistry", aliases: ["Interactie & chemie", "Erotische interactie"], questionnaireExplainer: "Interaction & Chemistry gaat over erotische spanning die ontstaat in wat partners bij elkaar uitlokken: plagen, oogcontact, geluiden, wachten, tempo of speels fysiek uitdagen. Het veronderstelt geen vaste machtsrol." },
  { id: "sensation", label: "Sensation Play", aliases: ["Sensatiespel", "Zintuiglijke prikkels"], questionnaireExplainer: "Sensation Play draait om lichamelijke en zintuiglijke prikkels zoals temperatuur, textuur, druk, geur of zintuiglijke beperking. De gewenste sensatie en intensiteit staan centraal." },
  { id: "sexual_acts", label: "Sexual Acts", aliases: ["Seksuele handelingen", "Seksuele activiteiten"], questionnaireExplainer: "Sexual Acts bundelt seksuele handelingen die niet primair door een fetisj, machtsdynamiek of hulpmiddel worden gedefinieerd. Geven, ontvangen en samen doen blijven aparte voorkeuren." },
  { id: "penetration", label: "Penetration", aliases: ["Penetratie", "Anaal & penetratie"], questionnaireExplainer: "Penetration bundelt vaginale, anale, urethrale en andere penetratieve handelingen. Geven en ontvangen zijn aparte voorkeuren; lichaamsdeel, methode en context kunnen afzonderlijke grenzen hebben." },
  { id: "exhibition", label: "Exhibition & Voyeurism", aliases: ["Exhibitionisme & Voyeurisme"], questionnaireExplainer: "Exhibition & Voyeurism draait om gezien worden, kijken of het gevoel daarvan. Onwetende omstanders zijn geen deelnemers: context en toestemming bepalen wat passend is." },
  { id: "media", label: "Media & Recording", aliases: ["Media & Content", "Media & Contentcreatie", "Opnames"], questionnaireExplainer: "Media & Recording gaat over erotische of kinky beelden, audio, schrijven en opnames. Vastleggen, bewaren en delen zijn afzonderlijke consentkeuzes." },
  { id: "group_partner", label: "Group Play", aliases: ["Group & Partner Play", "Groepsspel", "Groeps- & partnerspel"], questionnaireExplainer: "Group Play gaat over seksuele of kinky contexten met een derde persoon of meerdere partners. Wie betrokken is en welke interacties toegestaan zijn, moeten expliciet blijven." },
  { id: "body_focus", label: "Body Focus & Worship", aliases: ["Lichaamsfocus & aanbidding"], questionnaireExplainer: "Body Focus & Worship legt erotische of rituele aandacht op een lichaam of lichaamsdeel. Aandacht, aanbidding, service en vernedering zijn verschillende smaken en worden niet automatisch aan elkaar gekoppeld." },
  { id: "appearance", label: "Fetishwear & Presentation", aliases: ["Appearance & Clothing", "Fetishkleding & presentatie", "Uiterlijk & kleding"], questionnaireExplainer: "Fetishwear & Presentation draait om kleding, materialen en presentatie als erotische prikkel. Dragen, kiezen voor een ander, aanbidden en bekeken worden zijn verschillende voorkeuren." },
  { id: "pet_play", label: "Pet Play", aliases: ["Dierenspel"], questionnaireExplainer: "Pet Play gebruikt vrijwillig afgesproken dierlijke rollen, gedrag of verzorging als fantasie. Het blijft rollenspel tussen instemmende volwassenen." },
  { id: "fluids", label: "Fluids & Body Functions", aliases: ["Fluids & Bodily Play", "Lichaamsvloeistoffen & lichaamsfuncties"], questionnaireExplainer: "Fluids & Body Functions maakt lichaamsvloeistoffen of lichamelijke functies onderdeel van erotiek of spel. Contactzone, hygiëne en blootstelling kunnen de betekenis en het risiconiveau sterk veranderen." },
  { id: "toys", label: "Toys & Devices", aliases: ["Toys & Stimulation", "Speeltjes & apparaten", "Speeltjes & stimulatie"], questionnaireExplainer: "Toys & Devices gaat over hulpmiddelen, apparaten en gerichte prikkels. Hetzelfde hulpmiddel kan heel anders voelen afhankelijk van plek, intensiteit, duur en wie het bedient." },
  { id: "aftercare", label: "Aftercare & Recovery", aliases: ["Aftercare", "Nazorg & herstel", "Nazorg"], questionnaireExplainer: "Aftercare & Recovery gaat over wat iemand na intens of kwetsbaar spel prettig vindt: nabijheid, rust, praktische zorg of juist ruimte. Behoeften kunnen per persoon en per scène verschillen." },
  { id: "adult_ageplay", label: "Adult Ageplay & Diaper Play", aliases: ["Volwassen ageplay & luiers"], questionnaireExplainer: "Adult Ageplay & Diaper Play is fantasie en rollenspel tussen instemmende volwassenen. Leeftijdsrollen, verzorging, kleding en luiergebruik zijn afzonderlijke elementen en impliceren elkaar niet automatisch." },
] as const satisfies readonly KinkCategoryDefinition[];

export const CATEGORIES: readonly KinkCategoryId[] = KINK_CATEGORY_DEFINITIONS.map(
  ({ id }) => id,
);

const CATEGORY_DEFINITION_BY_ID = new Map<KinkCategoryId, KinkCategoryDefinition>(
  KINK_CATEGORY_DEFINITIONS.map(
    (definition): [KinkCategoryId, KinkCategoryDefinition] => [definition.id, definition],
  ),
);

export function kinkCategoryLabel(category: KinkCategory): string {
  if (category === "custom") return "Meer";
  return CATEGORY_DEFINITION_BY_ID.get(category)?.label ?? category;
}

export function kinkCategorySearchTerms(category: KinkCategory): readonly string[] {
  if (category === "custom") return ["Meer", "Eigen onderwerpen"];
  const definition = CATEGORY_DEFINITION_BY_ID.get(category);
  return definition ? [definition.label, ...definition.aliases] : [category];
}

export function kinkCategoryExplainer(category: KinkCategory): string | null {
  if (category === "custom") return null;
  return CATEGORY_DEFINITION_BY_ID.get(category)?.questionnaireExplainer ?? null;
}