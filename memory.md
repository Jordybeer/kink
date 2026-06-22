# Memory — persistent notes across Claude sessions

Read at session start. Append-only unless the user says otherwise.

## Parallel Claude sessions (mandatory)

Two Claude accounts — **claude1** and **claude2** — work this repo simultaneously, each under a separate login. Both must:

- Operate inside an isolated worktree (per CLAUDE.md `worktree` skill). Never the main checkout.
- Branch off `dev`, PR back to `dev`.
- Before starting a phase:
  - `git fetch origin`
  - `git log origin/dev..HEAD` to see what landed since this worktree was cut.
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
