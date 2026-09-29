# First-run backup recovery

Returning users can choose **Back-up herstellen** on the welcome screen. They
confirm the existing adult gate and read the existing consent explanation before
selecting a file. They do not have to create a replacement profile or finish the
new-user tour first.

JSON and encrypted files use the existing `restoreLocalBackup` pipeline. Owner
keys, signatures, quarantine, conflict resolution and PDF reconstruction retain
the same rules as Settings/Home import. A backup is not automatic ownership
proof. This change adds no persisted schema, dependency or new cryptography.

A successful import displays the existing restore summary. Only **Verder met
mijn gegevens** completes onboarding. Invalid files, wrong passwords, cancelled
password dialogs and returning to the introduction do not complete it. Cancelling
an in-flight file read aborts before restoration writes. Successfully restored
data remains saved even if the user returns to the introduction afterward.

The app PIN is not restored. The recovery screen explicitly directs users to set
a new PIN in Settings. Browser and installed-app storage may be separate; users
must keep their exported file and password until restoration is verified.

## Verification

- `e2e/first-run-backup.spec.ts`: age/consent ordering, JSON and encrypted recovery,
  wrong password, explicit completion, persistence, invalid files and cancellation
  during file reading.
- Existing new-user, onboarding geometry and backup-export browser regressions.
- Existing restore unit tests cover ownership, signatures and cancellation before
  mutations; no restore/security implementation is duplicated here.
- A real iPhone Safari export → installed-app restore remains a required release
  check. Browser emulation does not prove platform file saving or storage transfer.
