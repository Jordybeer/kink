from pathlib import Path
import shutil


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: verwacht exact één anker, vond {count}: {old[:100]!r}")
    target.write_text(text.replace(old, new, 1))


shutil.copyfile("scripts/lossless-review-src/profileShareV3.ts", "lib/profileShareV3.ts")
shutil.copyfile("scripts/lossless-review-src/profileShareV3.test.ts", "__tests__/profileShareV3.test.ts")

replace_once(
    "app/page.tsx",
    '''  const [scanOpen, setScanOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Profile | null>(null);
''',
    '''  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<Profile | null>(null);
''',
)
replace_once(
    "app/page.tsx",
    '''                  onClick={() => setScanOpen(true)}
''',
    '''                  onClick={() => { setScanError(null); setScanOpen(true); }}
''',
)
replace_once(
    "app/page.tsx",
    '''            try {
              setImportPreview(await decodeSharedProfile(p));
            } catch {
              setImportError("Profielcode is ongeldig of beschadigd.");
            }
''',
    '''            try {
              setImportPreview(await decodeSharedProfile(p));
              setScanError(null);
            } catch {
              setScanError("Profielcode is ongeldig of beschadigd.");
            }
''',
)
replace_once(
    "app/page.tsx",
    '''      )}

      {/* Import profile sheet */}
''',
    '''      )}

      {scanError && (
        <div
          role="alert"
          className="fixed top-[calc(var(--nav-h)+12px)] left-4 right-4 z-[300] mx-auto max-w-md rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg ks-fade-in"
          style={{ background: "var(--surface)", border: "1px solid var(--hard-no)", color: "var(--hard-no)" }}
        >
          <span className="text-sm flex-1">{scanError}</span>
          <button
            type="button"
            onClick={() => setScanError(null)}
            aria-label="Sluit foutmelding"
            className="focus-ring p-1 rounded-lg flex-none"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Import profile sheet */}
''',
)

replace_once(
    "components/QRScanner.tsx",
    '''  function dispatchPayload(raw: string): DispatchResult {
    const now = Date.now();
    if (lastRawRef.current?.value === raw && now - lastRawRef.current.at < 900) {
      return "progress";
    }
    lastRawRef.current = { value: raw, at: now };
''',
    '''  function dispatchPayload(raw: string, dedupeCameraFrames = true): DispatchResult {
    const now = Date.now();
    if (dedupeCameraFrames && lastRawRef.current?.value === raw && now - lastRawRef.current.at < 900) {
      return "progress";
    }
    if (dedupeCameraFrames) lastRawRef.current = { value: raw, at: now };
''',
)
replace_once(
    "components/QRScanner.tsx",
    '''    const outcome = dispatchPayload(pasteInput);
''',
    '''    const outcome = dispatchPayload(pasteInput, false);
''',
)
replace_once(
    "components/QRScanner.tsx",
    '''              onClick={() => { stopCamera(); setPasteMode(true); }}
''',
    '''              onClick={() => { stopCamera(); setPartError(null); setPasteMode(true); }}
''',
)

replace_once(
    "docs/lossless-profile-sharing.md",
    '''The avatar, private note, local scene-use counters, imported/locked metadata and every
`privateResponse` are excluded. A private custom kink is excluded including its name.
''',
    '''The avatar, private note, local scene-use counters, imported/locked metadata and every
`privateResponse` are excluded. A private custom kink is excluded including its name.
The v3 codec has no private-response opt-in: this boundary is enforced in the serializer.
''',
)
replace_once(
    "docs/lossless-profile-sharing.md",
    '''both representations decode losslessly.
''',
    '''both representations decode losslessly. Encoded input is capped before base64 decoding,
and Deflate output is read incrementally with a 4 MB hard ceiling before JSON parsing.
''',
)

replace_once(
    "corrections.md",
    '''---

## 2026-07-28 — Een QR-header mag de payload niet als scheidingsteken behandelen
''',
    '''---

## 2026-07-28 — Twee schrijvende workflowtriggers botsten op dezelfde branch

**What went wrong:** Een tijdelijke transform-workflow luisterde tegelijk naar `push` en `pull_request synchronize`. Eén stagingcommit startte daardoor twee identieke schrijvers. Beide doorliepen tests en build; de eerste pushte de bewezen productcommit, de tweede werd terecht als non-fast-forward geweigerd.

**Rule:** Een workflow die naar zijn eigen featurebranch schrijft krijgt exact één triggerpad. Gebruik voor een open same-repo PR uitsluitend `pull_request: synchronize`, of uitsluitend `push`, maar nooit beide. Een afgewezen tweede push is geen codefout: controleer eerst of de andere run dezelfde bewezen commit al heeft geland.

---

## 2026-07-28 — Een QR-header mag de payload niet als scheidingsteken behandelen
''',
)

shutil.rmtree("scripts/lossless-review-src")
Path("scripts/apply-lossless-review.py").unlink()
Path(".github/workflows/apply-lossless-review.yml").unlink()
print("CodeRabbitbevindingen afgedicht en workflowrace gelogd.")
