# Settings and shared disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Settings and reuse the exact compact Scene expansion across the app.
**Architecture:** Persistent CSS-grid DisclosureBody, flat Accordion trigger/caret, existing overlay and press primitives.
**Tech Stack:** Next16.4.3, React19, TypeScript, existing Framer/CSS.
**Spec:** docs/superpowers/specs/2026-10-23-settings-motion-design.md

## Global Constraints

- PRODUCT→UI-principles→DESIGN; privacy/consent/readability first; no new dependencies/data semantics.
-220ms grid/190ms opacity/ease(.16,1,.3,1); live Reduced Motion removes spatial interpolation.
- Closed bodies synchronously inert/aria-hidden, clip to zero; default-open no entrance; preserve children/values.
-44px controls, semantic tokens, current Settings surface/focus/scroll geometry, all existing actions/descriptions except named redundant headings/row.
- No large/private-list tween, blanket entrance, JS measurement, persistent will-change or animation-end business effects.
- Root owns final full checks, independent review, push and exact-head CI. No merge/deploy.

## Review Focus

- Rapid reversals and immediate closed keyboard exclusion.
- Scene note persistence, locked details and reorder focus.
-320px/200% and long verification strings without horizontal overflow.
- Native theme radio keyboard/OS behavior and stable selection geometry.
- Install optional/iOS/standalone/error/retry behavior; migrate summary selectors with markup.

### Task 1: Shared disclosure and Settings

**Files:** create components/ui/DisclosureBody.tsx; refine components/ui/Accordion.tsx, components/Sheet.tsx (titled surface typography only), components/sheets/SettingsSheet.tsx; migrate app/scene/page.tsx, components/ConsentLedgerPanel.tsx, components/QuarantinedProfileCard.tsx, app/contracts/[seriesId]/versions/[versionId]/page.tsx; minimal app/globals.css if needed. Document final direction in DESIGN.md. Tests in e2e/shared-disclosure.spec.ts, e2e/settings-density.spec.ts, e2e/pwa-install.spec.ts and relevant existing motion tests.

**Interfaces:** DisclosureBody({open:boolean,id:string,children:ReactNode,className?,contentClassName?,...safeDivAttributes}) owns grid/clipping/aria-hidden/inert. Flat Accordion default export keeps trigger ReactNode or (open:boolean)=>ReactNode, icon?, children, defaultOpen?, open?/onOpenChange?, className?, triggerClassName?, triggerStyle?, contentClassName?; stable useId, native button, expanded/controls,44px default, caret uses useMotionSafe. Scene consumes Body separately preserving its trigger/projection. Theme remains native radios, never tabs.

- [x] Read spec/authority and installed Next use-client guide. Use Impeccable animate and craft-floor. Root has inspected exact-head mobile/desktop Settings images; reproduce their identified issues, not a new visual world. Search all e2e/unit markup/label references without truncation.
- [x] Add behavioral browser tests: closed Scene body height≤1px; synchronous inert/aria-hidden; rapid reversals preserve final open/input; normal timing>0 and live reduced0; default-open/locked details visible; Settings installation keyboard open/close and focus return; consent help button behavior. Existing Scene reorder/privacy/install guards remain intact.
- [x] Implement shared body and flat Accordion; migrate the five bounded families only. No ContractSection/preamble changes. Settings layout per spec; preserve radio→sibling span state test compatibility and fixed check allocation.
- [ ] Capture390×844 dark/light,1280×900 desktop,320×568200% text, installation open and Scene under screenshots/theme-rehearsal/settings-motion/<project>/. Assert no horizontal overflow,44px targets, scroll-to-delete and fixed close access. Update pwa-install summary locator to button. No string-mirroring unit tests.
- [x] Run focused lint/types and source motion guards as relevant. Browser run stays explicitly pending CI due sandbox restriction. Root runs full unit/lint/build once after code. Self-review, commit only owned code/tests/DESIGN, report commands/results/limits to this task's SDD report. No push or new subagents.

## Execution

