# corrections.md — mistake log

Read at session start. Never repeat a logged mistake. Append new entries when something goes wrong.

Format: `## YYYY-MM-DD — <short title>` then what went wrong and the rule to follow instead.

---

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
