# Public release close-out

Updated 2026-09-29. This replaces the August roadmap's stale implementation
status. `PRODUCT.md` and `UI-principles.md` remain authoritative; the backlog is
`planned-changes.md`. Historical audit evidence remains in its dated documents
and Git history. Old Soft Gate requirements are not current product policy.

## Current decision

**Not yet approved for main.** Optional PWA installation #467 is merged into dev.
First-run backup recovery #468 is the next candidate. The remaining release gate
is exact-candidate CI, physical iPhone Safari/standalone sign-off and production
verification. No physical-device success is implied by browser emulation.

Installation is optional and user-invoked. Browser use stays available. There is
no automatic install nag, mutation checkpoint or mandatory Soft Gate to restore.
Existing browser data should be exported before installation; installation is
neither a backup nor a security boundary. First-run restore follows age and
consent information and precedes optional tour/PIN setup.

## Ordered work

1. Merge #468 into dev only after its full CI and review gates pass.
2. Keep #451 out until physical iPhone evidence establishes a defect and the
   complete safe-area solution passes review. Its global `viewport-fit=cover`
   change cannot be validated by checking source strings alone.
3. Use the [September delta review](release-readiness-2026-09-29.md) as the release
   scope, and record exact promotion head, base, preview URL and CI run in the PR.
4. Execute the [physical-device checklist](release-device-checklist.md) on that
   immutable candidate. A changed runtime requires renewed affected checks.
5. Merge dev to main through a PR only after all gates below pass.
6. Verify the deployed production commit and run the production smoke. A material
   regression blocks public launch; revert through a reviewed PR or fix forward.

## Mandatory gates

- Lint, units, production build, full browser E2E, device/launch, print and
  production offline rehearsal pass on the promotion candidate.
- Dependency audit has no unaccepted high/critical findings. Do not infer this
  from stale dependency PRs against old main.
- No unresolved P0/P1 privacy, consent, ownership, restore or storage issue.
- Physical iPhone Safari and installed standalone checklist has recorded results,
  OS/browser versions, exact candidate and deviations.
- #451 is explicitly resolved or deferred with device evidence; no blind merge.
- Required reviews/threads are resolved and branch governance is verified.
- Promotion adds no feature work and never force-resets main.

Main's unique commit at this review is `5e1089e` (an empty production-deploy
trigger), not historical PR #277. Preserve history through a normal merge; there
is no main-only code patch to transplant. Recheck divergence before promotion.

## Scope constraints

No new identity-anchor stack, broad catalog/questionnaire redesign, dependency
sweep or UI rewrite is part of release promotion. Draft PRs #394, #395, #397,
#399, #400, #401, #403 and #411 remain excluded. Fix a demonstrated release
blocker in a focused dev PR and rerun the relevant gates.

Same-origin JavaScript remains a trust boundary. CSP still permits inline
scripts; installation does not remove that risk. The current theme bootstrap is
static application code, not imported profile markup. Existing audit limitations
must remain explicit; this close-out is not a claim of a new independent security
certification.
