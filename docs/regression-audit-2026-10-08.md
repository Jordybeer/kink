# KinkSync regression audit and recovery, 8 October 2026

## Decision

Keep the approved Profile/topic-editor work and the dependency patches. Repair the three reproduced identity-readability regressions with a small patch. Do not merge PR #472 while its existing dependency audit gate fails.

This report distinguishes current source, reproduced rendering and historical PR claims. It is a scoped regression audit, not a complete security audit, performance benchmark or WCAG certification.

## Verified baseline

- Repository: `Jordybeer/kink`.
- PR: [#472](https://github.com/Jordybeer/kink/pull/472), open, targeting `dev`.
- Audited head: `2c254c83a3b3cac4bf2d859fe34f04834857dd63`.
- Current `dev`: `cc751e28c1e6c3cff85773bb846e96d056b3eadd`.
- The earlier reported `cc6b862` was superseded by the questionnaire-geometry revert `2c254c8`.
- Reference for the approved Profile before the subsequent broad styling work: `af88dbe46bfd0600eddf7f5eebcec357d2886559`. This is historical implementation evidence, not an assumption that every later styling decision was unwanted.
- Vercel deployment `dpl_3LdLyqjHsTXhry73jbFwkavXPPLM` is READY and explicitly identifies audited head `2c254c8`.
- PR #472 changes 44 files relative to `dev`, including the intentional status-first reader and two-step topic editor. A blanket branch reset would also discard that work.

## Implementation integrity verdict

The partial reverts did not restore every earlier layout. They removed the later site-wide skin layer from selected files while retaining the earlier relationship-thread changes in Compare, contracts and scenes. The current questionnaire implementation matches the earlier geometry after `2c254c8`; it should be tested rather than reverted again by assumption.

Three verified layout regressions remain at the audited head. Existing tests can find a complete string in the DOM while a user sees clipped text. That is why passing CI did not rule these defects out.

The recovery preserves palette, ambient motion, relational surfaces, status meanings, persistence, sharing and navigation. It changes how identity text receives space; it adds no dependencies, migration, hooks or state logic.

The detector returned no findings in the four repaired UI files. Manual rendering found the three issues below, so an empty deterministic scan is not a clean bill of health. Integrity verdict: the approved product structure is coherent, but the audited head fails identity-readability checks in three repeated relationship layouts.

## Scoped health assessment

These are provisional rubric judgments for the repaired identity surfaces, not measurements or an application-wide accessibility score.

| Dimension | Score | Evidence and limits |
|---|---:|---|
| Accessibility | 2/4 | Labelled native profile buttons, visible text and Escape dismissal verified; contrast and assistive technology combinations remain unmeasured. |
| Performance | 3/4 | Patch adds no dependencies, effects or state; no frame-rate or bundle benchmark. |
| Responsive design | 2/4 | Identity layouts pass the phone/wide matrix, but contract status tabs and top navigation still collide or clip at 200% root font. |
| Theming | 3/4 | Existing semantic tokens retained; rendered light/dark cases checked, without a complete contrast measurement. |
| Implementation integrity | 3/4 | Repeated clipping repaired in a small diff; current parent PR evidence still needs refreshing. |
| **Total** | **13/20** | **Acceptable within this scope; enlarged navigation needs further work.** |

Findings: 0 P0, 5 P1, 1 P2, 0 P3. Three P1 identity-layout findings are addressed by this recovery. Enlarged navigation, the existing dependency gate and stale parent PR evidence remain open.

## Findings by severity

### P1: Compare identity text collapses into letter columns

- Location: `components/compare/CompareProfileHeader.tsx`, `components/compare/ProfileChip.tsx`.
- Category: Responsive / Accessibility / Implementation integrity.
- Trigger: two selected profiles with long aliases at 320px; role labels are also clipped at 390px.
- Cause: `bee9b89` replaced two profile columns with two flexible columns plus a fixed 3.25rem connector. `e535cc1` then added horizontal wrapper padding. Avatar, padding and caret still consumed a fixed amount inside each profile button, leaving almost no width for the text. `ProfileChip` also explicitly truncated role labels.
- Evidence: production screenshot shows names rendered one letter per line and the identity block occupying most of the first viewport. New rendered-text checks fail at both phone widths.
- Recovery: use two full mobile columns, move avatar/caret above mobile text, allow role text to wrap, and retain the connector and horizontal button layout from `sm` upward.
- Suggested command: `$impeccable adapt`.

### P1: Contract participants cannot be distinguished reliably

- Location: `app/contracts/page.tsx`, active contract heading and expanded draft list.
- Category: Responsive / Implementation integrity.
- Cause: `14df58f` introduced fixed connector columns and `truncate` for both participants; subsequent presentation work applied the same pattern to draft links. Previous names wrapped.
- Impact: long aliases collapse into partial prefixes, making identification harder before opening the agreement.
- Evidence: new production checks fail for participant text at 320px and 390px.
- Recovery: restore flowing, wrapping participant names and the earlier multiplication separator in both list states. Give identity text its own full-width mobile row beside neither the status nor the icon/caret; retain horizontal layout from `sm` upward. Post-hydration 200% root-font testing reproduced clipping in both the draft row and the active header before these additional reflows. Preserve the contract surface, status, actions and timestamps.
- Suggested command: `$impeccable adapt`.

### P1: Scene participants lose readable identity

- Location: `app/scenes/page.tsx`, `SceneCard`.
- Category: Responsive / Implementation integrity.
- Cause: `f400c5b` replaced a flowing participant line with a fixed connector grid and truncated each name.
- Impact: participants are represented by shortened names in the scene overview.
- Evidence: new production checks fail at 320px and 390px.
- Recovery: restore a wrapping participant line with the earlier ampersand, keep identity colours, and retain the separate date line.
- Suggested command: `$impeccable adapt`.

### P1: Existing release gate remains blocked by dependency advisories

- Location: GitHub run [37800943040](https://github.com/Jordybeer/kink/actions/runs/37800943040), `Static verification`.
- Actual failing step: `npm audit --audit-level=high`.
- Exact run reports seven high-severity dependency entries, from three advisory roots: `braces`, `sharp`, `source-map-js`.
- The aggregate `Lint, test and build` job fails because it requires every lane. Its title does not mean a compiler or unit-test failure occurred there.
- Existing browser/device and production-offline lanes succeed on the candidate merge tree for this PR head. Vercel independently reports READY for the exact branch head.
- No audit policy was weakened or bypassed. Dependency remediation is separate from this layout patch.

### P1: Enlarged contract navigation remains constrained

- Location: contract status tabs in `app/contracts/page.tsx` and shared top navigation.
- Category: Responsive / Accessibility.
- Trigger: 320px with the root font set to 32px after hydration.
- Evidence: the final screenshot shows the `Gepauzeerd` and `Archief` labels overlapping; the top QR label also clips. Identity names themselves pass the strengthened checks after this recovery.
- This is a verified remaining layout problem. Its introduction has not been traced to the recent styling series, so it is not counted as one of the three causally established identity regressions.
- Recommendation: separately adapt shared navigation and the status tabs for enlarged text, then test labelled controls, all tab states and other routes. The identity matrix must not be presented as whole-page zoom certification.
- Suggested command: `$impeccable adapt`.

### P2: PR description does not describe the current verified candidate

- Location: PR #472 body.
- It still names `af88dbe` as its final head and reports five high entries. The current head is `2c254c8`, and the newer run reports seven high entries.
- Its older screenshots/test claims cannot automatically be transferred to later styling commits or reverts.
- The CodeRabbit success status is not proof of a full current review: the visible bot comment says automatic review was skipped. The recovery receives a separate read-only code review instead.
- Recommendation: update the parent PR description with fresh exact-head evidence after its remaining work settles.

## Tests and verification

Before implementation, all six new production-browser tests failed for the expected rendering defects: Compare, contract participants and scene participants at 320px and 390px.

The regression helper checks actual rendered text rectangles against the label, its parent, and every clipping ancestor on both axes. It does not merely assert that a string exists. Independent review caught a possible inline-span false negative; the helper was strengthened and the reviewer reproduced both horizontal and vertical clipping detection.

| Check | Result |
|---|---|
| Unit suite, before and after recovery | 97 files, 788 tests passed. |
| Final clean production build | Passed, including TypeScript and Phosphor icon check. |
| Full lint | 0 errors, 30 existing warnings; no new warnings. |
| Final production browser selection | 40 cases passed: 24 identity-readability cases plus 16 contract-flow cases. |
| Identity matrix | Light/dark; 320, 390 and 1280px at normal root font; 320px with post-hydration 200% root font verified as 32px. |
| Broader recovery rehearsal | 74 cases passed before the final contract mobile reflow, covering Compare, profile reader/editor/sharing, questions and home hierarchy. Its older pre-hydration zoom results are superseded by the final matrix. |
| Independent review | No remaining Critical or Important findings after the contract reflow. |
| Deterministic scan / whitespace | Four UI files: no detector findings; `git diff --check` passed. |

Final layout/contract verification used a clean production build, a fresh local port and blocked service workers to ensure current code was rendered. An earlier browser trace demonstrably loaded an older contract bundle; that run is excluded from final passing evidence. Chromium context-creation failures in earlier rounds are environment failures, not counted as app regressions. Offline behaviour is not certified by this scoped layout run.

The final root-font case verifies layout under a 32px root. It does not double fixed-pixel Compare name/role text, simulate every browser zoom mode, or certify the whole application's text enlargement.

## Positive findings to preserve

- The two-step topic editor and dedicated status reader have explicit product guidance; they are not accidental styling regressions.
- Public hard limits remain named and private data retains deliberate disclosure paths.
- Existing local/offline capabilities remain present; this work does not remove PWA support.
- Both themes use the existing semantic tokens. The repair adds no hard-coded theme palette.
- Questionnaire geometry was already restored at the audited head. Do not reapply its earlier styling changes while recovering other surfaces.

## Scope and remaining uncertainty

The patch addresses reproduced identity-readability problems. It does not certify every screen, every alias length, a physical iPhone, Safari text enlargement, keyboard/screen-reader combinations, measured colour contrast, or frame-rate performance. A root-font enlargement case is distinct from enlarging text with fixed pixel sizes.

The palette and stronger ambient movement remain because no verified regression established that those changes should be removed. Replacing them would require a separate design decision rather than a guessed rollback.

Recommended order: apply the scoped `$impeccable adapt` recovery, resolve the dependency gate through its own reviewed change, refresh the exact-head PR evidence, then use `$impeccable polish` only for a bounded final inspection.
