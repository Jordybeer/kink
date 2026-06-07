# Future improvements

Items identified during UI/UX audit (May 2026). Completed items removed.

## Quick wins
Independent, parallelisable — minimal logic, CSS/attr only:
- **Pill scroll hint**: Right-edge fade gradient on horizontal pill rows to signal scrollability
- **Vibe badge animation**: The vibe badge ("Avontuurlijk 🔥" etc.) could fade in when first calculated
- **Status pill active glow**: Active status pill could have a subtle outer glow matching its color (like the ⓘ button)
- **Screen reader live region**: When a kink status changes, announce the new status via `aria-live="polite"`

## UX / Interaction
- **Profile skeleton / loading state**: Profile page shows no skeleton while Zustand hydrates — add a shimmer skeleton for the overview cards
- **Category search result highlight**: Matched text in search results isn't highlighted
- **Kink count badge on category header**: Show rated/total as a badge in the sticky edit-list scrollspy nav
- **Swipe-to-rate gesture**: Swipe right on a KinkRow to cycle status, swipe left to clear — reduces tap targets needed for quick rating
- **Overview filter / sort**: In the profile read-only overview, let user filter by status (e.g. show only "Graag" and "Ja") or sort alphabetically
- **Edit list auto-close after rating session**: After a period of inactivity in the edit list, offer to collapse it back to overview mode

## Visual / Design
- **DNA bar tooltip**: Tapping/hovering a DNA bar segment could show a tooltip with the count and label
- **Dark mode variants**: Currently only dark themes — consider auto light-mode via `@media (prefers-color-scheme: light)`
- **Avatar upload drag-and-drop**: Allow dragging an image file onto the avatar button, not just clicking
- **Overview card tap-to-edit**: Tapping a read-only overview card could jump directly to that kink in the edit list (scroll + open accordion)
- **iOS 26 "liquid glass" redesign** (port the look from `~/code/auto-apply-agent`): Trade the current opaque slabs for translucent frosted surfaces. The kit:
  - *Enabling change* — re-express `--surface` / `--surface2` / `--surface3` as rgba-with-alpha (~0.6–0.7) across **all 4 themes (midnight/red/forest/mono) + light mode**. Blur over an opaque surface shows nothing, so this is the gate.
  - *Utilities* — add `.glass / .glass-card / .glass-nav / .glass-input / .glass-btn` with `backdrop-filter: saturate(180%) blur(24px)` (+ `-webkit-` twin), lifted from auto-apply-agent's `globals.css`.
  - *Watch-outs* — `backdrop-filter` is GPU-hungry: reserve heavy blur for nav / modals / sheets / toast, go light or skip it on long card lists (mid-range Android jank). Light mode washes out and needs the most tuning. Plenty of components use inline `style={{ background: 'var(--surface) }}` and won't pick up blur until the class is swapped in.
  - *Rollout* — don't big-bang. PoC on **midnight only** (nav + modals/sheets + Toast + UpdateBanner) to feel it in motion, then propagate surface translucency to the other themes. Do it on a branch off `dev` so it doesn't tangle with feat/offline-notifications.

## Performance / Technical
<!-- all four items are independent — parallelisable -->
- **Playwright CI integration**: Run `pw-audit.mjs` in CI to catch visual regressions automatically
- **Bundle size audit**: Run `npm run build` output analysis (`@next/bundle-analyzer`)
- **Custom kink persistence race**: If user adds a custom kink and immediately navigates away, Zustand's persist debounce may drop the write
- **Offline polish**: Serwist SW + `/offline` document fallback now in place (see Completed below). Still open: precache tuning + a "you're offline" indicator in-app rather than only the fallback route.

## Accessibility
- **Keyboard navigation in accordions**: Tab order inside closed CategorySection skips hidden content but focus can still land inside — verify with keyboard-only navigation
- **Color-only distinction**: Status colors (yes/willing/maybe/no/hard_no) are distinguished only by color — add icon/pattern for users with color vision deficiency

## Features
- **Export to PDF on mobile**: jsPDF export works on desktop but PDF rendering on iOS Safari has quirks — test and fix
- **Compare filter: "Only my yes + their yes"**: Add a quick filter for mutual enthusiastic matches only
- **Kink notes in compare view**: When two profiles have the same kink matched, show a collapsed view of each person's comment
- **Contract versioning**: Save multiple contract snapshots per pair, with timestamps — currently only one contract per pair is stored
- **Profile import validation**: Imported profiles currently accept any JSON shape — add Zod/schema validation to prevent crashes from malformed imports

## Completed (session Jun 6 2026 — offline & notifications)
- ~~Offline document fallback~~ — Serwist `fallbacks` route serves `/offline` ("Je bent offline") when a navigation fails with no network
- ~~Notification permission flow~~ — new onboarding step (after Consent), plus a one-time post-onboarding `NotificationPrompt` toast for existing users; iOS-in-browser & already-decided states skipped silently
- ~~Toast system~~ — `ToastProvider` / `useToast` with framer-motion slide-up, 6s auto-dismiss
- ~~Store `notificationPermissionAsked`~~ — persisted + v10→v11 migration
- ~~Latent onboarding crash caged~~ — removed dead `<Step5Content />` reference (undefined component, crashed desktop/installed-PWA path); fixed stale `AftercareEntry` shape in store.test
- ~~Update notifier decision~~ — kept the SW-based `UpdateBanner` as the single update signal; skipped a redundant `version.json` polling toast

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
