import fs from "node:fs";

function replaceOnce(path, from, to) {
  const before = fs.readFileSync(path, "utf8");
  if (!before.includes(from)) throw new Error(`${path}: expected source fragment not found`);
  const after = before.replace(from, to);
  if (after === before) throw new Error(`${path}: replacement produced no change`);
  fs.writeFileSync(path, after);
}

replaceOnce(
  "lib/storeCore.ts",
  'import { partnerDirectionalKinkId, stripDeprecatedDirectionalProfile } from "@/lib/directionality";',
  'import { partnerDirectionalKinkId, stripDeprecatedDirectionalEntries, stripDeprecatedDirectionalProfile } from "@/lib/directionality";'
);

replaceOnce(
  "lib/storeCore.ts",
  `export function migrateStoredDirectionalityV20<T extends { profiles?: Profile[] }>(\n  state: T,\n  version: number,\n): T {\n  if (version < STORE_PERSIST_VERSION && state.profiles) {\n    state.profiles = state.profiles.map(stripDeprecatedDirectionalProfile);\n  }\n  return state;\n}`,
  `export function migrateStoredDirectionalityV20<T extends {\n  profiles?: Profile[];\n  profileSnapshots?: ProfileSnapshot[];\n}>(\n  state: T,\n  version: number,\n): T {\n  if (version >= STORE_PERSIST_VERSION) return state;\n\n  if (state.profiles) {\n    // Preserve the previous proof as a cryptographic chain anchor. Because the\n    // projected entries changed, verifyProfileConsent will reject it until the\n    // source profile is re-sealed/re-shared; keeping the proof hash lets that\n    // next proof link to the same identity instead of weakening continuity.\n    state.profiles = state.profiles.map(stripDeprecatedDirectionalProfile);\n  }\n\n  if (state.profileSnapshots) {\n    state.profileSnapshots = state.profileSnapshots.map((snapshot) => {\n      const entries = stripDeprecatedDirectionalEntries(snapshot.entries);\n      return entries === snapshot.entries\n        ? snapshot\n        : { ...snapshot, entries, counts: deriveCounts(entries) };\n    });\n  }\n\n  return state;\n}`
);

replaceOnce(
  "e2e/private-responses.spec.ts",
  `      spanking_hand: {\n        ...PROFILE_ALEX.entries.spanking_hand,\n        usedInScene: 7,\n        privateResponse: true,\n      },`,
  `      spanking_hand_give: {\n        ...PROFILE_ALEX.entries.spanking_hand_give,\n        usedInScene: 7,\n        privateResponse: true,\n      },`
);

replaceOnce(
  "e2e/private-responses.spec.ts",
  `      spanking_hand: {\n        ...PROFILE_SAM.entries.spanking_hand,\n        usedInScene: 4,\n      },`,
  `      spanking_hand_receive: {\n        ...PROFILE_SAM.entries.spanking_hand_receive,\n        usedInScene: 4,\n      },`
);

replaceOnce(
  "e2e/compare.spec.ts",
  `  test("match-indicatie is zichtbaar voor complementaire spanking give/receive", async ({ page }) => {\n    const text = await page.evaluate(() => document.body.innerText);\n    expect(text).toMatch(/match|Heel graag|overeenkomst/i);\n  });`,
  `  test("match-indicatie is zichtbaar voor complementaire spanking give/receive", async ({ page }) => {\n    const text = await page.evaluate(() => document.body.innerText);\n    expect(text).toContain("Spanking (hand) — geven ↔ ontvangen");\n  });`
);

replaceOnce(
  "planned-changes.md",
  `### Phase — Explicit complementary matching (deferred, design gate)\n\nPer-kink give/receive direction was killed in \`629419b\`. Do **not** infer it\nfrom \`profile.role\` or Dominant/Submissive perspective: perspective says from\nwhich chair a question is answered, not which act someone wants to give or\nreceive. Directional catalog items such as a future pegging-giving and\npegging-receiving pair need explicit answers plus an independently reviewed\ncomplement relation at matching time. **Write a design doc and obtain an owner\ndecision before coding.** Touches \`lib/matching.ts\`; must not hide preference\ninference in \`lib/roles.ts\`.`,
  `### Phase — Explicit complementary matching [FOUNDATION SHIPPED; CATALOG AUDIT ONGOING]\n\nThe original deferred gate is superseded. Pegging and the reviewed Release B/C\nconcepts now use explicit give/receive IDs plus a central complement relation at\nmatching time. Dominant/Submissive perspective still never supplies an answer:\nRelease C role affinity may only choose the compact Dynamic coverage sibling;\nthe opposite side remains unknown and independently answerable. Remaining\ndirectional candidates stay item-by-item editorial work and must not be bulk\nsplit or inferred from \`profile.role\`.`
);

