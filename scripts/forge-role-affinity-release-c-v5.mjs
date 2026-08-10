import fs from "node:fs";
import { pathToFileURL } from "node:url";

await import(pathToFileURL(new URL("./forge-role-affinity-release-c-v4.mjs", import.meta.url).pathname).href + `?v=${Date.now()}`);

const questionnairePath = "__tests__/questionnaire.test.ts";
let questionnaire = fs.readFileSync(questionnairePath, "utf8");
for (const [oldId, giveId] of [
  ["spanking_hand", "spanking_hand_give"],
  ["spanking_implement", "spanking_implement_give"],
  ["flogging", "flogging_give"],
  ["rope_bondage", "rope_bondage_give"],
  ["shibari", "shibari_give"],
  ["handcuffs", "handcuffs_give"],
  ["leather_cuffs", "leather_cuffs_give"],
  ["gag_ball", "gag_ball_give"],
  ["gag_bit", "gag_bit_give"],
  ["blindfold", "blindfold_give"],
  ["sound_deprivation", "sound_deprivation_give"],
]) {
  questionnaire = questionnaire.replace(new RegExp(`\\b${oldId}\\b`, "g"), giveId);
}
fs.writeFileSync(questionnairePath, questionnaire);

const sharePath = "__tests__/shareProfile.test.ts";
let share = fs.readFileSync(sharePath, "utf8");
const wrongLegacyExpectation = `expect(LEGACY_COMPACT_KINK_IDS_V2[0]).toBe("latex_rubber");`;
if (!share.includes(wrongLegacyExpectation)) {
  throw new Error("Verwachte tijdelijke legacy-fixturevervanging ontbreekt");
}
share = share.replace(
  wrongLegacyExpectation,
  `expect(LEGACY_COMPACT_KINK_IDS_V2[0]).toBe("spanking_hand");`,
);
fs.writeFileSync(sharePath, share);

console.log("Release C bare fixture-IDs en immutable legacy expectation gecorrigeerd.");
