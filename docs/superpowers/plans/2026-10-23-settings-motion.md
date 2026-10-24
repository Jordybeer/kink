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
