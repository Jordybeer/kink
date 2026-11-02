# Scene sheets and private reading implementation plan

Design spec: `docs/superpowers/specs/2026-11-02-scene-sheets-private-reading-design.md`

1. Audit current code and earlier compact profile private-read presentation; respect `PRODUCT.md`, `UI-principles.md`, `DESIGN.md`, and `corrections.md`.
2. Produce editable Figma direction anchored to existing dark theme roles: one setlist sheet, one intimate moment sheet, one compact private read section.
3. Replace Scene's custom sheet markup with shared title/scroll/footer; replace bulky chips with semantic row buttons and add search. Preserve suggestion membership, privacy filtering, and add semantics.
4. Move the Intimacy composer to `Sheet`'s single scroll layer and pinned footer; keep full form behavior, labels, storage, reminders and calendar export.
5. Render compact private-read rows through an opt-in `ProfileTopicRow` presentation. Maintain explicit reveal, keep notes hidden, retain inline editor.
6. Add focused Playwright assertions. Run normal CI for static and browser evidence. Fix concrete issues only, then independent design/source review. Merge only after green CI, mobile screenshots and feature gate; never merge the draft preemptively.

## Scope exclusions
Do not change the Home masthead, #482, #488, contract state, profile schemas, shared stored content, service worker, or application-wide color tokens. No broad redesign to unrelated routes.

## Superpowers implementation addendum — 2026-11-02

The CI run 41518834930 completed: 751 browser checks passed; 22 failed and one was flaky. The recurring failures were obsolete fullscreen geometry expectations for compact reading surfaces, a private answer row accessible-label change, one missing feature-row fixture, and a test assuming a scrollable scene surface was draggable. The unrelated flaky check passed on retry.

Refactor strategy: retain the established Sheet API and add narrow reusable header-after, footer, scroll-ref and test-id slots. Migrate ProfileEditSheet away from its private SheetContent, scrolling frame, and footer; do not rewrite validation, store writes or view state. Apply the existing shared title and footer patterns to the two-step editor, and leave only the top-level editorial heading in display type.

Agenda uses individually readable full-width native date and time controls on phone screens, and a two-column layout on larger viewports. Preserve local persistence, reminders, and keyboard focus.

Verification gate: exact-head static checks, web-browser/mobile/WebKit suite, launch/print, offline, and privacy regression. Draft remains open until full passing evidence and screenshot review. No new dependencies or alternative modal framework.
