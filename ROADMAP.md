# KinkSync — Roadmap

Site: **kinksync.be** | Stack: Next.js 16, TypeScript, Tailwind v4, Zustand, jsPDF

---

## Phase 1 — Shipped ✅

### ✅ Rebrand: KinkList → KinkSync
Update all UI text, metadata, PDF headers, and manifest to use "KinkSync" and "kinksync.be".
**Files:** `app/layout.tsx`, `app/page.tsx`, `app/contract/page.tsx`, `app/profile/[id]/page.tsx`

---

### ✅ F1 — Kink Info Cards (ⓘ)
134 Dutch plain-language kink descriptions with consent notes and experience level badges. ⓘ button opens bottom sheet.
**Files:** `lib/kinks.ts`, `components/KinkRow.tsx`, `components/InfoSheet.tsx`

---

### ✅ F2 — JSON Backup & Import
Export full profiles as `kinksync-backup-{date}.json`. Import with validation + duplicate detection. Accessible via ⚙ in home header.
**Files:** `app/page.tsx`, `lib/store.ts`

---

### ✅ F3 — Safeword & Aftercare in Contract
Before signatures: each person enters their safeword, selects traffic-light level (🟢🟡🔴), and toggles aftercare chips. Feeds into PDF as "Safeword & Nazorg" section.
**Files:** `app/contract/page.tsx`, `types/index.ts`

---

### ✅ F4 — Compatibility Score + Category Heatmap
Compare page: large % compatibility score + grid of category pills colored green→red.
**Files:** `app/compare/page.tsx`

---

### ✅ F6 — Discussion Tracker
Each kink row in compare gets "Besproken ✓" toggle. Counter: "💬 14/22 besproken". Session-only state.
**Files:** `app/compare/page.tsx`

---

### ✅ F7 — Collapsible Comment Box
Multi-line textarea (3→6 rows auto-expand), char counter 0/200, tag chips: "eerste keer", "alleen privé", "scène specifiek", "vraag eerst". Tags shown in PDF.
**Files:** `components/KinkRow.tsx`, `types/index.ts`

---

### ✅ F11 — Profile PDF Export (KinkSync branded)
PDF from profile page: KinkSync logo + kinksync.be, profile name/role/date, color-coded kinks by status, stars as ★, tags + comments.
**Files:** `app/profile/[id]/page.tsx`

---

### ✅ F12 — Contract Versioning
Save slim snapshot on PDF export. "Eerdere contracten" section on contract page. Tap to re-generate + download.
**Files:** `app/contract/page.tsx`, `lib/store.ts`, `types/index.ts`

---

### ✅ F14 — Emotional Check-in
One-time overlay on first open of empty profile. Emoji check-in (not stored). Calming tone. Once per profile, never repeated.
**Files:** `app/profile/[id]/page.tsx`, `components/CheckIn.tsx`

---

### ✅ F15 — Dynamic Contract Personalization
Preamble uses actual names, roles, and adjusts for experience level gap.
**Files:** `app/contract/page.tsx`

---

## Phase 2 — Shipped ✅

### ✅ F10 — Onboarding Wizard
Full-screen portal, cinematic entry, 4 steps with smooth slide+fade transitions. Age gate with lockout for underage.
**Files:** `components/Onboarding.tsx`, `app/page.tsx`, `lib/store.ts`

---

### ✅ F9 — PWA / Install Prompt
`public/manifest.json` + meta link. Install banner shown on 3rd visit. State: `installPromptDismissed: boolean` — never shown again.
**Files:** `public/manifest.json`, `app/layout.tsx`, `app/page.tsx`, `lib/store.ts`

---

### ✅ F16 — Profile Share via URL / QR
Profile encoded to base64 URL fragment. Partner opens link → "Importeer profiel?" modal. QR bottom sheet on profile page.
**Files:** `app/profile/[id]/page.tsx`, `components/QRModal.tsx`, `lib/shareProfile.ts`, `app/page.tsx`

---

## Phase 3 — Standalone Features

### ✅ F8 — Scene Builder (`/scene`)
Plan a scene from matched kinks. Drag-reorder list. Intensity per item (Zacht/Midden/Intens). Time estimates. Notes. Export as A5 PDF "Scène Menu".
**Files:** `app/scene/page.tsx`

---

### F17 — Live P2P Vergelijken (WebRTC)
Real-time comparison session between two devices. No server, no cloud — pure peer-to-peer via WebRTC DataChannel. DTLS encryption prevents MITM: the fingerprint is embedded in the SDP and exchanged via QR, so any interceptor is cryptographically rejected.

**Flow:**
1. Profile A: tap "Live sessie starten" → WebRTC offer SDP → rendered as QR code
2. Profile B: scan QR → receives offer → generates answer SDP → shows as QR
3. Profile A: scans answer → ICE negotiation completes → P2P link live
4. Both see partner's kink selections update in real-time as they rate
5. **Blind reveal ceremony**: both tap "Sluit af" → profiles lock simultaneously → matches revealed with pulse animation

**Why no MITM:** The DTLS fingerprint in the offer SDP is cryptographically bound to A's ephemeral private key. B's browser verifies it on handshake. An interceptor cannot forge the fingerprint — they'd need A's private key, which never leaves the device. The QR exchange is the trust anchor (equivalent to handing your public key in person).

