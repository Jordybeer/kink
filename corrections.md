# corrections.md — mistake log

Read at session start. Never repeat a logged mistake. Append new entries when something goes wrong.

Format: `## YYYY-MM-DD — <short title>` then what went wrong and the rule to follow instead.

---

## 2026-07-10 — The watchdog was asleep: e2e specs rot silently

**What was found:** Phase 30's "guard" (`new-user.spec.ts`) was 4/5 failing on dev *before any change* — the PIN step (added June 3) and the L-01 age-gate fix had changed the onboarding flow, and nobody re-ran the spec. It sat broken for five weeks while unit tests stayed green.

**Rule:** When a user flow changes, run its e2e spec in the same session and fix it in the same commit. And before trusting any spec as a regression guard, run it against unchanged code first — a failing baseline means the spec, not your change, is the suspect.

## 2026-07-09 — "Regression" reports need a git alibi before agreement

**What nearly went wrong:** The owner reported compare-page badges "losing kink colors" as a regression. It pattern-matched perfectly to the evening's refactors (status labels had just been centralised in that exact file). Agreeing on vibes would have sent the session hunting a regression in commits that were innocent.

**What the history showed:** `git show` on `StatusBadge` across `d2e8f69`, `629419b`, and the pre-June-16 revision proved the badges had *always* worn person colours — a standing design decision from the compare redesign, never a break. The critique was still right (fixed as Phase 27a); the framing was not.

**Rule:** When anything is called a regression — by the owner, a test, or your own gut — trace the exact lines through git history *before* agreeing or acting. Answer with the alibi: "changed in X / never existed / broke in Y." A design flaw and a regression get different treatment: flaws get a design pass, regressions get a revert-or-fix against the last good commit.

## 2026-07-09 — Backlog claims drift from the code they describe

**What went wrong:** Phase 24b's ledger note said `hard_no` drifted between "Grens" (app) and "Harde grens" (contract PDF) — implying the contract was the outlier. The code said the opposite: six of eight surfaces (including the status explainer that *defines* the vocabulary) said "Harde grens"; the two newest triage components were the strays. The fix direction only came out right because the code was re-read at execution time.

**Rule:** Backlog/plan entries are hypotheses, not facts. Before executing any phase written in an earlier session, re-verify its claims against the live code — especially claims about which side of an inconsistency is canonical.

## 2026-06-22 — Phase 10: ambient animation misfired

**What went wrong:** Replaced the working `ks-shimmer` wordmark animation with a trailing cursor `_` pulsing at 1.8s, opacity 1 → 0.22. It read as a notification dot, not ambient motion. PR #219 was opened and then closed same evening.

**Specific failures:**
- Cycle 3× too fast (1.8s vs the original 5.5s shimmer)
- Opacity swing of 78% — way too deep for "subtle"
- Terminal-cursor motif clashed with the Cormorant Garamond editorial wordmark
- Killed the original shimmer instead of coexisting with it

**Rule:** Ambient motion on brand elements must use ≥ 3s cycle and ≤ 30% opacity swing. Don't replace existing brand motion — coexist with it. Match the design vocabulary of the surface.

---

## 2026-06-20 — Chart denominator double-counted soft limits

**What went wrong:** `app/compare/page.tsx` manually computed `discussCount` by absorbing `counts.soft` into it. `ContractTrendsChart` then added `soft` again in its denominator (`match + discuss + soft + hard`), double-counting soft limits and deflating `verbond %` for every contract saved after the change.

**Rule:** Keep four disjoint buckets: `matchCount`, `softLimitCount`, `discussCount`, `hardLimitCount`. Never collapse `soft` into `discuss`. The chart's denominator sums all four — they must be mutually exclusive.

---

## 2026-06-20 — Ledger theme contrast failure

**What went wrong:** Ledger `--accent` was set to `#C73E2E` (cochineal) which failed AA contrast (~3.7:1) on all surfaces. `--on-accent` was bone `#F4ECDF` (light on dark), which was also wrong once the accent was brightened.

**Rule:** Check contrast ratios before shipping any colour token. When brightening an accent colour, flip `--on-accent` to dark text (`#160806`) — lighter backgrounds need dark foregrounds.

---

## 2026-06-19 — Worktree letter tracking missed local branches

**What went wrong:** When computing the next alphabetical kink word for a new worktree, only remote branches on `origin` were checked. A local branch (`worktree-inversion`) was missed, causing a letter collision.

**Rule:** Always check both local and remote branches: `git branch -a | grep worktree-`. Never rely on `remotes/origin/` alone.
