# v5 Backlog — Field Notes from User (2026-06-18)

Mobile-first. No regressions. No Playwright unless a feature genuinely needs it. Group commits per phase; each phase ships independently.

## Redundancy Check (already done — skip)

- **Score overhaul** — Done in v4 Item 2 (six-tier rubric). `te bespreken` classifying as mismatch is **correct** (it's neither match nor limit; the chart's four disjoint buckets depend on it). No further work needed; the question is settled.
- **ProfileHero redesign** — Shipped in v4 Item 5. User confirms it's "still messy" → Phase 2 below is a follow-up pass, not a redo.
- **TimePicker / DurationStepper a11y** — Polish pass already raised touch targets and added dialog roles. Don't re-touch.

---

## Phase 1 — Critical Bugs (ship first)

Small, isolated fixes. Each = one commit.

1. **Live session zoom on connect** — Viewport jumps/zooms when peer connects. Inspect `viewport` meta and any `transform` applied on connect.
2. **Contract `Bevestigen` doesn't save** — Currently only `Opslaan als PDF` persists. `Bevestigen` also skips signature/name validation that `Opslaan` enforces. Both bugs in one commit: gate `Bevestigen` on validation, then call `saveContract`.
3. **Scene page contract-gate doesn't re-check** — When both profile dropdowns get filled, the no-contract banner stays. Add effect listening on `[profileAId, profileBId]` to re-query.
4. **ProfileHero scroll-jump on kink rating** — DNA bar updates mutate hero height → page scroll drifts. Fix: reserve hero height OR scroll-anchor the active kink row.
5. **Import URL stuck after import** — After import succeeds, `router.replace('/')` to clear the encoded payload from address bar.

## Phase 2 — ProfileHero Polish v2 (mobile portrait)

User says hero is "still messy" in portrait. Tight, surgical pass — no full redesign.

- Role label cut off by edit button in portrait → either move pencil into the `Bewerken` tab header, or absorb edit affordance into the `Bewerken` tab itself (delete pencil from hero entirely).
- `Overzicht` / `Bewerken` tabs eat vertical space → consider segmented control, single-row inline switcher, or fold "Overzicht" into the default state with edit toggling in-place.
- Pill cluster (experience / relationship) → redesign as compact metadata row or move to expandable details (less visual noise).
- Space above/beside kink title is unused → land role pill or dominant-status caption there.
- Reduce card-background opacity when in edit mode → makes editing feel like a distinct surface.

## Phase 3 — Status Color System Refinement

DNA + KinkRow color palette is too compressed at the green and amber ends.

