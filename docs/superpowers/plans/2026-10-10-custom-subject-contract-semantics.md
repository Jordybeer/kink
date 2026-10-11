# Custom subject contract semantics implementation plan

> **For agentic workers:** Use superpowers:executing-plans task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Preserve explicit custom-topic identity, public limits and independent contract notes.
**Architecture:** Project Compare-v2 public facts into contract sections; keep catalogue classification unchanged. Optional source references belong only to newly composed payloads. Discussion memory matches referenced rows by explicit participant/topic identity and retains read-only legacy handling.
**Tech Stack:** TypeScript, Next 16.3.4, React 19, Vitest, Playwright.
**Spec:** `docs/superpowers/specs/2026-10-10-custom-subject-contract-semantics-design.md`

## Global Constraints
- No implicit consent, name-based custom matching, hidden-answer metadata or historical payload migration.
- Preserve catalogue status classification, schema 1, lifecycle and QR formats.
- Work on `safety/custom-subject-semantics-20261010`; do not change PR #472 or dependencies.
- User authorized autonomous execution; no repeated approval gate for this accepted direction.

## Review Focus
- Same ID with renamed topic remains unpaired (Task 1).
- Private versus absent counterpart must produce identical output (Task 1).
- New source mismatch must never fall back to a matching label (Task 2).
- Reversed participant order retains both note ownership and discussion meaning (Tasks 1–2).
- Source fields must survive signing/QR and be covered by hashes without changing legacy objects (Task 3).

### Task 1: Project public custom evidence and isolate editor identity
**Files:** create `lib/contractCustomProjection.ts`, `lib/contractSources.ts`, `__tests__/contractCustomProjection.test.ts`, `e2e/contract-custom.spec.ts`; modify `lib/contractLifecycle.ts`, `app/contract/page.tsx`, `components/contract/ContractSection.tsx`.
**Interfaces:** `projectCustomContractEvidence(a: Profile, b: Profile)` returns shared, softLimits, discuss, hardLimits, hardLimitDetails; rows carry optional `sourceKind`, `sourceAId`, `sourceBId`. `contractSourceKey(source, profileAId, profileBId): string` uses sorted JSON tuples, no title identity.
- [x] Add DOM regressions: independent equal-name positive topics produce two discussion rows; one-sided hard_no is in hard limits; equal-name note editors stay separate; private/absent outputs agree; self-pair is rejected.
- [x] Run against existing composer: intended assertions fail, existing contract tests remain green.
- [x] Add pure projection tests for all 25 status pairs, absent/private answers, reversed order, renamed topics, identical profiles and no input mutation. Observe missing-function failure.
- [x] Implement using buildCompareModel; never use hidden side IDs from unpaired placeholders. Wire section identity through an optional getItemKey callback and display quiet ownership text on custom rows. Notes keyed by item identity AND note owner's profile ID survive A/B swap.
- [x] Preserve catalogue classifier, but add explicit visible catalogue source references so names cannot collide with custom sources.
- [x] Run `npm test` and `CI=1 npx playwright test e2e/contract.spec.ts e2e/contract-custom.spec.ts --retries=0`. Expect PASS. Commit.

### Task 2: Match discussion memory to exact new sources
**Files:** modify `lib/compareDiscussionMemory.ts`, `__tests__/compareDiscussionMemory.test.ts`.
**Interfaces:** consume optional source reference and contract participants; compare visible source tuples with current fact's explicit profile/topic tuples. At least one source required; every supplied source must match. Kind mismatch or malformed/incomplete metadata fails closed; truly metadata-free rows retain historical name matching.
- [x] Add regressions asserting equal-name unrelated custom rows do not affect fingerprints, exact matched rows do, A/B swaps preserve fingerprint, one-sided limits remain relevant, catalog/custom and wrong-profile sources never match, legacy behavior stays intact.
- [x] Run `npm test -- __tests__/compareDiscussionMemory.test.ts`; observe intended failures.
- [x] Replace label-only filter for referenced rows; retain legacy fallback only for rows with no source fields.
- [x] Run `npm test`; expect PASS. Commit.

### Task 3: Prove compatibility and delivery readiness
**Files:** extend `__tests__/contractLifecycle.test.ts`; add evidence to this plan.
**Interfaces:** unchanged hashContractContent, signContractPayload, verifyContractProof, createContractRequest/Response, QR codec and backup APIs.
- [x] Test optional source metadata round-trip through signed QR exchange; tampering invalidates proof. Hash/serialized legacy content stays unchanged when new metadata is used elsewhere.
- [x] Run lifecycle, backup, PDF, privacy and full unit suite; expect PASS.
- [x] Run lint, TypeScript, build and relevant browser/production offline tests. Inspect mobile/desktop light/dark contract screenshots. Report infrastructure failures precisely, no false green gate.
- [x] Obtain independent whole-branch review, fix important findings with red→green tests; record deferred issues.
- [ ] Push isolated feature branch and create draft PR to dev with exact evidence and release blockers. Local commits complete; publication blocked by automatic approval review. No merge.

