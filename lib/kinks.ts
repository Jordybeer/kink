import type { Kink } from "@/types";

export const KINKS: Kink[] = [
  // ─── Impact Play ───────────────────────────────────────────────────────────
  { id: "spanking_hand", name: "Spanking (hand)", category: "Impact Play" },
  { id: "spanking_implement", name: "Spanking (implement)", category: "Impact Play" },
  { id: "flogging", name: "Flogging", category: "Impact Play" },
  { id: "caning", name: "Caning", category: "Impact Play" },
  { id: "cropping", name: "Crop", category: "Impact Play" },
  { id: "paddling", name: "Paddling", category: "Impact Play" },
  { id: "whipping", name: "Whipping", category: "Impact Play" },
  { id: "belt", name: "Belt", category: "Impact Play" },
  { id: "slapping_face", name: "Face slapping", category: "Impact Play" },
  { id: "punching", name: "Punching / thuding", category: "Impact Play" },
  { id: "trampling", name: "Trampling", category: "Impact Play" },

  // ─── Bondage ───────────────────────────────────────────────────────────────
  { id: "rope_bondage", name: "Rope bondage", category: "Bondage" },
  { id: "shibari", name: "Shibari / suspension", category: "Bondage" },
  { id: "handcuffs", name: "Handcuffs / metal cuffs", category: "Bondage" },
  { id: "leather_cuffs", name: "Leather cuffs", category: "Bondage" },
  { id: "spreader_bar", name: "Spreader bar", category: "Bondage" },
  { id: "hogtie", name: "Hogtie", category: "Bondage" },
  { id: "mummification", name: "Mummification", category: "Bondage" },
  { id: "straitjacket", name: "Straitjacket", category: "Bondage" },
  { id: "chastity", name: "Chastity device", category: "Bondage" },
  { id: "gag_ball", name: "Ball gag", category: "Bondage" },
  { id: "gag_bit", name: "Bit gag", category: "Bondage" },
  { id: "gag_tape", name: "Tape gag", category: "Bondage" },
  { id: "blindfold", name: "Blindfold", category: "Bondage" },
  { id: "hood", name: "Hood / sensory deprivation hood", category: "Bondage" },
  { id: "collar_leash", name: "Collar & leash", category: "Bondage" },

  // ─── Power Exchange ─────────────────────────────────────────────────────────
  { id: "dominance_submission", name: "D/s dynamic", category: "Power Exchange" },
  { id: "master_slave", name: "Master / slave dynamic", category: "Power Exchange" },
  { id: "owner_pet", name: "Owner / pet dynamic", category: "Power Exchange" },
  { id: "collaring", name: "Collaring ceremony", category: "Power Exchange" },
  { id: "rules_protocols", name: "Rules & protocols", category: "Power Exchange" },
  { id: "punishment", name: "Punishment play", category: "Power Exchange" },
  { id: "humiliation_verbal", name: "Verbal humiliation", category: "Power Exchange" },
  { id: "degradation", name: "Degradation", category: "Power Exchange" },
  { id: "praise_kink", name: "Praise kink", category: "Power Exchange" },
  { id: "objectification", name: "Objectification", category: "Power Exchange" },
  { id: "forced_orgasm", name: "Forced orgasm", category: "Power Exchange" },
  { id: "orgasm_denial", name: "Orgasm denial / edging", category: "Power Exchange" },
  { id: "orgasm_control", name: "Orgasm control / permission", category: "Power Exchange" },
  { id: "service", name: "Service (domestic / personal)", category: "Power Exchange" },
  { id: "financial_domination", name: "Financial domination", category: "Power Exchange" },

  // ─── Role Play ──────────────────────────────────────────────────────────────
  { id: "cnc", name: "Consensual non-consent (CNC)", category: "Role Play" },
  { id: "interrogation", name: "Interrogation scene", category: "Role Play" },
  { id: "capture_scene", name: "Capture / kidnapping scene", category: "Role Play" },
  { id: "teacher_student", name: "Teacher / student", category: "Role Play" },
  { id: "boss_employee", name: "Boss / employee", category: "Role Play" },
  { id: "doctor_patient", name: "Doctor / patient", category: "Role Play" },
  { id: "strangers_scene", name: "Strangers scene", category: "Role Play" },
  { id: "brat_tamer", name: "Brat / tamer dynamic", category: "Role Play" },

  // ─── Sensation Play ─────────────────────────────────────────────────────────
  { id: "wax_play", name: "Wax play", category: "Sensation Play" },
  { id: "ice_play", name: "Ice play", category: "Sensation Play" },
  { id: "knife_play", name: "Knife play", category: "Sensation Play" },
  { id: "needle_play", name: "Needle play", category: "Sensation Play" },
  { id: "fire_play", name: "Fire play", category: "Sensation Play" },
  { id: "electro_play", name: "Electrostimulation", category: "Sensation Play" },
  { id: "wartenberg_wheel", name: "Wartenberg wheel", category: "Sensation Play" },
  { id: "pinching", name: "Pinching / nipple clamps", category: "Sensation Play" },
  { id: "scratching", name: "Scratching", category: "Sensation Play" },
  { id: "biting", name: "Biting", category: "Sensation Play" },
  { id: "tickling", name: "Tickling", category: "Sensation Play" },
  { id: "temperature_play", name: "Temperature play (general)", category: "Sensation Play" },

  // ─── Breath & Body ──────────────────────────────────────────────────────────
  { id: "choking", name: "Choking / breath restriction", category: "Breath & Body" },
  { id: "facesitting", name: "Facesitting / smothering", category: "Breath & Body" },
  { id: "hair_pulling", name: "Hair pulling", category: "Breath & Body" },
  { id: "marking", name: "Marking / bruising", category: "Breath & Body" },
  { id: "scarification", name: "Scarification / branding", category: "Breath & Body" },
  { id: "piercing_temp", name: "Temporary piercing play", category: "Breath & Body" },

  // ─── Exhibition & Voyeurism ─────────────────────────────────────────────────
  { id: "exhibitionism", name: "Exhibitionism", category: "Exhibition & Voyeurism" },
  { id: "voyeurism", name: "Voyeurism", category: "Exhibition & Voyeurism" },
  { id: "public_play", name: "Public play (discreet)", category: "Exhibition & Voyeurism" },
  { id: "dogging", name: "Outdoor / dogging", category: "Exhibition & Voyeurism" },
  { id: "watching_others", name: "Watching others (in person)", category: "Exhibition & Voyeurism" },
  { id: "being_watched", name: "Being watched", category: "Exhibition & Voyeurism" },
  { id: "recording", name: "Recording / photography (private)", category: "Exhibition & Voyeurism" },
  { id: "webcam", name: "Webcam / streaming (private)", category: "Exhibition & Voyeurism" },

  // ─── Fetishes ───────────────────────────────────────────────────────────────
  { id: "feet", name: "Foot worship / feet", category: "Fetishes" },
  { id: "leather", name: "Leather", category: "Fetishes" },
  { id: "latex_rubber", name: "Latex / rubber", category: "Fetishes" },
  { id: "lingerie", name: "Lingerie / stockings", category: "Fetishes" },
  { id: "uniforms", name: "Uniforms / costumes", category: "Fetishes" },
  { id: "cross_dressing", name: "Cross-dressing / forced feminization", category: "Fetishes" },
  { id: "pet_play", name: "Pet play (puppy / kitten / pony)", category: "Fetishes" },
  { id: "furry", name: "Fursuit / furry play", category: "Fetishes" },
  { id: "cuckolding", name: "Cuckolding / hotwifing", category: "Fetishes" },
  { id: "voyeur_sharing", name: "Sharing / group play", category: "Fetishes" },
  { id: "body_worship", name: "Body worship", category: "Fetishes" },
  { id: "stocking_worship", name: "Stocking / lingerie worship", category: "Fetishes" },

  // ─── Fluid & Bodily ─────────────────────────────────────────────────────────
  { id: "spitting", name: "Spitting", category: "Fluid & Bodily" },
  { id: "watersports", name: "Watersports (golden shower)", category: "Fluid & Bodily" },
  { id: "scat", name: "Scat play", category: "Fluid & Bodily" },
  { id: "cum_play", name: "Cum play / facials", category: "Fluid & Bodily" },
  { id: "squirting", name: "Squirting", category: "Fluid & Bodily" },
  { id: "swallowing", name: "Swallowing", category: "Fluid & Bodily" },
  { id: "menstrual_play", name: "Menstrual play", category: "Fluid & Bodily" },

  // ─── Anal & Penetration ─────────────────────────────────────────────────────
  { id: "anal_sex", name: "Anal sex", category: "Anal & Penetration" },
  { id: "anal_fingering", name: "Anal fingering", category: "Anal & Penetration" },
  { id: "pegging", name: "Pegging / strap-on", category: "Anal & Penetration" },
  { id: "butt_plug", name: "Butt plug (wear)", category: "Anal & Penetration" },
  { id: "anal_beads", name: "Anal beads", category: "Anal & Penetration" },
  { id: "fisting_anal", name: "Anal fisting", category: "Anal & Penetration" },
  { id: "fisting_vaginal", name: "Vaginal fisting", category: "Anal & Penetration" },
  { id: "deep_throat", name: "Deep throat", category: "Anal & Penetration" },
  { id: "rough_sex", name: "Rough sex", category: "Anal & Penetration" },

  // ─── Aftercare ──────────────────────────────────────────────────────────────
  { id: "aftercare_physical", name: "Physical aftercare (cuddling, blankets)", category: "Aftercare" },
  { id: "aftercare_verbal", name: "Verbal reassurance / check-ins", category: "Aftercare" },
  { id: "aftercare_alone", name: "Alone time after scenes", category: "Aftercare" },
  { id: "aftercare_food", name: "Food / drink after scenes", category: "Aftercare" },
  { id: "aftercare_journaling", name: "Journaling / reflection after scenes", category: "Aftercare" },
];

export const CATEGORIES = Array.from(new Set(KINKS.map((k) => k.category)));

export function getKinksByCategory(category: string): Kink[] {
  return KINKS.filter((k) => k.category === category);
}
