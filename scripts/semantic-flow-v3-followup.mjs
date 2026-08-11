import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, content) { fs.writeFileSync(path, content); }
function replaceOnce(path, before, after) {
  const source = read(path);
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected one match, got ${count}`);
  write(path, source.replace(before, after));
}
function replaceExpected(path, before, after, expectedCount) {
  const source = read(path);
  const count = source.split(before).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${path}: expected ${expectedCount} matches, got ${count}`);
  }
  write(path, source.split(before).join(after));
}

replaceOnce(
  "lib/questionnaireEngine.ts",
  `      if (canonicalProbe) return canonicalProbe;
    }

    return candidates[0] ?? null;
  }
`,
  `      if (canonicalProbe) return canonicalProbe;
    }

    // Geen echte continuation beschikbaar: behoud de bestaande conversation
    // spacing in plaats van een gewone related/topic-buur direct te serveren.
    if (context.lastKinkId) {
      const last = catalog.find((kink) => kink.id === context.lastKinkId);
      if (last) {
        const differentTopic = candidates.find((item) => !sharesTopic(last, item.kink));
        if (differentTopic) return differentTopic;
      }
    }
    return candidates[0] ?? null;
  }
`,
);

replaceOnce(
  "lib/participation.ts",
  `import type { KinkEntry } from "@/types";
import {
  directionalCompareLabel,
  partnerDirectionalKinkId,
} from "@/lib/directionality";`,
  `import type { KinkEntry, ProfilePerspective } from "@/types";
import {
  directionalCompareLabel,
  partnerDirectionalKinkId,
  questionnaireDirectionalKinkIdForPerspective,
} from "@/lib/directionality";`,
);
replaceOnce(
  "lib/participation.ts",
  `  leftLabel: string;
  rightLabel: string;
}`,
  `  leftLabel: string;
  rightLabel: string;
  /** Compacte Dynamic-anchorselectie; nooit een antwoord- of eligibilityregel. */
  questionnaireAffinity?: Readonly<Partial<Record<ProfilePerspective, "left" | "right">>>;
}`,
);
replaceOnce(
  "lib/participation.ts",
  `    leftLabel: "Zelf dragen",
    rightLabel: "Partner draagt",
  },`,
  `    leftLabel: "Zelf dragen",
    rightLabel: "Partner draagt",
    questionnaireAffinity: { dominant: "right", submissive: "left" },
  },`,
);
replaceOnce(
  "lib/participation.ts",
  `export function complementarySiblingId(kinkId: string): string | null {`,
  `/**
 * Eén perspectiefadapter voor coverage-anchors. Directionele give/receive
 * affinity en bijzondere participatie-assen blijven allebei zachte Dynamic
 * selectie, nooit een hard filter of voorkeurssignaal.
 */
export function questionnaireParticipationKinkIdForPerspective(
  kinkId: string,
  perspective?: ProfilePerspective,
): string {
  const directionalId = questionnaireDirectionalKinkIdForPerspective(kinkId, perspective);
  if (!perspective) return directionalId;
  const special = SPECIAL_PAIR_BY_KINK_ID.get(directionalId);
  const side = special?.questionnaireAffinity?.[perspective];
  if (!special || !side) return directionalId;
  return side === "left" ? special.leftId : special.rightId;
}

export function complementarySiblingId(kinkId: string): string | null {`,
);

replaceOnce(
  "lib/questionnaire.ts",
  `import { questionnaireDirectionalKinkIdForPerspective } from "@/lib/directionality";
import { isQuestionnaireKinkEligibleForPerspective } from "@/lib/questionnaireEligibility";`,
  `import { isQuestionnaireKinkEligibleForPerspective } from "@/lib/questionnaireEligibility";
import { questionnaireParticipationKinkIdForPerspective } from "@/lib/participation";`,
);
replaceExpected(
  "lib/questionnaire.ts",
  `questionnaireDirectionalKinkIdForPerspective(sourceId, perspective)`,
  `questionnaireParticipationKinkIdForPerspective(sourceId, perspective)`,
  2,
);

