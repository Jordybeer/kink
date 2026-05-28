# Future improvements

Items identified during UI/UX audit (May 2026) — not yet implemented.

## UX / Interaction
- **Pill scroll hint**: Right-edge fade gradient on horizontal pill rows to signal scrollability ("Harde grens" gets clipped and users may not discover scroll)
- **Profile skeleton / loading state**: Profile page is 16 000+ px tall at full depth; currently shows no skeleton while Zustand hydrates — add a shimmer skeleton for categories
- **Category search result highlight**: When a user searches kinks, the matched text in results isn't highlighted — add yellow/accent highlight around the matched substring
- **Kink count badge on category header**: Show rated/total as a badge in the sticky category header for quicker orientation
- **Swipe-to-rate gesture**: Swipe right on a KinkRow to cycle status, swipe left to clear — reduces tap targets needed for quick rating

## Visual / Design
- **DNA bar tooltip**: Tapping/hovering a DNA bar segment could show a tooltip with the count and label (currently only legend below bar)
- **Vibe badge animation**: The vibe badge ("Avontuurlijk 🔥" etc.) could fade in when first calculated
- **Status pill active glow**: Active status pill could have a subtle outer glow matching its color (like the ⓘ button)
- **Dark mode variants**: Currently only dark themes — consider auto light-mode via `@media (prefers-color-scheme: light)`
- **Avatar upload drag-and-drop**: Allow dragging an image file onto the avatar button, not just clicking

## Performance / Technical
- **Playwright CI integration**: Run `pw-audit.mjs` (or a headless screenshot diff) in CI to catch visual regressions automatically
- **Bundle size audit**: Run `npm run build` output analysis (`@next/bundle-analyzer`) — profile page likely imports all 300+ kinks at once
- **Custom kink persistence race**: If user adds a custom kink and immediately navigates away, Zustand's persist debounce may drop the write — investigate persist throttle setting
- **Offline support**: App is localStorage-only but has no service worker — PWA manifest exists but no caching strategy

## Accessibility
- **Screen reader live region**: When a kink status changes, announce the new status to screen readers via `aria-live="polite"`
- **Keyboard navigation in accordions**: Tab order inside closed CategorySection skips hidden content but focus can still land inside — verify with keyboard-only navigation
- **Color-only distinction**: Status colors (yes/willing/maybe/no/hard_no) are distinguished only by color — add icon/pattern for users with color vision deficiency

## Features
- **Export to PDF on mobile**: jsPDF export works on desktop but PDF rendering on iOS Safari has quirks — test and fix
- **Compare filter: "Only my yes + their yes"**: Add a quick filter for mutual enthusiastic matches only
- **Kink notes in compare view**: When two profiles have the same kink matched, show a collapsed view of each person's comment
- **Contract versioning**: Save multiple contract snapshots per pair, with timestamps — currently only one contract per pair is stored
- **Profile import validation**: Imported profiles currently accept any JSON shape — add Zod/schema validation to prevent crashes from malformed imports
