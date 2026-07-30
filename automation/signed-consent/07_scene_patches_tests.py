from pathlib import Path
from textwrap import dedent

ROOT = Path('.')

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(dedent(content).lstrip(), encoding='utf-8')

def replace_once(path: str, old: str, new: str) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count} for {old[:100]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# Scene planning freezes the currently sealed consent versions.
replace_once('app/scene/page.tsx', '''import { moveUp, moveDown } from "@/lib/sceneOrder";
''', '''import { moveUp, moveDown } from "@/lib/sceneOrder";
import { createSceneConsentLedger } from "@/lib/consentLedger";
''')
replace_once('app/scene/page.tsx', '''  const { profiles, scenes, contracts, saveScene } = useStore();
''', '''  const { profiles, scenes, contracts, saveScene, sealProfileForSharing } = useStore();
''')
replace_once('app/scene/page.tsx', '''  function handleSave(status: "draft" | "planned") {
''', '''  async function handleSave(status: "draft" | "planned") {
''')
replace_once('app/scene/page.tsx', '''    const title = sceneTitle.trim() || `${profileA.name} & ${profileB.name}`;
    const id = saveScene({
      id: sceneId ?? undefined,
      title,
      profileAId: profileA.id,
      profileBId: profileB.id,
      profileAName: profileA.name,
      profileBName: profileB.name,
      items,
      plannedDate: sceneDate || undefined,
      plannedTime: sceneTime || undefined,
      safeword: safeword.trim() || undefined,
      status,
    });
''', '''    const title = sceneTitle.trim() || `${profileA.name} & ${profileB.name}`;
    const recordId = sceneId ?? crypto.randomUUID();
    let consentLedger = currentScene?.consentLedger;
    if (status === "planned" && !consentLedger) {
      try {
        const [sealedA, sealedB] = await Promise.all([
          profileA.origin === "shared" ? Promise.resolve(profileA) : sealProfileForSharing(profileA.id),
          profileB.origin === "shared" ? Promise.resolve(profileB) : sealProfileForSharing(profileB.id),
        ]);
        if (!sealedA || !sealedB) throw new Error("Profiel kon niet worden verzegeld");
        const state = useStore.getState();
        consentLedger = await createSceneConsentLedger(
          sealedA,
          sealedB,
          recordId,
          [state.profileKeys[sealedA.id], state.profileKeys[sealedB.id]].filter(Boolean),
        );
      } catch (reason) {
        setSaveError(reason instanceof Error
          ? reason.message
          : "Toestemming kon niet veilig worden vastgezet.");
        return;
      }
    }
    const id = saveScene({
      id: recordId,
      title,
      profileAId: profileA.id,
      profileBId: profileB.id,
      profileAName: profileA.name,
      profileBName: profileB.name,
      items,
      plannedDate: sceneDate || undefined,
      plannedTime: sceneTime || undefined,
      safeword: safeword.trim() || undefined,
      status,
      consentLedger,
    });
''')
replace_once('app/scene/page.tsx', '''                onClick={() => handleSave("draft")}
''', '''                onClick={() => void handleSave("draft")}
''')
replace_once('app/scene/page.tsx', '''                onClick={() => handleSave("planned")}
''', '''                onClick={() => void handleSave("planned")}
''')

# Scene detail renders the frozen consent record and append-only updates.
replace_once('components/scenes/SceneDetailScreen.tsx', '''import SafewordRibbon from "@/components/SafewordRibbon";
''', '''import SafewordRibbon from "@/components/SafewordRibbon";
import ConsentLedgerPanel from "@/components/ConsentLedgerPanel";
''')
replace_once('components/scenes/SceneDetailScreen.tsx', '''      <SafewordRibbon safeword={scene.safeword} />

      {/* Aftercare block */}
''', '''      <SafewordRibbon safeword={scene.safeword} />

      {scene.consentLedger && <ConsentLedgerPanel scene={scene} />}

      {/* Aftercare block */}
''')

write('__tests__/storeConsent.test.ts', r'''
import { beforeEach, describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import { useStore } from "@/lib/store";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    consentRevision: 3,
    sourceTrust: "self",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 100,
    updatedAt: 200,
    entries: { rope: { status: "yes", comment: "" } },
    origin: "own",
    ...overrides,
  };
}

describe("store consent ownership gates", () => {
  beforeEach(() => {
    useStore.setState({
      profiles: [],
      profileKeys: {},
      scenes: [],
      contracts: [],
      profileSnapshots: [],
    });
  });

  it("does not let shared profile consent be changed through store actions", () => {
    const shared = makeProfile({ origin: "shared", isImported: true, sourceTrust: "confirmed" });
    useStore.setState({ profiles: [shared] });
    useStore.getState().setEntry(shared.id, "rope", { status: "hard_no" });
    useStore.getState().resetEntry(shared.id, "rope");
    useStore.getState().addCustomKink(shared.id, "Not mine");
    useStore.getState().removeCustomKink(shared.id, "rope");
    expect(useStore.getState().profiles[0]).toEqual(shared);
  });

  it("increments own consent revision and clears the old seal after a change", () => {
    const own = makeProfile({
      consentSeal: {
        algorithm: "ECDSA-P256-SHA256",
        keyId: "key",
        publicKey: { kty: "EC", crv: "P-256", x: "x", y: "y" },
        revision: 3,
        issuedAt: 100,
        payloadHash: "old-hash",
        signature: "signature",
      },
    });
    useStore.setState({ profiles: [own] });
    useStore.getState().setEntry(own.id, "rope", { status: "maybe" });
    const changed = useStore.getState().profiles[0];
    expect(changed.entries.rope.status).toBe("maybe");
    expect(changed.consentRevision).toBe(4);
    expect(changed.previousConsentHash).toBe("old-hash");
    expect(changed.consentSeal).toBeUndefined();
  });
});
''')