One cohesive task plus independent review covers new component and consumers; prior completed branch reviews remain valid. Continue owned PR484 branch, avoiding a new serial branch before merge. Former local prep was removed by workspace maintenance; GitHub7997142 is the recovery base. No new UI implementation had been pushed before restoration.

## Implementation and review record

Implemented in `2b1e5a6`: persistent DisclosureBody; flat Accordion; the five named consumers; Settings hierarchy and native theme reflow; behavioral browser tests and captures wired into the existing CI artifact path. Scene projection, sensitive-state semantics and dependencies are unchanged.

Independent expert review of `7997142..2b1e5a6` found no actionable findings. It checked live Reduced Motion and the interaction between persistent hidden controls and the existing Sheet focus trap. Previously approved UI/dependency work is unchanged. Local focused TypeScript and source-motion checks passed; the controller's full unit suite passed 109 files / 929 tests, and lint passed with the same 30 baseline warnings. The production build passed, including TypeScript and generation of all 21 static pages.

Browser execution and visual acceptance remain pending exact-candidate GitHub CI because local browser process sockets are blocked. The new tests cover zero closed height, immediate inert state, reversible content, locked details, keyboard installation/consent controls, theme-label stability, Settings scrolling and 320px/200% text. Screenshot targets are mobile light/dark, expanded install, desktop, enlarged text and Scene. Surrounding inherited Home/navigation constraints are not used as Settings overflow assertions. No physical-device result is claimed.

The PR remains a draft; no merge or deployment. The decisions above preserve the existing approved direction: one owned PR, one coherent shared-component task and one independent new-delta review. CI screenshot inspection is the remaining visual gate.

## Observed CI audit blocker and narrow repair

The first published UI candidate `60ec7a1` triggered CI run40044605726. Its static lane stopped at npm audit after the October23 update to [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): Zod below4.6.6 and three Serwist meta-dependents produced four high findings. Local audit reproduced the same result. The UI change itself had not changed dependencies.

The compatible repair adds one exact Zod4.6.6 override, deduplicates three nested4.4.1 copies and updates the root4.4.3 copy. All other package versions/lock entries remain unchanged. Serwist stays9.5.11: even the latest stable9.5.13 pins vulnerable4.6.5, so an upstream patch alone cannot fix this advisory. ESLint's declared Zod4 range accepts4.6.6. This intentionally overrides Serwist's exact pin within the same major; remove the override after a separately verified upstream release supports the patched version.

Clean npm ci, the targeted dependency graph and a composed Serwist schema smoke passed. Audit now reports zero vulnerabilities. The full graph has no missing/invalid nodes but reports seven unrelated optional sharp/wasm helpers as extraneous; no pre-fix full graph was captured, and no unrelated cleanup was added. Independent review verified the registry integrity, constraints and narrow diff without findings. The controller reran full unit tests (109 files/929 passed), lint (zero errors/30 baseline warnings) and production build (including TypeScript), all successfully.

The initial run is superseded before its regular browser/screenshot lane starts. This avoids spending a complete visual rehearsal on an already failed dependency candidate; the definitive candidate still requires the entire exact-head CI and screenshot inspection. Local browser restrictions, hardware limits and draft/no-deployment status remain unchanged.


### Task 2: Reading surfaces and CI repair

Spec: docs/superpowers/specs/2026-10-24-reading-surfaces-design.md. User's October24 iPhone screenshots extend the scope to explanation-modal usability. Existing permission to perform UI fixes applies; reuse the current surface architecture rather than create a new navigation pattern.

- [x] Diagnose and fix320px/200% Settings intrinsic-width overflow without masking or shrinking content.
- [x] Align the locked Scene browser assertion with intentional disabled semantics while retaining initial visible-detail checks.
- [x] Convert Status and three questionnaire explanations to titled surfaces, remove nested summary container/redundant bottom dismissals, preserve copy/state/focus.
- [ ] Cover mobile/desktop/large-text geometry, one scroll region, fixed close and state retention; collect screenshots via existing CI artifact path.
- [ ] Focused implementation checks, independent new-delta review and root final checks; publish once and verify fullCI plus batched visual evidence.


