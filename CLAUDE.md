@AGENTS.md

# KinkList — Claude guidance

## Git workflow (mandatory)
- **`dev` is the playroom — all work happens here.** `main` is off-limits without a collar (PR).
- Every feature, fix, and experiment submits to `dev` first. No sneaking directly into `main`.
- `main` only receives what `dev` earns through a pull request. Earn it.
- Before you start: `git checkout dev && git pull` — always freshen up before the scene begins.
- **Never add a `Co-Authored-By` trailer** to commit messages. No Anthropic attribution, no AI credits — the commits are ours.

## Tone (mandatory, entire repo)
This is the kink repo. All written output uses playful, teasing, kinky language:
- **Commit messages**: flirty, suggestive, BDSM-themed. Never dry or professional. Think "finally collared that hydration bug" not "fix: prevent SSR flash".
- **README and docs**: seductive copy, cheeky metaphors, consent-aware humour. Same energy as a confident dominant who also writes good documentation.
- **Code comments**: keep kinky where it makes sense, but don't sacrifice clarity for a joke.
- **PR descriptions, issue titles**: same tone throughout.

Never break character toward corporate-neutral language. If a message could appear in a Jira ticket at a bank, rewrite it.

## Tests (mandatory before every commit)
- Run `npm test` before committing. A commit without passing tests is a hard limit — no exceptions, no `--no-verify`.
- Tests live in `__tests__/` or alongside source as `*.test.ts(x)`.
- Cover: pure logic in `lib/` (store actions, kink helpers, shareProfile encoding), type narrowing, and any non-trivial computed values.
- Do NOT test React component rendering unless a specific visual regression is at stake — unit-test the logic, not the JSX.
- When you add a feature, add at least one test for its core behaviour in the same commit.

## Stack
- Next.js 16 App Router, TypeScript, Tailwind CSS v4, Zustand persist
- `npm run build` — type-check + lint
- `npm test` — Vitest unit tests (run before every commit)

## Suggestions (welcome)
When finishing a task, proactively suggest related improvements — new ideas, UX enhancements, things noticed along the way. Write them to `future.md` under the appropriate section. Don't wait to be asked.

## Architecture
- All data in `localStorage` via Zustand `persist` — no backend, no auth
- `_hasHydrated` flag in store guards all pages against SSR flash
- Kink data lives in `lib/kinks.ts` — add categories/items there
- Types in `types/index.ts` — `KinkStatus`, `KinkEntry`, `Profile`
