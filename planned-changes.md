# The Backlog — one ledger to rule them all (merged 2026-07-08)

`future.md` and `planned-changes.md` are now one file. Active phases up top, the suggestion pool beneath, the shipped ledger at the bottom. **Read this at session start; update it when work lands.**

Mobile-first. No regressions. No Playwright unless a feature genuinely needs it. Group commits per phase; each phase ships independently.

---

## Active queue

**Owner-set priority order (2026-07-09): 31, then resume the rest of this queue while implementing suggestion-pool items alongside. (Phases 28–30 shipped — see ledger.)**

### PR #299 — Dynamic questionnaire v2 [SHIPPED 2026-08-09]

Only Dynamic replaces fixed budgets for newly created profiles; Quick, Balanced,
and Full retain their existing depth and question limits. Deep Dive remains the
explicit route to every catalog item. Coverage is a fixed, monotonic set of
explicit questions; local expansion is stateless and sparse: `yes`/`willing`
may open one pinned canonical follow-up, `no` (Voor hen) and `maybe` are neutral,
and only two or more `hard_no` answers whose explicit follow-up edges converge
on the same target may delay that target. Broad clusters exist only for
diversity; topic metadata only spaces the conversation.
No metadata means zero propagation. Existing v1 quick/balanced/full setups stay
editable and unmigrated until the user explicitly switches flow. Changing an
existing canonical source → target mapping is a semantic data migration, not a
metadata tidy-up.

### Catalogus v2 + funnel completion [ACTIVE — contract audited 2026-08-09]

Plan of record: `docs/catalog-v2-contract.md`; runtime invariants:
`engine.md`.

The audit covered the historical 266 IDs and found why the funnel felt abrupt:
Dynamic had 20 fixed anchors and Discover was a one-per-broad-cluster
micro-wave. The active stacked work now has 291 catalog IDs, a 44-anchor
Dynamic plan spanning all 19 user-facing categories, continuous user-exitable
Discover, exhaustive Deep Dive, and an ephemeral `Meer uit deze categorie`
intent.

Work is split into independently reviewable slices:

1. thin catalog fields (`aliases`, optional `safetyNote`), explicit category
   constants, alias search and positional-QR order decoupling;
2. catalog corrections plus high-confidence additions with zero propagation by
   default;
3. continuous Discover, local category intent, honest skip semantics, inline
   `Lees meer`, and new-profile card focus;
4. coverage/topic/related audit, followed only then by a separately versioned
   canonical allowlist.

The catalog-foundation slice is ready as draft PR #302 on
`feature/catalog-foundation-v2`: stable category keys are separated from their
display copy, Dutch aliases join full-catalog search, and the retired positional
v2 QR decoder is pinned to its own immutable historical ID order.

The stacked content slice is ready as draft PR #303 on `feature/catalog-content-v2`. It
applies all 155 audited change rows except the explicit pegging gate, retires
five composite/duplicate questions without copying answers, and adds the 30
reviewed Release-A questions with zero propagation metadata. “Auto
masturbation” remains absent until its meaning is confirmed.

No catalog generations or permanent v1/v2 dual engine: there is no public
legacy population to justify that complexity. The pre-launch migration maps v1
Full to Deep Dive and Quick/Balanced/no-setup to Dynamic while preserving
interests and entries. Preserve unchanged kink IDs and answers; semantic splits
start unanswered and never copy one old answer into multiple new meanings.

The questionnaire/UX slice is ready as draft PR #304 on `feature/questionnaire-ux-v2`.
It replaces the micro-wave with continuous Discover, adds category-local
exploration and honest `Later`, expands descriptions inline, fixes new-profile
card focus, and ships store v18 normalization so the runtime has no permanent
v1 budget branch.

The final metadata slice shipped in PR #305 and its canonical allowlist has now advanced to
mapping version 3 for the explicit Release B semantic migration. The Golden Shower give→receive
inference is removed and retired anal source IDs are replaced by explicit same-side directional
mappings. “Auto masturbation” remains explicitly out of scope.

