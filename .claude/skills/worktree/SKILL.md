---
name: worktree
description: Manage the full lifecycle of kink-named git worktrees in this project. Spawn mode: compute the next alphabetical kink name, create the branch and worktree. Ship mode: run tests, build, push, and open a PR to dev with a BDSM-toned description. Use when starting new feature work ("new worktree", "spawn worktree", "start a branch", "need a worktree") or when wrapping up ("ship this", "PR to dev", "wrap up this worktree", "done with this branch", "open a PR"). Triggers any time worktree lifecycle management is needed in the kink project.
---

# worktree — spawn and ship kink-named feature branches

Two modes. Detect which one from context — spawn if starting work, ship if wrapping up.

---

## Spawn — start a new feature worktree

### 1. Collect existing kink branch names

```bash
git fetch origin
git worktree list
git branch -a
```

Find all branch names matching `worktree-<word>` (local and remote on origin). Strip the `worktree-` prefix to get the bare kink words. Collect the **first letter** of each word. Always compute from the live output — never assume which letters are taken.

### 2. Find the next letter

Take the set of first letters already used and pick the next letter in the alphabet (a→b→c→…) that hasn't been used yet.

### 3. Pick a kink word

Choose one BDSM/kink word that starts with that letter. Pick something that feels apt, surprising, or fun — the word itself sets the tone for all the work done in that branch. Avoid reaching for the most obvious choice. Hyphens allowed only when no single word exists for that letter. Present your pick to the user and let them confirm or swap it.

### 4. Create the worktree

```bash
git worktree add .claude/worktrees/<name> -b worktree-<name>
```

Confirm with `git worktree list`. Report the worktree path and branch name so the user knows where to work.

---

## Ship — test, push, PR to dev

Stop at any failure and report what broke before doing anything else.

### 1. Identify the branch

```bash
git branch --show-current
```

Should be `worktree-<name>`. If not, warn the user — they may be on the wrong branch.

### 2. Tests must pass

```bash
npm test
```

All tests must be green. Do not push broken code. On failure: report which tests failed and stop.

### 3. Build must be clean

```bash
npm run build
```

Zero TypeScript errors, zero lint violations. On failure: report and stop.

### 4. Push

```bash
git push -u origin <branch-name>
```

### 5. Open the PR

```bash
gh pr create --base dev --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

**Tone rules for title and body (mandatory):**

- Playful, BDSM-themed throughout. Think "finally collared the X bug", "restrain the overflow", "kneel before the new share flow". Never corporate-neutral ("fix:", "add feature", "update component").
- Body: 2–3 bullet summary using kinky metaphors where natural, followed by a markdown test checklist.
- Never mention AI, Claude, or co-authors in the PR.

Return the PR URL when done.
