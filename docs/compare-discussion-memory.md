# Keep each discussion on its own leash

`Besproken` is a relationship acknowledgement, never consent or a profile answer.

## Storage contract

- Each v2 entry belongs to canonical `(person identity, kink ID)` pairs. Column swaps and linked perspectives preserve identity; opposite directions and same-label custom items do not share it.
- Each explicit mark or unmark writes only that entry. Concurrent decisions on the same entry use the last storage write, not wall-clock timestamps.
- Unmarking stores `discussed: false`. Removing the key would allow an old v1 mark to return.
- Reads never mutate storage. A mismatching fingerprint is hidden locally without letting a stale tab erase a newer acknowledgement.
- Actual profile/agreement edits and changes of the compared perspective revoke the specific acknowledgement of the previous meaning. Revocations use separate, immutable keys tied to acknowledgement IDs. Reverting an answer does not restore a revoked mark; explicitly discussing it again creates a fresh ID.
- Store subscriptions observe edits even outside Compare. Compare also refreshes on relevant storage events, same-tab changes, and window focus.

## V1 compatibility

An absent v2 entry may read an unambiguous v1 mark. This compatibility read never copies or rewrites the legacy blob, so there is no migration writer competing with clicks. A v2 entry always takes precedence, including an explicit unmark or malformed entry.

Legacy complementary marks reopen because v1 did not record who gave or received. Duplicate labels also reopen where identity cannot be recovered safely. The original v1 data is retained.

Revocation records are retained deliberately. Deleting them during reads could resurrect old acknowledgements. Automatic compaction is outside this change.

Storage failures retain the existing storage-full notice path. This schema does not add cross-device synchronization or backup support.

## Regression gate

The unit suite covers directional identity, linked perspectives, column swaps, independent writes, stale readers, fresh marks racing invalidation, legacy precedence, change/reversion, agreement lifecycle, storage failures and event cleanup. `e2e/compare-discussion.spec.ts` checks two real tabs, opposite directions, unmarking and reloads on mobile and desktop.
