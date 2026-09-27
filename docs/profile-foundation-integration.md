# Profile foundation: tying the whole knot

Integration record for PR #460 into `dev`, including the repair stack from
PR #466. The starting `dev` was `79a57f0253a483156b99446f861a80dd8b507c22`.
This is a broad Home/Profile foundation and reliability change, not just a new
profile hero. The rejected #459 is not its base.

## What changes for people

| Surface | Before | After |
| --- | --- | --- |
| Profile | Identity, source metadata and nested containers competed for attention. | Avatar, name, perspective and experience lead a flat canvas; source details and editing stay quieter. BDSMTest, continuing the questionnaire and managing topics remain reachable. |
| Profile editing | Identity, questionnaire setup and linked-source editing were fragmented. | One sheet has **Identiteit** then **Vragenlijst**, with reachable back/save/close controls, bounded scrolling and focused subpanels for sources, interests and exploration mode. |
| Experience | Questionnaire depth could set or raise the displayed experience level. | Experience is an explicit self-assessment. Changing questionnaire mode does not change it. The stored `diepgaand` value displays as **Zeer ervaren**. |
| Home | Profile cards and utilities carried similar visual weight. | Grouped person rows and compact disclosures give Compare the focal action; Contracts, Scenes, Agenda, create and scan use quieter rows. Small screens and installed-PWA spacing are covered. |
| Partner preference | The shared profile used for Home comparison was less explicit. | **Mijn partner** is an explicit local preference, reachable in shared-profile navigation and used by Home. It does not edit the partner's profile. |
| Empty Home | Restoring required finding the existing backup route elsewhere. | **Importeer back-up** is a tertiary utility below partner scanning, using the same validated restore path. |
| Compare | Discussion acknowledgements did not reliably survive sessions and linked perspectives. | **Besproken** persists per person pair and exact topic/direction. Profile answers and notes remain read-only in Compare. |
| Backup and recovery | Large encrypted exports and incomplete archive restores could fail or omit content. | Chunked base64 handles large exports; JSON and encrypted restores share validation and ownership checks, including scenes and profile history. Failed encrypted imports can always close with Escape. |
| Onboarding and Scenes | Motion, focus, collapsed controls and field geometry had audit gaps. | Reduced motion, keyboard focus, visible-label accessible names, semantic control borders and affected 44px targets are hardened. |

## Meaning stays on a short leash

- KinkSync remains local-first: no account, backend or cloud synchronization is
  introduced. Sharing remains explicit; no answers or consent are inferred from
  a role, experience label, source score or partner preference.
- Identity updates preserve linked-person semantics. Questionnaire answers stay
  perspective-specific; updating questionnaire setup never copies answers.
- `Besproken` is an acknowledgement, **not consent**. A linked perspective with
  the same relevant meaning retains it; a relevant status/agreement change
  reopens that topic. Reverting the change does not resurrect a revoked mark.
- Opposite directions and ambiguous same-label custom topics remain distinct.
  Independent marks in different tabs do not overwrite the whole relationship.
  See [the storage contract](compare-discussion-memory.md) for legacy reads,
  acknowledgement revocation and storage-failure handling.
- Restore cannot roll an existing scene back over a later withdrawal. Invalid
  scene consent evidence is rejected rather than stripped into an unsigned scene.
  Existing scenes win ID collisions; archive limits remain 50 scenes and 30
  profile snapshots per profile. Signed PDFs are rebuilt from verified records.

## Compatibility and scope limits

- Main profile persistence remains version 25; there is no catalog-ID migration
  or forced rewrite of existing answers in this integration.
- Discussion memory uses separate v2 entry/revocation keys with conservative v1
  compatibility. Ambiguous legacy directional marks reopen. Old data is retained.
- Discussion marks/revocations and **Mijn partner** are local browser preferences;
  they are not included in backup/restore or synchronized between devices.
  Revocation-key compaction is deliberately outside this change.
- Deep Dive remains available. This merge does not execute the later Discover /
  Deep Dive rationalisation programme or imply those backlog items are complete.
- Existing dependencies are patched: Next.js and eslint-config-next 16.3.0 →
  16.3.4; Vitest and coverage-v8 ^4.1.7 → ^4.1.11. No new runtime package is added.
- The existing suggestion to move Home disclosure controls into section headers
  remains deferred. It is not a merge-blocking regression and is not silently
  counted as delivered here.
- Other open PRs, including #451's TopNav safe-area work and the draft identity
  anchor stack, are excluded. They must recheck overlap against the new `dev`,
  especially shared navigation, profile, backup and contract surfaces.

## Evidence and acceptance

The application tree `d44ac555fda16b239bdf96fade3c8e183ca30ba1` was verified on
`2d1d942e66b28e89e9951ed2097daf09c36a9c1c` by
[CI run #1235](https://github.com/Jordybeer/kink/actions/runs/36269524291).
Merging #466 produced `9774f59ca206a00d6192c7f74704deddb76366b9` with that exact
same tree. This integration note and the backlog record are documentation only.

| Gate | Result on the verified application tree |
| --- | --- |
| Audit / lint / build | 0 audit vulnerabilities; 0 lint errors, 30 existing warnings; production build passed |
| Unit | 782 passed |
| Browser | 536 passed |
| Launch matrix | 26 passed; 4 intentional skips of the iPhone-only motion case on other device projects |
| Print | 2 passed, Chromium and WebKit |
| Production offline | 16 passed |
| Vercel preview | Passed |

Visual acceptance on 2026-09-27 used the same run's WebKit iPhone screenshots
for Profile, Home, Scene and scrolled Profile editing, with mobile dark-theme
and larger-screen captures as supporting evidence. A production-build Chromium
rehearsal at 402×681 additionally inspected **Identiteit → Vragenlijst → Opslaan**
in both themes: both cases passed, the footer stayed reachable and there was no
horizontal page overflow. The focused Impeccable detector returned no findings
for ProfileHero, ProfileList and ProfileEditSheet. This is browser emulation,
not a claim of physical-iPhone testing or a blanket accessibility certification.

The parent PR must still have a successful final **Lint, test and build** gate
on its final head before merging to `dev`. The PR body records that final run.
CodeRabbit's skipped review status is not counted as a completed review.

## Integration and recovery

Merge #466 into #460 first, then #460 into `dev`, preserving both merge records
and the original commits. Do not merge into `main` as part of this task.

If a regression requires rollback, prepare a normal revert PR for the #460
merge using its first parent as the baseline. Preserve local browser data and
encrypted exports; do not clear storage as a deployment fix. The older app does
not consume v2 discussion records, so discussion state may not appear there.
Re-test restore and consent-sensitive flows before any rollback lands. Code
rollback cannot undo profile or agreement edits people made after deployment.
