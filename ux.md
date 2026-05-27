# KinkSync — UX/UI Roadmap

> Findings from structured UI/UX audit. Ordered by severity: Critical → Significant → Moderate → Polish.
> Status: 24/24 addressed. All items closed. 🖤

---

## Critical (fix before next release)

### C1 — Onboarding z-index too low ✅
**File:** `components/Onboarding.tsx:82`
Inline `zIndex: 50` conflicts with the design system layer spec (`500` for onboarding overlays). Any future modal (z-index 200), popover (400), or PWA toast (120) will render on top of onboarding.
**Fix:** Change inline style to `zIndex: 500`.
**Done:** `zIndex: 500` applied.

### C2 — KinkRow pill touch targets below 44px minimum ✅
**File:** `components/KinkRow.tsx:133-147`
Primary interaction elements — the most-touched UI in the app — are only ~22–28px tall. Normal mode uses `py-1 text-[11px]`, compact mode uses `py-0.5 text-[10px]`.
**Fix:** `py-2.5` in normal mode, `py-1.5` in compact mode. Five pills per row may need horizontal scroll or wrapping at narrow widths.
**Done:** `py-2.5` normal / `py-1.5` compact applied.

### C3 — CheckIn modal is pure friction with no function ✅
**File:** `components/CheckIn.tsx`
Full-screen interrupt fires on every fresh profile open. Every button (all four mood options + "Doorgaan →") calls `onDone` identically — mood is never stored, never surfaced, never affects any behaviour. Maximally interruptive, zero functional return.
**Fix:** Store mood on the profile and surface it meaningfully (e.g. show on ProfileHero, influence compare scoring), or remove the modal entirely.
**Done:** Modal removed entirely.

### C4 — Compare page sidebar pattern breaks on portrait mobile ✅
**File:** `app/compare/page.tsx:206`
`md:flex md:gap-6 md:items-start` with `md:w-72 md:sticky` sidebar stacks to a single column on mobile. Profile selectors + identity chips + summary + score + heatmap + filters render as ~400–500px of vertical content before the user reaches the kink list.
**Fix:** Collapse controls into a sticky header strip on mobile or move them into a bottom sheet. Kink list should be visible within the first viewport.
**Done:** Mobile-only sticky selector strip added; sidebar hidden on mobile (`hidden md:block`), fully visible on desktop by design.

### C5 — Session page has no error recovery or progress feedback ✅
**File:** `app/session/page.tsx`
ICE gathering failures show no explanation and reset to idle with no retry guidance. Spinners (`"Verbinding voorbereiden…"`) have no timeout and no progress indication — on poor connections ICE can take 10–30 seconds, causing users to assume the app froze. SDP paste fallback textarea (`lines 402-421`) has no label explaining what to paste or where to obtain it.
**Fix:** Add 20s ICE timeout with a clear retry CTA. Add descriptive label to paste fallback. Show elapsed time or a "still working…" message after 5s.
**Done:** ICE gathering timeout reduced to 3s with graceful fallback; elapsed time display added; paste fallback labelled; WiFi requirement noted in UI.

---

## Significant

### S1 — Create-profile form always visible, buries existing profiles ✅
**File:** `app/page.tsx:238-317`
The full new-profile form (name input + role dropdown + experience grid + relationship pills + submit) renders at full height on every visit, pushing the profile list ~350px down. Returning users with existing profiles see form-first on every load.
**Fix:** Collapse form behind a "+ Nieuw profiel" toggle button when at least one profile exists. Auto-expand on first visit.
**Done:** Form collapsed behind `+ Nieuw profiel` toggle; auto-expands when no profiles exist.

