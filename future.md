# Future improvements

Items identified during UI/UX audit (May 2026). Completed items removed.

## UX / Interaction
- **Pill scroll hint**: Right-edge fade gradient on horizontal pill rows to signal scrollability ("Harde grens" gets clipped and users may not discover scroll)
- **Profile skeleton / loading state**: Profile page shows no skeleton while Zustand hydrates — add a shimmer skeleton for the overview cards
- **Category search result highlight**: Matched text in search results isn't highlighted — add accent highlight around the matched substring
- **Kink count badge on category header**: Show rated/total as a badge in the sticky edit-list scrollspy nav for quicker orientation
- **Swipe-to-rate gesture**: Swipe right on a KinkRow to cycle status, swipe left to clear — reduces tap targets needed for quick rating
- **Overview filter / sort**: In the profile read-only overview, let user filter by status (e.g. show only "Graag" and "Ja") or sort alphabetically
- **Edit list auto-close after rating session**: After a period of inactivity in the edit list, offer to collapse it back to overview mode

## Visual / Design
- **DNA bar tooltip**: Tapping/hovering a DNA bar segment could show a tooltip with the count and label (currently only legend below bar)
- **Vibe badge animation**: The vibe badge ("Avontuurlijk 🔥" etc.) could fade in when first calculated
- **Status pill active glow**: Active status pill could have a subtle outer glow matching its color (like the ⓘ button)
- **Dark mode variants**: Currently only dark themes — consider auto light-mode via `@media (prefers-color-scheme: light)`
- **Avatar upload drag-and-drop**: Allow dragging an image file onto the avatar button, not just clicking
- **Overview card tap-to-edit**: Tapping a read-only overview card could jump directly to that kink in the edit list (scroll + open accordion)

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

## Completed (session May 28 2026)
- ~~iPhone zoom fix~~ — inputs/textarea/select forced to 16px in globals.css
- ~~Pill reorder (Graag before Ja)~~ — applied across KinkRow, session, profile, ProfileHero DNA
- ~~Micro-animation on kink rating~~ — ks-pop keyframe on KinkRow container
- ~~Categories closed by default~~ — CategorySection useState(false)
- ~~DNA bar label~~ — "Kink DNA" label restored above bar
- ~~Contract preamble collapsible~~ — "Lees meer ↓" toggle added
- ~~Navbar Profile tab~~ — 👤 tab added to BottomNav, links to first profile
- ~~Profile list cards too large~~ — smaller avatar, reduced padding and gaps on home page
- ~~Profile page read-only overview~~ — compare-style cards grouped by category, only rated kinks shown
- ~~Edit list collapsible~~ — hidden behind toggle, auto-opens for empty profiles
