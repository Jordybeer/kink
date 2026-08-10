import fs from "node:fs";

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Niet gevonden in ${path}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Niet uniek in ${path}`);
  fs.writeFileSync(path, source.slice(0, index) + after + source.slice(index + before.length));
}

replaceOnce(
  "__tests__/directionalMatching.test.ts",
  `    for (const [giveId, receiveId] of [
      ["watersports_geven", "watersports_ontvangen"],
      ["anal_sex_give", "anal_sex_receive"],
      ["fisting_anal_give", "fisting_anal_receive"],
      ["deep_throat_give", "deep_throat_receive"],
      ["rimming_give", "rimming_receive"],
      ["footjob_give", "footjob_receive"],
    ] as const) {`,
  `    for (const [giveId, receiveId] of [
      ["pegging_give", "pegging_receive"],
      ["watersports_geven", "watersports_ontvangen"],
      ["anal_sex_give", "anal_sex_receive"],
      ["anal_fingering_give", "anal_fingering_receive"],
      ["fisting_anal_give", "fisting_anal_receive"],
      ["fisting_vaginal_give", "fisting_vaginal_receive"],
      ["deep_throat_give", "deep_throat_receive"],
      ["rimming_give", "rimming_receive"],
      ["footjob_give", "footjob_receive"],
    ] as const) {`,
);

replaceOnce(
  "planned-changes.md",
  `The final metadata slice is in progress on \`feature/questionnaire-metadata-v2\`.
It audits topics and every canonical edge separately, pins the allowlist as
mapping version 2 while preserving every @1 source-target pair, and documents
rejected suggestive associations. “Auto masturbation” was explicitly dropped
from scope; it is not an open gate.

The original Pegging product gate is shipped. Directionality Release B now audits the catalog with the same anti-inference contract: high-confidence role-neutral sexual actions become explicit complementary pairs, while impact/bondage stay deferred behind a role-affinity eligibility pass so Dynamic does not balloon.`,
  `The final metadata slice shipped in PR #305 and its canonical allowlist has now advanced to
mapping version 3 for the explicit Release B semantic migration. The Golden Shower give→receive
inference is removed and retired anal source IDs are replaced by explicit same-side directional
mappings. “Auto masturbation” remains explicitly out of scope.

The original Pegging product gate is shipped. Directionality Release B now audits the catalog with the same anti-inference contract: high-confidence role-neutral sexual actions become explicit complementary pairs, while impact/bondage stay deferred behind a role-affinity eligibility pass so Dynamic does not balloon.`,
);

console.log("CodeRabbit reviewfixes toegepast.");
