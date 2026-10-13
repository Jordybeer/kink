# KinkSync motion harmonisation

> Execute inline with Superpowers executing-plans; one independent whole-branch review before publication.

**Goal:** Extend the existing Scènes motion identity across the product without redesign or changes to consent/privacy.
**Architecture:** Existing CSS interaction classes and `useMotionSafe` remain the interfaces. Local state, short disclosure and spatial overlays get distinct rhythms; reading surfaces stay stationary.
**Stack:** Next/React, CSS, existing Framer Motion, Vitest and Playwright. No new dependency.
**Spec:** Owner request of 2026-10-12 plus PRODUCT.md, UI-principles.md and DESIGN.md. Owner explicitly authorizes autonomous execution on PR #481, overriding serial-branch and intermediate approval defaults.

## Evidence at start

PR #481 head 93899638782626086b224489175478e1be2ad1c1, parent #472 at 523085fe. #478/#479/#480 are independent open PRs and are not pulled into this work.
GitHub run 38185791756: browser failures pin progress to zero duration and a removed scale class; backup-export first attempt failed but retry passed. Offline/Vercel fail TS1501 in motion-language.test.ts (three dotAll flags incompatible with ES2017). Audit gate remains separate.

## Motion direction and surface inventory

- Scènes reference: 190ms surface/colour feedback, 140ms press at .985; 200ms grid disclosure; 300ms energy arc; 350ms local item arrival. Shared sheets enter in 280ms and leave in 220ms. Preserve these roles, converge easing on (0.16,1,0.3,1).
- Keep: scene arc, local disclosures, shared sheets, profile shared indicator, persistent Home/Profile salmon/lavender ambient positioning, stable question DOM and controls.
- Improve: unbounded scene row delay (index*35ms), decorative loops while hidden, persistent compositor hints, mismatched button feedback across settings/navigation/profile/compare/contracts/aftercare/planner.
- Questions: retain immediate content replacement, local selection response and 300ms thin progress interpolation. No card or section entrance added. Preserve all geometry and live announcement tests.
- Overlays: retain existing focus trap/portal/swipe behavior; use shared reduced-motion-aware timings in contract confirmation too.
- Read surfaces: no new reveals. Charts must respect Reduced Motion. Ambient glow keeps colour and slow drift, pauses when hidden; brand ornament pauses offscreen too.
- Budget: no extra dependency; no page-scale blur/layout animation; no permanent will-change. Existing width/flex animations confined to tiny progress strips. Bounded stagger <=140ms.

## Review focus

1. Disabled and aria-disabled controls cannot scale or imply a successful action.
2. Rapid questionnaire answers leave the DOM, focus, hint alignment and controls stable.
3. Sheet interruption/reopening and keyboard dismissal restore useful focus.
4. Hidden/offscreen ornament and Reduced Motion suppress spatial animation without losing state.
5. Mobile Safari/PWA viewport, navigation and offline storage semantics remain intact.

## Tasks

- [x] 1. Reproduce TypeScript failure; remove unnecessary dotAll flags without weakening regex assertions. Update obsolete browser assertions to computed behavior while retaining geometry checks. Run motion Vitest, tsc and relevant mobile questions tests. Commit.
- [x] 2. Consolidate CSS timing variables and JS presets; apply explicit motion classes to remaining interactive controls across the named screens, preserving layout/copy. Bound scene delay. Add focused browser tests for state, disabled and reduced motion. Commit after targeted checks.
- [x] 3. Pause ornamental motion when hidden/offscreen; remove permanent will-change; adapt chart/contract overlay timing to Reduced Motion. Verify lifecycle and state retention in browser. Commit.
- [x] 4. Batch mobile/desktop, light/dark visual captures, keyboard/sheet checks, Reduced Motion and scene interactions. Impeccable critique then one correction pass and confirmation. Record evidence.
- [x] 5. Full unit/lint/build/browser/launch/print/offline verification once final code is stable. Independent review; fix consequential findings with targeted tests and rerun only invalidated checks. Publish coherent commits to existing branch and update PR truthfully. No merge while release gate red.

## CI efficiency recommendation

Current PR synchronize runs all browser tests on mobile and desktop, followed by launch+print; offline builds again; static builds too when audit passes. Dev push repeats full release gate. No duplicate feature-branch push trigger exists. Keep gates unchanged here. Follow-up: cache build artifacts per exact SHA/config, split cheap typecheck from audit so compile errors remain visible, run focused mobile tests during draft development and full lanes on ready-for-review plus every release candidate SHA. Required aggregate must require full lanes for the candidate, never treat skipped suites as success. Batch pushes to avoid cancelling useful rehearsals.