## Reading-surface implementation checkpoint

The source/test changes were committed locally as `d8b4eef`: four explanations now reuse the existing titled surface, with fixed close/header, one scroll region, flat prose, retained factual content and contained desktop presentation. Shared frame/header/body widths are constrained; Settings has an explicit shrinkable grid track and minimum-content-aware wrapping. The locked Scene browser assertion now respects inherited aria-disabled state while still proving initial open details and read-only content. No dependency or application state semantics changed.

Focused TypeScript/lint/discovery passed. Root full verification passed 109 files/929 unit tests, lint with zero errors/the same30 baseline warnings, and production build including TypeScript. Independent expert source review approved the new delta without findings and confirmed both CI repairs at source level. Runtime geometry/focus and visual acceptance remain pending the next exact-head CI; discovery and source review are not substituted for browser results. Existing question/device selectors were updated, with four meaningful reading geometry/focus/state tests and captures added to the existing artifact path.
# Profile extension, 2026-10-24

Spec: `docs/superpowers/specs/2026-10-24-profile-inline-design.md`.
The owner explicitly requests inline Profile editing and same-page status filters.
This extends the owned PR before publication of the reviewed reading-surface work.

### Task 3: Unified Profile list with inline editor

**Files:** `components/profile/ProfileScreen.tsx`, `components/KinkListRow.tsx`,
`components/CategorySection.tsx`, `components/KinkEditSheet.tsx` (extract/reuse fields
or remove if unused), focused new components under `components/profile/`,
`DESIGN.md`, relevant `e2e/profile*.spec.ts` and other affected consumers/tests.

**Interfaces:** Consume existing `DisclosureBody`, `StatusOptionRows` with
`presentation="list"`, `useStore.setEntry(profileId,kinkId,partial)` and public
summary/privacy helpers. Produce one consistent inline row/editor used by Profile
overview and its catalogue. Preserve schema and partial update semantics.

**Binding constraints:** Follow the linked spec verbatim. No dependency changes,
questionnaire/Compare rewrite, private leakage, browser-launch workaround, global
list-height animation or gratuitous visual overhaul. Existing source-reviewed
Settings/reading changes remain. Read AGENTS and product doctrine in order; use
installed Next client-component docs and Impeccable operate/animate/craft-floor.
Context CLI already failed this session; direct context fallback is complete.

- [ ] Read the linked spec and current Profile/editor/summary/privacy/test paths.
- [ ] Write meaningful regressions for inline filter/hero and query restoration;
  row open/change/clear/close/reload; private conceal/reveal/edit and shared read-only;
  custom topics; keyboard/focus, rapid reversal/reduced motion, long text geometry.
  Search all e2e and unit references to the old labels/structure without truncation.
- [ ] Implement the cohesive inline row/editor and integrate all Profile entry
  points. Reuse status choices and optional field semantics without divergent
  copies. Update DESIGN.md to the new explicit owner direction.
- [ ] Run focused runnable unit checks and lint; discover E2E tests without
  launching a browser. Root owns the one full unit/lint/build pass and remote CI.
  Browser runtime remains unverified until CI, never claim RED/GREEN there.
- [ ] Self-review and commit scoped code/tests/docs; record report with files,
  commands/results and limitations in the controller-provided report path.

**Review focus:** a changed status retains controls until close; privacy removes
public presentation immediately; imported/shared entries cannot mutate; deep link
and back preserve same-page context; enlarged text and long names cannot overflow.

Task 3 source checkpoint: implemented at `34b9c2e`; independent expert review
approved spec compliance and code quality with no actionable findings. All 933
unit tests (110 files), lint (zero errors, 30 existing warnings), TypeScript and
production build pass. Browser test discovery is preparation only; exact-candidate
CI and screenshot inspection remain required. The reviewed reading-surface fixes
and this Profile extension will be published together to avoid a redundant run.

