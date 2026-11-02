# KinkSync scene sheets and private reading refinement

Date: 2026-11-02
Figma design: https://www.figma.com/design/u2DpOzcDRTzMgUwOAqgfqY
Baseline: `dev`; independent feature branch, not PR #482.

## Problem and intent
Two mobile sheets feel inconsistent with Scenes' editorial, matte rose / lavender visual language. The scene setlist picker wraps suggestions into an unwieldy forest of large outlined chips, with duplicated hand-drawn sheet chrome. The intimacy composer nests an independently scrolling `SheetContent` inside a scrollable `Sheet`, causing poor spatial hierarchy and a fragile bottom action. Private profile answers became less legible when their earlier compact read format was replaced by full-width editable topic rows.

## Design and interaction contract
- Use the shared `Sheet` with title, close control, scrollable body, and fixed footer for scene suggestions and intimacy composer. Keep existing semantic `aria-label` values and form labels. One sheet-owned scroll container. No new navigation or global modal mechanics.
- Scene suggestions: retain the three distinct *Meest gebruikt*, *Wederzijds*, *Spanning* groups and existing consent/privacy filtering. Show calm, full-width suggestion rows (name and meaningful add state), not arbitrarily wrapped chip clouds. Add text filtering; search never invents shared interests. Feedback and the close action remain visible. A suggestion does not imply consent.
- Intimacy composer: use the existing surface variation, one scroll owner, a clear editorial title, a short privacy line, and persistently reachable Cancel/Save actions. Preserve reminder permission handling, date/time fields, partner selector, local storage, and calendar export.
- Profile: bring back compact private read rows: name + category + concealed/revealed answer control. Preserve the more recent inline editor, but reveal an answer explicitly before editing it. Keep concealed private comments out of the DOM when collapsed or hidden and never import them into scene suggestions.
- Do not create duplicate state stores, bespoke animation presets or additional motion layers. Reuse `useMotionSafe`, `Sheet` motion, and `DisclosureBody`. Color changes should be calm gradients and semantic tokens, not loud always-running animations. Support Reduce Motion, theme roles, keyboard navigation, 44px touch targets, iOS visual viewport, PWA, and safe area.
- Do not change user data, consent semantics, security, workflow/CI or dependencies; keep PR #482 independent.

## Review and verification
- Figma deliverable has three editable mobile frames illustrating setlist, planner, private answers.
- Independent design review focus: hierarchy, safe areas, footer reachability, long suggestion names, genuinely concealed private content, keyboard focus, and light theme.
- Added targeted Playwright regressions for suggestion search and sticky footer, intimacy sheet scroll owner, and private reveal/inline editor behavior. Follow the normal remote CI gate; screenshots in browser CI are required before promoting from draft.
- Verify when UI runtime is available; local GitHub connector writes are not runtime validation. Do not label changes production-ready until browser and CI evidence passes.