## Execution record
- Baseline: 3593188, dev unchanged at cc751e2; 96 files / 795 tests passed.
- Isolated fresh clone on the pre-existing safety branch; no other working tree shares this checkout.
- Open PR #473 owns dependencies; dependency patch stays outside this change. #472 owns Profile/UI work.


### Verified implementation and review (2026-10-11 closeout)

- Baseline 795 tests passed. On the old composer, three new browser tests failed on the actual expected assertions: equal-name independent topics were not separate discussion rows, one-sided custom hard limits were absent from hard limits, and a self-pair was accepted. Private-topic omission already passed.
- Five new source-aware discussion-memory regressions failed before implementation; the legacy compatibility case passed.
- Pure projection: 31 cases cover all 25 status pairs, unpaired topics, rename, private/absent equivalence, A/B reversal and non-mutation.
- Independent whole-branch review (Astra) found two Important defects, no Critical defects: note state crossed from A+B to A+C for one-sided topics, and catalogue discussion matching lost person-scoped linked-profile continuity. Both received reproductions and fixes. No deferred Minor findings.
- Review fix 1: canonical full relationship pair scopes editor/note state; note owner remains explicit. Browser test passes after A/B swap and subsequent A+C navigation.
- Review fix 2: catalogue references match person identity plus exact entry; custom references retain strict profile+entry identity. New unit test failed before fix and passed after it, including later agreement changes.
- Final production webpack/Serwist build and TypeScript completed with exit 0; BUILD_ID and prerender/required-server manifests generated.
- Fresh final suite: 97 files / 836 unit tests passed. Lint: 0 errors, 30 existing warnings. TypeScript: pass.
- Production browser checks: 48/48 passed (mobile and desktop) across contract.spec.ts, contract-custom.spec.ts and contract-dev-tools.spec.ts. Includes real handwritten/local digital signing, separate saved notes, source fields, and a durable generated PDF tied to the signed content hash.
- Production offline/PWA suite: 16/16 passed on desktop and mobile Chromium.
- Four screenshots inspected: mobile/desktop × dark/light. Explicit browser color scheme and html data-theme assertion prove both themes. No new overflow or overlapping content observed. No full WCAG or physical iOS/WebKit certification claimed.
- Signed QR round-trip, metadata tampering rejection, signed backup restore and unchanged legacy signatures pass. Existing historical metadata-free discussion remains label-based, intentionally read-only.
- Browser installation workaround: bundled Playwright download returned invalid archives. Local checks used isolated Chromium 153 with the repository's Playwright and production server; only local ignored configs changed runtime paths. Standard CI remains unchanged.
- An initial development-server browser run had one transient privacy-test failure while source/tests were being edited; it is not counted as a pass. The final frozen production run passed all 48 without retries. Temporary logs disappeared across the session pause; final tests were rerun.
- An initial lint attempt included generated Playwright report JavaScript; moving generated output outside the repo restored the normal zero-error lint run. No lint rule was bypassed.
- Dependency audit remains blocked: 9 entries (1 critical, 7 high, 1 low) on the unchanged dev dependency graph. Affected packages reported: next, sharp, source-map-js, braces, micromatch, fast-glob, @next/eslint-plugin-next, eslint-config-next, dompurify. No dependency, audit policy or CI changes in this branch.
- dev and PR #472 checked unchanged: cc751e2 and 2c254c83 respectively. No merge performed.

### Rulings and limitations

- Existing fresh safety-branch clone supplies isolation; no duplicate worktree. Cost if incorrect: interference with another checkout; no shared checkout was present.
- User's autonomous execution authorization supersedes repeated skill approval menus. Publication is a draft PR, not a merge or release.
- Catalogue matching uses the product's person-scoped rule, not the custom-only strict profile rule. Cost if incorrect: discussion memory continuity; exact entry IDs and explicit person identity remain required and the regression pins both continuity and invalidation.
- Optional source fields were retained under schema 1 because QR, signatures and backup tests accepted them without altering legacy payloads. No historical migration.
- philosophy.md referenced by the original design is not present on this dev base; PRODUCT.md, UI-principles.md and the approved explicit semantics are authoritative for this slice.
- Release readiness still requires the remote CI/Vercel outcome on the published SHA and resolution of the separate dependency audit. No full gate success claimed.


### Publication blocker

Automatic approval review rejected the attempted push because it requires explicit end-user authorization to publish repository code to GitHub destination `Jordybeer/kink`. No alternate writer was used. Read-only verification confirms remote safety branch is still `3593188b3c92fc35aef49af8c9c217c6c24a5732`; PR #472 remains `2c254c83a3b3cac4bf2d859fe34f04834857dd63`. No draft PR was created. The user must explicitly approve pushing this safety branch and opening its draft PR against dev. All implementation and local verification work is committed and reviewable.
