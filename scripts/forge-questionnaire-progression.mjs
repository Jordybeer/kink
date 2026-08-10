import fs from "node:fs";

function replaceOnce(path, from, to) {
  const before = fs.readFileSync(path, "utf8");
  if (!before.includes(from)) throw new Error(`${path}: expected source fragment not found`);
  const after = before.replace(from, to);
  if (after === before) throw new Error(`${path}: replacement produced no change`);
  fs.writeFileSync(path, after);
}

replaceOnce(
  "lib/questionnaireEngine.ts",
  `} from "@/lib/questionnaireMetadata";\nimport { directionalSiblingId } from "@/lib/directionality";`,
  `} from "@/lib/questionnaireMetadata";\nimport { questionnaireProgressionParentIds } from "@/lib/questionnaireProgression";\nimport { directionalSiblingId } from "@/lib/directionality";`,
);

replaceOnce(
  "lib/questionnaireEngine.ts",
  `  return result;\n}\n\n/** De lanes houden de teugels: geen vurige score mag coverage onder de voet lopen. */`,
  `  return result;\n}\n\n/**\n * Laat ritme/diversiteit nooit een expliciete verdiepingsdeur inhalen. De\n * topologische herschikking is stabiel: alleen een child die vóór haar nog\n * onbeantwoorde parent staat, schuift naar achter. Een metadata-cycle faalt\n * open zodat de UI nooit vastloopt; de catalogustest bewaakt dat zo'n cycle\n * niet kan landen.\n */\nfunction enforceProgressionOrder<T extends { kink: Kink }>(\n  items: readonly T[],\n  entries: Record<string, KinkEntry>,\n): T[] {\n  const remaining = [...items];\n  const result: T[] = [];\n\n  while (remaining.length > 0) {\n    const remainingIds = new Set(remaining.map((item) => item.kink.id));\n    const index = remaining.findIndex(({ kink }) =>\n      questionnaireProgressionParentIds(kink.id).every(\n        (parentId) => entries[parentId]?.status != null || !remainingIds.has(parentId),\n      ),\n    );\n\n    if (index < 0) {\n      result.push(...remaining);\n      break;\n    }\n\n    const [next] = remaining.splice(index, 1);\n    result.push(next);\n  }\n\n  return result;\n}\n\n/** De lanes houden de teugels: geen vurige score mag coverage onder de voet lopen. */`,
);

replaceOnce(
  "lib/questionnaireEngine.ts",
  `  return diversified;\n}\n\n/**\n * Compatibiliteitsadapter voor gerichte unit-tests.`,
  `  return enforceProgressionOrder(diversified, entries);\n}\n\n/**\n * Compatibiliteitsadapter voor gerichte unit-tests.`,
);

replaceOnce(
  "lib/questionnaireEngine.ts",
  `  if (queue.length === 0) return null;\n  let candidates = [...queue];\n\n  if (context.requireNonProbe) {`,
  `  if (queue.length === 0) return null;\n  let candidates = [...queue];\n\n  // Een expliciete progression-parent die nog in dezelfde wachtrij staat,\n  // houdt haar child nog even achter de gordijnrand. Dit filtert alleen de\n  // volgende kaart; eligibility en antwoorden blijven onaangeraakt.\n  const queuedIds = new Set(queue.map((item) => item.kink.id));\n  const progressionReady = candidates.filter(({ kink }) =>\n    questionnaireProgressionParentIds(kink.id).every((parentId) => !queuedIds.has(parentId)),\n  );\n  if (progressionReady.length > 0) candidates = progressionReady;\n\n  if (context.requireNonProbe) {`,
);

replaceOnce(
  "planned-changes.md",
  `The original Pegging product gate and Release B role-neutral catalog audit are shipped. Release C now proves role-affinity on a deliberately small impact/bondage vertical slice: explicit pairs remain fully independent, while only compact Dynamic coverage may choose the perspective-aligned sibling. The opposite side stays unknown and reachable. Remaining impact/bondage candidates stay item-by-item work, not a bulk split.`,
  `The original Pegging product gate and Release B role-neutral catalog audit are shipped. Release C now proves role-affinity on a deliberately small impact/bondage vertical slice: explicit pairs remain fully independent, while only compact Dynamic coverage may choose the perspective-aligned sibling. The opposite side stays unknown and reachable. Remaining impact/bondage candidates stay item-by-item work, not a bulk split.\n\nQuestion progression is now a separate explicit ordering contract. High-confidence parent → child doors make broad/light cards precede true deepenings when both are queued (for example Golden Shower ontvangen → urine in mond/slikken), without turning catalog \`level\` into a universal ladder. Progression never copies an answer, never suppresses a child after a neutral/negative answer in exhaustive flows, and never converts related siblings such as impact instruments, gag types or anal acts into inferred escalation. Source of truth: \`docs/questionnaire-progression-gates.md\`.`,
);

console.log("Questionnaire progression gate patch applied");
