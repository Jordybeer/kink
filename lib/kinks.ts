import { KINKS as BASE_KINKS } from "@/lib/kinks/base";
import type { CatalogKink, Kink, KinkCategoryId } from "@/types";

export { CATEGORIES, kinkCategoryLabel, KINK_CATEGORY_DEFINITIONS } from "@/lib/kinkCategories";

/**
 * Taxonomy migration layer.
 *
 * Existing kink IDs stay stable so saved profile entries keep resolving. The
 * legacy catalog snapshot lives in `lib/kinks/base.ts`; this layer only changes
 * taxonomy/copy and adds broad missing compatibility topics.
 */
const CATEGORY_OVERRIDES: Readonly<Record<string, KinkCategoryId>> = {
  // Retired Materials & Scent category.
  leather: "appearance",
  latex_rubber: "appearance",
  lingerie: "appearance",
  geur_scent_fetish: "sensation",
  panty_sniffing: "sensation",
  kniekousen_fetish: "appearance",
  wetlook: "appearance",

  // Clearer primary homes for existing catalog entries.
  collar_leash: "power",
  ballbusting: "impact",
  deep_throat_give: "sexual_acts",
  deep_throat_receive: "sexual_acts",
  mutual_masturbation: "sexual_acts",
  partner_masturbation_watch: "sexual_acts",
  footjob_give: "sexual_acts",
  footjob_receive: "sexual_acts",
  voetgeur: "sensation",
  penisring_cockring: "toys",
  erotisch_dansen_prive: "interaction",
  erotisch_dansen_publiek: "exhibition",
  kleding_commando: "rituals",
  verplicht_nudisme_prive: "rituals",
  verplicht_nudisme_publiek: "rituals",
  sissificatie: "roleplay",
  furry: "roleplay",
  katheters_urethral: "penetration",
  klysma_straf: "discipline",
  rough_sex: "interaction",
  dirty_talk: "interaction",
  facesitting: "sexual_acts",
  erotic_massage_give: "sexual_acts",
  erotic_massage_receive: "sexual_acts",
  rimming_give: "sexual_acts",
  rimming_receive: "sexual_acts",
  stocking_worship: "appearance",
  hoge_hakken_aanbidding: "appearance",
  laarzen_aanbidding_give: "appearance",
  laarzen_aanbidding_receive: "appearance",
};

const ALIAS_OVERRIDES: Readonly<Record<string, readonly string[]>> = {
  breeding_fantasy: ["Bevruchtingsfantasie", "Breeding"],
  creampie: ["Inwendig klaarkomen", "Creampie"],
  diaper_wetting: ["In een luier plassen", "Luier natmaken"],
  diaper_messing: ["Ontlasting in een luier", "Luier bevuilen"],
};

const COPY_OVERRIDES: Readonly<
  Record<string, { readonly name?: string; readonly description?: string }>
> = {
  rituelen_protocols: {
    name: "Daily D/s protocols",
    description: "Terugkerende dagelijkse protocollen binnen een afgesproken D/s-dynamiek, zoals aanspreekvormen, houdingen of vaste taken. Dit vult het bredere Rules & protocols aan zonder dezelfde umbrella-vraag te dupliceren.",
  },
};

function migratedCategory(kink: CatalogKink): KinkCategoryId {
  const explicit = CATEGORY_OVERRIDES[kink.id];
  if (explicit) return explicit;
  // Defensive fallback: the retired category must never leak into live browse.
  if (kink.category === "materials_scent") return "appearance";
  return kink.category;
}

const MIGRATED_BASE_KINKS: CatalogKink[] = BASE_KINKS.map((kink) => {
  const aliases = ALIAS_OVERRIDES[kink.id];
  const copy = COPY_OVERRIDES[kink.id];
  return {
    ...kink,
    ...copy,
    category: migratedCategory(kink),
    ...(aliases ? { aliases } : {}),
  };
});