### S2 — Profile page FAB overlaps content, buttons unlabelled ✅
**File:** `app/profile/[id]/page.tsx:571-592`
The floating "↓ TXT" / "↓ PDF" FAB at `bottom-6 right-4 z-10` obscures the last kink row on scroll. `pb-24` padding is the only safeguard and is not conditional on FAB presence (imported profiles show a lock notice instead). The split button has no contextual label — new users won't know what TXT/PDF refers to.
**Fix:** Add "Exporteer" label above the FAB. Make `pb-24` conditional on FAB visibility. Consider a bottom sheet for export options.
**Done:** "Exporteer" label added; bottom padding conditionally `pb-28` (own) / `pb-10` (imported).

### S3 — Onboarding skip button is invisible and untappable ✅
**File:** `components/Onboarding.tsx:142-148`
Skip button on step 0: `font-size: 0.75rem`, `color: rgba(255,255,255,0.2)`, `padding: 0.25rem 0.5rem`. Contrast ratio ≈ 1.3:1 (WCAG AA requires 4.5:1 for small text). Touch target ≈ 24×18px.
**Fix:** `padding: 0.75rem 1rem`, `color: rgba(255,255,255,0.45)` minimum. If intentionally de-emphasised, use `rgba(255,255,255,0.35)` which passes at 2.5:1 for large interactive elements while remaining subdued.
**Done:** `padding: 0.75rem 1rem`, `color: rgba(255,255,255,0.35)` applied.

### S4 — Compare header action buttons wrap chaotically on mobile ✅
**File:** `app/compare/page.tsx:181-203`
Header row uses `flex-wrap` containing `← Terug`, `h1`, `🎭 Plan een scène`, and `✍ Teken het contract`. On 390px these four items wrap across 2–3 lines unpredictably.
**Fix:** Move action buttons below the profile selectors section. Header row should contain only back link and page title.
**Done:** Action buttons relocated below the profile selectors section.

### S5 — Contract canvas clearRect only clears top-left quarter on HiDPI screens ✅
**File:** `app/contract/page.tsx:167-170`
`clearRect(0, 0, c.offsetWidth, c.offsetHeight)` is called after the canvas is scaled by `dpr` (`canvas.width = canvas.offsetWidth * dpr`). On 2× or 3× screens, the CSS pixel dimensions cover only a fraction of the physical canvas — the rest of the signature persists visually.
**Fix:** Use `clearRect(0, 0, c.width, c.height)` (physical pixel dimensions) or store the unscaled context reference and clear before the `ctx.scale()` call.
**Done:** `clearRect(0, 0, c.width, c.height)` applied — physical pixel dimensions used.

### S6 — Session live-rating pills are unreadable and untappable ✅
**File:** `app/session/page.tsx:519-530`
During the connected phase, status pills use `text-[10px] px-2 py-0.5` ≈ 20px height — the critical rating interaction during an active live session.
**Fix:** Match KinkRow normal-mode pill size (`py-2.5`). These are tapped under real conditions, potentially one-handed.
**Done:** Session pills enlarged to match normal-mode pill size.

### S7 — No global NavBar — navigation dead-ends on multiple pages ✅
No persistent navigation component exists. Profile page: `← Terug` only. Session revealed state: `← Terug naar home` only. Contract page: no link to profile pages. Deep-linked users (shared QR) have no route to other features.
**Fix:** Implement a minimal sticky bottom nav (Home / Vergelijk / Sessie) at `z-index: 100` — the slot is reserved in the design system but unused. Three icons with labels is sufficient.
**Done:** `components/BottomNav.tsx` created and wired into all main pages.

---

## Moderate

### M1 — CategorySection bulk-skip has no undo ✅
**File:** `components/CategorySection.tsx:68-89`
"Sla over" button in the sticky category header silently sets every kink in the category to `"no"` with no confirmation and no undo. On a 30+ kink category, this is a large destructive action one tap away from the collapse chevron.
**Fix:** Show a 3-second undo toast after bulk-skip. One tap to revert.
**Done:** 3-second undo toast implemented with full state restoration.