## Execution ledger

- Initial checkout clean; isolated new clone on requested branch. No unrelated user files touched.
- TypeScript failure reproduced locally (TS1501 at lines 25,36,37). No tsconfig/build bypass.

- Task 1: local tsc now passes; 10/10 motion Vitest pass. Browser execution is blocked locally by socket sandbox restrictions, not a product assertion. Testing continues in an isolated Vercel sandbox at the original head, then against the exact patch.
- Ruling: Scene list changes use existing Framer layout-position interpolation instead of CSS entrance stagger. CSS transform transitions never animated reordered DOM positions; removing index delays makes newly added rows immediately available. No removal delay or consent change.

- Tasks 2/3: 10 mobile motion browser tests passed on the patched tree, including settings, background pause/resume, offscreen relationship threads, keyboard focus, scene reorder and aftercare disabled state.
- Reduced Motion test was strengthened to sample the full 250ms press interval. It reproduced live-preference failure (0.66px shrink vs 0.5px maximum); the hook now subscribes to OS changes. Scene endpoint keyboard focus failure was reproduced and fixed by focusing the same item's available opposite move action, independent of animation completion.
- Final static checks: 792/792 Vitest, 98 files; TypeScript pass; full lint 0 errors / 30 existing warnings; production build exit 0. An earlier lint attempt included generated Playwright-report scripts; moving test artifacts out of source restored the actual source-only result without changing lint policy.
- Audit remains red: seven high entries on this unmodified lockfile, including sharp/source-map-js handled by separate #480 and the unpatched braces lint-tooling chain. No gate or dependency edits.
- Vercel test environment supports Chromium 148 and WebKit after installing test-only OS libraries. No claim of physical Safari/device performance.
- Independent Assessment A: read-only code/design review, 18 representative production screenshots; one Important transform-ownership conflict identified. Assessment B: detector once, two warnings/no errors; thin progress width interpolation is intentional, semantic comparison rail is incumbent. No second design round or redesign warranted.
- Final review fix: new computed-style browser assertions reproduced conflicting CSS transforms; correction gives Framer sole ownership on scene rows/selection marks. CSS-only switch/caret movement retains its own class. Production reorder measurement before: y446→568 immediately, backwards to549, then568; after: y446→446→480→488→500→525→568, continuous forward interpolation. Measured in the test browser, not a physical-device frame benchmark.
- Corrected candidate: all65 modified code/test files hash-identical to local candidate; fresh production build passed; affected mobile+desktop production tests64/64 passed. Unit suite792/792 and TypeScript remained green.
- Ruling: retain the deliberate thin progress width transition; it stays confined to progress and does not move controls. Do not change approved semantic rails due to generic detector styling warnings.
- Deferred baseline: mobile Compare chips wrap short names and roles; unchanged dimensions, outside this motion branch. Physical iOS Safari and thermal/battery performance remain unverified.
- Final verification: full browser578/578 on the harmonisation tree; after the transform-only fix, affected production mobile/desktop64/64, HTTPS WebKit10/10 and final offline16/16. Device launch26 passed/4 intentional skips; Chromium/WebKit print2/2. Those unchanged lanes were not rerun for a test-viewport/documentation-only correction.
- Visual verification:48 actual production screenshots across12 surfaces, mobile/desktop and light/dark.36 logged route states had zero overflow/pageerrors;12 additional sheet/detail captures were visually reviewed, not included in the route metrics.
- CodeRabbit completed review of f4751e0: one Minor finding about the two390px motion tests. Narrowed both to375px; all4 affected project/test cases passed against the corrected production candidate, and targeted ESLint passed. Its ESLint installation timed out; its docstring coverage check was inconclusive. No automated fixes or blanket docstrings added.
- Publication: three implementation commits published without force-push; local tree verified identical and aligned to remote head. Vercel deployment dpl_2ZZGYGLM3ZZ1wBdWemtwy8BRriU5 READY, authenticated HTTP200. Browser protection remains enabled.
- Fresh GitHub run38253498800 confirms the same seven-high audit failure. Static lint/unit/build steps are skipped by that audit; browser/offline lanes are still running/queued at this checkpoint. This is not a claim of green remote CI. PR remains draft and cannot merge while the release gate is red.
