import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  DIRECTIONAL_KINK_PAIRS,
  directionalSiblingId,
  partnerDirectionalKinkId,
  questionnaireDirectionalKinkIdForPerspective,
  stripDeprecatedDirectionalEntries,
} from "@/lib/directionality";
import {
  buildQuestionnaireCoveragePlan,
  getQuestionnaireRuntime,
  searchAllKinks,
} from "@/lib/questionnaire";
import {
  derivePendingExpansionProbes,
  selectConversationQuestion,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import { encodeProfile, decodeAny } from "@/lib/shareProfile";
import { generateProfileOwnerKey, signProfileConsent, verifyProfileConsent } from "@/lib/consentProof";
import { sanitizeProfileFull } from "@/lib/sanitizeProfile";
import { migrateStoredDirectionalityV24, STORE_PERSIST_VERSION } from "@/lib/storeCore";
import { QUESTIONNAIRE_CANONICAL_PROBE_TARGETS, QUESTIONNAIRE_FOLLOW_UPS } from "@/lib/questionnaireMetadata";
import { QUESTIONNAIRE_PROGRESSION_EDGES } from "@/lib/questionnaireProgression";
import type { KinkEntry, Profile, ProfilePerspective } from "@/types";

function ownProfile(perspective: ProfilePerspective, entries: Record<string, KinkEntry> = {}): Profile {
  return {
    id: "direction-" + perspective,
    name: "Direction",
    role: perspective === "dominant" ? "Dominant" : "Submissive",
    perspective,
    questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    experienceLevel: "gevorderd",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries,
    origin: "own",
  };
}

function queueItem(id: string): QuestionnaireQueueItem {
  const kink = KINKS.find((candidate) => candidate.id === id);
  if (!kink) throw new Error("Kink ontbreekt: " + id);
  return { kink, lane: "coverage", isProbe: false, coversAnchor: true, reasons: [] };
}

describe("directionele kinkvragen", () => {
  it("models pegging as two flat explicit IDs and retires the ambiguous combined ID", () => {
    const ids = new Set(KINKS.map((kink) => kink.id));
    expect(DIRECTIONAL_KINK_PAIRS.slice(0, 9)).toEqual([
      { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },
      { conceptId: "golden_shower", giveId: "watersports_geven", receiveId: "watersports_ontvangen" },
      { conceptId: "anal_sex", giveId: "anal_sex_give", receiveId: "anal_sex_receive" },
      { conceptId: "anal_fingering", giveId: "anal_fingering_give", receiveId: "anal_fingering_receive" },
      { conceptId: "anal_fisting", giveId: "fisting_anal_give", receiveId: "fisting_anal_receive" },
      { conceptId: "vaginal_fisting", giveId: "fisting_vaginal_give", receiveId: "fisting_vaginal_receive" },
      { conceptId: "deep_throat", giveId: "deep_throat_give", receiveId: "deep_throat_receive" },
      { conceptId: "rimming", giveId: "rimming_give", receiveId: "rimming_receive" },
      { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
    ]);
    expect(DIRECTIONAL_KINK_PAIRS).toHaveLength(55);
    const affinityPairs = DIRECTIONAL_KINK_PAIRS.filter((pair) => "questionnaireAffinity" in pair);
    expect(affinityPairs).toHaveLength(34);
    for (const pair of affinityPairs) {
      expect("questionnaireAffinity" in pair).toBe(true);
      if ("questionnaireAffinity" in pair) {
        expect(pair.questionnaireAffinity.dominant).toBe("give");
        expect(pair.questionnaireAffinity.submissive).toBe("receive");
      }
    }
    expect(ids.has("pegging")).toBe(false);
    expect(ids.has("pegging_give")).toBe(true);
    expect(ids.has("pegging_receive")).toBe(true);
    for (const pair of DIRECTIONAL_KINK_PAIRS) {
      expect(ids.has(pair.giveId), pair.giveId).toBe(true);
      expect(ids.has(pair.receiveId), pair.receiveId).toBe(true);
    }
    for (const retired of [
      "anal_sex", "anal_fingering", "fisting_anal", "fisting_vaginal", "deep_throat", "rimmen", "footjob",
      "spanking_hand", "spanking_implement", "flogging", "rope_bondage", "shibari", "handcuffs",
      "leather_cuffs", "gag_ball", "gag_bit", "blindfold", "sound_deprivation",
      "caning", "cropping", "paddling", "whipping", "belt", "slapping_face", "punching", "trampling",
      "spreader_bar", "hogtie", "mummification", "straitjacket", "gag_tape", "hood",
      "gag_opblaasbaar", "gag_penisvorm", "gag_rubber",
      "suspension_rechtop", "suspension_ondersteboven", "suspension_horizontaal",
      "opsluiting_kooi", "opsluiting_donker", "opsluiting_kleine_ruimte",
      "body_worship", "vagina_aanbidding", "cock_worship", "ass_worship", "laarzen_aanbidding",
      "erotic_massage", "prostate_massage", "pet_training", "pet_grooming", "diaper_changing",
    ]) {
      expect(ids.has(retired), retired).toBe(false);
    }
  });

  it("keeps neutral pairs role-independent while compact Dynamic aligns strong role-affinity anchors", () => {
    for (const perspective of ["dominant", "submissive"] as const) {
      const plan = buildQuestionnaireCoveragePlan([], perspective);
      expect(plan.anchorIds).toHaveLength(45);
      expect(plan.anchorIds).toContain("pegging_give");
      expect(plan.anchorIds).toContain("pegging_receive");
      expect(plan.anchorIds).toContain(perspective === "dominant" ? "spanking_hand_give" : "spanking_hand_receive");
      expect(plan.anchorIds).not.toContain(perspective === "dominant" ? "spanking_hand_receive" : "spanking_hand_give");

      const ids = getQuestionnaireRuntime(ownProfile(perspective)).queue.map((item) => item.kink.id);
      expect(ids).toContain("pegging_give");
      expect(ids).toContain("pegging_receive");
      expect(ids).toContain(perspective === "dominant" ? "rope_bondage_give" : "rope_bondage_receive");
      expect(ids).not.toContain(perspective === "dominant" ? "rope_bondage_receive" : "rope_bondage_give");
    }
  });

  it("uses role affinity only for questionnaire eligibility, never as an answer", () => {
    expect(questionnaireDirectionalKinkIdForPerspective("spanking_hand_give", "submissive"))
      .toBe("spanking_hand_receive");
    expect(questionnaireDirectionalKinkIdForPerspective("spanking_hand_receive", "dominant"))
      .toBe("spanking_hand_give");
    expect(questionnaireDirectionalKinkIdForPerspective("pegging_give", "submissive"))
      .toBe("pegging_give");
    const sub = ownProfile("submissive");
    getQuestionnaireRuntime(sub);
    expect(sub.entries.spanking_hand_give).toBeUndefined();
    expect(sub.entries.spanking_hand_receive).toBeUndefined();
  });

  it("asks an independently eligible sibling directly after an explicit answer", () => {
    const queue = [queueItem("ice_play"), queueItem("pegging_receive")];
    expect(selectConversationQuestion(queue, KINKS, {
      lastKinkId: "pegging_give",
      preferDirectionalSibling: true,
    })?.kink.id).toBe("pegging_receive");

    expect(selectConversationQuestion(queue, KINKS, {
      lastKinkId: "pegging_give",
      preferDirectionalSibling: false,
    })?.kink.id).toBe("ice_play");
  });

  it("never turns pairflow into an expansion probe", () => {
    const entries = { pegging_give: { status: "yes", comment: "" } } satisfies Record<string, KinkEntry>;
    expect(derivePendingExpansionProbes(KINKS, entries)
      .some((probe) => probe.targetKinkId === "pegging_receive")).toBe(false);
    expect(entries.pegging_give.status).toBe("yes");
    expect((entries as Record<string, KinkEntry>).pegging_receive).toBeUndefined();
  });

  it("keeps direction pairing explicit and role-independent", () => {
    expect(directionalSiblingId("pegging_give")).toBe("pegging_receive");
    expect(directionalSiblingId("pegging_receive")).toBe("pegging_give");
    expect(partnerDirectionalKinkId("pegging_give")).toBe("pegging_receive");
    expect(partnerDirectionalKinkId("watersports_geven")).toBe("watersports_ontvangen");
    expect(partnerDirectionalKinkId("fisting_anal_give")).toBe("fisting_anal_receive");
    expect(partnerDirectionalKinkId("deep_throat_receive")).toBe("deep_throat_give");
    expect(partnerDirectionalKinkId("spanking_hand_give")).toBe("spanking_hand_receive");
    expect(partnerDirectionalKinkId("spanking_hand_receive")).toBe("spanking_hand_give");
    expect(partnerDirectionalKinkId("caning_give")).toBe("caning_receive");
    expect(partnerDirectionalKinkId("trampling_receive")).toBe("trampling_give");
    expect(partnerDirectionalKinkId("spreader_bar_give")).toBe("spreader_bar_receive");
    expect(partnerDirectionalKinkId("hood_receive")).toBe("hood_give");
    expect(partnerDirectionalKinkId("gag_rubber_give")).toBe("gag_rubber_receive");
    expect(partnerDirectionalKinkId("suspension_rechtop_receive")).toBe("suspension_rechtop_give");
    expect(partnerDirectionalKinkId("opsluiting_kooi_give")).toBe("opsluiting_kooi_receive");
    expect(partnerDirectionalKinkId("body_worship_give")).toBe("body_worship_receive");
    expect(partnerDirectionalKinkId("prostate_massage_receive")).toBe("prostate_massage_give");
    expect(partnerDirectionalKinkId("diaper_changing_give")).toBe("diaper_changing_receive");
  });

  it("searches both variants through the shared concept vocabulary", () => {
    const ids = searchAllKinks("pegging").map((kink) => kink.id);
    expect(ids).toContain("pegging_give");
    expect(ids).toContain("pegging_receive");
    const caningIds = searchAllKinks("caning").map((kink) => kink.id);
    expect(caningIds).toContain("caning_give");
    expect(caningIds).toContain("caning_receive");
    const restraintIds = searchAllKinks("spreader bar").map((kink) => kink.id);
    expect(restraintIds).toContain("spreader_bar_give");
    expect(restraintIds).toContain("spreader_bar_receive");
    const suspensionIds = searchAllKinks("upright suspension").map((kink) => kink.id);
    expect(suspensionIds).toContain("suspension_rechtop_give");
    expect(suspensionIds).toContain("suspension_rechtop_receive");
    const worshipIds = searchAllKinks("body worship").map((kink) => kink.id);
    expect(worshipIds).toContain("body_worship_give");
    expect(worshipIds).toContain("body_worship_receive");
  });

  it("houdt Impact-instrumenten directioneel zonder een escalatieladder te verzinnen", () => {
    const impactIds = [
      "caning_give", "caning_receive", "cropping_give", "cropping_receive",
      "paddling_give", "paddling_receive", "whipping_give", "whipping_receive",
      "belt_give", "belt_receive", "slapping_face_give", "slapping_face_receive",
      "punching_give", "punching_receive", "trampling_give", "trampling_receive",
    ];
    for (const id of impactIds) {
      expect(QUESTIONNAIRE_FOLLOW_UPS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_PROGRESSION_EDGES.some(([parent, child]) => parent === id || child === id)).toBe(false);
    }
    expect(questionnaireDirectionalKinkIdForPerspective("caning_give", "submissive")).toBe("caning_receive");
    expect(questionnaireDirectionalKinkIdForPerspective("caning_receive", "dominant")).toBe("caning_give");
  });

  it("houdt high-confidence restraints directioneel zonder sibling-inference of nep-escalatie", () => {
    const restraintIds = [
      "spreader_bar_give", "spreader_bar_receive", "hogtie_give", "hogtie_receive",
      "mummification_give", "mummification_receive", "straitjacket_give", "straitjacket_receive",
      "gag_tape_give", "gag_tape_receive", "hood_give", "hood_receive",
    ];
    for (const id of restraintIds) {
      expect(QUESTIONNAIRE_FOLLOW_UPS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_PROGRESSION_EDGES.some(([parent, child]) => parent === id || child === id)).toBe(false);
    }
    expect(questionnaireDirectionalKinkIdForPerspective("spreader_bar_give", "submissive")).toBe("spreader_bar_receive");
    expect(questionnaireDirectionalKinkIdForPerspective("hood_receive", "dominant")).toBe("hood_give");
  });

  it("houdt de resterende gag-, suspension- en confinementacties expliciet zonder inferentie", () => {
    const ids = [
      "gag_opblaasbaar_give", "gag_opblaasbaar_receive", "gag_penisvorm_give", "gag_penisvorm_receive",
      "gag_rubber_give", "gag_rubber_receive", "suspension_rechtop_give", "suspension_rechtop_receive",
      "suspension_ondersteboven_give", "suspension_ondersteboven_receive", "suspension_horizontaal_give", "suspension_horizontaal_receive",
      "opsluiting_kooi_give", "opsluiting_kooi_receive", "opsluiting_donker_give", "opsluiting_donker_receive",
      "opsluiting_kleine_ruimte_give", "opsluiting_kleine_ruimte_receive",
    ];
    for (const id of ids) {
      expect(QUESTIONNAIRE_FOLLOW_UPS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_PROGRESSION_EDGES.some(([parent, child]) => parent === id || child === id)).toBe(false);
    }
    expect(questionnaireDirectionalKinkIdForPerspective("gag_rubber_give", "submissive")).toBe("gag_rubber_receive");
    expect(questionnaireDirectionalKinkIdForPerspective("suspension_rechtop_receive", "dominant")).toBe("suspension_rechtop_give");
    expect(questionnaireDirectionalKinkIdForPerspective("opsluiting_kooi_give", "submissive")).toBe("opsluiting_kooi_receive");
  });

  it("houdt role-neutrale partnerhandelingen directioneel zonder perspective-inference", () => {
    const ids = [
      "body_worship_give", "body_worship_receive", "vagina_aanbidding_give", "vagina_aanbidding_receive",
      "cock_worship_give", "cock_worship_receive", "ass_worship_give", "ass_worship_receive",
      "laarzen_aanbidding_give", "laarzen_aanbidding_receive", "erotic_massage_give", "erotic_massage_receive",
      "prostate_massage_give", "prostate_massage_receive", "pet_training_give", "pet_training_receive",
      "pet_grooming_give", "pet_grooming_receive", "diaper_changing_give", "diaper_changing_receive",
    ];
    for (const id of ids) {
      expect(QUESTIONNAIRE_FOLLOW_UPS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[id]).toBeUndefined();
      expect(QUESTIONNAIRE_PROGRESSION_EDGES.some(([parent, child]) => parent === id || child === id)).toBe(false);
      expect(questionnaireDirectionalKinkIdForPerspective(id, "dominant")).toBe(id);
      expect(questionnaireDirectionalKinkIdForPerspective(id, "submissive")).toBe(id);
    }
  });

  it("drops the old ambiguous answer instead of copying it to either direction", () => {
    const old = { pegging: { status: "yes", comment: "legacy" } } satisfies Record<string, KinkEntry>;
    const cleaned = stripDeprecatedDirectionalEntries(old);
    expect(cleaned.pegging).toBeUndefined();
    expect(cleaned.pegging_give).toBeUndefined();
    expect(cleaned.pegging_receive).toBeUndefined();
    const retired = stripDeprecatedDirectionalEntries({
      anal_sex: { status: "yes", comment: "oud" },
      fisting_anal: { status: "hard_no", comment: "oud" },
      deep_throat: { status: "maybe", comment: "oud" },
    });
    expect(retired.anal_sex).toBeUndefined();
    expect(retired.fisting_anal).toBeUndefined();
    expect(retired.deep_throat).toBeUndefined();
    expect(retired.anal_sex_give).toBeUndefined();
    expect(retired.anal_sex_receive).toBeUndefined();
    const roleRetired = stripDeprecatedDirectionalEntries({
      spanking_hand: { status: "yes", comment: "ambigue oud antwoord" },
      sound_deprivation: { status: "maybe", comment: "ambigue oud antwoord" },
    });
    expect(roleRetired.spanking_hand).toBeUndefined();
    expect(roleRetired.spanking_hand_give).toBeUndefined();
    expect(roleRetired.spanking_hand_receive).toBeUndefined();
    expect(roleRetired.sound_deprivation).toBeUndefined();
    const impactRetired = stripDeprecatedDirectionalEntries({
      caning: { status: "yes", comment: "ambigue impact" },
      trampling: { status: "hard_no", comment: "ambigue impact" },
    });
    expect(impactRetired.caning).toBeUndefined();
    expect(impactRetired.caning_give).toBeUndefined();
    expect(impactRetired.caning_receive).toBeUndefined();
    expect(impactRetired.trampling).toBeUndefined();
    const restraintRetired = stripDeprecatedDirectionalEntries({
      spreader_bar: { status: "yes", comment: "ambigue restraint" },
      hood: { status: "hard_no", comment: "ambigue restraint" },
    });
    expect(restraintRetired.spreader_bar).toBeUndefined();
    expect(restraintRetired.spreader_bar_give).toBeUndefined();
    expect(restraintRetired.spreader_bar_receive).toBeUndefined();
    expect(restraintRetired.hood).toBeUndefined();
    const completionRetired = stripDeprecatedDirectionalEntries({
      gag_opblaasbaar: { status: "yes", comment: "oud gecombineerd" },
      suspension_rechtop: { status: "maybe", comment: "oud gecombineerd" },
      opsluiting_kooi: { status: "hard_no", comment: "oud gecombineerd" },
    });
    expect(completionRetired.gag_opblaasbaar).toBeUndefined();
    expect(completionRetired.gag_opblaasbaar_give).toBeUndefined();
    expect(completionRetired.gag_opblaasbaar_receive).toBeUndefined();
    expect(completionRetired.suspension_rechtop).toBeUndefined();
    expect(completionRetired.opsluiting_kooi).toBeUndefined();
    const neutralRetired = stripDeprecatedDirectionalEntries({
      body_worship: { status: "yes", comment: "oud gecombineerd" },
      prostate_massage: { status: "hard_no", comment: "oud gecombineerd" },
      diaper_changing: { status: "maybe", comment: "oud gecombineerd" },
    });
    expect(neutralRetired.body_worship).toBeUndefined();
    expect(neutralRetired.body_worship_give).toBeUndefined();
    expect(neutralRetired.body_worship_receive).toBeUndefined();
    expect(neutralRetired.prostate_massage).toBeUndefined();
    expect(neutralRetired.diaper_changing).toBeUndefined();
  });

  it("migreert v19 profielen en snapshots en bewaart de consent chain-anchor", async () => {
    // Deze tripwire stond op `toBe(24)` en heeft precies gedaan waarvoor hij
    // bedoeld was: bij de bump naar v25 viel hij om en dwong hij een blik op
    // deze migratie. Nu de guard van migrateStoredDirectionalityV24 zelf op 24
    // is gepind, hoeft de globale versie niet meer stil te blijven staan. Wat
    // wél moet gelden is dat v19-opslag deze migratie nog steeds passeert.
    expect(STORE_PERSIST_VERSION).toBeGreaterThanOrEqual(24);
    const profile = ownProfile("dominant", {
      spanking_hand: { status: "yes", comment: "oud C" },
      anal_sex: { status: "willing", comment: "oud B" },
      praise_kink: { status: "maybe", comment: "blijft" },
    });
    const ownerKey = await generateProfileOwnerKey(profile.id);
    const signed = await signProfileConsent(profile, ownerKey);
    profile.consentProof = signed.proof;
    const migrated = migrateStoredDirectionalityV24({
      profiles: [profile],
      profileSnapshots: [{
        id: "snapshot-legacy",
        profileId: profile.id,
        date: 1,
        entries: {
          spanking_hand: { status: "yes", comment: "oud snapshotantwoord" },
          praise_kink: { status: "maybe", comment: "blijft" },
        },
        customKinks: [],
        counts: { yes: 1, willing: 0, maybe: 1, no: 0, hard_no: 0 },
      }],
    }, 19);

    const migratedProfile = migrated.profiles?.[0];
    expect(migratedProfile?.entries.spanking_hand).toBeUndefined();
    expect(migratedProfile?.entries.anal_sex).toBeUndefined();
    expect(migratedProfile?.entries.spanking_hand_give).toBeUndefined();
    expect(migratedProfile?.entries.spanking_hand_receive).toBeUndefined();
    expect(migratedProfile?.entries.praise_kink?.status).toBe("maybe");
    expect(migratedProfile?.consentProof?.proofHash).toBe(signed.proof.proofHash);
    expect((await verifyProfileConsent(migratedProfile!)).status).toBe("invalid");

    const resealed = await signProfileConsent(migratedProfile!, signed.ownerKey);
    expect(resealed.proof.previousProofHash).toBe(signed.proof.proofHash);
    expect((await verifyProfileConsent({ ...migratedProfile!, consentProof: resealed.proof })).status).toBe("valid");

    expect(migrated.profileSnapshots?.[0].entries.spanking_hand).toBeUndefined();
    expect(migrated.profileSnapshots?.[0].entries.praise_kink?.status).toBe("maybe");
    expect(migrated.profileSnapshots?.[0].counts).toEqual({
      yes: 0, willing: 0, maybe: 1, no: 0, hard_no: 0,
    });
  });

  it("migreert v20 Impact-antwoorden zonder een kant te verzinnen", () => {
    const profile = ownProfile("dominant", {
      caning: { status: "yes", comment: "oud gecombineerd" },
      praise_kink: { status: "maybe", comment: "blijft" },
    });
    const migrated = migrateStoredDirectionalityV24({ profiles: [profile] }, 20);
    expect(migrated.profiles?.[0].entries.caning).toBeUndefined();
    expect(migrated.profiles?.[0].entries.caning_give).toBeUndefined();
    expect(migrated.profiles?.[0].entries.caning_receive).toBeUndefined();
    expect(migrated.profiles?.[0].entries.praise_kink?.status).toBe("maybe");
  });

  it("migreert v21 restraint-antwoorden zonder een kant te verzinnen", () => {
    const profile = ownProfile("dominant", {
      spreader_bar: { status: "yes", comment: "oud gecombineerd" },
      praise_kink: { status: "maybe", comment: "blijft" },
    });
    const migrated = migrateStoredDirectionalityV24({ profiles: [profile] }, 21);
    expect(migrated.profiles?.[0].entries.spreader_bar).toBeUndefined();
    expect(migrated.profiles?.[0].entries.spreader_bar_give).toBeUndefined();
    expect(migrated.profiles?.[0].entries.spreader_bar_receive).toBeUndefined();
    expect(migrated.profiles?.[0].entries.praise_kink?.status).toBe("maybe");
  });

  it("migreert v22 completion-antwoorden zonder een kant te verzinnen", () => {
    const profile = ownProfile("dominant", {
      suspension_rechtop: { status: "yes", comment: "oud gecombineerd" },
      praise_kink: { status: "maybe", comment: "blijft" },
    });
    const migrated = migrateStoredDirectionalityV24({ profiles: [profile] }, 22);
    expect(migrated.profiles?.[0].entries.suspension_rechtop).toBeUndefined();
    expect(migrated.profiles?.[0].entries.suspension_rechtop_give).toBeUndefined();
    expect(migrated.profiles?.[0].entries.suspension_rechtop_receive).toBeUndefined();
    expect(migrated.profiles?.[0].entries.praise_kink?.status).toBe("maybe");
  });

  it("migreert v23 role-neutrale singles zonder een kant te verzinnen", () => {
    const profile = ownProfile("dominant", {
      body_worship: { status: "yes", comment: "oud gecombineerd" },
      diaper_changing: { status: "maybe", comment: "oud gecombineerd" },
      praise_kink: { status: "willing", comment: "blijft" },
    });
    const migrated = migrateStoredDirectionalityV24({ profiles: [profile] }, 23);
    expect(migrated.profiles?.[0].entries.body_worship).toBeUndefined();
    expect(migrated.profiles?.[0].entries.body_worship_give).toBeUndefined();
    expect(migrated.profiles?.[0].entries.body_worship_receive).toBeUndefined();
    expect(migrated.profiles?.[0].entries.diaper_changing).toBeUndefined();
    expect(migrated.profiles?.[0].entries.diaper_changing_give).toBeUndefined();
    expect(migrated.profiles?.[0].entries.diaper_changing_receive).toBeUndefined();
    expect(migrated.profiles?.[0].entries.praise_kink?.status).toBe("willing");
  });

  it("laat v24 state ongemoeid door dezelfde migratieboundary", () => {
    const profile = ownProfile("dominant", { body_worship_give: { status: "yes", comment: "expliciet" } });
    const migrated = migrateStoredDirectionalityV24({ profiles: [profile] }, 24);
    expect(migrated.profiles?.[0].entries.body_worship_give?.status).toBe("yes");
  });

  it("sanitizes and shares both explicit directions independently", () => {
    const raw = ownProfile("dominant", {
      pegging: { status: "yes", comment: "oud" },
      pegging_give: { status: "willing", comment: "geven" },
      pegging_receive: { status: "hard_no", comment: "ontvangen", privateResponse: true },
    });
    const clean = sanitizeProfileFull(raw);
    expect(clean?.entries.pegging).toBeUndefined();
    expect(clean?.entries.pegging_give?.status).toBe("willing");
    expect(clean?.entries.pegging_receive?.status).toBe("hard_no");

    const encoded = encodeProfile(clean!, { includePrivateResponses: true });
    const decoded = decodeAny(encoded);
    expect(decoded.entries.pegging_give?.status).toBe("willing");
    expect(decoded.entries.pegging_receive?.status).toBe("hard_no");
    expect(decoded.entries.pegging_receive?.privateResponse).toBe(true);
  });
});
