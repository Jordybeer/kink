# Memory — persistent notes across Claude sessions

Read at session start. Append-only unless the user says otherwise.

## Parallel Claude sessions (mandatory)

Two Claude accounts — **claude1** and **claude2** — work this repo simultaneously, each under a separate login. Both must:

- Operate inside an isolated worktree (per CLAUDE.md `worktree` skill). Never the main checkout.
- Branch off `dev`, PR back to `dev`.
- Before starting a phase:
  - `git fetch origin`
  - `git log HEAD..origin/dev` to see what landed on dev since this worktree was cut.
  - `gh pr list --base dev` to see the other Claude's in-flight work.
  - Pick orthogonal files/phases — avoid the surface area of any open parallel PR.
- Before pushing: rebase onto latest `origin/dev`, re-run `npm test` + `npm run build` to catch silent regressions from the other branch landing first.
- Call out surface-area overlap explicitly in PR descriptions.

Risk to watch: merge regressions and conflicts when two PRs land against `dev` in close succession.

## Required plugins (both Claudes, every session)

Each Claude account runs from its own config dir (claude1: `~/.claude/`, claude2: `~/.claude2/`). Skills don't cross-install automatically. Verify these three are available at session start:

| Skill | How it lands |
| --- | --- |
| `worktree` | **Vendored in this repo** at `.claude/skills/worktree/SKILL.md`. Auto-loaded by both Claudes on checkout — no install needed. |
| `skill-creator` | Per-account install. Run once: `/plugin install skill-creator@claude-plugins-official` |
| `frontend-design` | Per-account install. Run once: `/plugin install frontend-design@claude-plugins-official` |

Sanity check from any Claude:
```bash
grep -E '"(skill-creator|frontend-design)' ~/.claude*/plugins/installed_plugins.json
ls .claude/skills/worktree/SKILL.md
```

If `skill-creator` or `frontend-design` is missing from the active account's `installed_plugins.json`, install before doing any work that touches UI (`frontend-design`) or new skills (`skill-creator`).

## Ambient animation design rule (Phase 10 postmortem, 2026-06-22)

When adding "subtle ambient" motion to brand elements (wordmark, logo, status indicators, idle pulses):

- **Cycle length ≥ 3 seconds.** Anything faster reads as activity, notification, or impatience — not ambient. The original wordmark shimmer runs 5.5s and feels luxurious; the failed Phase 10 cursor ran 1.8s and felt like a blink.
- **Opacity or position swing ≤ 30% of the available range.** Deep swings demand attention. The failed cursor went opacity 1 → 0.22 (a 78% drop) and read as a notification dot, not a held breath.
- **Coexist, don't replace.** Established brand motion (the shimmer) is part of identity. Adding a new ambient element should sit alongside, not displace it. Replacing elegance to add novelty is a regression.
- **Match the vocabulary of the surface.** A blinking terminal cursor next to an editorial Cormorant Garamond serif is a design-language clash. CLI/status motifs belong on technical or system surfaces — not pinned to the brand mark.

Apply this rule before shipping any motion touch on the wordmark, logo, hero, or onboarding chrome.

## Session 2026-06-29/30 — Type system overhaul + bdsmtest integration (DONE, dev pushed)

### What shipped (all on dev, HEAD: 179f641)

**bdsmtest integration** (shipped earlier in session):
- `lib/parseBdsmtest.ts` — parses bdsmtest.org copy-paste output (`100% Dominant\n97% Sadist\n...`)
- `components/BdsmtestScores.tsx` — horizontal bar chart, absolute widths (`${pct}%`), top 10, "Bekijk ↗" link, "+N meer"
- Store: `setBdsmtestScores(id, scores)` action added
- Profile page: paste textarea + "Verwerk resultaten" button in edit Sheet → parses → stores
- Share encoding v2: `bs` key carries bdsmtestScores
- BdsmtestScores renders between ProfileHero and tab bar, always visible when scores exist
- DNA bar concept killed entirely — ProfileList and ProfileHero stripped

**Type system** (phases 20 + 21 + deep sweep):
- **Section headers** (h2/h3/p introducing content blocks): Cormorant italic, text-sm or text-base, `var(--text)` or `var(--accent)`
- **Card eyebrow tags** (e.g. BdsmtestScores label): text-xs font-medium, no uppercase
- **Form field labels**: text-xs, no uppercase
- **Body/metadata copy floor**: text-xs (12px) minimum everywhere
- **Chart axis labels** (CompatibilityTimeline, ProfileTrendsChart, ContractTrendsChart): kept text-xs uppercase tracking-widest intentionally
- **Microbadge pills** (rounded-full/rounded border status chips): kept at native size
- **font-mono log lines** (session diagnostics): kept at native size
- **Overzicht category headers**: text-base Cormorant italic, `var(--text)` (full white) — was text-sm grey, had zero hierarchy vs kink rows

Files changed in sweep: compare, contract, profile, scene, scenes, session, timeline pages + AftercareSheet, InfoSheet, KinkRow, CategorySection, TimePicker, BdsmtestScores, QRModal, ProfileList components.

**Other changes**:
- Home "Nieuw profiel" button: PlusCircle/X icons, better label
- Home wordmark gap: mb-10 → mb-6
- Compare empty state: "nog niets gewaardeerd" → "rate kinks om te vergelijken"
- .gitignore: `.claude/worktrees/` and `screenshots/` excluded

### PENDING next session: Visual check

**Use this prompt at session start:**

"Do a full visual audit of the app. Run `npm run dev`, open the browser, and check every major page: home, profile detail (overzicht + bewerken tabs), compare, contract, scene builder, scenes list, scene detail, session, timeline. For each page check: (1) are section headers clearly distinct from body text? (2) is any text illegibly small? (3) does the Cormorant italic treatment feel consistent — does it appear in the right places and not in wrong ones? (4) any layout breaks, overflow, or broken elements? Screenshot anything wrong and fix it. Pay special attention to: profile overzicht category headers vs kink row names, compare kink list section headers, contract page section structure, session live UI density."

### planned-changes.md status after this session
- Phase 20 ✓ DONE
- Phase 21 ✓ DONE
- Phase 22 ✓ DONE (earlier)
- Phase 23 — Status colour user-test (defer, verification only, no code)
- Phase B — Agreement Archive Data Model (deferred structural)
- Phase 8 — External Imports (bdsmtest portion DONE; FetLife paste + dupe matching still open)
- Phase 10 — Brand polish (deferred, do after Phase 20 settled)

## UI doctrine — mandatory, user-locked 2026-08-15

The user explicitly requires the KinkSync UI principles to be used **always, without exception for convenience or visual taste**.

- Root file `UI-principles.md` is the source of truth for KinkSync UI/UX decisions.
- Read it before **every** task that touches UI, UX, components, layout, hierarchy, interaction, motion, responsive behaviour, user-facing interface copy, or visual audit.
- Apply its conflict order when principles compete: **consent/safety/privacy → readability → stable interaction geometry → hierarchy/calm → expression/decoration → density/speed**.
- Run its `UI decision gate` before implementation and again during the final self-review.
- Essential decision, consent, safety, or privacy context may not be hidden to gain cleaner visuals, tighter density, more stable geometry, or a faster flow.
- KinkSync must keep character: intimate by default; many hues with few visual weights; expressive in colour but restrained in structure; organised by hierarchy; mobile-native; reflective, not clinical or rushed.
- Existing patterns, design trends, screenshots, `frontend-design`, or prior code do not overrule `UI-principles.md`.
