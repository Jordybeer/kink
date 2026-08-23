# PR1 — Contract lifecycle security audit

Date: 2026-08-18
Status: POST-MERGE VERIFIED
PR: #390 — Harden contract lifecycle against stale and forked requests
Merged dev commit: `fa6999fad5d9ec8e3a5ef37a9aaf17c01f316123`
Verified candidate head: `8f54733172a3430261df625b22e61a372070d9ba`

## Executive summary

PR1 hardens KinkSync's contract lifecycle so that lifecycle authority is tied to the exact locally known contract lineage rather than merely to a cryptographically valid message. The implementation rejects stale, forked, malformed, replayed, and invalid-transition exchanges; preserves restrictive local pause/stop semantics; requires mutual signed authority for resume/reactivation; and keeps regenerated pending QR payloads bound to their original lineage event.

The post-merge verification completed successfully. All three required CI lanes were green on the exact verified candidate, and PR1 is considered fully green. PR2 was not part of this implementation.

## Security objective

The objective of PR1 is to prevent a validly signed contract lifecycle message from acquiring authority when it is no longer attached to the exact contract state that the receiving device currently trusts.

The central invariant is:

> A valid signature is necessary but not sufficient. A lifecycle request, response, or receipt must also bind to the exact expected local lineage tail and represent a permitted state transition.

This prevents old, concurrent, forked, or replayed messages from silently becoming authoritative merely because their signatures remain cryptographically valid.

## Threat model covered by PR1

PR1 addresses the following lifecycle-level attack and failure classes:

1. **Stale request acceptance** — an older signed lifecycle request must not be accepted after local contract state has advanced.
2. **Forked lineage** — two independently valid messages branching from the same earlier state must not both become authoritative.
3. **Replay** — a previously valid lifecycle exchange must not be reusable against a later state.
4. **Malformed lineage** — messages with incomplete or internally inconsistent lineage metadata must fail closed.
5. **Invalid transition** — cryptographic validity must not bypass the contract state machine.
6. **Pending QR regeneration drift** — regenerating a pending QR must not silently create a new lineage authority or detach it from the event originally awaiting completion.
7. **Unilateral relaxation** — restrictive local pause/stop behavior must not be weakened by a remote message without the authority required by the lifecycle rules.
8. **Resume/reactivate authority** — moving from a restrictive state back into an active state requires mutual signed authority rather than unilateral local or remote assertion.

## Security invariants

PR1 establishes or reinforces these invariants:

- Contract lifecycle messages are evaluated against the exact local lineage tail.
- Request, response, and receipt lineage are cryptographically and semantically bound to the lifecycle event they represent.
- A stale but correctly signed message is rejected.
- A forked but correctly signed message is rejected when it no longer extends the trusted local tail.
- Replayed lifecycle material cannot advance a contract twice.
- Invalid state-machine transitions are rejected independently of signature validity.
- Restrictive local pause/stop semantics remain fail-safe.
- Resume/reactivate requires the expected mutual signed authority.
- Regenerated pending QR payloads remain tied to the original pending lineage event.
- No accepted remote exchange may silently rewrite canonical local contract history.

## Fail-closed behavior

Where lineage or transition authority cannot be established, PR1 chooses rejection rather than best-effort recovery. In particular, stale tails, lineage conflicts, malformed messages, invalid transitions, and incompatible pending exchanges do not silently merge into the local contract history.

This is deliberate: contract history is security-sensitive consent state. Ambiguity is surfaced as a blocked exchange instead of being resolved by guessing which signed message should win.

## Scope boundaries

PR1 is specifically a contract lifecycle and lineage hardening change. It does **not** claim to solve independent first-contact identity anchoring.

A locally trusted participant identity is still an input into the PR1 trust model. PR1 verifies that subsequent contract authority remains consistent with that trusted participant and the exact contract lineage; it does not independently prove that the first key imported for a person belonged to the intended human.

That remaining trust-on-first-use boundary is PR2 scope.

PR1 also does not redefine backup/restore as canonical contract authority, introduce accounts or a backend, or redesign KinkSync's local-first architecture.

## Verification evidence

The exact PR1 candidate head used for the final gate was:

`8f54733172a3430261df625b22e61a372070d9ba`

Workflow run #706 completed with all required lanes successful:

- Lint, test and build — success
- Browser and device rehearsal — success
- Production PWA and offline rehearsal — success

After merge, `dev` advanced to:

`fa6999fad5d9ec8e3a5ef37a9aaf17c01f316123`

The merge commit records PR #390 as hardening contract lifecycle authority against stale and forked requests and preserving the approved lifecycle semantics.

## Audit conclusion

**PR1 is POST-MERGE VERIFIED — fully green.**

The implemented security boundary is intentionally narrow and composable: PR1 protects the integrity and continuity of contract lifecycle authority *after* a participant identity and contract lineage are locally trusted. Independent first-contact identity anchoring remains a separate PR2 concern and was not started as part of PR1.
