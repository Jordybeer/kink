from pathlib import Path

path = Path("scripts/apply-questionnaire-semantic-flow-v3.py")
source = path.read_text()

diaper_needle = '''    description: "Als volwassene een luier dragen om lichamelijke, praktische, esthetische of erotische redenen, zonder ageplay, controle of vernedering te veronderstellen.",
  },'''
diaper_replacement = '''    description: "Als volwassene een luier dragen om lichamelijke, praktische, esthetische of erotische redenen, zonder ageplay, controle of vernedering te veronderstellen.",
    safetyNote: "Kies de juiste maat, voorkom schuren en controleer de huid. Vervang een natte of vervuilde luier tijdig en stop bij huidbeschadiging of aanhoudende irritatie.",
  },'''
count = source.count(diaper_needle)
if count != 2:
    raise RuntimeError(f"expected two diaper wearing transform fragments, got {count}")
source = source.replace(diaper_needle, diaper_replacement)

role_needle = r'''Voor \*\*sterk rol-geassocieerde\*\* pair.*?Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn\.'''
role_replacement = r'''Voor een \*\*sterk rol-geassocieerde\*\* pair.*?Pairflow blijft bovendien alleen gelden wanneer beide siblings al zelfstandig eligible zijn\.'''
if source.count(role_needle) != 1:
    raise RuntimeError("expected one role-policy documentation regex")
source = source.replace(role_needle, role_replacement, 1)

cleanup_marker = '''# Temporary transform plumbing must not survive in the PR diff.
'''
if source.count(cleanup_marker) != 1:
    raise RuntimeError("expected one transform cleanup marker")
contract_updates = r'''# Align old reviewed contracts with the new semantic model.
replace_once(
    "lib/questionnaireProgression.ts",
    '  ["recording", "adult_content_creation"],\n',
    '',
)
replace_once(
    "__tests__/kinks.test.ts",
    '    expect(added).toEqual([...RELEASE_A_IDS, ...DIRECTIONAL_RELEASE_IDS].sort());',
    '    expect(added).toEqual([...RELEASE_A_IDS, ...DIRECTIONAL_RELEASE_IDS, "diaper_partner_wearing"].sort());',
)
replace_once(
    "__tests__/questionnaire.test.ts",
    '  it("opens only the first explicit media boundary at a time", () => {',
    '  it("stops immediate media expansion at the private recording boundary", () => {',
)
replace_once(
    "__tests__/questionnaire.test.ts",
    '    photography.entries.recording = { status: "yes", comment: "privé-opname is expliciet" };\n    expect(getQuestionnaireRuntime(photography).pendingProbes.map((probe) => probe.targetKinkId))\n      .toEqual(["adult_content_creation"]);',
    '    photography.entries.recording = { status: "yes", comment: "privé-opname is expliciet" };\n    expect(getQuestionnaireRuntime(photography).pendingProbes.map((probe) => probe.targetKinkId))\n      .toEqual([]);',
)
replace_once(
    "__tests__/questionnaireProgression.test.ts",
    '''  it("herstelt na ranking en diversiteit ook een volledige drie-staps waterval", () => {
    const adultContent = kinkAtForcedLevel("adult_content_creation", 1);
    const recording = kinkAtForcedLevel("recording", 1);
    const photography = kinkAtForcedLevel("nude_photography", 4);

    const ranked = rankQuestionnaireCandidates(
      [adultContent, recording, photography],
      {},
    );

    expect(ranked.map((kink) => kink.id)).toEqual([
      "nude_photography",
      "recording",
      "adult_content_creation",
    ]);
  });''',
    '''  it("ordent alleen de geaudite privé-mediastap en maakt publiceren geen verplichte trede", () => {
    const adultContent = kinkAtForcedLevel("adult_content_creation", 1);
    const recording = kinkAtForcedLevel("recording", 1);
    const photography = kinkAtForcedLevel("nude_photography", 4);

    const ranked = rankQuestionnaireCandidates(
      [adultContent, recording, photography],
      {},
    );
    const ids = ranked.map((kink) => kink.id);

    expect(ids.indexOf("nude_photography")).toBeLessThan(ids.indexOf("recording"));
    expect(questionnaireProgressionParentIds("adult_content_creation")).toEqual([]);
  });''',
)

# Clean warnings introduced by replacing whole-catalog progress with guided scope.
replace_once(
    "components/profile/QuestionsScreen.tsx",
    'import { CaretDown, Check, Info, Sparkle, UserMinus } from "@phosphor-icons/react";',
    'import { CaretDown, Check, Sparkle, UserMinus } from "@phosphor-icons/react";',
)
replace_once(
    "components/profile/QuestionsScreen.tsx",
    'import { CATEGORIES, KINKS, kinkCategoryLabel } from "@/lib/kinks";',
    'import { CATEGORIES, kinkCategoryLabel } from "@/lib/kinks";',
)
replace_once(
    "components/profile/QuestionsScreen.tsx",
    '  const catalogRated = KINKS.filter((kink) => currentProfile.entries[kink.id]?.status != null).length;\n',
    '',
)

'''
source = source.replace(cleanup_marker, contract_updates + cleanup_marker, 1)

path.write_text(source)
print("transform preconditions and reviewed contracts patched")
