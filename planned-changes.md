# v4 Roadmap — Shipped to Production

## Status (as of 2026-06-18)

✅ **Items 2–5 complete** — All core v4 features implemented and shipped to main.
✅ **Polish pass complete** — a11y refinements (44px+ touch targets, dialog roles, ARIA labels), mobile viewport fixes, Dutch microcopy consistency.
✅ **Merged to main** — PR #192 shipped 2026-06-18 11:42 UTC. v4 now live in production.

The roadmap planning in this file (Items 2–5 sequencing) proved accurate. All items landed shippable; the chart denominator conflict was resolved as planned (four disjoint buckets preserved). No regressions detected post-merge.

---

## Next Phase — Deferred Structural Work (from `4.md` sections B–D)

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