The original Pegging product gate and Release B role-neutral catalog audit are shipped. Release C proves role-affinity on a deliberately small impact/bondage vertical slice: explicit pairs remain fully independent, while only compact Dynamic coverage may choose the perspective-aligned sibling. The opposite side stays unknown and reachable. The audited Impact extension splits caning, crop, paddling, whipping, belt, face slapping, punching/thudding and trampling. The subsequent high-confidence restraint slice splits spreader bar, hogtie, mummification, straitjacket, tape gag and hood. None gains progression or canonical inference. Chastity, collar/leash, suspension and remaining confinement/gag candidates stay item-by-item work, not a bulk split.

Question progression is now a separate explicit ordering contract. High-confidence parent → child doors make broad/light cards precede true deepenings when both are queued (for example Golden Shower ontvangen → urine in mond/slikken), without turning catalog `level` into a universal ladder. Progression never copies an answer, never suppresses a child after a neutral/negative answer in exhaustive flows, and never converts related siblings such as impact instruments, gag types or anal acts into inferred escalation. Source of truth: `docs/questionnaire-progression-gates.md`.

### Phase 31 — Main ↔ dev audit [SHIPPED 2026-07-11 — verdict in docs/phase31-main-dev-audit.md]

Verdict: v5 improves or holds every surface; zero code regressions. Two rot
findings fixed in-session (vacuous DNA e2e spec rewritten; `reuseExistingServer`
guarded behind `!CI` after a stale server green-lit a run that never exercised
dev). Upgrade path v4→v5 is byte-compatible (same persist v15, additive-only
store diff). Verification of record: 179/179 e2e on a fresh server + 228 unit +
clean build. Remaining human half of the gate: owner device walk-through and one
iOS Safari PDF export before the dev → main promotion PR.

### Phase 23 — Status colour user-test [DEFER, verification]

Phase 3d deliberately mapped `--yes → orange` (desire/heat) and `--willing → green`, inverting the universal "green = enthusiastic / amber = caution" expectation. Worth a quiet user-test against two real partners before assuming the mapping lands; not a fix request, a verification. (Same colour-semantics territory as the 24c green-soft-limits bug — run them together mentally.)

### Phase 8 — External Imports (research-heavy)

Each item needs its own design pass before code.
- **BDSMtest meaningful use** — paste-parsing shipped (`lib/parseBdsmtest.ts`, `BdsmtestScores`). Remaining: map archetypes (Master, Brat, …) → suggested kink defaults? Exploration doc in `docs/phase8-external-imports.md`.
- **FetLife kinks import** — text paste → tokenize → fuzzy-match against `lib/kinks.ts`. Screenshot OCR deferred.
- **Dupe matching** — `lib/kinkAliases.ts` of common alternative spellings.
- **Identity-vs-dynamic split** — `category: "identity"` flag in `lib/kinks.ts`, surface in a separate ProfileHero strip.

### Phase — Explicit complementary matching [FOUNDATION SHIPPED; CATALOG AUDIT ONGOING]

The original deferred gate is superseded. Pegging and the reviewed Release B/C
concepts now use explicit give/receive IDs plus a central complement relation at
matching time. Dominant/Submissive perspective still never supplies an answer:
Release C role affinity may only choose the compact Dynamic coverage sibling;
the opposite side remains unknown and independently answerable. The audited
Impact instrument extension and the high-confidence restraint slice (spreader
bar, hogtie, mummification, straitjacket, tape gag and hood) follow that same
contract. Remaining directional candidates stay item-by-item editorial work and
must not be bulk split or inferred from `profile.role`.

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

