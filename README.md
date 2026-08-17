# KinkSync 🖤

> *You've been a very disorganised dominant. Let's fix that.*

Tired of negotiating your next scene over a Google Sheet like some kind of vanilla HR department? Same. KinkSync is a private, browser-based tool for building honest kink profiles, comparing them side-by-side, planning the scene, and signing the contract — so everyone knows exactly what they're begging for before anyone's tied to anything.

No accounts. No servers. No judgment. Just the truth, laid bare.

---

## What's on the menu

- **340+ activities across 19 sinful categories** — Impact Play, Bondage, Power Exchange, Rituals & Protocols, Discipline & Correction, Pet Play, Adult Ageplay, and every other dirty little corner
- **Five-point consent scale** — *Yes* / *Willing to try* / *Maybe* / *No* / *Hard no* — because "I guess" is not a safeword
- **Star scores 1–5** per activity, because not all yeses are equally enthusiastic
- **Per-item notes and tags** — conditions, limits, safety flags, or that one specific request you've been too shy to say out loud
- **Side-by-side compare view** — see where your appetites overlap, where they clash, and what needs a conversation over dinner first
- **Scene planning with aftercare** — turn a compare session into an actual plan, then close it out with the check-in that comes after
- **Digitally signed contracts** — two devices, two signatures, one cryptographically bound agreement, exportable as a proper PDF
- **QR profile sharing** — hand your partner a code instead of your unlocked phone
- **PIN / biometric app lock** and an **installable, offline-capable PWA** — because this stays on your device, not in a tab you forgot to close

---

## Privacy, and we mean it

Everything stays in your browser's `localStorage`. Nothing phones home — no backend, no accounts, no cloud sync, no receipts. Your deepest curiosities are between you, your partner, and your browser history — and you know how to clear that.

---

## Getting started

```bash
npm install
npm run dev
```

Head to [http://localhost:3000](http://localhost:3000) and introduce yourself.

1. **Confirm you're an adult** — this door only opens one way
2. **Create a profile** — pick a name, pick a role, own it
3. **Work the list** — go category by category, be honest with yourself
4. **Compare** — when both profiles exist, the compare page shows you exactly where things get interesting
5. **Plan, sign, play** — turn a match into a scene or a signed contract, then wind down with aftercare

---

## Stack (the boring bit, sorry)

- [Next.js 16](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/) with localStorage persistence
- [Serwist](https://serwist.pages.dev/) for the installable, offline-first service worker

---

## Contributing

PRs welcome. Keep it consensual, keep it kind. Hard limits are respected — don't push scope you weren't given permission for.

---

*For adults. By adults. Use it responsibly and with enthusiastic consent.*
