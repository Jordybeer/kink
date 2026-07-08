# The Backlog — one ledger to rule them all (merged 2026-07-08)

`future.md` and `planned-changes.md` are now one file. Active phases up top, the suggestion pool beneath, the shipped ledger at the bottom. **Read this at session start; update it when work lands.**

Mobile-first. No regressions. No Playwright unless a feature genuinely needs it. Group commits per phase; each phase ships independently.

---

## Active queue

### Phase 24 — Consistency polish sweep [NEXT UP — start here]

From the 2026-07-08 design critique of the triage-deck redesign. Pure polish, nothing additive. Three commit-sized passes, in order:

**24a — Tap-to-expand kink descriptions**
- `TriageDeck.tsx:110` clamps descriptions at `line-clamp-2` with zero affordance — the clipped sentence is exactly the safety-relevant content someone needs *before* picking "Heel graag" vs "Grens".
- Make the paragraph itself tappable to un-clamp in place (`aria-expanded`, subtle "…meer" hint when clamped). Keep the (i) InfoSheet as the discoverable fallback (it adds the level badge).
- Same clamp/expand parity in `KinkEditSheet` so both surfaces agree about the same text.

**24b — One status vocabulary, one source**
- `STATUS_LABEL`/`STATUS_VAR`-style maps are copy-pasted **eight** ways (verified 2026-07-08 via `grep -rl "Heel graag"`): `StatusOptionRows`, `KinkListRow`, `StatusPicker`, `app/profile/[id]/page.tsx`, `app/compare/page.tsx`, `app/session/page.tsx`, `app/contract/page.tsx` (`STATUS_NL`), `lib/profileSnapshot.ts` — which is how `hard_no` drifted between "Grens" (app) and "Harde grens" (contract PDF). Extract to `lib/statusLabels.ts`, kill the drift everywhere.

