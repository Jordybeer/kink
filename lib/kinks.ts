import type { Kink } from "@/types";

// level 1 = beginner (kort)  |  2 = gevorderd (normaal)  |  3 = ervaren (lang)  |  4 = diepgaand (alles)
export const KINKS: Kink[] = [
  // ─── Impact Play ───────────────────────────────────────────────────────────
  { id: "spanking_hand",      name: "Spanking (hand)",        category: "Impact Play", level: 1 },
  { id: "spanking_implement", name: "Spanking (implement)",   category: "Impact Play", level: 2 },
  { id: "flogging",           name: "Flogging",               category: "Impact Play", level: 2 },
  { id: "caning",             name: "Caning",                 category: "Impact Play", level: 3 },
  { id: "cropping",           name: "Crop",                   category: "Impact Play", level: 2 },
  { id: "paddling",           name: "Paddling",               category: "Impact Play", level: 2 },
  { id: "whipping",           name: "Whipping",               category: "Impact Play", level: 3 },
  { id: "belt",               name: "Belt",                   category: "Impact Play", level: 2 },
  { id: "slapping_face",      name: "Face slapping",          category: "Impact Play", level: 3 },
  { id: "punching",           name: "Punching / thuding",     category: "Impact Play", level: 3 },
  { id: "trampling",          name: "Trampling",              category: "Impact Play", level: 3 },

  // ─── Bondage ───────────────────────────────────────────────────────────────
  { id: "rope_bondage",   name: "Rope bondage",                       category: "Bondage", level: 2 },
  { id: "shibari",        name: "Shibari / suspension",               category: "Bondage", level: 4 },
  { id: "handcuffs",      name: "Handcuffs / metal cuffs",            category: "Bondage", level: 1 },
  { id: "leather_cuffs",  name: "Leather cuffs",                      category: "Bondage", level: 1 },
  { id: "spreader_bar",   name: "Spreader bar",                       category: "Bondage", level: 2 },
  { id: "hogtie",         name: "Hogtie",                             category: "Bondage", level: 3 },
  { id: "mummification",  name: "Mummification",                      category: "Bondage", level: 4 },
  { id: "straitjacket",   name: "Straitjacket",                       category: "Bondage", level: 4 },
  { id: "chastity",       name: "Chastity device",                    category: "Bondage", level: 3 },
  { id: "gag_ball",       name: "Ball gag",                           category: "Bondage", level: 2 },
  { id: "gag_bit",        name: "Bit gag",                            category: "Bondage", level: 2 },
  { id: "gag_tape",       name: "Tape gag",                           category: "Bondage", level: 2 },
  { id: "blindfold",      name: "Blindfold",                          category: "Bondage", level: 1 },
  { id: "hood",           name: "Hood / sensory deprivation hood",    category: "Bondage", level: 3 },
  { id: "collar_leash",   name: "Collar & leash",                     category: "Bondage", level: 1 },

  // ─── Power Exchange ─────────────────────────────────────────────────────────
  { id: "dominance_submission", name: "D/s dynamic",                     category: "Power Exchange", level: 1 },
  { id: "master_slave",         name: "Master / slave dynamic",           category: "Power Exchange", level: 3 },
  { id: "owner_pet",            name: "Owner / pet dynamic",              category: "Power Exchange", level: 2 },
  { id: "collaring",            name: "Collaring ceremony",               category: "Power Exchange", level: 3 },
  { id: "rules_protocols",      name: "Rules & protocols",                category: "Power Exchange", level: 2 },
  { id: "punishment",           name: "Punishment play",                  category: "Power Exchange", level: 2 },
  { id: "humiliation_verbal",   name: "Verbal humiliation",               category: "Power Exchange", level: 2 },
  { id: "degradation",          name: "Degradation",                      category: "Power Exchange", level: 3 },
  { id: "praise_kink",          name: "Praise kink",                      category: "Power Exchange", level: 1 },
  { id: "objectification",      name: "Objectification",                  category: "Power Exchange", level: 3 },
  { id: "forced_orgasm",        name: "Forced orgasm",                    category: "Power Exchange", level: 2 },
  { id: "orgasm_denial",        name: "Orgasm denial / edging",           category: "Power Exchange", level: 2 },
  { id: "orgasm_control",       name: "Orgasm control / permission",      category: "Power Exchange", level: 2 },
  { id: "service",              name: "Service (domestic / personal)",    category: "Power Exchange", level: 1 },
  { id: "financial_domination", name: "Financial domination",             category: "Power Exchange", level: 4 },

  // ─── Role Play ──────────────────────────────────────────────────────────────
  { id: "cnc",             name: "Consensual non-consent (CNC)", category: "Role Play", level: 3 },
  { id: "interrogation",   name: "Interrogation scene",          category: "Role Play", level: 3 },
  { id: "capture_scene",   name: "Capture / kidnapping scene",   category: "Role Play", level: 3 },
  { id: "teacher_student", name: "Teacher / student",            category: "Role Play", level: 2 },
  { id: "boss_employee",   name: "Boss / employee",              category: "Role Play", level: 2 },
  { id: "doctor_patient",  name: "Doctor / patient",             category: "Role Play", level: 2 },
  { id: "strangers_scene", name: "Strangers scene",              category: "Role Play", level: 2 },
  { id: "brat_tamer",      name: "Brat / tamer dynamic",         category: "Role Play", level: 2 },

  // ─── Sensation Play ─────────────────────────────────────────────────────────
  { id: "wax_play",          name: "Wax play",                      category: "Sensation Play", level: 2 },
  { id: "ice_play",          name: "Ice play",                      category: "Sensation Play", level: 1 },
  { id: "knife_play",        name: "Knife play",                    category: "Sensation Play", level: 3 },
  { id: "needle_play",       name: "Needle play",                   category: "Sensation Play", level: 4 },
  { id: "fire_play",         name: "Fire play",                     category: "Sensation Play", level: 4 },
  { id: "electro_play",      name: "Electrostimulation",            category: "Sensation Play", level: 3 },
  { id: "wartenberg_wheel",  name: "Wartenberg wheel",              category: "Sensation Play", level: 2 },
  { id: "pinching",          name: "Pinching / nipple clamps",      category: "Sensation Play", level: 2 },
  { id: "scratching",        name: "Scratching",                    category: "Sensation Play", level: 1 },
  { id: "biting",            name: "Biting",                        category: "Sensation Play", level: 1 },
  { id: "tickling",          name: "Tickling",                      category: "Sensation Play", level: 1 },
  { id: "temperature_play",  name: "Temperature play (general)",    category: "Sensation Play", level: 1 },

  // ─── Breath & Body ──────────────────────────────────────────────────────────
  { id: "choking",       name: "Choking / breath restriction",  category: "Breath & Body", level: 3 },
  { id: "facesitting",   name: "Facesitting / smothering",      category: "Breath & Body", level: 2 },
  { id: "hair_pulling",  name: "Hair pulling",                  category: "Breath & Body", level: 1 },
  { id: "marking",       name: "Marking / bruising",            category: "Breath & Body", level: 2 },
  { id: "scarification", name: "Scarification / branding",      category: "Breath & Body", level: 4 },
  { id: "piercing_temp", name: "Temporary piercing play",       category: "Breath & Body", level: 4 },

  // ─── Exhibition & Voyeurism ─────────────────────────────────────────────────
  { id: "exhibitionism",   name: "Exhibitionism",                    category: "Exhibition & Voyeurism", level: 1 },
  { id: "voyeurism",       name: "Voyeurism",                        category: "Exhibition & Voyeurism", level: 1 },
  { id: "public_play",     name: "Public play (discreet)",           category: "Exhibition & Voyeurism", level: 3 },
  { id: "dogging",         name: "Outdoor / dogging",                category: "Exhibition & Voyeurism", level: 3 },
  { id: "watching_others", name: "Watching others (in person)",      category: "Exhibition & Voyeurism", level: 2 },
  { id: "being_watched",   name: "Being watched",                    category: "Exhibition & Voyeurism", level: 1 },
  { id: "recording",       name: "Recording / photography (private)",category: "Exhibition & Voyeurism", level: 3 },
  { id: "webcam",          name: "Webcam / streaming (private)",     category: "Exhibition & Voyeurism", level: 3 },

  // ─── Fetishes ───────────────────────────────────────────────────────────────
  { id: "feet",             name: "Foot worship / feet",                     category: "Fetishes", level: 1 },
  { id: "leather",          name: "Leather",                                 category: "Fetishes", level: 2 },
  { id: "latex_rubber",     name: "Latex / rubber",                          category: "Fetishes", level: 2 },
  { id: "lingerie",         name: "Lingerie / stockings",                    category: "Fetishes", level: 1 },
  { id: "uniforms",         name: "Uniforms / costumes",                     category: "Fetishes", level: 2 },
  { id: "cross_dressing",   name: "Cross-dressing / forced feminization",    category: "Fetishes", level: 3 },
  { id: "pet_play",         name: "Pet play (puppy / kitten / pony)",        category: "Fetishes", level: 2 },
  { id: "furry",            name: "Fursuit / furry play",                    category: "Fetishes", level: 4 },
  { id: "cuckolding",       name: "Cuckolding / hotwifing",                  category: "Fetishes", level: 3 },
  { id: "voyeur_sharing",   name: "Sharing / group play",                    category: "Fetishes", level: 3 },
  { id: "body_worship",     name: "Body worship",                            category: "Fetishes", level: 1 },
  { id: "stocking_worship", name: "Stocking / lingerie worship",             category: "Fetishes", level: 2 },

  // ─── Fluid & Bodily ─────────────────────────────────────────────────────────
  { id: "spitting",       name: "Spitting",                     category: "Fluid & Bodily", level: 2 },
  { id: "watersports",    name: "Watersports (golden shower)",  category: "Fluid & Bodily", level: 3 },
  { id: "scat",           name: "Scat play",                    category: "Fluid & Bodily", level: 4 },
  { id: "cum_play",       name: "Cum play / facials",           category: "Fluid & Bodily", level: 1 },
  { id: "squirting",      name: "Squirting",                    category: "Fluid & Bodily", level: 2 },
  { id: "swallowing",     name: "Swallowing",                   category: "Fluid & Bodily", level: 1 },
  { id: "menstrual_play", name: "Menstrual play",               category: "Fluid & Bodily", level: 4 },

  // ─── Anal & Penetration ─────────────────────────────────────────────────────
  { id: "anal_sex",       name: "Anal sex",           category: "Anal & Penetration", level: 2 },
  { id: "anal_fingering", name: "Anal fingering",     category: "Anal & Penetration", level: 1 },
  { id: "pegging",        name: "Pegging / strap-on", category: "Anal & Penetration", level: 2 },
  { id: "butt_plug",      name: "Butt plug (wear)",   category: "Anal & Penetration", level: 1 },
  { id: "anal_beads",     name: "Anal beads",         category: "Anal & Penetration", level: 2 },
  { id: "fisting_anal",   name: "Anal fisting",       category: "Anal & Penetration", level: 3 },
  { id: "fisting_vaginal",name: "Vaginal fisting",    category: "Anal & Penetration", level: 3 },
  { id: "deep_throat",    name: "Deep throat",        category: "Anal & Penetration", level: 2 },
  { id: "rough_sex",      name: "Rough sex",          category: "Anal & Penetration", level: 2 },

  // ─── Aftercare ──────────────────────────────────────────────────────────────
  { id: "aftercare_physical",   name: "Physical aftercare (cuddling, blankets)", category: "Aftercare", level: 1 },
  { id: "aftercare_verbal",     name: "Verbal reassurance / check-ins",          category: "Aftercare", level: 1 },
  { id: "aftercare_alone",      name: "Alone time after scenes",                 category: "Aftercare", level: 2 },
  { id: "aftercare_food",       name: "Food / drink after scenes",               category: "Aftercare", level: 1 },
  { id: "aftercare_journaling", name: "Journaling / reflection after scenes",    category: "Aftercare", level: 2 },
];

export const CATEGORIES = Array.from(new Set(KINKS.map((k) => k.category)));

export function getKinksByCategory(category: string): Kink[] {
  return KINKS.filter((k) => k.category === category);
}

export function getKinksByCategoryAndLevel(category: string, maxLevel: number): Kink[] {
  return KINKS.filter((k) => k.category === category && k.level <= maxLevel);
}

export const LEVEL_MAX: Record<string, number> = {
  beginner:  1,
  gevorderd: 2,
  ervaren:   3,
  diepgaand: 4,
};