- `Heel graag` vs `Ja`: both green. Make `Heel graag` warmer/saturated (e.g. lime→emerald distinction) or add an outline ring on `Heel graag` only.
- `Misschien` vs `Voor hen`: too similar amber. Push `Voor hen` toward muted blue/grey (it's a directional preference, not enthusiasm).
- Pulse animation: currently only `Ja` pulses. Either add to `Heel graag` or remove from `Ja` so pulse signals something specific (suggest: pulse = "fresh / unrated → rated this session").
- New `Nieuwsgierig` (curious) status between `Misschien` and `Ja` — add to rubric in `lib/matching.ts`, wire color, update DOMINANT_LABEL.
- Ledger PDF palette: bump contrast on body text / counter swatches; current swatches read as vague greys on print.

## Phase 4 — KinkRow Edit UI

Cleaner editing surface.

- Non-switch roles: hide `Geven` / `Ontvangen` toggle entirely (only switches need directional UI).
- `Harde grens` button: shrink — it's the rarest pick, doesn't need parity sizing.
- Thicker border on desirability tap to confirm interaction (currently subtle).
- Sort: group by category but inside each category sort by rated-first → unrated-last so progress is visible.

## Phase 5 — Navigation Layout

- Move settings gear out of inline page chrome into `TopNav` top-right.
- Status indicator (online/offline/sync) lives to the left of the gear.
- Ensure home page uses the same `TopNav` component (currently inconsistent).
- Home cards: replace `Geven` / `Ontvangen` row with the profile's `role` pill — it's the meaningful signal, the others are too granular for a card.

## Phase 6 — Profile Sharing Flow

Single biggest UX gap: after a live session reveal, the peer's profile vanishes. Needs persistence path.

- **Share-profile button on live-session reveal** — Drop a CTA on the reveal screen: `Importeer dit profiel`. Pulls the live-session payload into local storage as a partner profile.
- **QR audit** — Document in commit message: what fields the QR encodes today, what's missing (avatar? customKinks? snapshots?), and the byte budget before QR becomes unscannable on a phone screen (≤ ~2.9 kB for L-level Version 40).
- **Live-session handshake capacity** — Since it's WebRTC datachannel, it can carry **multiples** of the QR payload. Spec a richer payload (avatar + full entries + custom kinks) for live mode while keeping QR lean.
- **Camera modal: paste-from-URL fallback** for PWA users whose camera permission is awkward.
- Post-import always `router.replace('/')` (also covered in Phase 1 #5 — share the fix).

## Phase 7 — Profile Trends / Snapshots

User wants per-profile evolution view (mirrors the contract trends chart already shipped).

- Add `Profiel opslaan` CTA at bottom of profile page → snapshots `entries` + `customKinks` + timestamp into a new `ProfileSnapshot[]` store key.
- New chart component on profile detail: Chart.js line/bar mirroring `ContractTrendsChart`, showing counts per status over time.
- **Overlap with deferred Phase B (`4.md`):** This is a leaner version of the Agreement Archive — same idea, scoped to a single profile rather than pair snapshots. Doing Phase 7 first de-risks Phase B by surfacing storage + drift questions on a smaller surface.

## Phase 8 — External Imports (research-heavy — split into sub-tasks)

These are bigger than a single commit. Each needs its own design pass before code.

- **BDSMtest meaningful use** — Currently we only link out. Brainstorm: scrape result percentages on paste? Map test archetypes (Master, Brat, etc.) → suggested kink defaults? Display alongside DNA bar? **Action: write a one-page exploration doc before coding.**
- **FetLife kinks import** — No API. Options: (a) user pastes their fetish list text → tokenize → fuzzy-match against `lib/kinks.ts`; (b) screenshot OCR (heavy, defer). Start with (a).
- **Dupe matching** — Build a `lib/kinkAliases.ts` of common alternative spellings/wordings so paste-import doesn't double-count.
- **Identity-vs-dynamic split** — Some kinks describe the person ("voyeur identity"), not the scene ("voyeur play"). Add a `category: "identity"` flag in `lib/kinks.ts` and surface in a separate ProfileHero strip.

## Phase 9 — PWA Install UX

- Current toast is broken + visually basic. Rebuild as a bottom-sheet card matching app identity: soft entrance, clear "Installeer als app" header, single big-button CTA, dismissible. Non-invasive (no overlay), but readable by tech-illiterate users. Reuse `Toast.tsx` patterns.

## Phase 10 — Brand Micro-polish

- Logo underscore: subtle ambient animation (slow pulse / shimmer). The name itself stays static so the underscore reads as a status cursor, not motion clutter. Easy win; ship after the visual phases settle.

---

## Recommended Execution Order

| Order | Phase | Why |
|-------|-------|-----|
| 1 | **Phase 1 — Critical Bugs** | Each fix is small, isolated, ships in hours. Clears the floor. |
| 2 | **Phase 5 — Navigation Layout** | Touches `TopNav`, foundational for any chrome-related polish that follows. |
| 3 | **Phase 2 — ProfileHero Polish v2** | Independent surface, mobile-portrait win. |
| 4 | **Phase 4 — KinkRow Edit UI** | Same surface area as Phase 2, group the visual passes. |
| 5 | **Phase 3 — Color System** | Cross-cuts DNA, KinkRow, Ledger — do once everything that consumes color is settled. |
| 6 | **Phase 9 — PWA Install** | Independent. Slot in when other work blocks. |
| 7 | **Phase 6 — Sharing Flow** | Largest UX win. Do after navigation is stable so import → home flow doesn't fight chrome. |
| 8 | **Phase 7 — Profile Snapshots** | Foundational for Phase B (Agreement Archive). De-risks the deferred structural work. |
| 9 | **Phase 8 — External Imports** | Research first, code second. No commits until exploration docs land. |
| 10 | **Phase 10 — Logo polish** | Last. Pure delight, no dependencies. |

---

# v4 — Shipped to Production (Historical)

## Status (as of 2026-06-18)

✅ **Items 2–5 complete** — All core v4 features implemented and shipped to main.
✅ **Polish pass complete** — a11y refinements (44px+ touch targets, dialog roles, ARIA labels), mobile viewport fixes, Dutch microcopy consistency.
✅ **Merged to main** — PR #192 shipped 2026-06-18 11:42 UTC. v4 now live in production.

The roadmap planning in this file (Items 2–5 sequencing) proved accurate. All items landed shippable; the chart denominator conflict was resolved as planned (four disjoint buckets preserved). No regressions detected post-merge.

---

## Deferred Structural Work (from `4.md` sections B–D)

Per the original roadmap, Items B–D were deferred after v4 polish to avoid scope creep:

| Phase | Item | Scope | Status |
|-------|------|-------|--------|
| **B** | **Agreement Archive Data Model** | Migrate `ContractSnapshot` → `ProfileSnapshot`. Design storage budget + drift strategy. | Queued — requires upfront design cost. Foundational for evolution tracking. |
| **C** | **Evolution View** | `/history` page aggregating snapshot diffs over time. Depends on B. | Blocked on B. |
| **D** | **History Consolidation** | Merge `/history` into `/timeline`, retire redundant endpoint. | Blocked on C. |

**Why deferred:** Each phase adds complexity without immediate user value; B requires significant schema design work upfront. v4 polish took priority to establish a clean baseline before tackling structural changes.

**Recommendation:** Start with B design phase next — surface requirements, schema draft, storage constraints. This unblocks C and D downstream.

---

## Historical: Verified State from Planning Phase (kept for reference)

- `lib/matching.ts` exports `isKinkMatch`, `isHardLimit`, `isConflict`, `hasRating` — signatures match the plan.
- `KinkEntry` has `status`, `statusGive`, `statusReceive`, `direction` — directional logic is supportable.
- `app/compare/page.tsx:355–370` holds the manual `matchCount/hardLimitCount/discussCount` loop. It **does not compute `softLimitCount`** today.
- `ContractSnapshot` persists all four counts (`matchCount`, `discussCount`, `softLimitCount`, `hardLimitCount`).
- `components/ContractTrendsChart.tsx:216–223` derives `verbond %` as `match / (match + discuss + soft + hard)` — i.e. the chart treats all four as disjoint buckets.
- `app/page.tsx` already groups by name (`~398–405`); role-chip pattern is at `~470–488` (4.md said 471–485 — minor drift, not a bug).
- `app/scene/page.tsx` is 1049 lines (the plan's number is accurate).
- `SceneRecord` has `plannedDate` and `safeword`; duration lives on `SceneItem` not `SceneRecord` (the plan is correct — Item 4a only touches per-item `duration`).
- `components/ProfileHero.tsx` still has the purple `radial-gradient` (line ~117) and `Camera size={11}` badge (~150); `VIBE_MAP` is local to this file; `Lock` icon for partner profiles is already wired at line ~230.
- `rounded-xl` violations exist across `app/scene/page.tsx`, `app/scenes/page.tsx`, `app/scenes/[id]/page.tsx`, and parts of `ProfileHero.tsx` — apply v4's rounded-xl ban opportunistically as each item touches those files.

---

## The one real conflict — chart denominator (must resolve in Item 2)

`4.md` Item 2 says:

```
discussCount = counts.discuss + counts.conflict + counts.soft
```

If the new `compare/page.tsx` saves a `ContractSnapshot` where `discussCount` already
absorbs `counts.soft`, but `softLimitCount` is still persisted separately by `saveContract`,
the chart's denominator at `ContractTrendsChart.tsx:216–223`
(`match + discuss + soft + hard`) **double-counts soft limits** for every contract saved
after Item 2 lands. Verbond % drifts downward; the "Zachte grenzen" trend line stays correct
but the masthead vs tooltip diverge.

### Recommended resolution (preserve four disjoint buckets)

Override `4.md` Item 2's bucket mapping in `app/compare/page.tsx` to:

```ts
matchCount      = counts.perfect + counts.strong;
hardLimitCount  = counts.limit;
softLimitCount  = counts.soft;
discussCount    = counts.discuss + counts.conflict;
```

Rationale:
- Keeps the chart's existing `verbond %` formula honest with no chart-side change.
- Preserves the four-line trend visualization (Matches / Te bespreken / Zachte grenzen / Harde grenzen) — soft limits remain a distinct status, not collapsed into "discuss".
- Matches the design intent of the v4 rubric: `willing+willing → soft (60)` is a real category, not a discussion point.
- Verify `saveContract` in `lib/store.ts` actually persists `softLimitCount` from the compare page's value (it currently doesn't — fix this as part of Item 2; otherwise the chart's `Zachte grenzen` series stays at zero for new contracts).

### Test addition for Item 2

Add to `__tests__/matchingScore.test.ts`:
- A `profileMatchScore` case with one of each kind verifying that `counts.soft` is non-zero and distinct from `counts.discuss` and `counts.conflict`.
- A compare-page-derivation integration check (pure-logic, not React) confirming the four buckets sum to `total rated` with no overlap.

---

## Other small corrections (apply when relevant)

1. **Chart text/microcopy.** "Verloop" + "Hoe de getallen bewegen tussen contracten" weren't proofed against v4's editorial register. Defer the copy pass until Item 5's frontend-design sweep — same brain, fewer commits.

2. **Empty-state link on the chart placeholder.** Still deferred from `timeline-chart-plan.md`. Reconsider during Item 5 alongside the other v4 microcopy decisions. Not required for Item 2.

3. **`rounded-xl` cleanup.** Address only on files each item touches. Don't fan out into unrelated files.

4. **Line-number drift in `4.md`.** Items reference exact line numbers (e.g. role chips at `471–485`) — these drift slightly. Treat all line numbers in `4.md` as anchors, re-locate before editing.

---

## Execution order (unchanged from `4.md` — confirmed sequencing is correct)

| # | Item | Why this slot |
|---|------|---------------|
| 1 | **Item 2 — matching.ts graded scoring** | Locks the `verbond %` denominator before any other UI work consumes it. |
| 2 | **Item 3 — subprofile chip selector** | Pure additive; no schema change; safe in isolation. |
| 3 | **Item 4a — TimePicker + DurationStepper** | Foundation for the rest of Item 4. |
| 4 | **Item 4b — always-visible reorder arrows** | Independent; can ship in either order with 4a. |
| 5 | **Item 4c — PDF rewrite (`lib/scenePdf.ts`)** | Largest single change in Item 4. Pure-logic extraction makes it testable. |
| 6 | **Item 4d — scene detail page redesign** | Consumes the SafewordRibbon + sceneSummary helpers; lands last in Item 4. |
| 7 | **Item 5 — Profile page redesign + chart microcopy pass** | Depends on Items 1–4. Fold the deferred `timeline-chart-plan.md` microcopy items (Verloop title, empty-state CTA, Dutch register) into the same frontend-design sweep. |

Each item = one commit. `npm test` green before commit. No `--no-verify`.

---

## Files touched (next commit only — Item 2)

- `lib/matching.ts` — add `MatchKind`, `KinkMatch`, `kinkMatchScore`, `profileMatchScore`; rewrite `isKinkMatch` body to delegate (signature unchanged).
- `app/compare/page.tsx` — replace manual loop at lines `~355–370` with the corrected bucket mapping above (four disjoint buckets, including `softLimitCount`).
- `lib/store.ts` — verify (and if needed, fix) that `saveContract` persists `softLimitCount` from the value passed in by the compare page.
- `__tests__/matchingScore.test.ts` — new file. Cover every rubric row, directional complementary, both-want-to-give-neither-receives, hard-limit short-circuit, unrated, `profileMatchScore` with mixed counts, and the four-disjoint-buckets invariant.
- `__tests__/matching.test.ts` — audit and update any rows where `willing+maybe` previously matched (now `discuss`). Add an intentional comment on the assertion change.

---

## Verification

End-to-end, after Item 2 lands:

1. `npm test` — all matching tests green, including the new `matchingScore.test.ts` and the audited `matching.test.ts`.
2. `npm run build` — type-check + lint clean.
3. Manual: open `/compare` with two profiles, confirm the masthead percentage shifts in line with the new rubric (`willing+maybe` no longer in green). Save a contract.
4. Manual: open `/timeline` for the same pair. Confirm:
   - The new contract's dot lands at the same `verbond %` the masthead just showed (denominator parity).
   - "Zachte grenzen" line shows a non-zero value if any `willing+willing` pairs exist (not silently saved as 0).
   - All four series remain visually distinct; no double-counting.
5. Confetti unification check: confirm the confetti threshold from commit `b6d5d10` still fires when expected — the absolute threshold may need tightening if it was tuned against the old looser denominator (note in commit message if so).

---

## Out of scope for this plan

- Items 3, 4, 5 specifics — they don't need replanning; `4.md` is canonical for them. This plan only fixes the chart-denominator conflict that Item 2 introduces, and surfaces small drift corrections.
- Deferred structural work in `4.md` sections B–D (Agreement archive, Evolution view, /history consolidation) — explicitly out of scope per `4.md`.
- The deferred items in `timeline-chart-plan.md` (theme-switch live remount, bundle audit, SR-navigability of canvas, locale) — none triggered by Items 2–5.
