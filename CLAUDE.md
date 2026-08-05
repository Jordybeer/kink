# KinkList — Claude guidance

## Regression is the cardinal sin (mandatory, overrides everything)
Breaking something that already worked is the single worst outcome — worse than shipping nothing, worse than an ugly diff, worse than a slow fix. No feature, refactor, or polish pass is worth a regression.
- Before touching working code, know exactly what currently works and preserve it. When in doubt, make changes **additive** (e.g. `lg:` overrides that leave mobile byte-identical) rather than rewriting.
- Prove no regression before you call anything done: re-run the affected tests/audit and compare against the prior behaviour, don't just eyeball the new thing.
- Mobile-first + the installed PWA are the primary surfaces — a desktop/tablet improvement that degrades either of those is a net loss, not a win.
- If a change *might* regress and you can't prove it won't, stop and flag it rather than shipping on hope.

## Git (mandatory)
- `dev` is the playroom — all work here. `main` only via PR.
- Never add `Co-Authored-By` trailers. No AI credits, no Happy attribution — commits are yours alone.
- Always `git checkout dev && git pull` before starting.
- Pre-commit hooks are non-negotiable. Never skip with `--no-verify` unless explicitly discussing the exception with the user first.

## Branching
- Small features / fixes: commit directly to `dev`.
- Large features that might conflict: `feature/name` off `dev`, merge back when complete.
- Hotfixes to production: branch off `main`, PR to `main`, then merge back to `dev`.

## Worktree & branch naming (mandatory)
Use the `worktree` skill for spawning worktrees and shipping (test → push → PR to dev).
**Never auto-invoke it** — only call `/worktree` when the user explicitly asks. It freezes when auto-triggered.

## Parallel Claude sessions (mandatory)
Two Claude accounts — **claude1** and **claude2** — work this repo simultaneously under separate logins. Both:
- Operate inside an isolated worktree off `dev`. Never the main checkout.
- Open PRs back to `dev`.
- Before starting a phase: `git fetch origin && gh pr list --base dev` to see the other Claude's in-flight work; pick orthogonal files/phases.
- Before pushing: rebase onto latest `origin/dev`, re-run `npm test` + `npm run build` to catch silent regressions from the other branch landing first.
- Call out surface-area overlap explicitly in PR descriptions.


## Commits
- One commit = one logical unit (complete feature, fix, or polish pass).
- Group related changes (component + tests + imports) into a single commit.
- Never commit incomplete implementations or WIP code.
- Each commit must pass `npm test` green before pushing.

## Frontend design
The `frontend-design` skill is available for UI/visual decisions.
**Never auto-invoke it** — only call `/frontend-design` when the user explicitly asks. It freezes when auto-triggered.

## Tone (mandatory, entire repo)
Playful, kinky, BDSM-themed throughout — commits, docs, comments, PRs.
Think "finally collared that hydration bug" not "fix: prevent SSR flash".
Never corporate-neutral. If it could appear in a Jira ticket at a bank, rewrite it.

## Tests (mandatory before every commit)
- `npm test` before committing — all tests must pass.
- Cover pure logic in `lib/` — store actions, kink helpers, shareProfile encoding.
- Don't test React rendering. Add one test per new feature.
- `npm run build` must complete without TypeScript errors or lint violations.
- Scale coverage to task size: tiny fix → run affected test file only. Feature → full `npm test`. Structural change → `npm test` + `npm run build`. Never run e2e for unit-level changes.
- Playwright tests are mobile-first (375px viewport). Only add desktop if behaviour genuinely differs.

## Stack
- Next.js 16 App Router · TypeScript · Tailwind CSS v4 · Zustand persist
- `npm run build` — type-check + lint · `npm test` — Vitest · `npm run e2e` — Playwright

## Architecture
- All data in `localStorage` via Zustand `persist` — no backend, no auth
- `_hasHydrated` guards all pages against SSR flash — never skip this gate
- Kink data: `lib/kinks.ts` · Types: `types/index.ts` · Store: `lib/store.ts`

## File map
- `app/` — Next.js App Router pages
- `components/` — shared UI components
- `lib/kinks.ts` — kink data, source of truth
- `lib/store.ts` — Zustand persist store
- `types/index.ts` — all shared TypeScript types
- `__tests__/` — Vitest unit tests (lib/ only)
- `e2e/` — Playwright tests
- `e2e-offline/` — Playwright offline tests
- `docs/` — internal documentation
- `corrections.md` — mistake log (read at session start)
- `planned-changes.md` — the single backlog: active phases + suggestion pool + shipped ledger (read at session start, update when work lands; absorbed `future.md` on 2026-07-08)
- `ideas.md` — raw ideas, read only

## Hard constraints
- No backend, no auth — all state in localStorage via Zustand persist
- `_hasHydrated` must gate every page that reads store state
- Never add a fetch() to an external API without explicit discussion
- Never install packages without asking first

## Component layer rules
- `components/ui/` — interaction primitives only (motion, touch, layout). Must never import from `lib/store`, `lib/kinks`, or any domain type beyond what's passed via props. No kink knowledge lives here.
- `components/` — domain components. May use store and types freely. Compose from `components/ui/` primitives.
- Pages (`app/`) — wire store state to domain components. Never build interaction primitives inline in a page.

## corrections.md (mandatory)
Read `corrections.md` at session start before doing anything.
These are documented mistakes — do not repeat them.
When something goes wrong mid-session (reverted PR, wrong approach, design regression, bad assumption), append a new entry immediately. Format: `## YYYY-MM-DD — <short title>` then what went wrong and the rule to follow instead.

## memory.md (mandatory)
Read `memory.md` at session start. Cross-session operational notes the user wants every Claude (claude1 + claude2) to carry. Append new notes here when the user says "remember this" or similar.

## Planning files
- `ideas.md` — your raw ideas, Claude reads only, never modifies
- `planned-changes.md` — the single backlog. **Read at session start** and begin with the phase marked NEXT UP unless told otherwise. Update when completing tasks. (`future.md` was merged in on 2026-07-08 and deleted.)

## Suggestions (ask first)
After each task, ask if suggestions are welcome before writing anything to the suggestion pool in `planned-changes.md`.

## Editing discipline (learned)
- Read the full element before editing — not just the target line. Avoid duplicate props.
- On large files (300+ lines), run `smart_outline(file)` before planning structural changes.
- When restructuring JSX (moving nodes, adding fragments), verify open/close tag balance with `grep` after each edit.

## Diff discipline (mandatory)
Return minimal diffs only. Do not explain unless fix is ambiguous.
