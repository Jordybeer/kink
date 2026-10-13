# Give KinkSync its own key to the front door

## Decision, 2026-09-28

Restore optional PWA installation following the owner's approval. PR #445 removed
installation promotion, the manifest and iOS standalone metadata; its offline
service worker remained. This change restores installability without restoring
automatic promotion. The browser app and installed app are both supported.

## User experience

Settings → KinkSync → KinkSync installeren opens inline guidance. When the browser
provides a native installation invitation, an explicit button can use it once.
Dismissal does not trigger another prompt. A new browser invitation enables a
later attempt. Failure falls back to browser instructions. iPhone/iPad users get
Safari instructions, including the optional Open as Web App setting. Installed
standalone windows hide the installation entry.

The manifest preserves the original identity (`id`, `start_url`, `scope`: `/`)
and existing ordinary/maskable icons. iOS standalone metadata returns with the
default status-bar treatment; this does not change navigation safe-area CSS.
No dependency, account, backend, notification permission or storage migration is
introduced. The old persisted installation-dismissal field remains inert.

## Local data and offline behaviour

Installation is not backup or sync. The guidance explicitly asks existing users
to make a backup and restore it if their installed app has a separate data store.
Do not promise browser-to-installed-app storage transfer across platforms.
The existing Serwist caching, fixed local-record shells and update banner retain
their behaviour. New installations still need an online first load to cache assets.

## Verification and release boundary

The browser regression suite covers the emitted manifest/icons/Apple metadata,
manual iOS guidance, hidden installed-state entry, and deferred native invitation
acceptance, dismissal and failure. Native events and standalone state are simulated;
these tests do not claim that an OS installation was performed.

Run unit tests, lint, production build, the installation/Settings browser specs and
production offline suite. Before promoting dev to main, record a physical iPhone
Safari install and standalone launch, profile/backup availability, offline cold
launch and a service-worker update. Emulation cannot sign off those OS behaviours.

Recovery: revert this PR to remove the manifest, metadata and Settings affordance.
Do not unregister the service worker or clear local storage as part of rollback.
