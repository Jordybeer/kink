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
