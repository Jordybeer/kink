# Readable explanation surfaces and final Settings fixes

## Intent and evidence

The user asks about Settings and calls this modal type inconvenient, supplying iPhone screenshots of status explanation and questionnaire Info & uitleg. The large dead area above the panel, decorative drag handle on non-draggable scrollable content, inconsistent header/close placement and nested summary card make reading cumbersome. This continues the authorized Settings/shared-motion refinement in PR484; no merge or deployment is authorized.

PR50489a8 contains the new Settings hierarchy but is unmerged. Exact-head CI40045217045 passed static and offline lanes; browser results were720 passed/four failures representing two cases on mobile and desktop. Settings overflow at320px/200% and locked Scene clicking a semantically disabled control remain open. Root inspected exact-head mobile light/dark and desktop Settings plus the320px failure image. Standard Settings now has clear hierarchy; the failure image shows actual horizontal clipping including the close control and content, so simply hiding overflow or weakening tests is unacceptable.

## Approaches and choice

Keep a content-sized bottom sheet: cheap, but preserves the user's awkward reading geometry. Inline disclosure: retains question context but pushes answer controls away while reading long explanations. Reuse the existing titled surface: predictable reading origin, fixed close, one scroll body and contained desktop presentation. The controller chooses the existing surface under standing autonomous UI authority and has stated this choice to the user; this is a controller decision, not a claimed user selection. The established visual world and overlay engine remain intact.

## Design

Use the existing Sheet surface variant for status explanation and the three related questionnaire read-only explanations: topic info, safety and category explanation. On phones they begin near the safe top edge and use available visual viewport height; on desktop they are centered and width-contained. Fixed title/44px close, exactly one scroll body, no drag handle or drag gesture, retained Escape/backdrop dismissal and return focus. Keep every factual explanation, status meaning, curiosity disclaimer, safety text and alias. Flatten the Info summary card into headings and text, and remove redundant bottom dismissal buttons in favor of the always-available header close. Use semantic tokens, editorial heading face and clear reading rhythm; preserve existing status dots. No route/navigation rewrite, added content, dependency or state change.

Settings keeps its new hierarchy and surface. Diagnose its intrinsic-width failure using CI screenshot/trace and source, then constrain actual layout and wrap long labels without shrinking type or merely clipping. Fix the locked Scene test to match the existing intentional aria-disabled lock while still proving initial visible content and lock safety; no force-click workaround or enabling locked editing.

## Bounds and validation

No general conversion of short action menus, contracts, scanners or editors. No global animation sweep or new motion engine. Keep approved compact disclosure and surface motion with live Reduced Motion, privacy and focus behavior. Native iPhone browser launch remains unavailable locally: do not retry or bypass sandbox restrictions. Validate source/types/lint locally and behavioral/rendering assertions through exact-head CI.

Update relevant existing questionnaire/device tests for intentional accessible close changes. Add meaningful geometry/focus tests for all four reading presentations at390px, desktop and320px/200%, including long topic titles, preserved answer/category state, fixed close during scroll and zero horizontal overflow. Capture both user-reported examples and Settings in the existing screenshots/theme-rehearsal path. One batched screenshot inspection and at most one confirmation; fixes based on concrete evidence. Root owns final verification, independent delta review, publication and CI.
