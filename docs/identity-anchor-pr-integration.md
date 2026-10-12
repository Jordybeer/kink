# Identity anchor PR integration, 2026-10-12

This integration starts at `523085f` (`impeccable/profile-topic-ui-prototype-20260930`) and merges the actual PR #411 head `3f30f5e`. The initial merge commit is `224b00f`. It retains the current Home, first-run backup recovery, optional installation from Settings, shared navigation, ProfileTrust `quiet` prop and current typography.

Before integration, none of the old identity heads was an ancestor of current dev or the Profile prototype, and `git cherry` marked their patch commits `+`. Source inspection also found the independent identity-anchor functionality absent. They must not be treated as semantic no-ops until the consolidated implementation is present.

## Superseded branch intent and current source evidence

| PR and original head | Intended behavior | Consolidated implementation retained |
| --- | --- | --- |
| #394, `87356aa` | Separate a valid signature from independently confirmed identity; match exact profile/code/key/fingerprint | `lib/profileIdentityTrust.ts`: `createProfileIdentityAnchor`, `matchProfileIdentityAnchor`, `resolveProfileIdentityTrust`; matching original module differs only by the stronger cryptographic fingerprint |
| #395, `269f283` | Persist local-only versioned anchors; preserve existing anchors; fail closed on malformed registry | `lib/storeSecurity.ts`: separate registry, strict parser and immutable persistence; #403's exclusive Web Locks and readback replace the earlier synchronous writes |
| #397, `ba8159a` | Classify imports against existing anchors and signed update lineage | `lib/profileVerification.ts`: `classifyProfileImportWithIdentityAnchor`; known code/id/key changes remain conflicts |
| #399, `d9f152b` | Explicit source-device or independent-channel comparison before first signed import; distinct visible trust states | `app/page.tsx` confirmation methods, fresh signature verification and local anchor transaction; `components/ProfileTrust.tsx` distinct signed-unanchored, anchored, legacy and invalid states |
| #401, `05a1740` | Block initial contract activation until the shared counterparty has a matching local independent anchor | `lib/contractProtocol.ts`: outbound activation gate and incoming request verification; `components/contract/ContractInboxSheet.tsx` checks before receiving and responding; ordinary pause/stop/resume rules retained |
| #403, `a6aae59` | Cryptographic fingerprint, stale-operation guards, safe import plan, exact rollback and cross-tab serialization | `lib/consentProof.ts`: 80-bit SHA-256 fingerprint; `lib/importOperationGuard.ts`; `lib/storeSecurity.ts`: safe plan, Web Locks and `removePersistedProfileIdentityAnchorIfMatches`; fresh-state checks in Home |
| #400, `682a855` | Repair Home context-menu navigation expectations in browser tests | Current `e2e/about.spec.ts`, `questions-nav-share-polish.spec.ts`, `route-scroll.spec.ts` already navigate with `Meer opties`; `settings-density.spec.ts` checks installation in Settings. Their modern content is retained unchanged. |

After the consolidated merge and corrections, old heads can be recorded as ancestry-only merges. They do not replace current files with older Home layout, automatic installation prompts, old navigation selectors, weak fingerprints or synchronous registry writes. The ancestry merge is justified by the semantic mapping above, not by the age of the branches.

## Corrections to the consolidated donor

- Receiving a decoded candidate invalidates its old decode generation. `applyIfCurrent` preserves the acceptance decision so a successful scan still closes; stale callbacks remain no-ops. Leaving Home or a profile-share URL invalidates pending work.
- An exact existing signed shared version can undergo explicit independent comparison without forcing a new proof version. `sameSignedProfileVersion` requires the same id, code, complete proof and projected signed payload. The import plan retains the original object, including local private context. Owned profiles, changed payloads, changed keys and older/different versions do not qualify. An already anchored identical replay is named `anchored-existing`, not a new update.
- The existing quota-safe Zustand persistence wrapper suppresses write exceptions. The donor checked memory only and could report success despite a failed durable profile write. `commitProfileImportPlan` checks the persisted prewrite snapshot against memory, reads back persisted profiles exactly, rolls memory back after a failed attempted write, and leaves the surrounding anchor transaction to remove only its own newly created anchors.
- The confirmation button keeps independent comparison explicit and follows the current no-em-dash interface-copy rule.

## Validation evidence

The donor integration passed its eight focused test files (65 tests) and TypeScript. New existing-contact and generation tests were observed failing before their fixes. A real Zustand/persist + `createQuotaSafeStorage` reproduction demonstrated the donor's memory-only commit reporting success on quota failure; the durable-readback fix makes it fail closed while the successful control remains accepted. External stale-profile and unreadable-prewrite regressions also demonstrate rejection without writing either the proposed profiles or a stale rollback; a real initially empty Zustand store remains accepted only after its first durable write.

The final focused unit/security group passes 19 files and 154 tests, covering trust, registry immutability/rollback/locking, import lineage/planning/commit, stale generations, contract identity/lifecycle/replay/participant binding, profile sharing, private responses and backup ownership. TypeScript, changed-path ESLint and `git diff --check` pass. Existing unrelated donor crypto/protocol unused-variable lint warnings are not changed.

Browser guards were added for successful scanner dismissal, existing-contact confirmation preserving local data, and quota failure rolling back the new anchor. These and the donor's profile/contract identity browser specs require the final combined-tree remote browser gate. Local Chromium exits before test execution; no browser pass is claimed here. No complete unit or browser suite was run for this isolated integration.