### M2 — FetLife field saves on blur with no confirmation ✅
**File:** `app/profile/[id]/page.tsx:369-394`
`onBlur={saveFetLife}` saves silently. On mobile, blur fires unpredictably and users have no visual confirmation the value persisted.
**Fix:** Show brief "Opgeslagen ✓" state for 1.5s after blur fires.
**Done:** `fetLifeSaved` state shows `✓` for 1.5s after blur.

### M3 — Profile DNA bar has no legend ✅
**File:** `components/ProfileHero.tsx:210-263`
"Kink-DNA" bar uses five coloured segments with icon-only labels (`✓ 12`, `↗ 5`, etc.). Icons map to status values but are unexplained inline. New users cannot decode the bar without cross-referencing the kink list.
**Fix:** Add one-line legend below the bar: `✓ Ja · ↗ Graag · ♡ Misschien · ✕ Nee · ✕✕ Grens`.
**Done:** Legend row added below the DNA bar.

### M4 — Onboarding progress dots skip step 0 ✅
**File:** `components/Onboarding.tsx:103-115`
Dots only render when `step > 0`. Step 0 (splash) has no position indicator — users don't know how many screens are coming.
**Fix:** Render dots from step 0, showing dot 0 filled and dots 1–5 empty, to set expectations from the start.
**Done:** Dots rendered from step 0.

### M5 — Contract 2-column grid overflows at 390px ✅
**File:** `app/contract/page.tsx:474-586`
`grid-cols-2` for the Person A / Person B safeword and aftercare section gives ~155px per column on a 390px screen. "Eten & drinken" and other multi-word labels overflow or wrap mid-word. Traffic-light buttons at 32×32px are crowded.
**Fix:** `grid-cols-1 sm:grid-cols-2`. Add `min-w-0 overflow-wrap: break-word` to column containers.
**Done:** `grid-cols-1 sm:grid-cols-2` applied with `break-words` on column containers.

### M6 — Session revealed screen offers no next step ✅
**File:** `app/session/page.tsx:557-591`
After match reveal, the only CTA is `← Terug naar home`. The natural next steps — view detailed compare, create a contract — are not offered at the moment of highest intent.
**Fix:** Add "Vergelijk uitgebreid →" link to `/compare` and "Maak een contract →" link to `/contract` with relevant profile IDs pre-filled.
**Done:** Both links added with `?a=${profileId}` pre-filled.

---

## Polish

### P1 — Onboarding animations ignore `prefers-reduced-motion` ✅
**File:** `components/Onboarding.tsx`
All keyframes (`ks-slide-up`, `ks-icon-pop`, `ks-fade-in`, etc.) are defined in an inline `<style>` tag, bypassing the `@media (prefers-reduced-motion: reduce)` block in `globals.css`. Animations run regardless of system accessibility preference.
**Fix:** Move keyframes to `globals.css` inside the existing reduced-motion media query guard, or add a `@media (prefers-reduced-motion: reduce)` block to the inline styles.
**Done:** `@media (prefers-reduced-motion: reduce)` block added to inline `<style>` zeroing all keyframe durations.

### P2 — `--no` and `--hard-no` colors are visually indistinguishable ✅
**File:** `globals.css`
Default theme: `--no: #f87171`, `--hard-no: #ef4444` — both red, differing only in saturation. Hard limits carry real safety weight in this context; they must be visually distinct even at a glance.
**Fix:** `--no` → muted amber/orange (e.g. `#fb923c`), `--hard-no` stays red. Ensure this is consistent across all theme variants.
**Done:** `--no` changed to `#fb923c` (amber) across all theme variants.

### P3 — Disabled home CTAs hidden from screen readers ✅
**File:** `app/page.tsx:556-568, 583-596`
Greyed-out "Vergelijk profielen" and "Maak een contract" cards use `aria-hidden="true"` — screen reader users get no indication these features exist or what they require to activate.
**Fix:** Replace with `role="button" aria-disabled="true"` and include the explanatory sub-text in the accessible label.
**Done:** `aria-disabled="true"` applied; explanatory text included in accessible labels.

