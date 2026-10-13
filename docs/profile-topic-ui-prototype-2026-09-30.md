# Profile topic UI prototype — 2026-09-30

Branch: `impeccable/profile-topic-ui-prototype-20260930`

Purpose: test a flatter real-UI alternative for the Profile topic manager and topic editor without changing `dev`.

## Spatial thesis

Primary task path:

1. Search or choose a category.
2. Scan a category as a list.
3. Open one topic.
4. Change the explicit status or context.
5. Finish with the persistent `Klaar` action.

Hierarchy:

- Search and category filter orient the catalogue.
- Category label + completion count form the section heading.
- Topic name is the primary row content.
- Status is secondary factual state, not a badge competing with the topic.
- Context such as `Eerst vragen` is a quiet second line.
- The editor keeps topic information, answer, agreements, visibility and context as sequential sections.

Prototype changes:

- Remove individual topic-card surfaces and thick coloured side bars.
- Remove category-card chrome and the duplicate category-picker icon.
- Use flat dividers and stable 58px topic rows.
- Keep status colour as a small semantic signal alongside written labels.
- Tighten editor status rows from 64px to 54px while preserving two-line explanation and 44px+ touch targets.
- Add scroll padding to task sheets so focused/targeted rows do not sit under fixed chrome.
- Preserve all consent, privacy, save and sharing semantics.

This file documents a prototype only. It does not supersede DESIGN.md unless the prototype is approved.