replaceOnce(
  "__tests__/directionality.test.ts",
  'import { encodeProfile, decodeAny } from "@/lib/shareProfile";',
  'import { encodeProfile, decodeAny } from "@/lib/shareProfile";\nimport { generateProfileOwnerKey, signProfileConsent, verifyProfileConsent } from "@/lib/consentProof";'
);

const testPath = "__tests__/directionality.test.ts";
let test = fs.readFileSync(testPath, "utf8");
const oldMigration = `  it("migreert een bestaande v19 store naar v20 zonder ambigue directionality te behouden", () => {\n    expect(STORE_PERSIST_VERSION).toBe(20);\n    const profile = ownProfile("dominant", {\n      spanking_hand: { status: "yes", comment: "oud C" },\n      anal_sex: { status: "willing", comment: "oud B" },\n      praise_kink: { status: "maybe", comment: "blijft" },\n    });\n    const migrated = migrateStoredDirectionalityV20({ profiles: [profile] }, 19);\n\n    expect(migrated.profiles?.[0].entries.spanking_hand).toBeUndefined();\n    expect(migrated.profiles?.[0].entries.anal_sex).toBeUndefined();\n    expect(migrated.profiles?.[0].entries.spanking_hand_give).toBeUndefined();\n    expect(migrated.profiles?.[0].entries.spanking_hand_receive).toBeUndefined();\n    expect(migrated.profiles?.[0].entries.praise_kink?.status).toBe("maybe");\n  });`;
const newMigration = `  it("migreert v19 profielen en snapshots en bewaart de consent chain-anchor", async () => {\n    expect(STORE_PERSIST_VERSION).toBe(20);\n    const profile = ownProfile("dominant", {\n      spanking_hand: { status: "yes", comment: "oud C" },\n      anal_sex: { status: "willing", comment: "oud B" },\n      praise_kink: { status: "maybe", comment: "blijft" },\n    });\n    const ownerKey = await generateProfileOwnerKey(profile.id);\n    const signed = await signProfileConsent(profile, ownerKey);\n    profile.consentProof = signed.proof;\n    const migrated = migrateStoredDirectionalityV20({\n      profiles: [profile],\n      profileSnapshots: [{\n        id: "snapshot-legacy",\n        profileId: profile.id,\n        date: 1,\n        entries: {\n          spanking_hand: { status: "yes", comment: "oud snapshotantwoord" },\n          praise_kink: { status: "maybe", comment: "blijft" },\n        },\n        customKinks: [],\n        counts: { yes: 1, willing: 0, maybe: 1, no: 0, hard_no: 0 },\n      }],\n    }, 19);\n\n    const migratedProfile = migrated.profiles?.[0];\n    expect(migratedProfile?.entries.spanking_hand).toBeUndefined();\n    expect(migratedProfile?.entries.anal_sex).toBeUndefined();\n    expect(migratedProfile?.entries.spanking_hand_give).toBeUndefined();\n    expect(migratedProfile?.entries.spanking_hand_receive).toBeUndefined();\n    expect(migratedProfile?.entries.praise_kink?.status).toBe("maybe");\n    expect(migratedProfile?.consentProof?.proofHash).toBe(signed.proof.proofHash);\n    expect((await verifyProfileConsent(migratedProfile!)).status).toBe("invalid");\n\n    const resealed = await signProfileConsent(migratedProfile!, signed.ownerKey);\n    expect(resealed.proof.previousProofHash).toBe(signed.proof.proofHash);\n    expect((await verifyProfileConsent({ ...migratedProfile!, consentProof: resealed.proof })).status).toBe("valid");\n\n    expect(migrated.profileSnapshots?.[0].entries.spanking_hand).toBeUndefined();\n    expect(migrated.profileSnapshots?.[0].entries.praise_kink?.status).toBe("maybe");\n    expect(migrated.profileSnapshots?.[0].counts).toEqual({\n      yes: 0, willing: 0, maybe: 1, no: 0, hard_no: 0,\n    });\n  });`;
if (!test.includes(oldMigration)) throw new Error(`${testPath}: migration test fragment not found`);
test = test.replace(oldMigration, newMigration);
fs.writeFileSync(testPath, test);

console.log("Release C closeout patch applied");