### P4 — Settings sheet drag handle implies swipe-to-dismiss but gesture is unimplemented ✅
**File:** `app/page.tsx:787`
The pill handle (`w-10 h-1 rounded-full`) is a standard iOS/Android swipe-to-dismiss affordance. The sheet only closes via overlay click or "Sluit" button. Users will instinctively swipe down and nothing will happen.
**Fix:** Implement drag-close with Framer Motion `drag="y"` + threshold, or remove the handle entirely.
**Done:** Native touch events wired — `onTouchStart/Move/End` track drag offset; dragging past 80px closes the sheet; spring-back below threshold. No animation library needed.

### P5 — Import sheet uses "Weiger" instead of "Annuleer" ✅
**File:** `app/page.tsx:819`
"Weiger" (refuse/reject) implies rejecting a person, not cancelling an action. In an interpersonal app this carries unintended social weight.
**Fix:** Change to "Annuleer" or "Niet nu".
**Done:** Changed to "Niet nu".

### P6 — "Live Sessie" uses title-case while all other headers use sentence-case ✅
**File:** `app/session/page.tsx:354`
All other page headers (`Vergelijk profielen`, `Teken het contract`) use sentence-case. `Live Sessie` breaks the pattern.
**Fix:** Change to `Live sessie`.
**Done:** Changed to `Live sessie`.

---

## Summary table

| ID | Area | File | Priority | Status |
|----|------|------|----------|--------|
| C1 | Onboarding z-index | `components/Onboarding.tsx` | Critical | ✅ |
| C2 | KinkRow touch targets | `components/KinkRow.tsx` | Critical | ✅ |
| C3 | CheckIn modal friction | `components/CheckIn.tsx` | Critical | ✅ |
| C4 | Compare mobile layout | `app/compare/page.tsx` | Critical | ✅ |
| C5 | Session error recovery | `app/session/page.tsx` | Critical | ✅ |
| S1 | Home form always visible | `app/page.tsx` | Significant | ✅ |
| S2 | Profile FAB overlaps content | `app/profile/[id]/page.tsx` | Significant | ✅ |
| S3 | Onboarding skip invisible | `components/Onboarding.tsx` | Significant | ✅ |
| S4 | Compare header wraps | `app/compare/page.tsx` | Significant | ✅ |
| S5 | Contract canvas clearRect | `app/contract/page.tsx` | Significant | ✅ |
| S6 | Session pill size | `app/session/page.tsx` | Significant | ✅ |
| S7 | No global NavBar | `components/BottomNav.tsx` | Significant | ✅ |
| M1 | CategorySection bulk-skip undo | `components/CategorySection.tsx` | Moderate | ✅ |
| M2 | FetLife save feedback | `app/profile/[id]/page.tsx` | Moderate | ✅ |
| M3 | DNA bar legend | `components/ProfileHero.tsx` | Moderate | ✅ |
| M4 | Onboarding dot index | `components/Onboarding.tsx` | Moderate | ✅ |
| M5 | Contract grid overflow | `app/contract/page.tsx` | Moderate | ✅ |
| M6 | Session post-reveal CTAs | `app/session/page.tsx` | Moderate | ✅ |
| P1 | Reduced motion onboarding | `components/Onboarding.tsx` | Polish | ✅ |
| P2 | no/hard-no color distinction | `globals.css` | Polish | ✅ |
| P3 | Disabled CTAs aria-hidden | `app/page.tsx` | Polish | ✅ |
| P4 | Sheet drag handle affordance | `app/page.tsx` | Polish | ✅ |
| P5 | "Weiger" → "Annuleer" | `app/page.tsx` | Polish | ✅ |
| P6 | Live Sessie capitalisation | `app/session/page.tsx` | Polish | ✅ |
