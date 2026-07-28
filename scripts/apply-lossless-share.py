from pathlib import Path
import shutil


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: verwacht exact één anker, vond {count}: {old[:100]!r}")
    target.write_text(text.replace(old, new, 1))


source = Path("scripts/lossless-share-src")
copy_map = {
    "profileShareV3.ts": "lib/profileShareV3.ts",
    "profileQr.ts": "lib/profileQr.ts",
    "parseSharePaste.ts": "lib/parseSharePaste.ts",
    "profileSnapshot.ts": "lib/profileSnapshot.ts",
    "QRModal.tsx": "components/QRModal.tsx",
    "QRScanner.tsx": "components/QRScanner.tsx",
    "profileShareV3.test.ts": "__tests__/profileShareV3.test.ts",
    "profileQr.test.ts": "__tests__/profileQr.test.ts",
    "parseSharePaste.test.ts": "__tests__/parseSharePaste.test.ts",
    "profileSnapshot.test.ts": "__tests__/profileSnapshot.test.ts",
    "lossless-profile-sharing.md": "docs/lossless-profile-sharing.md",
}
for src, dst in copy_map.items():
    target = Path(dst)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / src, target)

replace_once(
    "app/page.tsx",
    'import { decodeAny } from "@/lib/shareProfile";\n',
    'import { decodeSharedProfile } from "@/lib/profileShareV3";\nimport { parseSharePaste } from "@/lib/parseSharePaste";\n',
)
replace_once(
    "app/page.tsx",
    '''  useEffect(() => {
    const p = searchParams.get("p");
    if (!p) return;
    try { setImportPreview(decodeAny(p)); } catch { /* ongeldige parameter */ }
  }, [searchParams]);
''',
    '''  useEffect(() => {
    let cancelled = false;
    async function readShareLocation() {
      const parsed = parseSharePaste(window.location.href);
      if (parsed.kind !== "profile") return;
      try {
        const decoded = await decodeSharedProfile(parsed.encoded);
        if (!cancelled) setImportPreview(decoded);
      } catch {
        // Ongeldige of beschadigde deelcode blijft buiten de store.
      }
    }
    void readShareLocation();
    window.addEventListener("hashchange", readShareLocation);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", readShareLocation);
    };
  }, [searchParams]);
''',
)
replace_once(
    "app/page.tsx",
    '''          onResult={(p) => {
            try { setImportPreview(decodeAny(p)); } catch { /* ongeldige QR */ }
            setScanOpen(false);
          }}
''',
    '''          onResult={async (p) => {
            try {
              setImportPreview(await decodeSharedProfile(p));
            } catch {
              setImportError("Profielcode is ongeldig of beschadigd.");
            }
            setScanOpen(false);
          }}
''',
)

replace_once(
    "components/TriageDeck.tsx",
    '''              <button
                type="button"
                data-tour="private"
                onClick={() => onPrivateChange(current.id, !currentEntry?.privateResponse)}
                aria-pressed={!!currentEntry?.privateResponse}
                aria-label={currentEntry?.privateResponse ? "Antwoord niet langer privé maken" : "Antwoord privé maken"}
                className="focus-ring w-9 h-9 flex items-center justify-center rounded-lg border transition-colors flex-none"
                style={currentEntry?.privateResponse
                  ? { color: "var(--accent)", borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" }
                  : { color: "var(--text2)", borderColor: "var(--border)", background: "var(--tag-muted)" }}
              >
                {currentEntry?.privateResponse
                  ? <EyeSlash size={14} weight="bold" aria-hidden="true" />
                  : <Eye size={14} aria-hidden="true" />}
              </button>
''',
    '''              <button
                type="button"
                data-tour="private"
                onClick={() => onPrivateChange(current.id, !currentEntry?.privateResponse)}
                aria-pressed={!!currentEntry?.privateResponse}
                aria-label={currentEntry?.privateResponse ? "Antwoord niet langer verbergen" : "Antwoord verbergen"}
                className="focus-ring px-2.5 min-h-9 inline-flex items-center justify-center gap-1 rounded-lg border transition-colors flex-none text-xs"
                style={currentEntry?.privateResponse
                  ? { color: "var(--accent)", borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)" }
                  : { color: "var(--text2)", borderColor: "var(--border)", background: "var(--tag-muted)" }}
              >
                {currentEntry?.privateResponse
                  ? <EyeSlash size={13} weight="bold" aria-hidden="true" />
                  : <Eye size={13} aria-hidden="true" />}
                <span>{currentEntry?.privateResponse ? "Verborgen" : "Verberg"}</span>
              </button>
''',
)
replace_once(
    "components/ProfileTour.tsx",
    '''    title: "Hou je antwoord privé",
    body: "Tik het oogje naast de ster, voor of na je keuze. Alleen de kinknaam blijft zichtbaar; je oordeel, nieuwsgierigheid, tags en notitie blijven verborgen tot je ze bewust onthult.",
''',
    '''    title: "Verberg je antwoord",
    body: "Tik ‘Verberg’ naast de ster, voor of na je keuze. De knop wordt ‘Verborgen’: alleen de kinknaam blijft zichtbaar; oordeel, nieuwsgierigheid, tags en notitie blijven dicht tot je ze bewust onthult.",
''',
)

shutil.rmtree(source)
Path("scripts/apply-lossless-share.py").unlink()
Path(".github/workflows/apply-lossless-share.yml").unlink()
print("Lossless v3, multi-QR, snapshotprivacy en Verberg-label toegepast.")
