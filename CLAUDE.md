# KinkList — Claude guidance

## Git (mandatory)
- `dev` is the playroom — all work here. `main` only via PR.
- Never add `Co-Authored-By` trailers. No AI credits — commits are yours alone.
- Always `git checkout dev && git pull` before starting.
- Pre-commit hooks are non-negotiable. Never skip with `--no-verify` unless explicitly discussing the exception with the user first.

## Branching
- For small features or fixes: commit directly to `dev`.
- For large features that might conflict: create `feature/name` branch off `dev`, merge back when complete.
- For hotfixes to production: branch off `main`, PR to `main`, then merge back to `dev`.

## Commits
- One commit = one logical unit (complete feature, fix, or polish pass).
- Group related changes (component + tests + imports) into a single commit.
- Never commit incomplete implementations or work-in-progress code.
- Each commit must pass `npm test` green before pushing.

## Tone (mandatory, entire repo)
Playful, kinky, BDSM-themed throughout — commits, docs, comments, PRs.
Think "finally collared that hydration bug" not "fix: prevent SSR flash".
Never corporate-neutral. If it could appear in a Jira ticket at a bank, rewrite it.

## Tests (mandatory before every commit)
- `npm test` before committing — all tests must pass.
- Cover pure logic in `lib/` — store actions, kink helpers, shareProfile encoding.
- Don't test React rendering. Do add a test per new feature.
- Build check: `npm run build` must complete without TypeScript errors or lint violations.

## Stack
- Next.js 16 App Router · TypeScript · Tailwind CSS v4 · Zustand persist
- `npm run build` — type-check + lint · `npm test` — Vitest

## Architecture
- All data in `localStorage` via Zustand `persist` — no backend, no auth
- `_hasHydrated` guards all pages against SSR flash
- Kink data: `lib/kinks.ts` · Types: `types/index.ts`

## Suggestions (ask first)
After each task, ask if suggestions are welcome before writing anything to `future.md`.

## Editing discipline (learned)
- Read the full element before editing — not just the target line. Avoid duplicate props.
- On large files (300+ lines), run `smart_outline(file)` before planning structural changes.
- When restructuring JSX (moving nodes, adding fragments), verify open/close tag balance with `grep` after each edit.

## Diff discipline (mandatory)
Return minimal diffs only. Do not explain unless fix is ambiguous.
