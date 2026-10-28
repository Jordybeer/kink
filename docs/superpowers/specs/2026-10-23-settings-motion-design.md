# Settings and shared Scene motion

The user calls Settings ugly and selects the added-Scene-item expansion as the positive reference for consistent animations through shared components. This extends PR484. PRODUCT.md, UI-principles.md and DESIGN.md remain binding. Existing autonomous UI/E2E authorization and the explicit animate request permit execution without another brainstorming cycle.

## Evidence and approach

Exact-head CI39989651451 at7997142 passed all gates. Its artifact12519525448 supplied mobile and desktop Settings images already inspected by the controller. The surface has five weak headings, repeated top/bottom rules, redundant Weergave/Kleurmodus content, and equal-weight rows. Preserve the warm aubergine/rose world and useful mobile surface geometry; improve hierarchy rather than changing identity.

SceneItemRow in app/scene/page.tsx uses persistent CSS-grid0fr→1fr at220ms, opacity190ms, cubic-bezier(.16,1,.3,1), immediate aria-hidden/inert and separate Framer position projection. The unused ui/Accordion instead imposes a card and Framer height:auto. Copying effects would drift; replacing all motion would disturb proven controls. Extract the compact Scene mechanism and reuse it. Existing global press/state motion, Sheet and menus already cover the broader app.

## Settings

Retain surface variant/full-height mobile geometry, fixed close/header, one scroll body, focus return, safe areas and desktop containment. Titled surface headings use existing editorial font28px/moderate weight; other Sheet variants retain typography. No title-string selector.

Use16px editorial group headings, whitespace and subtle separators only between related rows. Consolidate Weergave/Kleurmodus into one Kleurmodus heading and existing helper. Native Systeem/Licht/Donker radios keep44px targets, legible checked state and fixed check space so labels never jump. Keep Gegevens, Beveiliging, KinkSync and every action/description. Remove only redundant Geavanceerd heading; destructive action stays clearly separated and directly reachable. No new cards, icon tiles, gradients, claims or dependencies.

Installation help uses the shared disclosure; preserve optional-install/platform instructions, backup warning, one-use prompt, busy/error/status and standalone absence.

## Motion thesis and scope

Focal moment: supporting content opens in place while its trigger stays stable. Continuity comes from persistent content and reversible CSS transitions. Feedback is fast press/caret response. Budget: no JS height measurement, second height engine, persistent will-change, page choreography or unbounded-list animation.

Shared DisclosureBody plus flat Accordion serve five compact families: Scene item details, Settings installation, ConsentLedgerPanel technical explanation, QuarantinedProfileCard technical reason, contract-version technical verification. Main consent/invalidity/safety information stays immediately visible. Contract note creation/preamble are different interactions and remain unchanged; Profile/catalogue/Compare large/private lists render immediately.

Body owns synchronous aria-hidden/inert, clips closed to zero with padding inside a clipped child, retains child values during reversals, and shows default-open content immediately without an entrance sequence. Trigger owns expanded/controls, keyboard and44px touch geometry. Live Reduced Motion removes spatial interpolation. No persistence/data/crypto semantics change or animation-completion business effects.

## Verification

Local browser execution was blocked by sandbox process sockets; escalation policy rejected the request. No retries or bypasses. Use existing exact-head CI screenshots as baseline, new behavioral browser tests/captures through CI, and local lint/types/unit/build. New captures must be under screenshots/theme-rehearsal/settings-motion/<project>/ because CI uploads screenshots/theme-rehearsal (not arbitrary screenshots paths).

Batch mobile dark/light, desktop,320px/200% text, expanded install and Scene. Inspect once, fix observed issues in one batch, at most one confirmation round. Verify rapid reversal, closed keyboard exclusion, retained input, default-open state, long text, native theme controls and live Reduced Motion. No physical iPhone/PWA hardware claim. No merge/deployment authorized.