**Tech:**
- `RTCPeerConnection` + `RTCDataChannel` (native browser API, no library needed)
- SDP offer/answer encoded into QR via existing `qrcode` package
- STUN only: `stun:stun.l.google.com:19302` (NAT traversal only — STUN never sees data)
- Session fully ephemeral — scoped to tab, nothing persisted

**Files:** `app/session/page.tsx`, `components/SessionQR.tsx`, `lib/webrtc.ts`

---

### ✅ Uitgebreide Kink Database
Expanded from 108 → 199 kinks across 5 new categories and expanded existing ones. All items leveled 1–4 with Dutch descriptions.

**New categories added:**
- **Uiterlijk & Kleding** — kledingregels, crossdressing M→V & V→M, korset, nudisme, erotisch dansen
- **Ageplay & Little Space** — DD/DM-little dynamiek, baby/infantiliteit, fopspeen, luiers
- **Pet Play** — puppyplay, kittenplay, ponyplay, staart, leiband, kom, kooi (gedetailleerd)

**Expanded existing categories:**
- **Bondage** — gag-types, gasmasker, borstafbinden, suspension (3 typen), opsluiting
- **Power Exchange** — knielen, strafstandjes, meubel/asbak play, 24/7 lifestyle, spreekverbod
- **Sensation Play** — tepelklemmen, fire cupping, naaldjes, Violet Wand, E-stim, shockcollar
- **Impact Play** — over-de-knie, rubber zweep, fire flogger, bullwhip
- **Fetishes** — geur/scent, hoge hakken aanbidding, footjob, laarzen, vossenstaart plug
- **Fluid & Bodily** — watersports gesplitst, bloedplay, katheters/sounds, klysma

**Files:** `lib/kinks.ts`

---

### ✅ F18 — Uitgebreide Rollen & Relatiestatus
Full FetLife-style role vocabulary + relationship status field on profile. Stored as `relationshipStatus?: string`, shown as chip on cards and ProfileHero.
**Files:** `app/page.tsx`, `types/index.ts`, `lib/store.ts`, `components/ProfileHero.tsx`

---

### ✅ F19 — FetLife Profiel Koppelen
Optional FetLife username stored on profile. Inline input on profile page. Privacy gate in QR modal: "FetLife-link meesturen?" defaults to OFF. `avatarDataUrl` always stripped from share payload.
**Files:** `types/index.ts`, `lib/store.ts`, `components/QRModal.tsx`, `lib/shareProfile.ts`, `app/profile/[id]/page.tsx`

---

## UI/UX Polish — Shipped ✅

- ✅ Compact kink row toggle (full picker ↔ dot-picker)
- ✅ Sensual theme variants: Midnight (default), Deep Red, Forest, Monochrome
- ✅ Kink search filter on profile page
- ✅ Profile Hero with Kink DNA fingerprint + prominent QR share CTA
- ✅ Category bulk skip action ("Sla over" per categorie)
- ✅ Kink row redesign: 1–5 verlangenssterren + harde-grensknop + ervaring ja/nee checkbox
- ✅ Profielfoto uploaden (canvas crop → JPEG 0.7, 256×256, nooit in QR)
- ✅ Geïmporteerde profielen kunnen niet worden doorgedeeld (privacy — `isImported` flag, export/share verborgen)

---

## UI/UX Polish — Upcoming

- Split-screen layout at ≥768px (tablet)
- Animated match reveal on compare page
- Contract signing ceremony (dim + message before PDF)

---

## Geplande fixes (volgende iteratie)

### KinkRow: status pills terug, sterren weg, ervaring checkbox blijft
De 1–5 verlangenssterren die in de vorige iteratie zijn toegevoegd, worden teruggedraaid naar de oorspronkelijke status-pills (ja/graag/misschien/nee/harde grens). De pills zijn begrijpelijker. De nieuwe "Ervaring" ja/nee checkbox blijft behouden.

**Wijzigingen:**
- `components/KinkRow.tsx` — StatusPicker terug, sterren weg, experienced checkbox in rij 1
- `components/CategorySection.tsx` — props terug naar `onStatusChange` + nieuw `onExperiencedChange`
- `app/profile/[id]/page.tsx` — handlers, CategorySection-calls en custom kink rijen bijwerken

---

### Home page UX: rol-picker als grouped select
De 24 rol-chips in het aanmaak- en bewerkformulier worden vervangen door een `<select>` dropdown met `<optgroup>` per categorie. Veel minder visuele ruis.

**Groepen:**
- D/s dynamiek: Switch, Dominant, Submissive
- Zorgzame D/s: Daddy Dom, Mommy Dom, little, Middle, Caregiver
- Impact & touw: Top, Bottom, Sadist, Masochist, Rigger, Rope Bunny
- Karakter: Brat, Brat Tamer, Primal Hunter, Primal Prey
- Dier & spel: Handler/Owner, Pet
- Overig: Voyeur, Exhibitionist, Kinkster, Vanilla (curious)

**Wijzigingen:** `app/page.tsx` — beide rolpickers (aanmaken + bewerken) vervangen

---

### Privacy-noot: isImported is een UX-guard, geen cryptografisch slot
Geïmporteerde profielen krijgen `isImported: true` bij import — share/export knoppen worden verborgen. Omdat alles in localStorage staat, kan een technisch gebruiker dit via DevTools omzeilen. Dit is acceptabel voor een pure client-side app.
