# KinkSync — Roadmap

Site: **kinksync.be** | Stack: Next.js 16, TypeScript, Tailwind v4, Zustand, jsPDF

---

## Phase 1 — Now (Quick wins + depth)

### ✅ Rebrand: KinkList → KinkSync
Update all UI text, metadata, PDF headers, and manifest to use "KinkSync" and "kinksync.be".
**Files:** `app/layout.tsx`, `app/page.tsx`, `app/contract/page.tsx`, `app/profile/[id]/page.tsx`

---

### F1 — Kink Info Cards (ⓘ)
Populate `description` on all 134 kinks in `lib/kinks.ts`. Add ⓘ button in `components/KinkRow.tsx` that opens a bottom sheet with Dutch plain-language description, consent note, and experience level badge.

---

### F2 — JSON Backup & Import
Export full profiles as `kinksync-backup-{date}.json`. Import with validation + duplicate detection. Accessible via ⚙ in home header.
**Files:** `app/page.tsx`, `lib/store.ts`

---

### F3 — Safeword & Aftercare in Contract
Before signatures: each person enters their safeword, selects traffic-light level (🟢🟡🔴), and toggles aftercare chips. Feeds into PDF as "Safeword & Nazorg" section.
**Files:** `app/contract/page.tsx`, `types/index.ts`

---

### F4 — Compatibility Score + Category Heatmap
Compare page: large % compatability score + grid of category pills colored green→red. High score (>70%) triggers subtle confetti CSS animation on load.
**Files:** `app/compare/page.tsx`, `components/CompatibilityScore.tsx`

---

### F6 — Discussion Tracker
Each kink row in compare gets "Besproken ✓" toggle. Counter: "💬 14/22 besproken". Session-only state.
**Files:** `app/compare/page.tsx`

---

### F7 — Collapsible Comment Box
Multi-line textarea (3→6 rows auto-expand), char counter 0/200, tag chips: "eerste keer", "alleen privé", "scène specifiek", "vraag eerst". Tags shown in PDF.
**Files:** `components/KinkRow.tsx`, `types/index.ts`

---

### F11 — Profile PDF Export (KinkSync branded)
PDF from profile page: KinkSync logo + kinksync.be, profile name/role/date, color-coded kinks by status, stars as ★, tags + comments.
**Files:** `app/profile/[id]/page.tsx`, `lib/exportProfilePDF.ts`

---

### F12 — Contract Versioning
Save slim snapshot on PDF export. "Eerdere contracten" section on contract page. Tap to re-generate + download.
**Files:** `app/contract/page.tsx`, `lib/store.ts`, `types/index.ts`

---

### F14 — Emotional Check-in
One-time overlay on first open of empty profile. Emoji check-in (not stored). Calming tone. Once per profile, never repeated.
**Files:** `app/profile/[id]/page.tsx`, `components/CheckIn.tsx`

---

### F15 — Dynamic Contract Personalization
Preamble uses actual names, roles, and adjusts for experience level gap. Logic extracted to `lib/contractText.ts`. No content removed — additive only.
**Files:** `app/contract/page.tsx`, `lib/contractText.ts`

---

## Phase 2 — Next Sprint

### F10 — Onboarding Wizard (Gorgeous, Proper UX)
Full-screen portal, cinematic entry, 4 steps with smooth slide+fade transitions.

**Step 0:** "KinkSync" fades in, subtitle appears, pulse "Begin" CTA  
**Step 1:** 🔒 Privacy first — no server, no account  
**Step 2:** Animated 4-icon flow (person → stars → compare → contract)  
**Step 3:** Age gate — "Ja, ik ben 18+" / "Ik ben jonger" (shows lockout)

Transitions: 300ms slide-left + fade. Step dots: active dot expands with spring-like CSS width. Staggered entry on step 0.
**Files:** `components/Onboarding.tsx`, `app/page.tsx`, `lib/store.ts` (add `onboardingComplete`)

---

### F9 — PWA / Install Prompt (once)
`public/manifest.json` + meta link. Install banner shown on 3rd visit. State: `installPromptDismissed: boolean` — never shown again.
**Files:** `public/manifest.json`, `app/layout.tsx`, `app/page.tsx`, `lib/store.ts`

---

### F16 — KinkSync Share via URL / QR
Profile → encoded base64/lz URL fragment. Partner opens link → "Importeer profiel?" modal. QR button on profile page renders encoded URL.
**Files:** `app/profile/[id]/page.tsx`, `components/QRModal.tsx`, `app/page.tsx`

---

## Phase 3 — Standalone Feature

### F8 — Scene Builder (`/scene`)
Plan a scene from matched kinks. Drag-reorder list. Intensity per item (Zacht/Midden/Intens). Time estimates. Notes. Export as A5 PDF "Scène Menu".
**Files:** `app/scene/page.tsx`, `components/SceneCard.tsx`

---

## UI/UX Polish (ongoing)

- Compact kink row toggle (full picker ↔ dot-picker)
- Category bulk skip action
- Split-screen layout at ≥768px (tablet)
- Animated match reveal on compare page
- Contract signing ceremony (dim + message before PDF)
- Sensual theme variants: Midnight (default), Deep Red, Forest, Monochrome
- Kink search filter on profile page
