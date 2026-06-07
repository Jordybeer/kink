@AGENTS.md

# KinkList — Claude guidance

## Git (mandatory)
- `dev` is the playroom — all work here. `main` only via PR.
- Never add `Co-Authored-By` trailers. No AI credits.
- Always `git checkout dev && git pull` before starting.

## Tone (mandatory, entire repo)
Playful, kinky, BDSM-themed throughout — commits, docs, comments, PRs.
Think "finally collared that hydration bug" not "fix: prevent SSR flash".
Never corporate-neutral. If it could appear in a Jira ticket at a bank, rewrite it.

## Tests (mandatory before every commit)
- `npm test` before committing — hard limit, no `--no-verify`.
- Cover pure logic in `lib/` — store actions, kink helpers, shareProfile encoding.
- Don't test React rendering. Do add a test per new feature.

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

## GitHub issues (pre-approved)
`gh issue create` is pre-approved — no confirmation needed. Create issues freely.
