# Phase 31 — Main ↔ dev audit: the mirror confession

*2026-07-11 · main `5dfa581` (v4) vs dev `03c1ee2`+ (v5) · this is the gate before any dev → main promotion PR.*

## Method

Both versions built for production and served side by side (main :3001, dev :3002).
Identical seeded localStorage (two profiles, six rated kinks, comments, pin) at
375×812, full-page screenshots of all eight surfaces, compared by eye and by code
diff. Store shape and route surface diffed directly. Findings below follow the
house rule: every "regression" claim traced through git history for an alibi
before being called one.

## Verdict per surface

| Surface | Verdict | Notes |
|---|---|---|
| Home | **Improved** | Profiles promoted above the fold, actions as compact chevron rows, Nieuw profiel/Scan QR demoted to footer links. `Open →` CTA killed in `6b419c9` — the whole card is a Link now (verified in `ProfileList.tsx:98`), so access is preserved. Per-profile DNA mini-bar no longer on home (moved with the hero strip, see Profile). |
| Profile | **Improved, one deliberate trade** | Hero stripped to identity (name, role, level) in `5bd1c25`/`e3b792a` — "hero is identity, not statistics". DNA bar + status counts now live in the Bewerken tab's sticky header. The v4 hero's "X van 181 beoordeeld · sterkste categorie" summary has no v5 equivalent in the Overzicht tab — flagged below as the one debatable loss. |
| Compare | **Improved** | Status chips now colour-coded per verdict (v4 wore uniform lilac); empty note fields collapse to `+ Notitie` instead of two placeholder boxes. Same overlap %, same counts — matching logic untouched. |
| Contract | **Improved** | Section order now reads as escalation: gedeelde verlangens → zachte grenzen → harde grenzen (v4 had hard before soft). Editorial serif section heads. All fields, signature pads, echte-namen flow preserved. PDF export gained house fonts, metadata, tinted verdicts, party-coloured comment bullets, page numbers (PR #247). |
| Scene | **Unchanged** | Verbond-vereist gate identical both sides. |
| Scenes | **Unchanged** | Structure identical; serif section labels. |
| Session | **Improved** | Emoji (📡🔑) replaced by Phosphor icons; copy identical. |
| Timeline | **Unchanged** | Structure identical; native selects restyled by the controls branch. |

## Upgrade safety (v4 user opens v5)

- Same Zustand persist `version: 15` on both sides; the store diff is **purely
  additive** (`bdsmtestScores?` on Profile + one setter). No migration runs, no
  field is re-interpreted. A v4 localStorage loads in v5 byte-compatibly.
- Route surface identical (no page removed).
- Same-origin PWA: the Serwist precache manifest includes the lazy PDF font
  chunks — offline export keeps working after upgrade (verified in sw.js).

## Regressions found (and their alibis)

1. **e2e spec rot — `ui-audit.spec.ts` DNA test** *(fixed this session)*.
   The spec still asserted the v4 hero's `aria-label="Kink DNA verdeling"`, and
   its seed used v8-era kink ids (`bdsm-general`, …) that no longer exist — so
   the "5 statuses" assertion had been passing vacuously against an empty
   overview. Rewritten with live kink ids, `version: 15`, the radio-group tabs,
   and a non-empty DNA label assertion. Proven red-against-old, green-against-new.
2. **Poisoned verification run** *(process failure, not code)*. The morning's
   "178 passed" full e2e run cannot have exercised dev's real profile page —
   the DNA test fails deterministically against dev code. `reuseExistingServer:
   true` will happily latch onto any stale dev server left on :3000 by an
   earlier session. The suite was re-run against a guaranteed-fresh server as
   part of this audit (result recorded below).
3. **Hero stats strip** — *not* a regression by the house definition (deliberate
   in `5bd1c25`), but the only v4 information with no v5 home: the Overzicht tab
   shows "X beoordeeld" without the total (X van 181), desire summary, or
   strongest category. Queued as a suggestion, not a fix.

## Queued follow-ups

- [ ] `playwright.config.ts`: `reuseExistingServer: !process.env.CI` so a
      verification run (`CI=1 npm run test:e2e`) can never reuse a stale server.
- [ ] Suggestion (ask owner): reintroduce a one-line "X van 181 · sterkste:
      Impact Play" whisper in the Overzicht tab — statistics without costume.
- [ ] Owner device walk-through + one iOS Safari PDF export check remain the
      human half of the launch gate.

## Full e2e status

- Unit: 228/228 green · build clean (both at audit time).
- Offline suite: 2/2 green against a production build.
- Full e2e re-run on fresh server (own dev server, nothing pre-listening on
  :3000): **179 passed, 0 failed, 3 flaky-passed-on-retry** in 35.5 min, with
  the rewritten DNA spec included. This run, not the morning one, is the
  verification of record for the v5 stack.
