# Future improvements

Items identified during UI/UX audit (May 2026). Completed items removed.

## Navigation polish (TopNav)
Follow-ups on the sticky header that replaced the bottom bar. Mobile-first — the bottom bar was easier to reach one-handed, so reachability is the open question.
- **Bottom-anchored variant for reach**: same pills, but floating bottom-right on phones (not full-width) — keeps the clean look while landing in the thumb zone. Biggest open tradeoff from the switch.
- **Hide-on-scroll-down / reveal-on-scroll-up**: auto-tuck the header while scrolling down a long kink list, slide it back on scroll up — maximises content on small screens.
- **Sliding active indicator**: animate the active pill with a framer-motion `layoutId` so the highlight glides between tabs instead of snapping.
- **Personal profile pill**: swap the 👤 glyph for the pinned profile's avatar thumbnail when one exists.
- **Notch / standalone safe-area check**: verify `env(safe-area-inset-top)` padding on notched iPhones in installed PWA mode — only eyeballed in browser so far.
- **Reduced-motion guard**: gate the scroll blur/fade transition behind `prefers-reduced-motion` for motion-sensitive users.
- **Tap feedback**: subtle scale/opacity press state on pills for tactile response.

## Quick wins
Independent, parallelisable — minimal logic, CSS/attr only:
- **Pill scroll hint**: Right-edge fade gradient on horizontal pill rows to signal scrollability
- **Vibe badge animation**: The vibe badge ("Avontuurlijk 🔥" etc.) could fade in when first calculated
- **Status pill active glow**: Active status pill could have a subtle outer glow matching its color (like the ⓘ button)
- **Screen reader live region**: When a kink status changes, announce the new status via `aria-live="polite"`
- **Profile edit (pencil) button still 40px**: `app/profile/[id]/page.tsx` — `w-10 h-10`, just under the `w-11 h-11` (44px) used by the export FABs next to it. Bump for touch-target parity.

## UX / Interaction
- **Profile skeleton / loading state**: Profile page shows no skeleton while Zustand hydrates — add a shimmer skeleton for the overview cards
- **Category search result highlight**: Matched text in search results isn't highlighted
- **Kink count badge on category header**: Show rated/total as a badge in the sticky edit-list scrollspy nav
- **Swipe-to-rate gesture**: Swipe right on a KinkRow to cycle status, swipe left to clear — reduces tap targets needed for quick rating
- **Overview filter / sort**: In the profile read-only overview, let user filter by status (e.g. show only "Graag" and "Ja") or sort alphabetically
- **Edit list auto-close after rating session**: After a period of inactivity in the edit list, offer to collapse it back to overview mode
- **Home compare CTA always picks first two profiles**: `app/page.tsx` — the "Vergelijk" shortcut always compares `profiles[0]`/`profiles[1]` regardless of which pair the user actually cares about. Default to the last-viewed pair, or let the user pick.
- **"Besproken" toggle is session-only**: `app/compare/page.tsx` — the discussed/hide-discussed state resets on refresh with no indication it's temporary. Persist it (sessionStorage or store) or add a "(tijdelijk)" note.

## Visual / Design
- **DNA bar tooltip**: Tapping/hovering a DNA bar segment could show a tooltip with the count and label
- **Dark mode variants**: Currently only dark themes — consider auto light-mode via `@media (prefers-color-scheme: light)`
- **Avatar upload drag-and-drop**: Allow dragging an image file onto the avatar button, not just clicking
- **Overview card tap-to-edit**: Tapping a read-only overview card could jump directly to that kink in the edit list (scroll + open accordion)

## Performance / Technical
<!-- all four items are independent — parallelisable -->
- **Playwright CI integration**: Run `pw-audit.mjs` in CI to catch visual regressions automatically
- **Bundle size audit**: Run `npm run build` output analysis (`@next/bundle-analyzer`)
- **Custom kink persistence race**: If user adds a custom kink and immediately navigates away, Zustand's persist debounce may drop the write
- **Offline support**: App is localStorage-only but has no service worker — PWA manifest exists but no caching strategy

## Accessibility
- **Keyboard navigation in accordions**: Tab order inside closed CategorySection skips hidden content but focus can still land inside — verify with keyboard-only navigation
- **Color-only distinction**: Status colors (yes/willing/maybe/no/hard_no) are distinguished only by color — add icon/pattern for users with color vision deficiency
- **Experience-level / relatiestatus groups use `<p>` + `role="group"`, not `<fieldset>/<legend>`**: `app/page.tsx` (~L478, L630) and `app/profile/[id]/page.tsx` (~L858) — the `aria-label` on the group helps, but `<fieldset>/<legend>` is the more standard pairing for screen readers.

## Phase 3b follow-ups (nieuwsgierig + KinkRow, 2026-06-19)
- **Nieuwsgierig pair distinction on compare page**: `nieuwsgierig+nieuwsgierig` (discuss/50) and `maybe+yes` (discuss/45) land in the same bucket with identical row styling. A subtle cyan dot or label variant on `compare/page.tsx` row renderer could surface the difference without bloating the layout.
- **Safety tags visible by default on partner profiles**: Tags like "vraag eerst" are safety-relevant. In read-only profile view, rows with active tags should default to `tagsOpen: true` so the viewer doesn't miss a boundary behind a tap. Only applies to the read-only `Overzicht` rendering path, not the edit list.
- **Nieuwsgierig swatch in contract PDF**: `app/contract/page.tsx` PDF row renderer uses CSS vars for colour swatches — those don't resolve in jsPDF. Hardcode `#06b6d4` for `nieuwsgierig` alongside the existing hardcoded hex fallbacks for the other statuses.
- **Status explainer i18n extraction**: The explainer sheet in `app/profile/[id]/page.tsx` is hardcoded Dutch. If multilingual support ever lands, extract the `STATUS_EXPLAINER` array to a locale file — it's a natural extraction point with no logic attached.

## Features
- **Export to PDF on mobile**: jsPDF export works on desktop but PDF rendering on iOS Safari has quirks — test and fix
- **Compare filter: "Only my yes + their yes"**: Add a quick filter for mutual enthusiastic matches only
- **Kink notes in compare view**: When two profiles have the same kink matched, show a collapsed view of each person's comment
- **Contract versioning**: Save multiple contract snapshots per pair, with timestamps — currently only one contract per pair is stored
- **Profile import validation**: Imported profiles currently accept any JSON shape — add Zod/schema validation to prevent crashes from malformed imports
