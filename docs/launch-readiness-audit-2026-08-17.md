# Launch-readiness audit — 2026-08-17

Baseline: `dev` @ `eed1c16` ("Collar deep links behind onboarding", PR #360).
Rebased from `b826fa9` (PR #372) when #360 landed mid-audit; every gate below was
re-run on the new baseline.

This audit **continues** `docs/prelaunch-audit-2026-08-07.md`, it does not replace it.
That audit froze at `123cd02` (close-out 2026-08-08) and closed every P0/P1 it
raised. Since then **365 commits / 185 files / +19.240 −4.211 lines** have landed
— catalogus v2, vragenlijst v2, de onboarding-kluis, the 404-kamer. That is the
surface this pass targets: *what walked in after the last safeword check*.

Verdict: **one launch blocker found and fixed** (the update channel was bricked).
Everything else is polish, hygiene, or a decision that belongs to the owner.

---

## 1. Gates

Re-run from a clean `npm ci` on this baseline.

| Gate | Result |
| --- | --- |
| `npm test` | **583 passed / 66 files** green (578 before this audit's fix, +5 new) |
| `npm run build` | green — Next 16.3.0, TypeScript clean, Serwist SW bundled |
| `npm run lint` | **0 errors**, 34 warnings (all unused-var noise) |
| `npm audit` / `--omit=dev` | **0 vulnerabilities** |
| Catalog integrity | 344 kinks, **344 unique ids**, 19 categories — no collisions |
| `npm run test:e2e` | **not runnable here** — see §5.1 |

---

## 2. Launch blocker (fixed in this pass)

### L-01 — The update channel was bricked for almost every user · FIXED

**Where:** `app/sw.ts`, install handler. Introduced `7d25a83` (2026-06-07),
survived the August audit untouched.

**What it did:**

```ts
self.addEventListener("install", (event) => {
  if (!self.registration.active) return;
  event.waitUntil(
    self.registration.showNotification("KinkSync bijgewerkt", { … })
  );
});
```

`ServiceWorkerRegistration.showNotification()` **rejects** unless notification
permission is already `granted`. A rejected promise handed to `install`'s
`waitUntil()` **fails the installation** — the fresh worker is discarded and
never reaches `waiting`.

The `!self.registration.active` guard exempts the *first* install. So the bug
has the nastiest possible shape: **a fresh install works, and every update after
it silently fails.** Users who never granted notifications — the default state,
and on iOS-in-a-browser the *only* possible state (`NotificationPrompt.tsx`
deliberately skips the ask there) — would have stayed collared to whatever build
they first installed. `UpdateBanner` would never fire, because nothing ever
reaches `waiting`.

**Evidence (real Chromium, this build, production server):**

```
serviceWorker.ready    => active
Notification.permission => default
showNotification()      => {"resolved":false,"name":"TypeError",
   "message":"Failed to execute 'showNotification' on 'ServiceWorkerRegistration':
              No notification permission has been granted for this origin."}
```

**Fix:** the announcement is now gated on consent already being on the record,
with a `.catch()` behind it for late revocation. The decision is a pure function
in `lib/swUpdateNotice.ts` (`shouldAnnounceUpdate`) so it is unit-testable —
`app/sw.ts` itself imports serwist and can't be loaded in vitest.
Regression cover: `__tests__/swUpdateNotice.test.ts`, 5 cases.

Verified in the **built** `public/sw.js`: the rejecting call is now unreachable
unless `"granted" === permission`. Behaviour for users who *did* grant
notifications is byte-for-byte unchanged.

---

## 3. Open findings — no code changed, owner's call

Ranked by what actually threatens a launch.

### L-02 — localStorage has no quota safeword · HIGH

There is **no `QuotaExceededError` handling anywhere** in the app.

`zustand/persist` calls `storage.setItem()` with no try/catch of its own
(`node_modules/zustand/middleware.js:302,360-375`) and it fires on *every*
`set()`. So on a full localStorage: the write throws out of the store action,
straight through the React event handler, and the answer the user just gave is
gone. No toast, no retry, no trace.

For an app whose entire hard constraint is "all data in localStorage", silent
data loss is the worst outcome on the board — and CLAUDE.md already ranks
regression/data loss above everything else.

Not hypothetical over time: profiles (~15–25 KB each), 256px JPEG avatars,
contracts, scenes, and a rolling 30 auto-snapshots per profile all accumulate
against a ~5 MB ceiling.

Worth noting: the two *direct* `localStorage.setItem` callers are already
guarded (`lib/profileQuarantine.ts:107`, `components/TriageDeck.tsx:115`). It's
only the persist store — the one holding everything that matters — that is bare.

**Suggested shape:** a `storage` wrapper in the persist config that catches the
quota error, keeps the in-memory state authoritative, and raises a toast
("je kluis zit vol") plus a pointer at the backup export. Needs design; that's
why I didn't ship it blind.

### L-03 — No error boundary · MEDIUM

No `app/error.tsx` and no `app/global-error.tsx`. `app/not-found.tsx` exists and
is lovely; the crash path has nothing. Any uncaught render error — including the
quota throw in L-02 — drops the user on Next's default error page, in an app
whose whole promise is "your data is safe here".

Cheap to add, but it needs copy and a design pass in the house voice, so it's
a decision not a drive-by.

### L-04 — No `robots.ts` / no indexing policy · MEDIUM, product decision

No `app/robots.ts`, no `public/robots.txt`, no `robots` metadata. The layout
advertises `kinksync.be` in its description, so this is a real choice, not an
oversight to auto-fix: **explicit adult content is currently fully indexable.**

Either is defensible — discoverability vs. discretion — but it should be a
decision on the record before launch, not a default. If discretion wins,
`app/robots.ts` with a `noindex` policy takes about four lines.

### L-05 — PWA manifest is thin · LOW

`app/manifest.ts` has no `id`, no `scope`, and no `purpose: "maskable"` icon.

- No `id` — the install identity is derived from `start_url`; changing that
  later orphans existing installs.
- No maskable icon — Android adaptive-icon launchers letterbox the icon into a
  white circle instead of filling the shape.

The installed PWA is a primary surface per CLAUDE.md, so this is worth ten
minutes. *(Checked and cleared: Next **does** auto-inject
`<link rel="manifest">` — confirmed in the prerendered HTML. No bug there.)*

### L-06 — README oversells and undercounts · LOW, but it's the front door

`README.md` still says **"100+ activities spread across 11 sinful categories"**.
Live catalog: **344 kinks across 19 categories**. It also still calls the project
**KinkList** while everything shipping says **KinkSync**.

The privacy claim ("No servers. Nothing phones home.") is — pleasingly — **true
again** on `dev`: `app/api/` is gone, `ioredis` is out of `package.json`, and
there is no outbound `fetch()` to any external host in `app/`, `components/`, or
`lib/`. It was *false* on `main`, which still ships the Redis relay and the
Cloudflare TURN route. Worth keeping straight during the `dev → main` promotion.

### L-07 — Repo hygiene · LOW

- `public/` still carries the Next.js starter litter: `next.svg`, `vercel.svg`,
  `file.svg`, `globe.svg`, `window.svg`. Dead weight in every deploy.
- `public/404-pagina-niet-hier.PNG` is **2.1 MB**. It is served through
  `next/image` (so users get an optimised, resized variant) and it is **not** in
  the SW precache manifest — both checked, both fine. But the source asset is
  worth compressing, and the uppercase `.PNG` is a case-sensitivity trap.
- Next 16.3 **rewrites `AGENTS.md` on every `next build`/`next dev`**
  (`node_modules/next/dist/server/lib/generate-agent-files.js`). The working tree
  goes dirty on its own. Either commit its version once or expect the noise.
- `eslint` lints the generated `public/sw.js` when it exists — 88 phantom
  warnings and 1 error the moment anyone lints after a build. Add it to the
  eslint ignores.

---

## 4. Deliberately re-verified, found clean

Per `corrections.md` ("backlog entries are hypotheses"), the previous audit's
closed findings were spot-checked rather than trusted:

- **No backend.** `app/api/` removed, `ioredis` dropped, zero external `fetch()`.
  The relay/TURN attack surface I first flagged **exists only on `main`**.
- **`SECURITY.md`** now exists at root — the last audit's only PENDING item
  (P2-13) is closed.
- **Crypto** (`lib/crypto.ts`): PBKDF2-SHA256 @ 310k iterations, AES-GCM-256,
  random salt+IV per operation, constant-time PIN comparison, legacy unsalted
  SHA-256 hashes still verifiable. No notes.
- **Input sanitisation** (`lib/sanitizeProfile.ts`): every imported field
  clamped, enums enforced, collections capped. Thorough.
- **XSS:** exactly one `dangerouslySetInnerHTML` — a static string in
  `app/layout.tsx` capturing `beforeinstallprompt`. No user data. Clean.
- **No secrets** committed anywhere.
- **Hydration:** every store-reading page gates on `_hasHydrated`.
- **A11y spot-check:** sheets carry `role="dialog"` + `aria-modal`, live regions
  present, images captioned, `prefers-reduced-motion` honoured in 5 places.
- **PR #360 (`OnboardingRouteGate`), landed mid-audit.** Reviewed on arrival
  because it wraps the whole tree and gates every non-public route. The obvious
  risk was share links: a first-time user opening a partner's link would be
  bounced to `/` and the payload dropped. It isn't — share payloads are read on
  `/` (`app/page.tsx:104-124`, via `parseSharePaste(window.location.href)`), and
  `/` is on the gate's `PUBLIC_ROUTES` allowlist alongside `/about` and
  `/offline`. The gate also fails closed on protected routes until persist has
  been checked, which is the right direction. No regression found.

---

## 5. What this audit does **not** claim

### 5.1 The e2e suites did not run here

This container's Playwright pins browser build **1223**; the preinstalled
Chromium is **1194**. `npm run test:e2e`, `test:e2e:offline` and
`test:e2e:launch` therefore could not execute. The targeted SW probes in §2 ran
against the preinstalled binary via an explicit `executablePath`.

CI is the authority on those suites — the 2026-08-08 close-out recorded 222/222
Playwright, 16/16 offline, 5/5 device smoke. **Those numbers predate all 365
commits audited here.** Re-run the full rehearsal on this baseline before
promoting.

### 5.2 The human gate from §14.5 is still open

Physical iPhone (Safari + installed PWA), camera permissions, a real contract
sign/scan + PDF export, VoiceOver, and a Samsung/Chrome smoke. Emulation does
not close these. L-01 makes one of them non-optional: **verify a real
service-worker update lands on a physical device** — that path has demonstrably
never worked in production.

---

## 6. Verdict

**Engineering: GO**, with L-01 fixed. Gates green, dependencies clean, no P0/P1
open from either audit.

**Public launch: CONDITIONAL GO**, unchanged in shape from 2026-08-08 but with
one addition — L-01 means every user who installed a previous build has been
frozen on it. Confirm the update actually flows on real hardware before calling
it launched.

Recommended order from here:

1. Land L-01 (this branch) and re-run the full CI rehearsal on the new baseline.
2. Decide L-04 (indexing) — it's a policy call, not a code task.
3. Design L-02 (quota safeword) — the only remaining finding that can lose data.
4. L-03, L-05, L-06, L-07 as a single tidy-up pass.
5. Then the physical-device gate, then `dev → main`.
