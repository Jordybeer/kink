import { readFileSync, writeFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function write(path, content) {
  writeFileSync(path, content, "utf8");
}

function replaceOnce(path, before, after) {
  const source = read(path);
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: verwacht precies 1 match, kreeg ${count}`);
  write(path, source.replace(before, after));
}

function appendOnce(path, marker, content) {
  const source = read(path);
  if (source.includes(marker)) throw new Error(`${path}: marker bestaat al: ${marker}`);
  write(path, `${source.trimEnd()}\n\n${content.trim()}\n`);
}

replaceOnce(
  "lib/directionality.ts",
  `/** De partnerkant voor complementaire matching; niet-directionele IDs blijven zichzelf. */\nexport function partnerDirectionalKinkId(kinkId: string): string {\n  return directionalSiblingId(kinkId) ?? kinkId;\n}\n`,
  `/** De partnerkant voor complementaire matching; niet-directionele IDs blijven zichzelf. */\nexport function partnerDirectionalKinkId(kinkId: string): string {\n  return directionalSiblingId(kinkId) ?? kinkId;\n}\n\nconst EMPTY_DIRECTIONAL_ENTRY: KinkEntry = { status: null, comment: \"\" };\n\nexport interface DirectionalComparisonEntries {\n  sourceKinkId: string;\n  partnerKinkId: string;\n  sourceEntry: KinkEntry;\n  partnerEntry: KinkEntry;\n}\n\n/**\n * Eén bron van waarheid voor consumers die A's concrete kink tegenover de\n * complementaire kant van B zetten. De helper verandert nooit eligibility,\n * status of privacy; hij kiest alleen de expliciete IDs die al bestaan.\n */\nexport function directionalComparisonEntries(\n  sourceEntries: Readonly<Record<string, KinkEntry>> | undefined,\n  partnerEntries: Readonly<Record<string, KinkEntry>> | undefined,\n  kinkId: string,\n): DirectionalComparisonEntries {\n  const partnerKinkId = partnerDirectionalKinkId(kinkId);\n  return {\n    sourceKinkId: kinkId,\n    partnerKinkId,\n    sourceEntry: sourceEntries?.[kinkId] ?? EMPTY_DIRECTIONAL_ENTRY,\n    partnerEntry: partnerEntries?.[partnerKinkId] ?? EMPTY_DIRECTIONAL_ENTRY,\n  };\n}\n`,
);

replaceOnce(
  "lib/matching.ts",
  `import { partnerDirectionalKinkId } from \"@/lib/directionality\";`,
  `import { directionalComparisonEntries } from \"@/lib/directionality\";`,
);
replaceOnce(
  "lib/matching.ts",
  `    const eA = a.entries[kink.id] ?? { status: null, comment: \"\" };\n    const partnerKinkId = partnerDirectionalKinkId(kink.id);\n    const eB = b.entries[partnerKinkId] ?? { status: null, comment: \"\" };`,
  `    const { sourceEntry: eA, partnerEntry: eB } = directionalComparisonEntries(\n      a.entries,\n      b.entries,\n      kink.id,\n    );`,
);

replaceOnce(
  "app/contract/page.tsx",
  `import { comparableEntry } from \"@/lib/privateResponses\";`,
  `import { comparableEntry } from \"@/lib/privateResponses\";\nimport { directionalCompareLabel, directionalComparisonEntries } from \"@/lib/directionality\";`,
);
replaceOnce(
  "app/contract/page.tsx",
  `    const entryA = comparableEntry(profileA.entries[kink.id]);\n    const entryB = comparableEntry(profileB.entries[kink.id]);`,
  `    const pair = directionalComparisonEntries(profileA.entries, profileB.entries, kink.id);\n    const entryA = comparableEntry(pair.sourceEntry);\n    const entryB = comparableEntry(pair.partnerEntry);`,
);
replaceOnce(
  "app/contract/page.tsx",
  `      name: kink.name,\n      statusA: entryA.status, statusB: entryB.status,`,
  `      name: directionalCompareLabel(kink.id, kink.name),\n      statusA: entryA.status, statusB: entryB.status,`,
);
replaceOnce(
  "app/contract/page.tsx",
  `      hardLimits.push({ name: kink.name, who });`,
  `      hardLimits.push({ name: detail.name, who });`,
);

replaceOnce(
  "app/scene/page.tsx",
  `import { visibleStatus, visibleUsedInScene } from \"@/lib/privateResponses\";`,
  `import { visibleStatus, visibleUsedInScene } from \"@/lib/privateResponses\";\nimport { directionalCompareLabel, directionalComparisonEntries } from \"@/lib/directionality\";`,
);
replaceOnce(
  "app/scene/page.tsx",
  `  function addFromKink(kinkName: string, kinkId: string) {\n    if (isConsentLocked) return;\n    const tags = [...new Set([...(profileA?.entries[kinkId]?.tags ?? []), ...(profileB?.entries[kinkId]?.tags ?? [])])];\n    setItems((prev) => [...prev, { id: uid(), name: kinkName, kinkId, intensity: \"midden\", duration: \"\", note: \"\", fromKink: true, tags }]);`,
  `  function addFromKink(kinkName: string, kinkId: string) {\n    if (isConsentLocked) return;\n    const pair = directionalComparisonEntries(profileA?.entries, profileB?.entries, kinkId);\n    const tags = [...new Set([...(pair.sourceEntry.tags ?? []), ...(pair.partnerEntry.tags ?? [])])];\n    setItems((prev) => [...prev, { id: uid(), name: kinkName, kinkId, intensity: \"midden\", duration: \"\", note: \"\", fromKink: true, tags }]);`,
);
replaceOnce(
  "app/scene/page.tsx",
  `  const topKinks = profileA\n    ? KINKS.filter((k) => visibleUsedInScene(profileA.entries[k.id]) > 0)\n        .sort((a, b) =>\n          (visibleUsedInScene(profileB?.entries[b.id]) + visibleUsedInScene(profileA.entries[b.id])) -\n          (visibleUsedInScene(profileB?.entries[a.id]) + visibleUsedInScene(profileA.entries[a.id])))\n        .slice(0, 5)\n    : [];\n\n  const mutualKinks = KINKS.filter((k) => {\n    const a = visibleStatus(profileA?.entries[k.id]);\n    const b = visibleStatus(profileB?.entries[k.id]);\n    return !!a && !!b && (a === \"yes\" || a === \"willing\") && (b === \"yes\" || b === \"willing\");\n  });\n\n  const spanningKinks = KINKS.filter((k) => {\n    const a = visibleStatus(profileA?.entries[k.id]);\n    const b = visibleStatus(profileB?.entries[k.id]);\n    if (!a || !b || a === \"hard_no\" || b === \"hard_no\" || a === \"no\" || b === \"no\") return false;\n    return !((a === \"yes\" || a === \"willing\") && (b === \"yes\" || b === \"willing\")) && (a === \"maybe\" || b === \"maybe\");\n  });`,
  `  const comparisonEntries = (kinkId: string) =>\n    directionalComparisonEntries(profileA?.entries, profileB?.entries, kinkId);\n\n  const topKinks = profileA\n    ? KINKS.filter((k) => visibleUsedInScene(comparisonEntries(k.id).sourceEntry) > 0)\n        .sort((a, b) => {\n          const pairA = comparisonEntries(a.id);\n          const pairB = comparisonEntries(b.id);\n          return (visibleUsedInScene(pairB.partnerEntry) + visibleUsedInScene(pairB.sourceEntry)) -\n            (visibleUsedInScene(pairA.partnerEntry) + visibleUsedInScene(pairA.sourceEntry));\n        })\n        .slice(0, 5)\n    : [];\n\n  const mutualKinks = KINKS.filter((k) => {\n    const pair = comparisonEntries(k.id);\n    const a = visibleStatus(pair.sourceEntry);\n    const b = visibleStatus(pair.partnerEntry);\n    return !!a && !!b && (a === \"yes\" || a === \"willing\") && (b === \"yes\" || b === \"willing\");\n  });\n\n  const spanningKinks = KINKS.filter((k) => {\n    const pair = comparisonEntries(k.id);\n    const a = visibleStatus(pair.sourceEntry);\n    const b = visibleStatus(pair.partnerEntry);\n    if (!a || !b || a === \"hard_no\" || b === \"hard_no\" || a === \"no\" || b === \"no\") return false;\n    return !((a === \"yes\" || a === \"willing\") && (b === \"yes\" || b === \"willing\")) && (a === \"maybe\" || b === \"maybe\");\n  });`,
);
for (const section of ["topKinks", "mutualKinks", "spanningKinks"]) {
  replaceOnce(
    "app/scene/page.tsx",
    `{${section}.map((k) => (\n                  <KinkChip key={k.id} name={k.name} added={addedKinkIds.has(k.id)}`,
    `{${section}.map((k) => (\n                  <KinkChip key={k.id} name={directionalCompareLabel(k.id, k.name)} added={addedKinkIds.has(k.id)}`,
  );
  replaceOnce(
    "app/scene/page.tsx",
    `onAdd={() => addFromKink(k.name, k.id)} />`,
    `onAdd={() => addFromKink(directionalCompareLabel(k.id, k.name), k.id)} />`,
  );
}

replaceOnce(
  "lib/storeCore.ts",
  `import { stripDeprecatedDirectionalProfile } from \"@/lib/directionality\";`,
  `import { partnerDirectionalKinkId, stripDeprecatedDirectionalProfile } from \"@/lib/directionality\";`,
);
replaceOnce(
  "lib/storeCore.ts",
  `            profiles = profiles.map((p) => {\n              if (p.id !== scene.profileAId && p.id !== scene.profileBId) return p;\n              const prev = p.entries[kinkId] ?? { status: null, comment: \"\" };\n              return { ...p, entries: { ...p.entries, [kinkId]: { ...prev, usedInScene: (prev.usedInScene ?? 0) + 1 } } };\n            });`,
  `            profiles = profiles.map((p) => {\n              if (p.id !== scene.profileAId && p.id !== scene.profileBId) return p;\n              // Scene kinkId is anchored to profile A; profile B records the explicit counterpart.\n              const participantKinkId = p.id === scene.profileBId\n                ? partnerDirectionalKinkId(kinkId)\n                : kinkId;\n              const prev = p.entries[participantKinkId] ?? { status: null, comment: \"\" };\n              return {\n                ...p,\n                entries: {\n                  ...p.entries,\n                  [participantKinkId]: { ...prev, usedInScene: (prev.usedInScene ?? 0) + 1 },\n                },\n              };\n            });`,
);

write("__tests__/directionalityIntegration.test.ts", `import { beforeEach, describe, expect, it } from "vitest";\nimport type { KinkEntry, Profile } from "@/types";\nimport { directionalComparisonEntries } from "@/lib/directionality";\nimport { profileMatchScore } from "@/lib/matching";\nimport { useStore } from "@/lib/store";\nimport { createConsentSnapshot, generateProfileOwnerKey, signProfileConsent } from "@/lib/consentProof";\nimport { decodeSharedProfile, encodeProfileV3 } from "@/lib/profileShareV3";\nimport { addProfileQrPart, buildProfileQrSet, type ProfileQrAssembly } from "@/lib/profileQr";\nimport { parseSharePaste } from "@/lib/parseSharePaste";\n\nfunction entry(status: KinkEntry["status"], extra: Partial<KinkEntry> = {}): KinkEntry {\n  return { status, comment: "", ...extra };\n}\n\nfunction profile(id: string, entries: Record<string, KinkEntry>): Profile {\n  return {\n    id, name: id, role: "Switch", perspective: "dominant", origin: "own",\n    experienceLevel: "gevorderd", customKinks: [], createdAt: 1, updatedAt: 2, entries,\n  };\n}\n\nfunction noise(length: number): string {\n  let x = 0x12345678;\n  let out = "";\n  for (let index = 0; index < length; index += 1) {\n    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;\n    out += String.fromCharCode(33 + ((x >>> 0) % 90));\n  }\n  return out;\n}\n\nbeforeEach(() => {\n  useStore.setState(useStore.getInitialState());\n});\n\ndescribe("directionality consumer contract", () => {\n  it("resolves one concrete A entry against B's explicit counterpart and keeps ordinary IDs unchanged", () => {\n    const a = { pegging_give: entry("yes"), spanking_hand: entry("willing") };\n    const b = { pegging_receive: entry("maybe"), spanking_hand: entry("yes") };\n\n    const pegging = directionalComparisonEntries(a, b, "pegging_give");\n    expect(pegging.sourceKinkId).toBe("pegging_give");\n    expect(pegging.partnerKinkId).toBe("pegging_receive");\n    expect(pegging.sourceEntry.status).toBe("yes");\n    expect(pegging.partnerEntry.status).toBe("maybe");\n\n    const spanking = directionalComparisonEntries(a, b, "spanking_hand");\n    expect(spanking.partnerKinkId).toBe("spanking_hand");\n    expect(spanking.partnerEntry.status).toBe("yes");\n  });\n\n  it("keeps compatibility symmetric when both directional sides are explicit", () => {\n    const a = profile("A", { pegging_give: entry("yes"), pegging_receive: entry("maybe") });\n    const b = profile("B", { pegging_receive: entry("willing"), pegging_give: entry("hard_no") });\n    expect(profileMatchScore(a, b)).toEqual(profileMatchScore(b, a));\n  });\n\n  it("stores give and receive independently in profile snapshots", () => {\n    const id = useStore.getState().createProfile("A", "Dominant");\n    useStore.getState().setEntry(id, "pegging_give", { status: "yes" });\n    useStore.getState().setEntry(id, "pegging_receive", { status: "hard_no" });\n    const snapshot = useStore.getState().saveProfileSnapshot(id)!;\n    expect(snapshot.entries.pegging_give?.status).toBe("yes");\n    expect(snapshot.entries.pegging_receive?.status).toBe("hard_no");\n    expect(snapshot.entries.pegging).toBeUndefined();\n  });\n\n  it("records scene usage on A's concrete direction and B's complementary direction", () => {\n    const aId = useStore.getState().createProfile("A", "Dominant");\n    const bId = useStore.getState().createProfile("B", "Submissive");\n    const sceneId = useStore.getState().saveScene({\n      title: "Directionele scène",\n      profileAId: aId, profileBId: bId, profileAName: "A", profileBName: "B",\n      items: [{ id: "peg", name: "Pegging — geven ↔ ontvangen", kinkId: "pegging_give", intensity: "midden", duration: "", note: "", fromKink: true }],\n      status: "planned",\n    });\n    useStore.getState().completeScene(sceneId, { completedAt: Date.now(), trafficLight: "green", wentWell: "", remember: "" });\n\n    const a = useStore.getState().profiles.find((candidate) => candidate.id === aId)!;\n    const b = useStore.getState().profiles.find((candidate) => candidate.id === bId)!;\n    expect(a.entries.pegging_give?.usedInScene).toBe(1);\n    expect(a.entries.pegging_receive?.usedInScene).toBeUndefined();\n    expect(b.entries.pegging_receive?.usedInScene).toBe(1);\n    expect(b.entries.pegging_give?.usedInScene).toBeUndefined();\n  });\n\n  it("keeps both concrete directions separate in a signed consent snapshot", async () => {\n    const original = profile("consent-owner", {\n      pegging_give: entry("yes", { comment: "geven" }),\n      pegging_receive: entry("hard_no", { comment: "ontvangen" }),\n    });\n    const ownerKey = await generateProfileOwnerKey(original.id);\n    const signed = await signProfileConsent(original, ownerKey);\n    const snapshot = await createConsentSnapshot({ ...original, consentProof: signed.proof });\n    expect(snapshot?.payload.entries.pegging_give?.status).toBe("yes");\n    expect(snapshot?.payload.entries.pegging_receive?.status).toBe("hard_no");\n    expect(snapshot?.payload.entries.pegging).toBeUndefined();\n  });\n\n  it("round-trips both directions through multipart profile QR without inventing legacy pegging", async () => {\n    const original = profile("qr-owner", {\n      pegging_give: entry("yes", { comment: "geven" }),\n      pegging_receive: entry("hard_no", { comment: "ontvangen grens" }),\n      spanking_hand: entry("maybe", { comment: noise(9000) }),\n    });\n    const encoded = await encodeProfileV3(original);\n    const qr = buildProfileQrSet("https://kink.example", encoded);\n    expect(qr.qrValues.length).toBeGreaterThan(1);\n\n    const parts = qr.qrValues.map((value) => {\n      const parsed = parseSharePaste(value);\n      expect(parsed.kind).toBe("profilePart");\n      if (parsed.kind !== "profilePart") throw new Error("profilePart verwacht");\n      return parsed.part;\n    });\n    const order = [parts.at(-1)!, parts[0], parts[0], ...parts.slice(1, -1)];\n    let assembly: ProfileQrAssembly | null = null;\n    let payload: string | null = null;\n    for (const part of order) {\n      const result = addProfileQrPart(assembly, part);\n      if (result.status === "progress") assembly = result.assembly;\n      if (result.status === "complete") payload = result.payload;\n    }\n    expect(payload).toBe(encoded);\n    const decoded = await decodeSharedProfile(payload!);\n    expect(decoded.entries.pegging_give?.status).toBe("yes");\n    expect(decoded.entries.pegging_receive?.status).toBe("hard_no");\n    expect(decoded.entries.pegging).toBeUndefined();\n  });\n\n  it("does not leak or synthesize the private sibling during profile sharing", async () => {\n    const original = profile("private-qr", {\n      pegging_give: entry("yes"),\n      pegging_receive: entry("hard_no", { privateResponse: true }),\n    });\n    const decoded = await decodeSharedProfile(await encodeProfileV3(original));\n    expect(decoded.entries.pegging_give?.status).toBe("yes");\n    expect(decoded.entries.pegging_receive).toBeUndefined();\n    expect(decoded.entries.pegging).toBeUndefined();\n  });\n});\n`);

appendOnce("e2e/contract.spec.ts", "Contractpagina — directionele pairing", `const DIRECTIONAL_CONTRACT_A = {\n  ...PROFILE_ALEX,\n  entries: {\n    spanking_hand: { status: "yes", comment: "" },\n    pegging_give: { status: "yes", comment: "geven" },\n  },\n} satisfies typeof PROFILE_ALEX;\n\nconst DIRECTIONAL_CONTRACT_B_RECEIVE = {\n  ...PROFILE_SAM,\n  entries: {\n    spanking_hand: { status: "yes", comment: "" },\n    pegging_receive: { status: "yes", comment: "ontvangen" },\n  },\n} satisfies typeof PROFILE_SAM;\n\nconst DIRECTIONAL_CONTRACT_B_GIVE = {\n  ...PROFILE_SAM,\n  entries: {\n    spanking_hand: { status: "yes", comment: "" },\n    pegging_give: { status: "yes", comment: "ook geven" },\n  },\n} satisfies typeof PROFILE_SAM;\n\nconst DIRECTIONAL_CONTRACT_B_LIMIT = {\n  ...PROFILE_SAM,\n  entries: {\n    spanking_hand: { status: "yes", comment: "" },\n    pegging_receive: { status: "hard_no", comment: "grens" },\n  },\n} satisfies typeof PROFILE_SAM;\n\ntest.describe("Contractpagina — directionele pairing", () => {\n  test("zet geven tegenover ontvangen in gedeelde verlangens", async ({ page }) => {\n    await seedAndGo(page, URL, [DIRECTIONAL_CONTRACT_A, DIRECTIONAL_CONTRACT_B_RECEIVE]);\n    const shared = page.getByText("Gedeelde verlangens", { exact: true }).locator("..");\n    await expect(shared.getByText("Pegging — geven ↔ ontvangen", { exact: true })).toBeVisible();\n  });\n\n  test("behandelt geven plus geven niet als gedeeld verlangen", async ({ page }) => {\n    await seedAndGo(page, URL, [DIRECTIONAL_CONTRACT_A, DIRECTIONAL_CONTRACT_B_GIVE]);\n    await expect(page.getByText("Pegging — geven ↔ ontvangen", { exact: true })).toHaveCount(0);\n  });\n\n  test("plaatst een hard_no op de complementaire ontvangstrichting bij harde grenzen", async ({ page }) => {\n    await seedAndGo(page, URL, [DIRECTIONAL_CONTRACT_A, DIRECTIONAL_CONTRACT_B_LIMIT]);\n    const limits = page.getByText("Harde grenzen", { exact: true }).locator("..");\n    await expect(limits.getByText(/Pegging — geven ↔ ontvangen/)).toBeVisible();\n  });\n});`);

appendOnce("e2e/scene.spec.ts", "Scene planner — directionele pairing", `const DIRECTIONAL_SCENE_A = {\n  ...PROFILE_ALEX,\n  entries: {\n    spanking_hand: { status: "yes", comment: "" },\n    pegging_give: { status: "yes", comment: "geven", tags: ["rustig"] },\n  },\n} satisfies typeof PROFILE_ALEX;\n\nconst DIRECTIONAL_SCENE_B_RECEIVE = {\n  ...PROFILE_SAM,\n  entries: {\n    spanking_hand: { status: "yes", comment: "" },\n    pegging_receive: { status: "yes", comment: "ontvangen", tags: ["veel glijmiddel"] },\n  },\n} satisfies typeof PROFILE_SAM;\n\nconst DIRECTIONAL_SCENE_B_GIVE = {\n  ...PROFILE_SAM,\n  entries: {\n    spanking_hand: { status: "yes", comment: "" },\n    pegging_give: { status: "yes", comment: "ook geven" },\n  },\n} satisfies typeof PROFILE_SAM;\n\ntest.describe("Scene planner — directionele pairing", () => {\n  const extras = { contracts: [CONTRACT_ALEX_SAM], contractSeries: [CONTRACT_SERIES_ALEX_SAM] };\n\n  test("toont geven plus ontvangen als wederzijdse Pegging-suggestie", async ({ page }) => {\n    await seedAndGo(page, "/scene?a=pw-alex-001&b=pw-sam-002", [DIRECTIONAL_SCENE_A, DIRECTIONAL_SCENE_B_RECEIVE], extras);\n    await page.getByRole("button", { name: "Kinks toevoegen" }).click();\n    const mutual = page.getByText("Wederzijds", { exact: true }).locator("..");\n    await expect(mutual.getByRole("button", { name: "Pegging — geven ↔ ontvangen" })).toBeVisible();\n  });\n\n  test("toont geven plus geven niet als wederzijdse Pegging-suggestie", async ({ page }) => {\n    await seedAndGo(page, "/scene?a=pw-alex-001&b=pw-sam-002", [DIRECTIONAL_SCENE_A, DIRECTIONAL_SCENE_B_GIVE], extras);\n    await page.getByRole("button", { name: "Kinks toevoegen" }).click();\n    await expect(page.getByRole("button", { name: "Spanking (hand)" })).toBeVisible();\n    await expect(page.getByRole("button", { name: "Pegging — geven ↔ ontvangen" })).toHaveCount(0);\n  });\n});`);

console.log("directionality consumer closeout applied");
