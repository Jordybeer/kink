# Open PR integration

> Execute autonomously with Superpowers executing-plans and independent security/integration reviews. The owner explicitly authorized all open PR merges on 2026-10-12; preserve all required release controls.

**Goal:** Integrate the 27 open PRs into dev, then the existing release PR into main, without resurrecting old behavior or weakening the audit.
**Architecture:** Compose current Profile/Motion, custom-topic semantics/readability, Home recovery and first-contact identity anchors in isolated worktrees. Preserve original PR commit ancestry; older steps are semantic no-ops only when their intended behavior is demonstrably present in the consolidated implementation.
**Spec:** Current owner instructions; PRODUCT.md, UI-principles.md, DESIGN.md, corrections.md and SECURITY.md.

## Constraints and review focus

- Keep private responses private, independent identity confirmation explicit, immutable anchors and atomic import/rollback.
- Preserve approved warm rails, editorial typography, motion preferences and optional installation from Settings.
- No audit exceptions, removed lint rules, forced framework downgrades or stale-source merge checks.
- Root glob compatibility: literal/current/absolute roots, brace ranges, symlinks, globstars, negation and real Next-rule diagnostics.
- Resolve old dependency PRs to reviewed newer safe versions, never downgrade just to reproduce their historical diff.

## Tasks

- [ ] Audit fix in package.json/package-lock.json and vendor/braces: reuse the existing reviewed PR473 backport and patched transitive versions from480. Move pure Node guard assertions out of browser suites; add alternate malicious and legitimate controls; run focused tests, full lint and full audit. Independent bypass/regression review before publication.
- [ ] Integrate 451/476/477/478/479 with motion 481. Preserve newer UI while carrying every intended semantic/readability fix. Run targeted unit/type/lint checks; update obsolete tests only for deliberate behavior.
- [ ] Integrate consolidated 411 identity implementation and preserve older phase ancestry. Reproduce/fix existing-contact anchoring and scanner dismissal; preserve modern Home/quiet trust UI. Run focused identity/security tests.
- [ ] Integrate applicable dependency targets and security 473/480; prove preserved-or-newer versions. Combine worktrees, reconcile conflicts, review resulting code and PR scopes.
- [ ] Clean install, audit, lint, unit, TypeScript, production build once on final candidate. Targeted production browser flows, then mandatory full browser/launch/print/offline gates once. Mobile/desktop light/dark visual and keyboard/reduced-motion checks for changed integration flows.
- [ ] Publish one coherent integration candidate preserving PR ancestry; use successful exact-head checks before dev/main merges. Verify GitHub marks each original PR merged and inspect final deployment. No bypass if any required check is red.

## Testing budget

During implementation use focused unit/type/lint checks. Reuse unchanged motion evidence. Do not run the complete browser suite per source edit or per historical no-op merge. Keep GitHub's mandatory final release lanes; batch publication so all PR ancestry can join the tested integration tree without 27 duplicate suite runs.