replaceOnce(
  "__tests__/semanticFlowV3.test.ts",
  `import { getQuestionnaireRuntime, searchAllKinks } from "@/lib/questionnaire";`,
  `import {
  buildQuestionnaireCoveragePlan,
  getQuestionnaireRuntime,
  searchAllKinks,
} from "@/lib/questionnaire";`,
);
replaceOnce(
  "__tests__/semanticFlowV3.test.ts",
  `    expect(selectConversationQuestion([probe, queueItem("doctor_patient")], KINKS, {
      phase: "topicBreakRequired",
      lastKinkId: "handcuffs_give",
    })?.kink.id).toBe("doctor_patient");
  });`,
  `    expect(selectConversationQuestion([probe, queueItem("doctor_patient")], KINKS, {
      phase: "topicBreakRequired",
      lastKinkId: "handcuffs_give",
    })?.kink.id).toBe("doctor_patient");

    // Een gewone related/topic-buur is géén continuation en mag het mentale
    // momentum niet kapen wanneer er geen sibling/canonical probe bestaat.
    expect(selectConversationQuestion([
      queueItem("spanking_implement_give"),
      queueItem("doctor_patient"),
    ], KINKS, {
      phase: "preferContinuation",
      lastKinkId: "spanking_hand_give",
    })?.kink.id).toBe("doctor_patient");
  });`,
);
replaceOnce(
  "__tests__/semanticFlowV3.test.ts",
  `    expect(KINKS.some((kink) => kink.id === "diaper_partner_wearing")).toBe(true);
    expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS.diaper_partner_wearing).toBeUndefined();
  });`,
  `    expect(KINKS.some((kink) => kink.id === "diaper_partner_wearing")).toBe(true);
    expect(QUESTIONNAIRE_CANONICAL_PROBE_TARGETS.diaper_partner_wearing).toBeUndefined();

    const dominantCoverage = buildQuestionnaireCoveragePlan([], "dominant").anchorIds;
    const submissiveCoverage = buildQuestionnaireCoveragePlan([], "submissive").anchorIds;
    expect(dominantCoverage).toContain("diaper_partner_wearing");
    expect(dominantCoverage).not.toContain("luiers_dragen");
    expect(submissiveCoverage).toContain("luiers_dragen");
    expect(submissiveCoverage).not.toContain("diaper_partner_wearing");

    const dominantDiscover = getQuestionnaireRuntime(ownProfile("dominant"), {
      intent: { kind: "discover" },
    }).queue.map((item) => item.kink.id);
    expect(dominantDiscover).toContain("luiers_dragen");
    expect(dominantDiscover).toContain("diaper_partner_wearing");
  });`,
);

replaceOnce(
  "directie.md",
  `Voor **role-neutrale** directionele concepten (zoals Pegging, fisting, rimming, worship en massage) filtert perspective geen kant weg. Als beide kanten onafhankelijk eligible zijn, kunnen beide expliciet gevraagd worden. Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn.`,
  `Voor **role-neutrale** directionele concepten (zoals Pegging, fisting, rimming, worship en massage) filtert perspective geen kant weg. Als beide kanten onafhankelijk eligible zijn, kunnen beide expliciet gevraagd worden. Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn.

Een participation-specific concept mag wel een zachte Dynamic-affinity hebben zonder hard role-bound te worden. Bij diaper wearing gebruikt de Dominant-coverage daarom \`partner draagt\` en de Submissive-coverage \`zelf dragen\`; Discover, categorie-exploratie en Deep Dive houden beide posities beschikbaar.`,
);

fs.rmSync("scripts/semantic-flow-v3-followup.mjs");
fs.rmSync(".github/workflows/semantic-flow-v3-followup.yml");
console.log("semantic-flow review fixes applied");
