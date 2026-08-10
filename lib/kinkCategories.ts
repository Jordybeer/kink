import type { KinkCategory, KinkCategoryId } from "@/types";

export interface KinkCategoryDefinition {
  id: KinkCategoryId;
  label: string;
  aliases: readonly string[];
}

/**
 * Stable navigation keys with independently editable display copy. Category
 * identity may steer browse and conversation diversity, never an answer.
 */
export const KINK_CATEGORY_DEFINITIONS = [
  { id: "impact", label: "Impact Play", aliases: ["Impactspel"] },
  { id: "bondage", label: "Bondage", aliases: ["Vastbinden", "Beperking"] },
  { id: "power", label: "Power Exchange", aliases: ["Machtsuitwisseling"] },
  { id: "rituals", label: "Rituals & Protocols", aliases: ["Rituelen & Training"] },
  { id: "discipline", label: "Discipline & Correction", aliases: ["Straf & Correctie"] },
  { id: "roleplay", label: "Role Play", aliases: ["Rollenspel"] },
  { id: "sensation", label: "Sensation Play", aliases: ["Sensatiespel"] },
  { id: "exhibition", label: "Exhibition & Voyeurism", aliases: ["Exhibitionisme & Voyeurisme"] },
  { id: "media", label: "Media & Content", aliases: ["Media & Contentcreatie", "Opnames"] },
  { id: "group_partner", label: "Group & Partner Play", aliases: ["Groeps- & partnerspel"] },
  { id: "body_focus", label: "Body Focus & Worship", aliases: ["Lichaamsfocus & aanbidding"] },
  { id: "materials_scent", label: "Materials & Scent", aliases: ["Materialen & geur"] },
  { id: "pet_play", label: "Pet Play", aliases: ["Dierenspel"] },
  { id: "fluids", label: "Fluids & Bodily Play", aliases: ["Lichaamsvloeistoffen"] },
  { id: "toys", label: "Toys & Stimulation", aliases: ["Speeltjes & stimulatie"] },
  { id: "penetration", label: "Oral, Anal & Penetration", aliases: ["Oraal, anaal & penetratie"] },
  { id: "aftercare", label: "Aftercare", aliases: ["Nazorg"] },
  { id: "appearance", label: "Appearance & Clothing", aliases: ["Uiterlijk & kleding"] },
  { id: "adult_ageplay", label: "Adult Ageplay & Diaper Play", aliases: ["Volwassen ageplay & luiers"] },
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
