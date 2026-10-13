# Exact-candidate iPhone release checklist

Status: **NOT RUN on physical hardware**. Do not mark this complete from CI,
Playwright device emulation, simulated install events or viewport screenshots.

## Candidate record

Copy this record into the promotion PR before testing:

- Promotion PR and head SHA:
- Main base SHA:
- Immutable preview/deployment URL and deployed commit:
- CI run URL (all required jobs green):
- Tester and date:
- iPhone model / iOS version / Safari version:
- Modes tested: Safari tab and installed standalone:
- Overall result / deviations / issue links:

Current application candidate before release-documentation changes:
`69108ec98e65bb1db8bc08a59d4b7083fd2cae05` (#468). It is **not** a substitute
for recording the final promotion head. Do not rely on the moving dev alias.
If runtime code changes, repeat affected checks and record the new candidate.
Use disposable test profiles and preserve any real backup before clearing data.

## Safari → installed app

- [ ] Fresh browser visit shows introduction. “Back-up herstellen” still requires
  the 18+ gate and consent explanation; underage cannot proceed.
- [ ] Make a disposable profile with identifiable answers; save an encrypted
  backup to Files and confirm the file exists. Keep its password separately.
- [ ] Open Settings installation guidance. Install via the native browser flow;
  return from Share Sheet without losing browser data or trapping focus.
- [ ] Launch the home-screen icon. Confirm actual standalone mode, not just a tab.
- [ ] If storage is fresh, choose first-run restore without creating a profile.
  Wrong password and cancellation do not finish onboarding or erase browser data.
- [ ] Restore the saved file. Check profile ID/answers, ownership/trust status,
  scenes/history/intimacy and verified contracts where present in the test backup.
  Check reported skipped/conflicting data; a file import is not ownership proof.
- [ ] Explicitly continue; close/reopen and confirm restored data persists.
  Set a new PIN in Settings, then verify lock/unlock and a direct protected route.
- [ ] Browser data remains intact. If browser/standalone storage is shared on this
  OS, record that observation rather than claiming a separate-storage transfer.

## Both Safari and standalone

- [ ] Home, profile, questionnaire and Compare work; private answers stay private.
- [ ] QR camera permission → close → reopen works; repeat after background/resume.
- [ ] Partner profile scan/import shows expected trust state and Compare works.
- [ ] Contract create/sign/QR/lifecycle and scene consent/withdrawal behave as
  expected; a historical contract is not presented as current consent.
- [ ] Profile/Compare/contract PDF output opens or saves legibly through Files or
  Share Sheet; returning to the app retains state.
- [ ] Portrait and landscape: notch, top nav, bottom controls and modal edges stay
  clear; no inaccessible controls or horizontal clipping. Record #451 evidence.
- [ ] Open keyboard in editor and backup password sheet; controls remain reachable,
  no unwanted input zoom, and focus returns after dismissing the sheet.
- [ ] Background/resume and rotation preserve the active task and local data.
- [ ] VoiceOver reads labels, gates and errors; focus stays in open dialogs.
  Reduced motion and larger text keep the same actions available.

## Offline and update

- [ ] In a fresh test install, load only Home online, let the worker finish, then
  go offline and cold-launch. Navigate core cached routes without warming each.
- [ ] Existing profiles and restored data remain accessible offline; unavailable
  routes fail clearly rather than showing a broken blank screen.
- [ ] With a documented older test deployment installed, publish/load the candidate
  and exercise the update flow. Verify it reaches the new commit without losing
  data. Record both deployments; do not mutate production to manufacture a test.

## Go / no-go

Storage, restore, ownership, consent, camera, lock, offline or update failures
block release. Record every failure with route, mode, OS and reproduction steps.
A #451 reproduction requires a focused fix and renewed verification; otherwise
record evidence for deferring it. Cosmetic deviations need explicit assessment.

After main is merged and deployment commit verified: smoke fresh load,
manifest/install, profile, encrypted backup roundtrip, QR on two devices,
Compare, contract, scene consent, PDF, offline/update and production `/qa` denial.
Record the production URL, commit and result in the promotion PR. Do not announce
public launch before this smoke passes.