### Post-v6 re-rating leftovers (added 2026-07-12 late night — the ~8.7 → 9+ shortlist)
In order of expected win, per the evening's re-rating against the July 11 audit:
1. ~~**Re-enable CI**~~ → **SHIPPED** — `safe-word check` draait weer; PR #296 promoveerde core, browser/device én productie-PWA naar harde launch-gates.
2. **Motion consolidation** — 15 inline `transition:` styles remain (Onboarding ×6, AppLock ×3, compare ×2, 4 strays); fold them into the shared motion vocabulary.
3. **Compare-page extraction** — compare (937), session (890) and scene (828) are now the fattest pages; same copy-move `lib/` treatment that slimmed Contract 1372→754 and Profile 1133→784.
4. **Last 3 bare radii** — the design-system sweep left three bare `rounded` classes standing.
5. **Human device checklist** — the VoiceOver / reduced-motion on-device checks from the Nine-Tails checklist; no code, just hands and a phone.

### Nine-Tails afterglow (added 2026-07-12, from the sweep itself)
- **e2e fixture rot guard**: `buildStore` still seeds persist `version: 8` — the migration wipes any seeded `scenes` (pre-v10 payloads get `scenes = []`). Bit the Phase 9 proof shots. Bump the fixture to v15 and teach `buildStore` extras to carry `scenes`/`contracts` so future specs don't rediscover this.
- **TRAFFIC map deduped**: the green/amber/red label+colour map lives twice (`app/scenes/page.tsx` and `app/scenes/[id]/page.tsx`). One home in `lib/` next to the status vocabulary.
- **ProfileSelect accent prop**: the old timeline selects wore their line colours on the border; the house dropdown lost that. An optional `accent` prop would restore the A/B colour echo without forking the component.
- ~~**CI e2e graduation**~~ → **SHIPPED in PR #296**: browser/device rehearsal en productie-PWA zijn enforcing; geen `continue-on-error` meer op de launch-gates.
- **Rare-state e2e for the unswept two**: session "connected" and AppLock never appear in screenshot sweeps (need a live peer / PIN hash). A mocked-signaling fixture would close the last visual blind spots.

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
- **Overzicht notes un-truncate** (2026-07-09): partner comments on Overzicht cards are single-line `truncate` with no way to read the rest — swap for the `ClampText` primitive from 24a (tap to expand, same affordance as the deck).
- **Safety tags ride along** (2026-07-09, 24e follow-through): `entry.tags` now show in Overzicht but are still invisible on compare rows and in both the profile and contract PDFs — the contract is the negotiated document, "vraag eerst" arguably belongs on the printed page most of all. Pairs with the curious-flag-in-contract-PDF item below.
- **STATUS_EXPLAINER into lib/statusLabels** (2026-07-09): the long-form verdict explainers stayed local to the profile page while `STATUS_HINT` moved to the lib in 24b — one voice, one file; also hands the i18n-extraction item its natural home. (Verified same day: custom kinks *do* render in read-only Overzicht under "Meer" — no gap there.)
- **Overview filter / sort**: filter read-only overview by status, or sort alphabetically.
- **Home compare CTA pair choice**: now pinned-profile-aware with a hint line (better than the old `profiles[0]`/`[1]`); remaining idea — last-viewed pair or explicit picker when >2 profiles.
- **"Besproken" toggle is session-only**: persists nothing, hints nothing — persist it or mark "(tijdelijk)".

### Visual / Design
- **Light mode**: consider auto light theme via `@media (prefers-color-scheme: light)`.
- **Avatar upload drag-and-drop**: drag an image onto the avatar button.
- **Overview card tap-to-edit**: tap a read-only Overzicht card to open `KinkEditSheet` directly (own profiles only — the accordion flow this originally targeted is gone).

### Performance / Technical
- ~~**Playwright CI integration**~~ → **SHIPPED in PR #296**: 222-test browserrehearsal + 5 launch-device smokes; 25 screenshots worden als CI-artifact bewaard.
- **Bundle size audit**: `@next/bundle-analyzer` pass.
- **Custom kink persistence race**: rapid add-then-navigate may drop the write in the persist debounce.
- ~~**Offline support**: PWA manifest exists but no service-worker caching strategy.~~ → shipped via PR #263 and completed for newly created local profile/scene routes in PR #266 (see ledger).

