# KinkSync M0–M1 — Preview foundation and visual exploration plan

**Status:** Proposed scoped work package. Do not execute until roadmap approval.  
**Spec:** [Experience-led design programme](2026-11-26-experience-led-roadmap.md), M0–M1, G0–G1.  
**Goal:** Establish a safe, reproducible preview and two meaningfully distinct visual worlds across all three experience compositions, with current baseline comparison.  
**Architecture:** Keep /hot and /hotter unchanged as controls. Proposed /hotter/journey subtree owns in-memory synthetic state, local CSS roles and three independent entry compositions. Use existing shell/font/status vocabulary without changing global tokens or data stores.  
**Stack:** Pinned Next 16.4.6, React 19.2.4, TypeScript, existing CSS, Playwright. No new dependencies.

## Global constraints
Preview/dev only, noindex, no real user data, no local-storage writes by lab, no production modifications. Preserve privacy gates and all five status meanings. Both themes; 44px targets; 320px/200% usable; full and reduced motion. Existing fonts and icons, no UI dash punctuation. Keep scope to candidate exploration; full engine integration is M2.

## Tasks
Each task requires a focused failing behavioural assertion where applicable, verified red, minimal implementation, verified green, scope review and atomic commit. Actual exact component interfaces for M2 onward are deliberately deferred until the owner chooses M1.

### Task 1 — Evidence baseline
- [ ] Pin head and Vercel deployment; verify matching fixture and captures of incumbent /hotter in both themes, plus existing /hot questionnaire, folio, overlays and real synthetic comparison/agenda if available.
- [ ] Record actual visual and device limitations, branch status, open PR overlap and current run IDs. Baseline no source changes.

### Task 2 — Isolated journey shell and fixture
- [ ] Add `e2e/hotter-journey.spec.ts` asserting direct route entry, independent navigation and Back, current lab reachable, no fixture writes to existing store, and production guard (production-mode check separately).
- [ ] Run focused spec against old head and confirm expected missing-route failure.
- [ ] Create proposed `app/hotter/journey/layout.tsx` (preview guard, noindex, lab provider), `page.tsx` (entry chooser), `self/page.tsx`, `connection/page.tsx`, `together/page.tsx` (independently enterable shells); `JourneyProvider.tsx` for in-memory fixture and theme/candidate selection, `fixtures.ts` for immutable synthetic data. Reuse existing house labels. No storage or network effects. Provider state resets only on explicit lab reset or unmount.
- [ ] Run focused spec, icon audit, build; record actual results.

### Task 3 — Three comparable compositions
- [ ] Extend spec to verify exact same fixture content for all candidate switches, no horizontal overflow at 320px, theme toggle maintains selected state, and independent entry.
- [ ] Implement `app/hotter/journey/world.css` scoped to journey wrapper. Add `SelfStudy.tsx` with editorial question and five statuses, `ConnectionStudy.tsx` with two fictional people, explicit similarity/difference/boundary, `TogetherStudy.tsx` with dated planned and completed examples. These are representative compositions with functional lab selection and navigation, not full shipping workflows.
- [ ] Keep candidate controls outside simulated content; display control, Daylight/Dusk and Velvet challenger with shared fixture. Contrast-check actual rendered blends. Match layout hierarchy while permitting authored atmosphere; use no global token override.
- [ ] Run same spec and capture stationary views in both themes at mobile and desktop. Note 200% wrap behaviour.

### Task 4 — Material challenger within self composition
- [ ] Add assertions for same selected status across material variant, immediate logical selection, equal status treatment, touch cancel/no unintended selection, rapid switch, reduced motion with static state.
- [ ] Develop three genuinely distinct pressure/elevation/settlement treatments inside self study with shared geometry and no forced dwell. Keep options separate from palette candidate so reviewer can isolate variables.
- [ ] Run focused test and visual recordings for rest/press/release/settled/rapid reversal. Compute contrast from actual backgrounds. Repeated-interaction review, not a single animation GIF.

### Task 5 — G0/G1 review package
- [ ] Verify exact preview head and READY status. Report commit, build, tests, browser/device caveats, route access, baseline/comparison captures and contrast. If local browser is unavailable, do not substitute a fabricated screenshot.
- [ ] Gather owner assessment of all three compositions in both themes, and material distinctions. Make one bounded correction batch, verify once, then stop.
- [ ] Record selected provisional world or reason to reject. No production token change, no merge, no full implementation until G1. Write separate M2/M3/M4 implementation plans against the approved candidates.

## Review focus
- Reload/deep link must not show real data or persist sample changes (Task 2).
- 320px and 200% text: no clipped content; overflow test in Task 3, manual zoom capture.
- Candidate/theme swap preserves identity and selected status (Task 3).
- Repeated/aborted presses never change an answer unintentionally (Task 4).
- Production route not exposed and evidence belongs to actual head (Tasks 2/5).

## Handoff
G0/G1 preview decisions only. No independent subagent execution available in the current session; request independent review only where an actual runner exists, otherwise disclose single-context review. This plan is not evidence tests have been run.
