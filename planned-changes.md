# v5 Backlog — reorganised 2026-06-24 (post UI/UX audit)

Mobile-first. No regressions. No Playwright unless a feature genuinely needs it. Group commits per phase; each phase ships independently.

---

## Open Decisions (resolve before scoping the queue below)

- ~~**Avatar ContextMenu**~~ — ✓ shipped `84cc42b`.
- ~~**Overzicht tab padding**~~ — ✓ shipped `629419b` — Bewerken `pt-2`, Overzicht `pt-4`.
- ~~**Give/receive direction selector**~~ — ✓ killed. `629419b` — store v15, direction fields stripped from all layers.

---

## Active queue

### ~~Phase 16 — Sheet implementation consolidation~~ ✓ [SHIPPED]

All 4 `sheet-panel`/`sheet-overlay` consumers in `app/page.tsx` migrated to `<Sheet>` from `components/ui/`. Import drag state + `settingsSheetRef` + `useFocusTrap` removed (Sheet handles those internally). CSS blocks `.sheet-overlay` / `.sheet-panel` deleted; z-index ladder comment updated to reflect 150/151.

### Phase 17 — Home page extraction [MEDIUM, structural, gated on Phase 16]

`app/page.tsx` is 81 KB / ~1250 lines holding seven distinct concerns: profile CRUD, theme picker, PIN flow, biometric setup, encrypted backup export/import, QR scan trigger, destroy-all. State explosion is hostile to changes.

Extract into:
- `components/sheets/SettingsSheet.tsx` (theme + backup entry + security entry + tour + danger zone)
- `components/sheets/PinFlowSheet.tsx` (set / confirm / remove + biometric)
- `components/sheets/EncryptedBackupSheets.tsx` (export-pw + import-pw)
- `components/sheets/DestroyAllSheet.tsx` (wipe phrase + confirm)

Target: `app/page.tsx` under 400 lines. Same instinct applies later to `app/scene/page.tsx` (37 KB), `app/session/page.tsx` (41 KB), `app/contract/page.tsx` (55 KB) but those are out of scope here.

### ~~Phase 18 — ProfileHero copy dedup~~ ✓ [SHIPPED]

`formatProfileMetadata` stripped of the count prefix; metadata `<p>` now only renders if custom kinks or top category is present. Single "X van Y beoordeeld" remains in the italic DNA summary line.

### ~~Phase 19 — /compare interaction upgrades~~ ✓ [SHIPPED]

AlignmentBar gained an `onFilter` prop — each colour segment now calls `setFilterMode`. Match tab gets its badge (green count) alongside Bespreken and Grenzen.

### Phase 20 — Italic Cormorant vocabulary extension [MEDIUM, identity]

The `/compare` score masthead (`app/compare/page.tsx:59–141`) is the strongest typographic moment in the product. Carry its italic-serif treatment to:
- Profile-detail section headers (currently 12px uppercase tracking-widest grey).
- `"Maak een contract"` CTA (`app/page.tsx:921`, currently semibold sans).
- Home empty-state copy ("Nog geen profielen. Wie ben jij in de speelkamer?" — text-sm now).

Goal: reinforce the editorial identity that's already doing the heavy lifting in the masthead, rather than letting it be a one-off.

### Phase 21 — Body type floor [SMALL, sweep]

Sweep `text-[10px]` and `text-[11px]` away from body and metadata copy across `app/` and `components/`. Reserve sub-12px for `tabular-nums` counters and microbadges only.

### ~~Phase 22 — Emoji → Lucide for chrome~~ ✓ [SHIPPED]

Phase 11 cleared chrome emoji from `/compare`, `/scene`, `/contract`. Remaining holdouts:
- Settings sheet icons (🎨 💾 🔒 🧭 ⚠️ 🔑 🔓 🔍) in `app/page.tsx:1004–1173`.
- Onboarding intro / status screens (🔒 💾 🖤 🎨 🔐 🔓 🔞) in `components/Onboarding.tsx`.
- `FEATURE_ROWS` (`components/Onboarding.tsx:323–330`) mixes string emoji with `Zap` / `PenLine` Lucide components in the same array — pick one.

Rule: Lucide for app chrome, emoji only for user-authored content.

### Phase 23 — Status colour user-test [DEFER, verification]

Phase 3d deliberately mapped `--yes → orange` (desire/heat) and `--willing → green`. The mapping inverts the universal "green = enthusiastic / amber = caution" expectation. Worth a quiet user-test against two real partners before assuming the mapping lands; not a fix request, a verification.

