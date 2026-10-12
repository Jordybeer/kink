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

- [ ] 1. Reproduce TypeScript failure; remove unnecessary dotAll flags without weakening regex assertions. Update obsolete browser assertions to computed behavior while retaining geometry checks. Run motion Vitest, tsc and relevant mobile questions tests. Commit.
- [ ] 2. Consolidate CSS timing variables and JS presets; apply explicit motion classes to remaining interactive controls across the named screens, preserving layout/copy. Bound scene delay. Add focused browser tests for state, disabled and reduced motion. Commit after targeted checks.
- [ ] 3. Pause ornamental motion when hidden/offscreen; remove permanent will-change; adapt chart/contract overlay timing to Reduced Motion. Verify lifecycle and state retention in browser. Commit.
- [ ] 4. Batch mobile/desktop, light/dark visual captures, keyboard/sheet checks, Reduced Motion and scene interactions. Impeccable critique then one correction pass and confirmation. Record evidence.
- [ ] 5. Full unit/lint/build/browser/launch/print/offline verification once final code is stable. Independent review; fix consequential findings with targeted tests and rerun only invalidated checks. Publish coherent commits to existing branch and update PR truthfully. No merge while release gate red.

## CI efficiency recommendation

Current PR synchronize runs all browser tests on mobile and desktop, followed by launch+print; offline builds again; static builds too when audit passes. Dev push repeats full release gate. No duplicate feature-branch push trigger exists. Keep gates unchanged here. Follow-up: cache build artifacts per exact SHA/config, split cheap typecheck from audit so compile errors remain visible, run focused mobile tests during draft development and full lanes on ready-for-review plus every release candidate SHA. Required aggregate must require full lanes for the candidate, never treat skipped suites as success. Batch pushes to avoid cancelling useful rehearsals.

## Execution ledger

- Initial checkout clean; isolated new clone on requested branch. No unrelated user files touched.
- TypeScript failure reproduced locally (TS1501 at lines 25,36,37). No tsconfig/build bypass.
