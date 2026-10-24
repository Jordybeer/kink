# Profile: read, filter and edit in place

## Intent and authority
The owner rejects the separate status browser and topic-edit modal on Profile,
prefers the flat answer-choice rows in the supplied editor screenshot, and asks
for inline editing with the shared Scene smoothness. This explicit request
supersedes DESIGN.md's dedicated status browser and modal-first topic editing.
Existing autonomous implementation authorization applies; no additional discovery
round is needed. Settings/reading-surface work already reviewed stays intact.

## Chosen interaction
Keep the person and their answers on one Profile document. Status controls filter
the list directly below them; no separate screen or three-item teaser. Reuse
`interests` query values as initial/deep-linked selection without replacing the
profile hero. Default to the first nonempty interest status; a selected empty
status shows an honest empty state rather than silently switching elsewhere.
Keep all five status choices reachable with public counts. Hard boundaries remain
named in a distinct visible safety section regardless of the interest filter;
selecting Harde grens targets this section without duplicating the same list.

Own-profile rows open one inline editor at a time. The row, description and safety
context lead, followed by the existing flat StatusOptionRows list. Optional
agreements, visibility and context use one quiet Details disclosure. No steps,
modal, nested cards or extra save flow. Immediate persistence and the active-choice
clear behavior stay unchanged. Include existing comment/context editing where
supported; preserve all entry fields on partial updates.

Retain an open public row in its position when its status changes or is cleared,
until the user closes it or deliberately changes filter. Privacy is stricter:
making it private immediately removes public presentation and returns focus to a
stable control. Private entries remain separately concealed, revealable and
editable only by their owner after explicit reveal. Shared/imported profiles have
no edit controls and must not expose private counts, status, tags or comments.

Apply the same row/editor to catalogue search, categories and custom topics on
Profile. Category-first discovery remains reachable through Onderwerpen beheren.
Do not alter questionnaire, Compare, sharing/export, schema or consent semantics.

## Visual and motion direction
Flat topic rows, quiet dividers, readable wrapping names, secondary category and
context, semantic status marks. Preserve aubergine/rose tokens and editorial
headings. The owner's clean list reference supersedes per-item tinted rail cards
on Profile; keep restrained hard-boundary distinction and explicit status text.
Use the existing DisclosureBody for the bounded active editor and Details:
220ms grid, 190ms opacity, cubic-bezier(.16,1,.3,1), immediate inert/aria-hidden,
persistent content for rapid reversal, live Reduced Motion support. Do not mount
full editor controls for every catalogue topic. Large filter/category lists render
immediately; only trigger feedback/caret animates. No page choreography or height
measurement. Keyboard focus remains on row trigger on open and returns there on
close; collapse must never leave focus inside inert content.

## Alternatives considered
Keeping a modal preserves the user's reported friction. A separate edit page also
breaks context. Inline expansion best matches the explicit request and reuses the
approved answer rows and shared disclosure. The controller chooses one active row
and pinned edit position to bound height and prevent disappearing controls.

## Acceptance
Mobile 390px, desktop, 320px/200% text, light/dark, keyboard and reduced motion.
Prove local filtering, same-page hero, legacy deep links, status change/clear
pinning, privacy transition, custom topics, shared read-only, persistence across
reload, rapid open/close, and no horizontal overflow. Capture within CI's existing
screenshots/theme-rehearsal tree. Local browser execution is policy-blocked: do
not retry; source checks and CI browser evidence are separate gates.
