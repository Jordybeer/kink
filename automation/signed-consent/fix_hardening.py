from pathlib import Path

path = Path("automation/signed-consent/08_harden_existing.py")
text = path.read_text(encoding="utf-8")
old = """replace_once('lib/store.ts', '''            p.id !== profileId
              ? p
              : {
''', '''            p.id !== profileId || isSharedProfile(p)
              ? p
              : {
''')
replace_once('lib/store.ts', '''            p.id !== profileId
              ? p
              : {
''', '''            p.id !== profileId || isSharedProfile(p)
              ? p
              : {
''')"""
new = '''store_path = ROOT / "lib/store.ts"
store_text = store_path.read_text(encoding="utf-8")
old_custom_guard = """            p.id !== profileId
              ? p
              : {
"""
new_custom_guard = """            p.id !== profileId || isSharedProfile(p)
              ? p
              : {
"""
if store_text.count(old_custom_guard) != 2:
    raise RuntimeError(f"lib/store.ts: expected two custom-kink guards, found {store_text.count(old_custom_guard)}")
store_path.write_text(store_text.replace(old_custom_guard, new_custom_guard), encoding="utf-8")'''
if text.count(old) != 1:
    raise RuntimeError(f"Expected one duplicated custom-kink transformer block, found {text.count(old)}")
text = text.replace(old, new, 1)

map_fixes = {
    "const originals = new Map([": "const originals = new Map<string, ConsentSnapshot>([",
    "const latestProof = new Map([": "const latestProof = new Map<string, ProfileConsentProof>([",
}
for before, after in map_fixes.items():
    if text.count(before) != 1:
        raise RuntimeError(f"Expected one consent map anchor for {before!r}, found {text.count(before)}")
    text = text.replace(before, after, 1)

path.write_text(text, encoding="utf-8")