### Phase 8 — External Imports (research-heavy)

Each item needs its own design pass before code.
- **BDSMtest meaningful use** — scrape result percentages on paste? Map archetypes (Master, Brat, …) → suggested kink defaults? Display alongside DNA bar? Exploration doc landed in PR #231 (`docs/phase8-external-imports.md`); next step is to pick one of the three sub-questions and prototype.
- **FetLife kinks import** — text paste → tokenize → fuzzy-match against `lib/kinks.ts`. Screenshot OCR deferred.
- **Dupe matching** — `lib/kinkAliases.ts` of common alternative spellings.
- **Identity-vs-dynamic split** — `category: "identity"` flag in `lib/kinks.ts`, surface in a separate ProfileHero strip.

### Phase 10 — Brand micro-polish (deferred indefinitely)

First attempt reverted (PR #219 closed). Rules now in `memory.md:39–48`:
- ≥3s cycle, ≤30% swing.
- Coexist with the shimmer, don't replace it.
- Open question: is the Cormorant wordmark even the right surface for a status-cursor motif? Maybe the underscore belongs in the nav status dot or a footer marker.

Only attempt once Phase 20 has landed and the editorial vocabulary is consistent enough to know what *would* "coexist".

### Phase — Role-aware complementary matching (deferred, post direction-kill)

Per-kink give/receive direction was killed in `629419b`. The complementary matching problem it partially addressed (Dom gives / Sub receives → high score) was never actually solved by it — the selector was Switch-only and opt-in.

The right approach: use `profile.role` at the `profileMatchScore` level to infer give/receive intent for the pair and weight scores accordingly. A Dom + Sub pair scoring "yes + yes" on spanking should resolve role complementarity without either user touching per-kink toggles.

Not scoped yet. Write a design doc before coding. Touches `lib/matching.ts` and possibly a new `lib/roles.ts` helper.

### Phase B — Agreement Archive Data Model (deferred structural)

Migrate `ContractSnapshot` → `ProfileSnapshot` derivatives. Phase 7 unblocked this — storage budget settled at ~15–25 KB per active profile (30 caps × ~500 B–1 KB), inside localStorage limits for a 5–10 profile user. Blocks Phase C (Evolution View at `/history`) and Phase D (history consolidation).

---

## Recommended Execution Order

| Order | Phase | Why this slot |
|------:|-------|---------------|
| 1 | ~~14 — Ledger `#000` sweep~~ ✓ | Shipped `7fcf6d2`. |
| 2 | ~~15 — hard_no glow timing~~ ✓ | Shipped `7fcf6d2`. |
| 3 | ~~18 — ProfileHero copy dedup~~ ✓ | Shipped `42d7083`. |
| 4 | ~~19 — Compare interactions~~ ✓ | Shipped `d2e8f69`. |
| 5 | ~~16 — Sheet consolidation~~ ✓ | Shipped `6266628`. |
| 6 | **17 — Home page extraction** | Next. Phase 16 done — `app/page.tsx` now ready to split. |
| 7 | ~~**22 — Emoji chrome cleanup**~~ ✓ | Shipped. |
| 8 | **20 — Italic Cormorant vocabulary extension** | Identity reinforcement once chrome is consistent. |
| 9 | **21 — Body type floor** | Final sweep after layout work has settled. |
| 10 | **23 — Status colour user-test** | Verification, not change. Run in parallel with later phases. |
| 11 | **B — Agreement Archive** | Largest deferred structural work; unblocks C and D. |
| 12 | **8 — External Imports** | Research first; commit second. |
| 13 | **10 — Brand polish (re-attempt)** | Last. Pure delight. No dependencies. |

Each phase = one commit (or one tight cluster). `npm test` green before commit. No `--no-verify`.

---

## Shipped — historical ledger (full detail preserved in git log)

### v5 (this branch, dev)

| Phase | Title | Landed |
|-------|-------|--------|
| 1 | Critical bugs (viewport, contract save, scene gate, hero scroll-jump, import URL) | 2026-06-18 · `13aed1d` |
| 2 | ProfileHero polish v2 (segmented control, portrait hierarchy, DNA promoted) | 2026-06-19 · `b685327` + `e043dfa` |
| 3a | Hue-separated greens (`--yes` / `--willing`), pulse scoped to yes, static glow | 2026-06-19 · `444e0ae` + `b685327` |
| 3b | KinkRow rewrite, harde-grens dashed-red, status explainer Sheet | 2026-06-19 · `64417e9` |
| 3c | Nieuwsgierig demoted from status → `curious?: boolean` flag | 2026-06-20 · `209f458` + `0e04ddd` |
| 3d | Colour re-expression (`--yes` lime → orange, `--no` slate → indigo, scoring recalibrated) | 2026-06-20 · `b51b59b` |
| 3e | Ledger contrast fix (`--accent` cochineal → vermilion, `--on-accent` bone → near-black) | 2026-06-20 · `35b4244` |
| 3 — last | Ledger PDF palette (hardcoded RGB → Phase 3d colours) | 2026-06-24 · PR #231 |
| 4a | Direction toggle gating, harde grens in pill row, thicker active border, rated-first sort | 2026-06-19 · `31cacc1` |
| 4b | KinkRow UX polish (`grid grid-cols-5`, per-status faint inactive hints, ★ curious flag, direction-after-rating) | 2026-06-20 · `6a07b0d` + `2b5e38d` + `64268ae` |
| 4c | Profile tab toggle → `<SegmentedPill>` | 2026-06-20 · `e4ebc74` |
| 5 | TopNav 3-col layout (hub + focused), 1312 overflow fix | 2026-06-20 · `e4ebc74` |
| 5b | UI primitive library (`SegmentedPill`, `Accordion`, `SwipeRow`, `ContextMenu`, `Sheet`, `TabBar`, `FAB`, `AmbientGlow`) + CLAUDE.md layer rules | 2026-06-19 · `359cd05` |
| 6a | Datachannel `"P"` variant → Import-on-reveal CTA + `lib/sessionImport.ts` | 2026-06-22 · worktree-edging |
| 6b | QR camera paste-from-URL fallback + `lib/parseSharePaste.ts` | 2026-06-23 · worktree-inversion |
| 6c | Avatar sync over datachannel (MIME-gated, 20 kB cap) | 2026-06-23 · worktree-inversion |
| 6d | QR audit verdict (v2 unchanged, ~68% headroom reserved) | 2026-06-23 · no-code |
| 7 | Profile Snapshots (store + `lib/profileSnapshot.ts` + `ProfileTrendsChart`) | 2026-06-22 · worktree-edging |
| 9 | PWA install UX (`PwaInstallGuide` redesign, app-icon hero, profile-tour spotlight restored) | 2026-06-24 · `a416459` + `f047662` |
| 11 | UI audit (compare soft-limit denominator, scene → "Wederzijds", contract icons, hero de-truncation) | 2026-06-22 · PR #216 |
| 12 | Delete `/1312` dev sandbox | 2026-06-22 · worktree-edging |
| 13 | Live session bugs (iOS `<select>` zoom, 25s keepalive + ICE restart) | 2026-06-24 · PR #231 |
| — | Direction selector killed — store v15, all give/receive fields stripped | 2026-06-24 · `629419b` |
| 14+15 | Ledger `--on-accent` sweep (14 files) + Sheet `var(--surface)` + hard_no glow 3.2s/18% | 2026-06-24 · `7fcf6d2` |
| 18 | ProfileHero copy dedup — `formatProfileMetadata` stripped of count prefix, paragraph gated | 2026-06-24 · `42d7083` |
| 19 | /compare interactions — AlignmentBar tap-to-filter + Match count badge | 2026-06-24 · `d2e8f69` |
| 16 | Sheet consolidation — 4 legacy `.sheet-panel` consumers → `<Sheet>`, CSS blocks purged | 2026-06-24 · `6266628` |
| 22 | Emoji → Lucide chrome sweep — settings sheet + onboarding ICON_CIRCLE + FEATURE_ROWS all Lucide | 2026-06-25 |

### v4 (main)

All v4 items (2–5) and polish pass shipped to main in PR #192 on 2026-06-18 11:42 UTC. Six-tier match rubric (`MatchKind`, `KinkMatch`, `kinkMatchScore`, `profileMatchScore`) lives in `lib/matching.ts` with disjoint buckets enforced. Chart denominator parity verified post-merge — no regression.

### Pruning + ops hygiene

- 8 stale worktrees pruned; `worktree-kinbaku` rebased + shipped as PR #231 (2026-06-24).
- `corrections.md` entries 2026-06-20 (Ledger contrast, chart double-count) and 2026-06-22 (Phase 10 cursor) referenced from Phases 14 + 15 above.
