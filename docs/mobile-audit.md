# Mobile UI/UX audit — Jun 11, 2026

Living checklist from a full Playwright sweep at 390×844 (`/tmp/kink-audit-*.png`).
Tick items as they ship. Add new findings under `## Backlog discoveries` at the bottom.

Source: 16 screens covering every route + offline/onboarding/scrolled states.
B2 (N-pin on onboarding) was a Vercel preview indicator, not an app bug — dropped from the list.

---

## 🔴 Blockers

- [x] **B1 — `/scenes/[id]` empty/error state is a single line of text on black**
  - Screen: `09-scene-detail.png`
  - "Scène niet gevonden." has no back CTA, no illustration, no recovery path.
  - **Fix:** add `<Link href="/scenes">Terug naar scènes</Link>` button + a friendly empty illustration. Also investigate why the seeded scene didn't render (probably store shape mismatch in `scripts/screenshots.mjs` seed — confirm `state.scenes` is the right key).

- [ ] **B3 — Compare page shows two identical rows of profile chips**
  - Screen: `06-compare.png`
  - Top of `/compare` renders A-Alex / S-Sam / A-Alex / S-Sam → reads as duplicate state.
  - **Fix:** single picker row with two labelled slots: `Profiel A: [Alex ▾] · ⇄ · Profiel B: [Sam ▾]`, or label the two columns explicitly ("Kolom links" / "Kolom rechts") with a divider between them.

---

## 🟠 Should-fix (inconsistency, clutter)

- [ ] **S1 — Emoji icons leak through the "leash to Lucide" rule**
  - Hub cards: 💍 Maak een contract · 📜 Nieuwe scène · 📒 Scènes · ✨ in title.
  - Compare filter pills: ⚡ Spanning · 🚫 Grenzen.
  - Session page: 📡 Sessie aanmaken · 🔑 Deelnemen met code.
  - Offline page: 📡 satellite glyph.
  - **Fix:** swap to `Handshake` / `Clapperboard` / `ListChecks` / `Zap` / `Ban` / `Radio` / `KeyRound` / `RadioTower`. TopNav + KinkRow + ProfileHero are already Lucide-pure; align everything else.

- [ ] **S2 — Hub TopNav items hug the viewport edge**
  - Screen: `01-hub.png`
  - Centred items + `ml-auto` StatusDot let the outer chip touch the safe-area edge on iOS.
  - **Fix:** wrap centred items in `max-w-[280px]` band, or give the centred container `px-12`.

- [ ] **S3 — Phantom "Opgeslagen ✓" strip reserves ~28 px above ProfileHero**
  - Screen: `04-profile-full.png`
  - `opacity: 0` keeps layout slot; visible gap above the hero card.
  - **Fix:** wrap the strip in `{showSaved && (...)}`, or absolutely-position it so it doesn't displace flow. Keep an `aria-live` region nearby for SR users.

- [ ] **S4 — "Open →" button uses a text arrow instead of `ChevronRight`**
  - Screen: `01-hub.png`
  - Inconsistent with Lucide chevrons everywhere else.
  - **Fix:** `<ChevronRight size={14} />` — or drop the CTA entirely (the whole card is clickable).

- [ ] **S5 — Bewerken tab stacks 5 rows per kink**
  - Screen: `05-profile-bewerken.png`
  - name+info → Richting → status → Harde grens → tags. Wall-of-pills on mobile.
  - **Fix:** collapse Richting into an "Geavanceerd" disclosure that only opens when the user wants directional split. Default = single status row + hard limit + tags.

- [ ] **S6 — Four horizontal strips of chrome before the first kink row**
  - Screen: `05-profile-bewerken.png`
  - Search input + DNA bar + category strip + progress strip.
  - **Fix:** merge the DNA bar with the category strip (use it as the progress indicator), or hide search behind a `Search` icon that expands inline.

