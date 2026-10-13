# Profile layout follow-up plan — 2026-09-30

Scope: PR #471 on `impeccable/distill-profile-20260929`.

This plan supersedes ad-hoc Profile/topic-editor polish notes for the current branch. It is intentionally narrow: finish the Profile read hierarchy and topic editor, restore the full release gate, then audit the exact head before touching `dev`.

## Current state

Audited implementation head: `887b6f8d15ea526c0dff35dfd2d0f3845a540223`.

Impeccable audit: **16/20 — Good, not release-ready**.

What is already working on that head:

- Profile category title + caret are the disclosure control; the collapsed factual summary is sibling reading content.
- The collapsed summary disappears when the full category is expanded, avoiding duplicate reading.
- Public preview items and every public hard boundary remain explicit.
- Private answers still contribute only a count to collapsed summaries.
- Topic editor follows the focused Profile Edit pattern: fixed title/close header, one scroll body and persistent `Klaar` footer.
- Topic description and safety copy are no longer clamped.
- Status choices in the editor are flatter list rows; questionnaire answer cards remain unchanged.
- Agreements, visibility and context are separated into plain groups.
- Immediate-save, privacy, consent, sharing and export semantics are unchanged.
- Static verification, production offline rehearsal, Vercel and CodeRabbit are green.
- The new topic-editor layout E2E passes on mobile and desktop.

Current blocker:

- Browser/device rehearsal fails **6 assertions** across mobile and desktop because older tests still expect the previous punctuation/markup contract:
  - `Heel graag:` instead of the new separate `Heel graag` label;
  - `Harde grens:` instead of the new separate `Harde grens` label.
- 558 browser tests pass.
- Because browser/device fails, launch and print are skipped and the aggregate release gate fails.
- This is a release-gate blocker even though the captured UI still contains the expected preference and boundary content.

## Phase 1 — Repair the stale Profile test contract

Priority: **P1 / release blocker**.

Update only the assertions that encode the intentionally superseded presentation structure.

Requirements:

- Keep testing the actual semantic guarantees, not punctuation.
- Continue asserting the exact public item names.
- Continue asserting public hard-boundary names while the category is collapsed.
- Continue asserting private-content redaction.
- Continue asserting truthful remainder semantics such as `+N meer`.
- Continue asserting keyboard disclosure state and accessible naming/description.
- Do **not** weaken tests by replacing precise semantic assertions with broad screenshot-only checks.
- Do **not** change production behaviour merely to make the stale punctuation assertions pass.

Known affected coverage:

- `e2e/profile-read-summary.spec.ts`
- `e2e/profile.spec.ts`

Exit condition:

- The previously failing mobile and desktop Profile assertions pass against the intentional new hierarchy.

## Phase 2 — Add explicit visual evidence for the topic editor

Priority: **P2 / audit completeness**.

The topic editor was the original user-reported readability problem, so its final layout must have its own visual evidence rather than relying only on interaction assertions.

Add or retain stable captures for:

- mobile dark theme;
- mobile light theme;
- enlarged text / text scaling where practical;
- a long-description or safety-note topic;
- selected status plus Agreements, Visibility and Context sections;
- persistent `Klaar` footer after scrolling.

Review specifically for:

- no container-lasagne returning;
- no clipped description or safety copy;
- no status row shorter than 44px;
- no horizontal overflow;
- clear difference between section heading, choice label and explanatory copy;
- selected state identifiable without colour alone;
- safe-area/footer geometry on iPhone-class viewport.

Exit condition:

- The editor is readable in both themes and its footer remains reachable without covering content.

## Phase 3 — Re-run every exact-head release gate

Priority: **P1 / mandatory before merge consideration**.

After the test-contract fix, freeze the commit and require all evidence from that exact head:

1. Static verification.
2. Browser and device rehearsal.
3. Launch rehearsal.
4. Print rehearsal.
5. Production offline web rehearsal.
6. Aggregate `Lint, test and build` / release gate.
7. Vercel deployment success.
8. CodeRabbit/status checks required by the PR.
9. No unresolved review threads.
10. PR remains mergeable.

Rules:

- Do not bypass, weaken or remove a gate.
- If a lane fails, inspect only that lane and its relevant artifact/log.
- Do not make unrelated polish changes while waiting for a gate.
- Any code or test change creates a new exact head and invalidates the previous exact-head gate evidence.

Exit condition:

- Every required lane is terminal and successful on one immutable PR head.

## Phase 4 — Bounded Impeccable polish

Priority: **P2 / only after Phase 3 is green**.

Do one bounded visual inspection of Profile + topic editor using the final screenshots.

Check:

- information hierarchy;
- scanability at phone width;
- spacing rhythm;
- light/dark contrast;
- 200% text scaling;
- 44px touch targets;
- focus visibility;
- disclosure semantics;
- footer/safe-area geometry;
- long names, notes, boundaries and descriptions.

Only fix defects that are visible and material. Do not start another redesign cycle.

If a polish change is made:

- return to Phase 3 and re-run the full exact-head gate.

Exit condition:

- No P0/P1 issue remains and no obvious P2 readability regression is visible in the final screenshots.

## Phase 5 — Final audit and dev decision

Run `@Impeccable audit Profile + topic editor` on the final exact PR head.

The final audit should explicitly answer:

- Does Profile read as a person-first overview rather than a compressed database?
- Are explicit statuses and hard boundaries easier to scan than in the original iPhone screenshots?
- Does the editor have one clear reading flow rather than competing cards?
- Is every consent/privacy meaning preserved?
- Did implementation complexity stay controlled?
- Are all release gates green on the exact audited head?

Only after that:

- decide whether PR #471 should leave draft;
- decide whether it is ready to merge into `dev`.

## Guardrails

Until the final exact-head audit is green:

- keep PR #471 **draft**;
- do not merge PR #471;
- do not modify `dev`;
- do not merge `main`;
- do not pull unrelated Home, identity-anchor, dependency or PWA work into this PR;
- preserve the optional-PWA policy;
- preserve all explicit consent/privacy semantics.

## Definition of done

PR #471 is ready for a dev-merge decision only when all of the following are true:

- [ ] stale Profile presentation assertions are updated without weakening semantic coverage;
- [ ] Profile browser tests pass on mobile and desktop;
- [ ] topic-editor visual evidence exists for light/dark mobile layouts;
- [ ] description and safety content remain fully readable;
- [ ] status choices, agreements, visibility and context remain accessible and keyboard-safe;
- [ ] no private content leaks into collapsed Profile summaries;
- [ ] every public hard boundary remains explicit by name;
- [ ] static verification is green;
- [ ] browser/device rehearsal is green;
- [ ] launch rehearsal is green;
- [ ] print rehearsal is green;
- [ ] production offline rehearsal is green;
- [ ] aggregate release gate is green;
- [ ] Vercel is green;
- [ ] no unresolved review threads remain;
- [ ] final Impeccable audit finds no P0/P1 issue;
- [ ] PR remains draft until the final audit is recorded.