### Accessibility
- **Keyboard navigation in accordions**: verify focus can't land inside closed CategorySections.
- **Color-only distinction**: status colours need an icon/pattern channel for colour-vision deficiency (the dashed hard_no border is a start; the other four statuses have nothing).
- **`<fieldset>/<legend>` semantics**: experience-level / relatiestatus groups use `<p>` + `role="group"` — swap for the standard pairing.

### Phase 3b follow-ups (nieuwsgierig)
- **Nieuwsgierig pair distinction on compare page**: `nieuwsgierig+nieuwsgierig` and `maybe+yes` land in the same bucket with identical styling — a subtle cyan dot could tell them apart.
- ~~Safety tags visible by default on partner profiles~~ → promoted to **Phase 24e**.
- **Curious flag in contract PDF**: the contract PDF renders no nieuwsgierig/curious signal at all (the old "swatch" item predates 3c's demotion from status → flag). Decide during 24c whether it belongs on the printed page.
- **Status explainer i18n extraction**: hardcoded Dutch `STATUS_EXPLAINER` — natural extraction point if multilingual ever lands.

### PDF polish
- ~~All five whims of 2026-07-11~~ → shipped on `redesign/pdf-polish` (see ledger): column-head reprint on page break, status-tinted verdicts, page numbers, metadata, party-coloured comment bullets.

### Features
- **Desire score in contract PDF** (2026-07-11): the on-screen contract cards show `verlangen x/5` per party; the PDF table now carries comments but still drops desire — same bullet-under-the-name pattern would fit.
- **Export to PDF on mobile**: test jsPDF quirks on iOS Safari.
- **Compare filter "only mutual yes"**: quick filter for enthusiastic matches only.
- **Kink notes in compare view**: collapsed view of each person's comment on matched kinks (partially shipped via '+ Notitie' — verify remaining gap).
- **Contract versioning**: multiple contract snapshots per pair with timestamps (overlaps Phase B).
- **Profile import validation**: schema-validate imported JSON to prevent crashes from malformed imports.

---

## Shipped — historical ledger (full detail preserved in git log)

### Local-first offline rooms (dev, 2026-07-28)

| — | What landed | Commit |
|---|-------------|--------|
| — | New profiles and scenes created after the network cut now open through fixed precacheable shells; legacy `/profile/<id>` and `/scenes/<id>` doors fall back in the service worker; exact-ID persistence wait and cold-route guards cover the iOS failures found on device | `59890b1` / PR #266 |

### Post-v6 polish night (dev, 2026-07-12 evening)

| — | What landed | Commit |
|---|-------------|--------|
| — | Uniform verdict pills on profile overview — `min-w-[5.5rem] text-center` so Nieuwsgierig stops jumping | `7a6261c` |
| — | `.serif-safe` utility — italic serif clip protection on all four overhang sides (left swash included), replacing the ad-hoc right/bottom-only pads; TopNav left-aligned in both hub and focused mode (title next to back chevron, actions pinned right, PWA `ml-auto` guard) | `656bc84` |
| — | Role drawer unstuck — `flex-1 min-h-0 overscroll-contain` lets the 24-role list actually scroll; verified with real touch swipes, bottom roles reachable | `35e8059` |
| — | "Verken grenzen. Samen." restored as the permanent hero vow; house-state line whispers beneath | `a161ae4` |
| — | Catalogue grows to 242 — 39 new temptations across ten categories (rimmen, primal, free use, keyholding, predicament bondage, glory hole, figging, deepthroat, trio…), each with house-style Dutch description + safety note; category listings now climb by intensity (stable level sort in both getters, hand order preserved within a level) | `e6d4d2f` |
| — | Two new houses: **Straf & Correctie** (15 entries — correctie van afgesproken gedrag, nóóit straffen om het straffen; kader-entry maakt het expliciet) and **Rituelen & Training** (16 entries — van begroetingsritueel tot hoog protocol); 7 umbrella-entries verhuisd uit Power Exchange met ids intact, dus opgeslagen ratings verhuizen mee | *(this commit)* |

⚠ Found during the evening's audit: the `safe-word check` workflow is **manually disabled** on GitHub since ~2026-06-21 — no CI ran on any PR or push since, including the v6 release. Re-enable via repo → Actions → safe-word check → Enable workflow.

### Operation Nine-Tails — audit-to-≥9 oneshot (worktree-needleplay, 2026-07-12)

One branch, eleven phases, every audit category flogged toward ≥9. Plan of record: `~/.claude/plans/make-a-giant-plan-parsed-barto.md`.

| Phase | What landed | Commit |
|-------|-------------|--------|
| 1 | Guards first — token-contrast test, 375px corset in ui-audit, advisory CI e2e job | `f9dd462` |
| 2 | Import hardening — v1 shares, QR payloads, backups & bdsmtest pastes all sanitized | `c418ea0` |
| 3 | Auto-snapshots — Verloop feeds itself (24h + deep-equal skip, no schema change) | `f1d1569` |
| 4 | Token sweep — radius tiers, hexes → tokens, one canonical font-display spelling + guard test | `cd4b2cc` |
| 5 | Motion consolidation — ProfileSelect extracted, inline transitions → lib/motion | `080e63a` |
| 6 | A11y — status glyphs (colour + icon + border), fieldset/legend, KinkEditSheet aria-live | `2aa798f` |
| 7 | Contract extraction — lib/contractPdf + components/contract/, page 1372 → 754 | `3a9b978` |
| 8 | Profile extraction — lib/profilePdf + StatusExplainerSheet + ProfileEditSheet, page 1133 → 784; Checkpoint 1 full e2e + offline green | `b6d61ca` + `e88b7a8` |
| 9 | Scenes + Verloop identity — mastheads, Phosphor over emoji, ProfileSelect in timeline, inviting empty states | `ab65adb` |
| 10 | Typography promotion — 13 genuine reading-copy sites text-xs → text-sm | `3e6b959` |
| 11 | 375px sweep of rare states (scene detail ×3, aftercare, session, contract expanded, onboarding) — zero crushes found; CI e2e stays advisory (never ran pre-push); Checkpoint 2 full e2e + offline | ledger commit |

Human half of the gate (in the PR body): iOS Safari PDF, device walkthrough, VoiceOver spot-check, reduced-motion check, legacy-import restore, CI e2e enforce/advisory decision.

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
| 24a | Tap-to-expand descriptions — `ClampText` primitive, deck + `KinkEditSheet` parity, "…meer" affordance | 2026-07-09 · `fa34e6b` |
| 24b | One status vocabulary — `lib/statusLabels.ts` (labels/hints/order/vars), eight copies killed, `hard_no` = "Harde grens" everywhere, dead `StatusPicker` deleted, drift-guard test | 2026-07-09 · `cebec8d` |
| 24c | PDF palette — `lib/pdfPalette.ts` derived from app tokens, AA-on-paper contrast test, zacht→maybe-blue + bespreken→conflict-amber semantic fix, `dark`→`paper` rename | 2026-07-09 · `1a35785` |
| 24d | Front-page harmonisation — chips `min-h-9` (home + ProfileList), CTA parity, submit arrow dropped, duplicate form h2 gated, InfoSheet deck hierarchy + neutral level-dot ramp | 2026-07-09 · `2a256f5` |
| 24e | Safety tags in Overzicht — muted tag row on tagged cards, not gated by the notes toggle | 2026-07-09 · `79fa74f` |
| 25 | Header nav consistency — 40px circles for bare icon buttons, pill vocabulary unified, icons 15/18, focused title in Cormorant italic | 2026-07-09 · `24f95b4` |
| 26a | Home salon reorder — profiles + compare CTA first, create/scan demoted to quiet footer row, state-aware hero tagline, first-run untouched | 2026-07-09 · `e72c100` |
| 26b | Pinned-profile portrait card — 64px avatar, Cormorant italic name, rated count, accent wash | 2026-07-09 · `d39861e` |
| 26c | Back wall hushed — contract/scène/scènes/live demoted from cards to slim quiet rows, all destinations + aria intact | 2026-07-09 · `a761d3e` |
| 27a | Compare badges wear status colours (dashed grens) — person stays in column/headers; verified not-a-regression, person-pink dated to pre-June-16 redesign | 2026-07-09 · `7face92` |
| 27b | Home card typography — serif names on all cards, on-accent serif monogram avatars, pencil centred | 2026-07-09 · `6602e5f` |
| 28 | Typography consistency + mobile readability sweep — sub-12px reading copy bumped to `text-xs`, off-scale 13/15/17px snapped to the Tailwind scale, inline serif CTA sizes classed, exemptions grandfathered (pills/mono/tab labels), `docs/type-system.md` is now the source of truth | 2026-07-09 · `08fb28d` |
| 29 | Nieuwsgierig star affordance — deck's naked ★ icon replaced with the KinkEditSheet's labeled "Nieuwsgierig" chip (one vocabulary), status explainer teaches the star ("een ster is geen ja") | 2026-07-10 |
| 30 | Onboarding + tour truth pass — dead status vocabulary ("nee") replaced with the living one, tour speaks "tik"-voice and rows-not-pills, fifth tour step spotlights the curious chip, `new-user.spec.ts` rewritten to walk the real flow (PIN step + non-bypassable age gate; was 4/5 failing on dev) | 2026-07-10 |
| 30b | Onboarding dramaturgy — age gate moved to the door (step 1), privacy+backup merged into one three-card trust step, feature brochure cut (salon + tour teach better), consent vow in serif ("Safewords zijn heilig"), finale hands off via "Maak je eerste profiel"; CSS keyframes → house framer-motion springs with stagger, reduced-motion safe | 2026-07-10 |
| 30c | Purple exorcism + theme soft-removal — last three purple-400 fossils (`#c084fc` in FAB glow, Accordion chip, profile-PDF chrome) replaced with accent tokens / new `PDF_DARK_PAGE` palette (+ drift-guard test); theme pickers removed from onboarding (6 steps now) and settings, store `theme` + ThemeProvider untouched so existing choices keep applying | 2026-07-10 |
| — | PDF signature block unglued — contract's name+date were crushed 4mm/4mm/4mm against the signature box and its own divider rule; respaced to 6/6/5mm with named `sigLineY`/`sigNameY`/`sigDateY`, ink inset widened 1mm → 2.5mm; scene ledger's first item also unglued from the safeword strip (3mm → 5mm clearance). Verified by rendering both generators standalone via jsPDF+pdftoppm and eyeballing the raster | 2026-07-10 |
| — | Contract speaks the choice ladder — sections now descend Gedeelde verlangens → Zachte grenzen → Harde grenzen → Bespreking nodig (te bespreken last), rows within every section sort keenest-pair-first via `statusPairRank` in `lib/statusLabels.ts` (+ unit test; ties break alphabetically, on-screen hard-limit chips march in the same order), and the PDF table finally whispers what the screen already showed: each party's comment as a muted italic bullet under its kink name, pagination-aware | 2026-07-11 · `4d135d5` |
| — | Columns learn their place, comments learn to breathe — kink names now wrap 8mm shy of the party columns (was 4mm), comment bullets stay inside the first column instead of sprawling under both verdicts, each party's comment prints as its own block with 1.4mm of air between the voices, rows +0.5mm padding; pagination accounts for every gap, verified by raster | 2026-07-11 · `6e0b903` |
| — | Contract section rules unglued — the coloured underline beneath each of the four section headers (Gedeelde verlangens, Harde grenzen, Zachte grenzen, Bespreking nodig) sat only 4mm above its content, the one rule in the doc tighter than its 6–10mm neighbours; bumped to 6mm to match | 2026-07-10 |
| — | Redesign stack (branches `redesign/foundation` → `readability` → `controls` → `pdf-voice` → `geometry` → `pdf-polish`, unmerged) — Fraunces + Instrument Sans typography, Lucide → Phosphor (43 icons), 12px readability floor, house-caret selects, PDF house fonts (lazy ~37KB TTF subsets via `lib/pdfFonts`), btn-accent's off-scale 10px radius snapped to the 12px CTA tier, ProfileHero focus rings gone circular | 2026-07-11 · `bccf4da`…`b0fb6ad` |
| — | Five PDF whims granted — status-tinted verdicts in the contract table, party-coloured comment bullets (new `PDF_PARTY_ON_PAPER`, AA-leashed), Val/Noor column heads reprint after mid-table page breaks, "pagina 2 van 4" footers on multi-pagers, `setProperties` metadata on all three exports; proven with a 39-kink 4-page fat contract signed through the real app | 2026-07-11 · `4572efe` |
| — | Fraunces stands up straight — kink titles in the triage deck, edit sheet and category headers keep the serif voice, lose the italic lean | 2026-07-11 · `c8776e6` |
| — | The lock no longer bites its own keyholder — PIN set mid-onboarding no longer summons the lock screen and amnesia-resets the wizard; onboarding raises `app_unlocked` before the store write, the lock effect reads sessionStorage live (stale mount-time ref executed), regression e2e proven red-then-green, corrections.md entry | 2026-07-11 · `03c1ee2` |
| 31 | Main ↔ dev audit — page-by-page 375px shootout of both production builds, verdict in `docs/phase31-main-dev-audit.md`: v5 improves or holds all eight surfaces, zero code regressions, v4→v5 upgrade byte-compatible; exposed and fixed the vacuous DNA e2e spec (ghost v8 kink ids) and the stale-server mirage (`reuseExistingServer` now `!CI`); verification of record 179/179 e2e fresh-server + 228 unit + clean build | 2026-07-11 |

### v4 (main)

All v4 items (2–5) and polish pass shipped to main in PR #192 on 2026-06-18. Six-tier match rubric lives in `lib/matching.ts` with disjoint buckets enforced.

### Pruning + ops hygiene

- 8 stale worktrees pruned; `worktree-kinbaku` rebased + shipped as PR #231 (2026-06-24).
- `corrections.md` entries 2026-06-20 (Ledger contrast, chart double-count) and 2026-06-22 (Phase 10 cursor) referenced from Phases 14 + 15.
- 2026-07-08: webpack WasmHash build crash on Node v26.2.0 = corrupted `.next/cache/webpack`; fix is `rm -rf .next/cache/webpack`.
- 2026-07-08: `future.md` merged into this file and deleted.
- 2026-07-09: dead Unix socket named `cloud` in the repo root crashes Turbopack's CSS scan ("No such device or address", os error 6) — check `ss -xl` for listeners, then `rm` it. A stale 7-day dev server holding :3000 with HTTP 500 blocks Playwright's `reuseExistingServer` — kill and let it respawn.
- 2026-07-11: session handoff, clean state — dev tree clean at `6e0b903`, 227 tests + build green. The contract-PDF arc (signature spacing, unified four-section table, choice-ladder ordering, comment bullets, column discipline + comment breathing room) is **complete**; a fresh session should not re-touch `app/contract/page.tsx` PDF code and should start at Phase 31. Visual PDF checks use the standalone jsPDF-repro + `pdftoppm` pattern (import `jspdf/dist/jspdf.node.min.js` by absolute path in a scratchpad `.mjs`).
- 2026-07-09: ephemeral screenshot pattern — drop a throwaway spec in `e2e/` using `seedAndGo` + `pinnedProfileId`, run `--project=desktop`, delete the spec; keeps visual proof without polluting the suite.

### Signed consent ledger (dev, 2026-07-30)

| — | What landed | Commit |
|---|-------------|--------|
| — | Lokale P-256 eigendomssleutels, ondertekende profielversies, broncontrole bij import, correcte ownership-backuprestore, leesbare drie-woordenbron en append-only toestemmingssnapshots per scène | PR pending |