- [ ] **S7 — TXT/PDF FAB overlaps the right edge of kink rows**
  - Screen: `03-profile-hero.png`
  - Status pill on the right of the row is the most informative pixel; FAB hides it.
  - **Fix:** shrink to `w-9 h-9`, or collapse into one `Download ▾` button with a dropdown.

- [ ] **S8 — Three pages gate behind "kies twee profielen" but only one offers an inline picker**
  - `/scene` modal: inline two `<select>` dropdowns ✅
  - `/timeline`: inline two dropdowns at top ✅
  - `/contract`: dead-end → "Kies twee profielen via de vergelijkingspagina." ❌
  - **Fix:** mirror the `/timeline` pattern on `/contract` — two profile dropdowns, render the contract preview inline.

- [ ] **S9 — Empty `/scenes` page wastes the viewport**
  - Screen: `08-scenes.png`
  - Three labels (GEPLAND / CONCEPTEN / AFGEROND) with three "Nog geen…" lines, then dead space. `+ Nieuwe scène` CTA hides in top-right.
  - **Fix:** when all three are empty, show one large illustrated empty-state with a primary CTA in the centre; switch to three-section layout only once a scene exists.

---

## 🟡 Nits (polish)

- [ ] **N1 — Hub header has no breathing room between title and settings cog**
  - KinkSync block hugs the left edge; cog hugs the right. Wrap in a single header row with proper gap.

- [ ] **N2 — Compare top-action row mixes button weights**
  - "Plan een scène" is ghost-bordered; "Contract" is filled accent. They're sibling actions → equally-weighted ghosts.

- [ ] **N3 — ProfileHero stat-card carousel only shows 2.5 cards at 390 px**
  - Consider a 2-column grid for the first three cards (Beoordeeld / Eigen kinks / Meest actief) instead of horizontal scroll.

- [ ] **N4 — Compact 8×8 edit button — verify touch target on real device**
  - WCAG 2.5.5 recommends 44×44. The visual is now tight; either pad the surrounding tap area to 44 (visual stays small) or accept a smaller hit and document the trade-off.

- [ ] **N5 — Onboarding has no "next" button, only dots**
  - First-time discoverability low; add `→ Volgende` button next to "Sla over" or make the whole screen tap-to-advance.

---

## ✨ Five things that would meaningfully improve the app

- [ ] **I1 — "Snelle invoer" focus mode for Bewerken**
  Tinder-style: one kink full-screen, 5-button status picker, swipe-right to advance.
  Direction + tags become long-press / pull-down details. 30-min survey → 5-min swipe.

- [ ] **I2 — Persistent BottomNav in browser mode behind an in-app toggle**
  Today PWA-only. Offer "compact nav" pref. Use `visualViewport.height` instead of `100vh` to survive iOS URL-bar resize.

- [ ] **I3 — Extract `<ProfilePair>` primitive used by Compare / Timeline / Contract / Scene planner**
  Each page reimplements the picker. One component → consistent UX, contract dead-end disappears for free.

- [ ] **I4 — DNA bar becomes the navigation key**
  Each segment is tappable → filters the Bewerken tab to that status. Legend becomes the filter UI. Removes the duplicate "Match ✓ / Spanning ⚡ / Grenzen" pills on Compare.

- [ ] **I5 — Diff/changelog mode on Compare**
  Toggle: `Alles · Δ Sinds vorige sessie · 🟠 Spanning · 🔴 Grenzen`. Pulls "wat is verschoven" from `/timeline` into a contract PDF section.

---

## How to re-run the audit

```bash
npm run dev                            # one terminal
node scripts/audit-screenshots.mjs     # in another
ls /tmp/kink-audit-*.png               # 16 screenshots
```

Seed in script populates two profiles (Alex switch, Sam dominant) and a scene
(`scene-01`); update the seed when you add new pages or store fields.

The small 4-shot script at `scripts/screenshots.mjs` is for quick spot-checks;
this one is the full sweep used for the punch list above.

---

## Backlog discoveries

_Add new findings here with date + screenshot ref so they don't get lost between audits._
