from pathlib import Path

path = Path("lib/store.ts")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one store anchor, found {count}: {old[:100]!r}")
    text = text.replace(old, new, 1)


replace_once(
    'const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };\n',
    '''const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };\n\nfunction isSharedProfile(profile: Profile): boolean {\n  return profile.origin === "shared" || profile.isImported === true;\n}\n''',
)

replace_once(
    '''            p.id === id\n              ? { ...p, name, role, experienceLevel, relationshipStatus: relationshipStatus || undefined, fetLifeUsername: fetLifeUsername || undefined, bdsmtestUrl: bdsmtestUrl || undefined, updatedAt: Date.now() }\n              : p\n''',
    '''            p.id === id && !isSharedProfile(p)\n              ? { ...p, name, role, experienceLevel, relationshipStatus: relationshipStatus || undefined, fetLifeUsername: fetLifeUsername || undefined, bdsmtestUrl: bdsmtestUrl || undefined, updatedAt: Date.now() }\n              : p\n''',
)

replace_once(
    '''            p.id === id ? { ...p, bdsmtestScores: scores, updatedAt: Date.now() } : p\n''',
    '''            p.id === id && !isSharedProfile(p) ? { ...p, bdsmtestScores: scores, updatedAt: Date.now() } : p\n''',
)

replace_once(
    '''      setEntry(profileId, kinkId, patch) {\n        set((s) => ({\n          profiles: s.profiles.map((p) => {\n            if (p.id !== profileId) return p;\n''',
    '''      setEntry(profileId, kinkId, patch) {\n        const target = get().profiles.find((profile) => profile.id === profileId);\n        if (!target || isSharedProfile(target)) return;\n        set((s) => ({\n          profiles: s.profiles.map((p) => {\n            if (p.id !== profileId) return p;\n''',
)

replace_once(
    '''      resetEntry(profileId, kinkId) {\n        set((s) => ({\n          profiles: s.profiles.map((p) => {\n            if (p.id !== profileId) return p;\n''',
    '''      resetEntry(profileId, kinkId) {\n        const target = get().profiles.find((profile) => profile.id === profileId);\n        if (!target || isSharedProfile(target)) return;\n        set((s) => ({\n          profiles: s.profiles.map((p) => {\n            if (p.id !== profileId) return p;\n''',
)

replace_once(
    '''      addCustomKink(profileId, name) {\n        const id = "custom_" + uid();\n''',
    '''      addCustomKink(profileId, name) {\n        const target = get().profiles.find((profile) => profile.id === profileId);\n        if (!target || isSharedProfile(target)) return;\n        const id = "custom_" + uid();\n''',
)

replace_once(
    '''      removeCustomKink(profileId, kinkId) {\n        set((s) => ({\n''',
    '''      removeCustomKink(profileId, kinkId) {\n        const target = get().profiles.find((profile) => profile.id === profileId);\n        if (!target || isSharedProfile(target)) return;\n        set((s) => ({\n''',
)

replace_once(
    '''          const existing = s.scenes.find((sc) => sc.id === id);\n          if (existing) {\n            return { scenes: s.scenes.map((sc) => sc.id === id ? { ...sc, ...record, id, updatedAt: now } : sc) };\n          }\n''',
    '''          const existing = s.scenes.find((sc) => sc.id === id);\n          if (existing?.consentLockedAt || existing?.consentSnapshots) return s;\n          if (existing) {\n            return { scenes: s.scenes.map((sc) => sc.id === id ? { ...sc, ...record, id, updatedAt: now } : sc) };\n          }\n''',
)

replace_once(
    '''        const localOwnerKey = get().profileOwnerKeys.find((key) =>\n          key.profileId === profileA.id || key.profileId === profileB.id);\n        const event = await createConsentLedgerEvent({\n''',
    '''        const localOwnerKey = get().profileOwnerKeys.find((key) =>\n          key.profileId === profileA.id || key.profileId === profileB.id);\n        if (!localOwnerKey) {\n          return { ok: false, message: "Minstens één deelnemer moet dit op het eigen toestel vastzetten." };\n        }\n        const event = await createConsentLedgerEvent({\n''',
)

path.write_text(text, encoding="utf-8")
