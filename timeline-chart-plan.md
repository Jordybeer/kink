# Timeline trends chart — plan status

Companion to `/home/cyberbear/.claude/plans/plan-and-implement-an-immutable-thimble.md`.
Tracks what shipped on commit `abb7423` and what is intentionally deferred or worth
revisiting before this surface is considered finished.

---

## Executed (shipped on `dev` @ `abb7423`)

- [x] Add deps: `chart.js`, `react-chartjs-2` (modular registration only — no `chart.js/auto`).
- [x] New component `components/ContractTrendsChart.tsx`:
  - [x] 4 toggleable line series (Matches, Te bespreken, Zachte grenzen, Harde grenzen).
  - [x] Semantic color mapping → `--yes` / `--maybe` / `--no` / `--hard-no`.
  - [x] Custom status-pill legend chips (`role=checkbox`, `aria-checked`, `min-height: 32px`).
  - [x] Tooltip styled to `--surface2` / `--border`, title in Cormorant italic, body in `tabular-nums`, with `verbond %` afterBody.
  - [x] Subtle 9% fill on the primary "Matches" line only; others line-only.
  - [x] Dashed horizontal grid at `color-mix(--text2, 14%, transparent)`; no vertical grid.
  - [x] Mobile-first height `clamp(180px, 38vw, 240px)`, `maintainAspectRatio: false`.
  - [x] Low-data placeholder (`< 2 contracts`) with dashed baseline, one dot, Cormorant italic "Eerst meer geschiedenis."
  - [x] CSS vars resolved at mount via `getComputedStyle` (so midnight ↔ ledger themes both apply on canvas).
  - [x] `aria-label` summary of latest contract counts on the canvas; timeline list below remains the canonical accessible source.
- [x] Slot the chart into `app/timeline/page.tsx` directly above `<CompatibilityTimeline />` in the has-contracts branch.
- [x] Pure-logic tests in `__tests__/contractTrendsChart.test.ts` (sort, projection, immutability, empty input, series-key contract).
- [x] `npm test` green (99 → 106). `npm run build` clean.
- [x] Commit + push to `origin/dev`.

---

## Still on the todo list (deferred — not blockers, revisit when relevant)

- [ ] **Theme-switch live remount.** Chart.js caches resolved canvas colors at mount; switching theme mid-view doesn't repaint until the chart remounts. If the theme switcher becomes a one-tap toggle in-context, add a `MutationObserver` on `<html>` class to force a key-based remount. Currently acceptable because theming is a settings action.
- [ ] **Bundle audit.** Tree-shaken Chart.js is ~70 KB gzipped on the `/timeline` route. If `/timeline` ever becomes a critical-path page or the Lighthouse bundle budget tightens, swap for a custom SVG line implementation with the same `<ContractTrendsChart />` component API — no consumer changes.
- [ ] **Screen-reader navigability of the chart canvas.** Chart.js canvas is not natively traversable. The visible timeline list below the chart already exposes every count to assistive tech, but if accessibility audit asks for more, render a visually-hidden `<table>` summary of the same data adjacent to the canvas.
- [ ] **Tick-label rotation at scale.** The 20-contract cap (`lib/store.ts`) keeps the X-axis readable without rotation. If the cap rises or contracts accumulate denser (e.g. multiple per day), reintroduce `maxRotation: 45` on the X ticks and tune `autoSkipPadding`.
- [ ] **Verbond % derivation parity.** The tooltip's `verbond %` = `matchCount / (match + discuss + soft + hard)`. Once Item 2 (graded `profileMatchScore`) lands per `4.md`, this denominator should be cross-checked against the masthead derivation on `/compare` so the two never drift.
- [ ] **Empty-state link.** The placeholder currently has no CTA. If product wants a "Maak je eerste contract" affordance in the placeholder card, route it to `/contract?a={aId}&b={bId}` using the same `Link` pattern the no-contracts empty state already uses.
- [ ] **Dutch microcopy review.** Title "Verloop" and subtitle "Hoe de getallen bewegen tussen contracten" weren't proofed against the v4 editorial register defined in `4.md` (em-dash convention, curator's-annotation voice). Worth a copy pass when Item 5's frontend-design sweep runs.
- [ ] **Locale assumption.** Date format is hard-coded `nl-NL`. Matches the rest of the app today; revisit if i18n ever lands.
- [ ] **Claude-mem observation write failed** (`server-beta missing_api_key`). The planning entry `2119` from this morning already captures intent; if persistent memory matters later, configure `CLAUDE_MEM_SERVER_BETA_*` and re-run an `observation_add`.

---

## Risks / assumptions baked in (revisit on regression)

- **Chart.js controllers must be explicitly registered.** The component registers `LineController`, `LineElement`, `PointElement`, `LinearScale`, `CategoryScale`, `Tooltip`, `Filler`. Anyone importing additional chart types into the same bundle must register their own controllers — we deliberately avoided `chart.js/auto`.
- **CSS variable read happens once at mount.** Any later runtime mutation of `--yes` / `--maybe` / `--no` / `--hard-no` / `--text2` / `--surface2` / `--border` / `--font-sans` / `--font-display` won't reach the canvas without a remount. This is intentional — Chart.js does not observe CSS — but worth flagging if someone adds dynamic accent colors.
- **`< 2` is the placeholder threshold.** Single-contract pairs render the elegant placeholder, not a dot-on-a-line. Verified honest by design; if product wants a one-point chart later, flip the conditional in `ContractTrendsChart.tsx`.
- **Filter feeds the chart.** The chart consumes the same `filtered: ContractSnapshot[]` the list does — there is no second source of truth. If the page ever switches to a different filter (e.g. role-based), the chart inherits it for free.
- **localStorage 20-contract cap is shared with the timeline list.** Any change to `saveContract`'s slicing in `lib/store.ts` flows through to both surfaces; no chart-specific cap exists.
- **`next/font` resolves to generated family names.** The chart reads `--font-sans` / `--font-display` at runtime to pick up the next/font generated identifiers; falling back to `system-ui` and `Georgia` keeps SSR/early-mount frames sane.
- **No new types.** `ContractSnapshot` was not extended. If `safeword` ever needs to be visualised (e.g. as event markers on the trend), expect a small additive change — not a refactor.

---

## Next — see `4.md`

Once this chart surface is considered settled, the next planned work is in
`/home/cyberbear/code/kink/4.md` (KinkSync v4 — session handoff). Continue with
**Item 2** (graded `kinkMatchScore` / `profileMatchScore` in `lib/matching.ts`) first,
since it changes the denominator the chart's `verbond %` tooltip and the masthead on
`/compare` both rely on — landing it after the chart keeps each commit shippable
without cross-surface drift.

Order per `4.md`:

1. Item 2 — Match calculation improvement (pure logic).
2. Item 3 — Subprofile system (additive).
3. Item 4 — Scene planner redesign (4 sub-commits: time picker, reorder arrows, PDF rewrite, detail page).
4. Item 5 — Profile page frontend redesign (depends on 1–4).

Read `4.md` in full before starting any of the above — it contains exact file
locations, Dutch copy requirements, test specifications, and the v4 design rules
(em-dash convention, absence-as-design, editorial register, `rounded-xl` ban).
