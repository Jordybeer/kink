# KinkSync — Roadmap

Site: **kinksync.be** | Stack: Next.js 16, TypeScript, Tailwind v4, Zustand, jsPDF

---

## Recent — Shipped ✅

- ✅ QR code: compact v2 encoding — worst-case exhaustive profiles now fit in a single QR
- ✅ KinkRow: ⓘ info button moved to left of kink name
- ✅ KinkRow: comment button replaced with 💬 (dim = empty, full = has note)
- ✅ KinkRow: "Ervaring" checkbox replaced with consistent pill (turns green when active)
- ✅ KinkRow: font sizes bumped across the board for mobile readability
- ✅ Onboarding: theme picker step inserted before age gate — instant live preview
- ✅ Profile tour: 3-step spotlight coach-mark on first profile visit

---

## Planned / Under Consideration

### Kink categorisation review
Some categories share thematic ground ("Sensation Play" / "Fetishes" / "Breath & Body"). Consider merging "Breath & Body" into "Sensation Play" and auditing any borderline items.

### Framer Motion animations
Currently CSS-only. Evaluate whether adding Framer Motion is worth the bundle size for drag-to-dismiss sheets and the profile tour overlay.

---

## Known Limitations

### Privacy: `isImported` is a UX guard, not a cryptographic lock
Imported profiles get `isImported: true` — share/export buttons are hidden. A technically skilled user could bypass this via DevTools. Acceptable for a pure client-side app.