const ADDITIONAL_KINKS: CatalogKink[] = [
  // ─── Interaction & Chemistry ──────────────────────────────────────────────
  {
    id: "kissing_making_out",
    name: "Kissing / making out",
    aliases: ["Zoenen", "Make-out"],
    category: "interaction",
    level: 1,
    description: "Zoenen of langdurig vrijen als erotische focus op zichzelf, van zacht en langzaam tot intens, zonder een machtsrol te veronderstellen.",
  },
  {
    id: "intense_eye_contact",
    name: "Intense eye contact",
    aliases: ["Intens oogcontact"],
    category: "interaction",
    level: 1,
    description: "Langdurig of doelbewust oogcontact gebruiken om spanning, nabijheid of uitdaging op te bouwen, zonder regels rond wel of niet mogen kijken te veronderstellen.",
  },
  {
    id: "sexual_sounds_auralism",
    name: "Sexual sounds / auralism",
    aliases: ["Auralism", "Seksuele geluiden", "Reactiegeluiden"],
    category: "interaction",
    level: 1,
    description: "Opwinding door de stem, ademhaling, kreunen of andere hoorbare reacties van een partner, zonder performance of exhibitionisme te veronderstellen.",
  },
  {
    id: "erotic_teasing",
    name: "Erotic teasing",
    aliases: ["Erotisch plagen", "Teasing"],
    category: "interaction",
    level: 1,
    description: "Spanning opbouwen door doelbewust uit te dagen, bijna aan te raken, terug te trekken of reacties uit te lokken, zonder een vaste D/s-rol te veronderstellen.",
  },
  {
    id: "slow_sensual_sex",
    name: "Slow / sensual sex",
    aliases: ["Langzame sensuele seks"],
    category: "interaction",
    level: 1,
    description: "Langzame, aandachtige seksuele intimiteit waarbij tempo, nabijheid en wederzijdse reactie belangrijker zijn dan intensiteit of een specifieke techniek.",
  },
  {
    id: "anticipation_suspense",
    name: "Anticipation / suspense",
    aliases: ["Anticipatie", "Spanning door wachten"],
    category: "interaction",
    level: 2,
    description: "Opwinding door bewust wachten, pauzes en onzekerheid over wanneer een afgesproken aanraking of volgende stap komt.",
  },
  {
    id: "play_fighting",
    name: "Play fighting / erotic wrestling",
    aliases: ["Speels vechten", "Erotisch worstelen"],
    category: "interaction",
    level: 2,
    description: "Wederzijds fysiek uitdagen, duwen, ontwijken, vastpakken of worstelen als speelse erotische interactie, zonder hunter/prey- of D/s-rol te veronderstellen.",
  },

  // ─── Broad Sexual Acts ────────────────────────────────────────────────────
  {
    id: "oral_sex_give",
    name: "Oral sex — giving",
    aliases: ["Orale seks geven"],
    category: "sexual_acts",
    level: 1,
    description: "De genitaliën van een partner oraal stimuleren, zonder deep-throat, machtsrol of specifieke techniek te veronderstellen.",
  },
  {
    id: "oral_sex_receive",
    name: "Oral sex — receiving",
    aliases: ["Orale seks ontvangen"],
    category: "sexual_acts",
    level: 1,
    description: "Orale stimulatie van je genitaliën ontvangen, zonder deep-throat, machtsrol of specifieke techniek te veronderstellen.",
  },
  {
    id: "manual_stimulation_give",
    name: "Manual genital stimulation — giving",
    aliases: ["Genitale stimulatie met de hand geven", "Handwerk geven"],
    category: "sexual_acts",
    level: 1,
    description: "De genitaliën van een partner met handen of vingers stimuleren, zonder penetratie of een machtsrol te veronderstellen.",
  },
  {
    id: "manual_stimulation_receive",
    name: "Manual genital stimulation — receiving",
    aliases: ["Genitale stimulatie met de hand ontvangen", "Handwerk ontvangen"],
    category: "sexual_acts",
    level: 1,
    description: "Stimulatie van je genitaliën met handen of vingers ontvangen, zonder penetratie of een machtsrol te veronderstellen.",
  },
];

export const KINKS: CatalogKink[] = [...MIGRATED_BASE_KINKS, ...ADDITIONAL_KINKS];

// Listings climb the ladder: beginner-kinks eerst, diepgaand als laatste. Stable
// sort, dus binnen één niveau blijft de handgekozen volgorde staan.
export function getKinksByCategory(category: string): Kink[] {
  return KINKS.filter((k) => k.category === category).sort((a, b) => a.level - b.level);
}

export function getKinksByCategoryAndLevel(category: string, maxLevel: number): Kink[] {
  return KINKS.filter((k) => k.category === category && k.level <= maxLevel).sort(
    (a, b) => a.level - b.level,
  );
}

export const LEVEL_MAX: Record<string, number> = {
  beginner: 1,
  gevorderd: 2,
  ervaren: 3,
  diepgaand: 4,
};