**24c — PDF palette unification**
- Two PDFs, two different purples, neither the brand: contract title `#6D28D9`, scene title `#3F1F7A`, app accent `#D946AF`. Two body inks (`#1E1B4B` vs `#241A32`), two muted grays (`#6B7280` vs `#4B5563`).
- **Semantic colour bug**: contract prints "Zachte grenzen" in green `#10B981` — the app's `--willing` ("Ja, geen probleem"). A *limit* wearing consent-green is the mixed signal this app exists to prevent.
- One shared PDF palette constant derived from the app tokens (jsPDF can't read CSS vars — hardcode, but from a single file). Rename the contract generator's `dark` variable that actually holds white.

**24d — Front-page harmonisation (small)**
- Home form chips (`px-3 py-1`, ~26px) → `min-h-9` to match KinkEditSheet's chips.
- "Nieuw profiel" (16px icon, `--text` label) vs "Scan QR" (18px icon, `--text2` label) — same rank, same treatment.
- Arrow-motif rule: arrows = forward navigation only ("Sla over →"), never on commit actions. Drop the duplicate "Nieuw profiel" h2 inside the form the toggle just opened.
- InfoSheet type hierarchy inverted vs deck/edit sheet (bold sans name + italic serif category vs the deck's serif italic name + plain category) — unify on the deck's pattern.
- InfoSheet level badges borrow status colours (Niveau 1 wears `--yes` orange) — levels aren't verdicts; give them a neutral ramp.

**24e — Safety tags surfaced in Overzicht (promoted from the pool)**
- The read-only Overzicht renders nieuwsgierig + status pill + optional comment, but **never `entry.tags`** — "vraag eerst" and "alleen privé" are invisible to exactly the person (a partner viewing a shared profile) who most needs them. Not a PR #243 regression (verified against `c940e04^` — the old Overzicht didn't show them either), but a long-standing safety gap now cheap to close: a muted tag row on Overzicht cards that have active tags.

### Phase 23 — Status colour user-test [DEFER, verification]

Phase 3d deliberately mapped `--yes → orange` (desire/heat) and `--willing → green`, inverting the universal "green = enthusiastic / amber = caution" expectation. Worth a quiet user-test against two real partners before assuming the mapping lands; not a fix request, a verification. (Same colour-semantics territory as the 24c green-soft-limits bug — run them together mentally.)

### Phase 8 — External Imports (research-heavy)

Each item needs its own design pass before code.
- **BDSMtest meaningful use** — paste-parsing shipped (`lib/parseBdsmtest.ts`, `BdsmtestScores`). Remaining: map archetypes (Master, Brat, …) → suggested kink defaults? Exploration doc in `docs/phase8-external-imports.md`.
- **FetLife kinks import** — text paste → tokenize → fuzzy-match against `lib/kinks.ts`. Screenshot OCR deferred.
- **Dupe matching** — `lib/kinkAliases.ts` of common alternative spellings.
- **Identity-vs-dynamic split** — `category: "identity"` flag in `lib/kinks.ts`, surface in a separate ProfileHero strip.

### Phase — Role-aware complementary matching (deferred, post direction-kill)

Per-kink give/receive direction was killed in `629419b`. The right approach: use `profile.role` at the `profileMatchScore` level to infer give/receive intent for the pair and weight scores accordingly. A Dom + Sub pair scoring "yes + yes" on spanking should resolve role complementarity without either user touching per-kink toggles. **Write a design doc before coding.** Touches `lib/matching.ts` and possibly `lib/roles.ts`.

### Phase — Pair-scoped kink overlay (deferred, design doc first)

"Depends on the dynamic" is real: a kink can be "ja" with this partner and "grens" in general. Today that need routes through subprofiles (a second role under the same name), "Voor hen", tags ("scène specifiek", "vraag eerst"), and the contract as the pair's negotiated truth. **Never** solve it by mutating a partner's imported profile — `lockedAt` guards their stated consent, and compare/contract derive from those entries.

If subprofiles prove too coarse in practice, the honest solution is a pair-scoped overlay ("in deze dynamiek: ja") stored alongside the comparison — new data model touching share encoding, `lib/matching.ts`, and contracts. Phase B-adjacent. Write a design doc before any code, and only after the polish sprint has settled and real use shows subprofiles falling short.

### Phase B — Agreement Archive Data Model (deferred structural)

Migrate `ContractSnapshot` → `ProfileSnapshot` derivatives. Storage budget settled at ~15–25 KB per active profile, inside localStorage limits for a 5–10 profile user. Blocks Phase C (Evolution View at `/history`) and Phase D (history consolidation).

### Phase 10 — Brand micro-polish (deferred indefinitely)

First attempt reverted (PR #219 closed). Rules in `memory.md` and `corrections.md`: ≥3s cycle, ≤30% swing, coexist with the shimmer, match the surface's vocabulary. Only attempt now that Phase 20's editorial vocabulary has landed — and only when feeling brave.

---

## Suggestion pool (formerly future.md)

Unscoped ideas, grouped by theme. Promote to a phase before working on any of them. Pruned + verified against live code 2026-07-08: DNA-bar items dropped (the bar was executed in June), and these were confirmed already shipped — TopNav pill tap feedback (`MotionLink` + `TAP_SPRING`), status active glow (`.status-*` classes + glow keyframes), the 40px profile pencil (gone), vibe badge items (badge no longer exists), reduced-motion scroll guard (blur is static now; `useMotionSafe` gates motion).

### Navigation polish (TopNav)
- **Bottom-anchored variant for reach**: same pills, floating bottom-right on phones — the biggest open tradeoff from killing the bottom bar.
- **Hide-on-scroll-down / reveal-on-scroll-up**: auto-tuck the header on long kink lists.
- **Sliding active indicator**: framer-motion `layoutId` glide between tabs instead of snapping.
- **Personal profile pill**: swap the 👤 glyph for the pinned profile's avatar thumbnail.
- **Notch / standalone safe-area check**: verify `env(safe-area-inset-top)` on notched iPhones in installed PWA mode.

### Quick wins (CSS/attr only, parallelisable)
- **Pill scroll hint**: right-edge fade gradient on horizontal pill rows.
- **Screen reader live region**: the triage deck already wraps in `aria-live="polite"`; verify status changes made via `KinkEditSheet` are also announced.

### UX / Interaction
- **Profile skeleton**: shimmer skeleton for overview cards while Zustand hydrates.
- **Category search result highlight**: highlight matched text.
- **Kink count badge on category header**: rated/total on `CategorySection` headers (the old scrollspy nav this targeted no longer exists).
- **Swipe-to-rate gesture**: ⚠️ written for the dead KinkRow — `KinkListRow`'s whole surface now taps open the edit sheet, so a swipe gesture needs a fresh design against the triage deck before any code.
- **Edit own status from compare row** (2026-07-08): tap your *own* half of a compare row → open the existing `KinkEditSheet`, only when your profile is `origin: "own"`. Partner rows stay immutable — their imported profile is their stated consent (`lockedAt` is the consent model, not a limitation). Closes the leave-compare-edit-return loop with zero new data model.
- **Overview filter / sort**: filter read-only overview by status, or sort alphabetically.
- **Home compare CTA pair choice**: now pinned-profile-aware with a hint line (better than the old `profiles[0]`/`[1]`); remaining idea — last-viewed pair or explicit picker when >2 profiles.
- **"Besproken" toggle is session-only**: persists nothing, hints nothing — persist it or mark "(tijdelijk)".

### Visual / Design
- **Light mode**: consider auto light theme via `@media (prefers-color-scheme: light)`.
- **Avatar upload drag-and-drop**: drag an image onto the avatar button.
- **Overview card tap-to-edit**: tap a read-only Overzicht card to open `KinkEditSheet` directly (own profiles only — the accordion flow this originally targeted is gone).

### Performance / Technical
- **Playwright CI integration**: run the visual audit in CI.
- **Bundle size audit**: `@next/bundle-analyzer` pass.
- **Custom kink persistence race**: rapid add-then-navigate may drop the write in the persist debounce.
- **Offline support**: PWA manifest exists but no service-worker caching strategy.

### Accessibility
- **Keyboard navigation in accordions**: verify focus can't land inside closed CategorySections.
- **Color-only distinction**: status colours need an icon/pattern channel for colour-vision deficiency (the dashed hard_no border is a start; the other four statuses have nothing).
- **`<fieldset>/<legend>` semantics**: experience-level / relatiestatus groups use `<p>` + `role="group"` — swap for the standard pairing.

### Phase 3b follow-ups (nieuwsgierig)
- **Nieuwsgierig pair distinction on compare page**: `nieuwsgierig+nieuwsgierig` and `maybe+yes` land in the same bucket with identical styling — a subtle cyan dot could tell them apart.
- ~~Safety tags visible by default on partner profiles~~ → promoted to **Phase 24e**.
- **Curious flag in contract PDF**: the contract PDF renders no nieuwsgierig/curious signal at all (the old "swatch" item predates 3c's demotion from status → flag). Decide during 24c whether it belongs on the printed page.
- **Status explainer i18n extraction**: hardcoded Dutch `STATUS_EXPLAINER` — natural extraction point if multilingual ever lands.

### Features
- **Export to PDF on mobile**: test jsPDF quirks on iOS Safari.
- **Compare filter "only mutual yes"**: quick filter for enthusiastic matches only.
- **Kink notes in compare view**: collapsed view of each person's comment on matched kinks (partially shipped via '+ Notitie' — verify remaining gap).
- **Contract versioning**: multiple contract snapshots per pair with timestamps (overlaps Phase B).
- **Profile import validation**: schema-validate imported JSON to prevent crashes from malformed imports.

---

## Shipped — historical ledger (full detail preserved in git log)

### v5 (dev)

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
| 4b | KinkRow UX polish (grid, per-status faint hints, ★ curious flag, direction-after-rating) | 2026-06-20 · `6a07b0d` + `2b5e38d` + `64268ae` |
| 4c | Profile tab toggle → `<SegmentedPill>` | 2026-06-20 · `e4ebc74` |
| 5 | TopNav 3-col layout (hub + focused), 1312 overflow fix | 2026-06-20 · `e4ebc74` |
| 5b | UI primitive library (8 primitives) + CLAUDE.md layer rules | 2026-06-19 · `359cd05` |
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
| 18 | ProfileHero copy dedup | 2026-06-24 · `42d7083` |
| 19 | /compare interactions — AlignmentBar tap-to-filter + Match count badge | 2026-06-24 · `d2e8f69` |
| 16 | Sheet consolidation — 4 legacy `.sheet-panel` consumers → `<Sheet>` | 2026-06-24 · `6266628` |
| 17 | Home page extraction — `app/page.tsx` 1588 → 568 lines; 5 components split out | 2026-06-25 · `d453e46` · PR #234 |
| 22 | Emoji → Lucide chrome sweep — settings sheet + onboarding all Lucide | 2026-06-25 |
| — | Onboarding polish + motion/type pass | 2026-06-25 |
| 20 | Italic Cormorant vocabulary extension — section headers, CTAs, empty states | 2026-06-29/30 |
| 21 | Body type floor — sub-12px swept from body/metadata copy, text-xs floor | 2026-06-29/30 |
| — | bdsmtest.org integration — `parseBdsmtest`, `BdsmtestScores`, share v2 `bs` key; DNA bar killed | 2026-06-29/30 · `179f641` |
| — | Triage deck — KinkRow decomposed into `TriageDeck`/`KinkEditSheet`/`KinkListRow`/`StatusOptionRows`, TopNav 375px corset fix, compare '+ Notitie' collapse, desktop widening | 2026-07-08 · PR #243 · `c940e04` |

### v4 (main)

All v4 items (2–5) and polish pass shipped to main in PR #192 on 2026-06-18. Six-tier match rubric lives in `lib/matching.ts` with disjoint buckets enforced.

### Pruning + ops hygiene

- 8 stale worktrees pruned; `worktree-kinbaku` rebased + shipped as PR #231 (2026-06-24).
- `corrections.md` entries 2026-06-20 (Ledger contrast, chart double-count) and 2026-06-22 (Phase 10 cursor) referenced from Phases 14 + 15.
- 2026-07-08: webpack WasmHash build crash on Node v26.2.0 = corrupted `.next/cache/webpack`; fix is `rm -rf .next/cache/webpack`.
- 2026-07-08: `future.md` merged into this file and deleted.
