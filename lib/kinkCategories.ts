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
 */
export const KINK_CATEGORY_DEFINITIONS = [
  { id: "impact", label: "Impact Play", aliases: ["Impactspel"], questionnaireExplainer: "Impact Play draait om afgesproken lichamelijke impact, van zacht en sensueel tot intens. De concrete handeling, intensiteit en richting blijven belangrijker dan een veronderstelde rol." },
  { id: "bondage", label: "Bondage", aliases: ["Vastbinden", "Beperking"], questionnaireExplainer: "Bondage gaat over bewegingsvrijheid bewust beperken met touw, cuffs, houdingen of andere middelen. Comfort, circulatie, snelle bevrijding en duidelijke stopafspraken blijven leidend." },
  { id: "power", label: "Power Exchange", aliases: ["Machtsuitwisseling"], questionnaireExplainer: "Power Exchange gaat over vrijwillig afgesproken macht, leiding of overgave. Een voorkeur voor één handeling zegt niet automatisch iets over iemands vaste rol of identiteit." },
  { id: "rituals", label: "Rituals & Protocols", aliases: ["Rituelen & Training"], questionnaireExplainer: "Rituelen en protocollen geven herhaling, betekenis of structuur aan een afgesproken dynamiek. Ze kunnen speels of serieus zijn en hoeven geen permanente machtsverhouding te betekenen." },
  { id: "discipline", label: "Discipline & Correction", aliases: ["Straf & Correctie"], questionnaireExplainer: "Discipline & Correction gebruikt afgesproken consequenties, opdrachten of correcties als onderdeel van spel of dynamiek. Consent en vooraf begrijpelijke grenzen onderscheiden dit van echte bestraffing." },
  { id: "roleplay", label: "Role Play", aliases: ["Rollenspel"], questionnaireExplainer: "Role Play verkent fantasieën via tijdelijk afgesproken rollen of scenario’s. De gespeelde rol is geen uitspraak over iemands identiteit, wensen buiten de scène of dagelijkse relatie." },
  { id: "sensation", label: "Sensation Play", aliases: ["Sensatiespel"], questionnaireExplainer: "Sensation Play draait om lichamelijke prikkels zoals temperatuur, textuur, druk of zintuiglijke beperking. De gewenste sensatie en intensiteit staan centraal." },
  { id: "exhibition", label: "Exhibition & Voyeurism", aliases: ["Exhibitionisme & Voyeurisme"], questionnaireExplainer: "Exhibition & Voyeurism draait om gezien worden, kijken of het gevoel daarvan. Onwetende omstanders zijn geen deelnemers: context en toestemming bepalen wat passend is." },
  { id: "media", label: "Media & Content", aliases: ["Media & Contentcreatie", "Opnames"], questionnaireExplainer: "Media & Content gaat over erotische of kinky beelden, audio, schrijven en opnames. Vastleggen, bewaren en delen zijn afzonderlijke consentkeuzes." },
  { id: "group_partner", label: "Group & Partner Play", aliases: ["Groeps- & partnerspel"], questionnaireExplainer: "Group & Partner Play gaat over situaties met meer dan één partner of met anderen in dezelfde seksuele context. Wie betrokken is en welke interacties toegestaan zijn, moeten expliciet blijven." },
  { id: "body_focus", label: "Body Focus & Worship", aliases: ["Lichaamsfocus & aanbidding"], questionnaireExplainer: "Body Focus & Worship legt erotische of rituele aandacht op een lichaamsdeel. Aandacht, aanbidding, service en vernedering zijn verschillende smaken en worden niet automatisch aan elkaar gekoppeld." },
  { id: "materials_scent", label: "Materials & Scent", aliases: ["Materialen & geur"], questionnaireExplainer: "Materials & Scent draait om opwinding door materiaal, kleding, geur of een combinatie daarvan. De specifieke prikkel is belangrijker dan een veronderstelde rol of dynamiek." },
  { id: "pet_play", label: "Pet Play", aliases: ["Dierenspel"], questionnaireExplainer: "Pet Play gebruikt vrijwillig afgesproken dierlijke rollen, gedrag of verzorging als fantasie. Het blijft rollenspel tussen instemmende volwassenen." },
  { id: "fluids", label: "Fluids & Bodily Play", aliases: ["Lichaamsvloeistoffen"], questionnaireExplainer: "Fluids & Bodily Play maakt lichaamsvloeistoffen of lichamelijke functies onderdeel van erotiek of spel. Contactzone, hygiëne en blootstelling kunnen de betekenis en het risiconiveau sterk veranderen." },
  { id: "toys", label: "Toys & Stimulation", aliases: ["Speeltjes & stimulatie"], questionnaireExplainer: "Toys & Stimulation gaat over hulpmiddelen en gerichte prikkels. Hetzelfde speeltje kan heel anders voelen afhankelijk van plek, intensiteit, duur en wie het bedient." },
  { id: "penetration", label: "Oral, Anal & Penetration", aliases: ["Oraal, anaal & penetratie"], questionnaireExplainer: "Deze categorie bundelt orale, anale en andere penetratieve handelingen. Geven en ontvangen zijn aparte voorkeuren; lichaamsdeel, methode en context kunnen afzonderlijke grenzen hebben." },
  { id: "aftercare", label: "Aftercare", aliases: ["Nazorg"], questionnaireExplainer: "Aftercare gaat over wat iemand na intens of kwetsbaar spel prettig vindt: nabijheid, rust, praktische zorg of juist ruimte. Behoeften kunnen per persoon en per scène verschillen." },
  { id: "appearance", label: "Appearance & Clothing", aliases: ["Uiterlijk & kleding"], questionnaireExplainer: "Appearance & Clothing draait om kleding, presentatie en uiterlijk als erotische of relationele prikkel. Dragen, kiezen voor een ander en bekeken worden zijn verschillende voorkeuren." },
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
