# Release delta review, 2026-09-29

## Baseline and verdict

Reviewed main `5e1089eb940cf3d41a78a54da214cafb7ae7b5ea` against dev
`01c85da369ed4d1bce9fb03ce4aec7d342971427`, plus first-run recovery candidate
`69108ec98e65bb1db8bc08a59d4b7083fd2cae05` (#468).

At the dev baseline: 326 commits ahead, one behind, 229 changed files,
16,129 insertions and 8,192 deletions. Counts include merge history and the large
catalog move, so they are not a measure of new product behavior.

**Ready to continue release verification, not yet to promote main.** Physical
hardware evidence and final candidate CI remain open. This is a scoped delta
review with existing regression evidence, not a full independent security audit.

## What changes for users

| Area | Main → candidate behavior | Evidence / release check |
| --- | --- | --- |
| Home and profiles | Calmer hierarchy, disclosure, two-step identity editor, linked sources, local partner preference | #460 and `profile-foundation-integration.md`; profile/home browser suites |
| Compare | Person-pair “Besproken” memory without changing profile answers or consent | `compare-discussion-memory.md`; invalidation/storage-failure tests |
| Questionnaire/catalog | Broader first-round coverage with less repeated topics; explicit oral/manual directional pairs; catalog split into `lib/kinks/base.ts` | First-round, directionality and taxonomy tests; 55 pairs now, not the old roadmap's 53 |
| Agenda | Local planned/completed intimacy entries, private calendar export, countdowns and opt-in reminders | Intimacy store/backup/calendar/reminder tests; reminders run while app is active, not guaranteed background delivery |
| Theme/navigation | System/light/dark choices, token contrast and shared sheet/viewport behavior | Theme, contrast, layout and device suites |
| Export/restore | Print-native Compare/profile output; shared validated JSON/encrypted restore includes scenes, history and intimacy; large base64 exports handled in chunks | Print/backup suites, ownership and consent verification; native iPhone file handling remains manual |
| Installation/offline | PWA installability restored through explicit Settings action; existing offline route caching retained | #467, `pwa-installation.md`, production offline suite |
| First visit | Direct recovery after adult/consent gates, explicit finish, no replacement profile, new PIN explained | #468, `first-run-backup-recovery.md`, six recovery E2E cases |
| QA | Dev-only fixture console, host allow-list and independent main/master route block | `devQaGate` and QA browser tests; confirm production `/qa` stays unavailable |
| CI | Historical required check aggregates static, browser/device/print and production offline jobs | `.github/workflows/ci.yml`; all lanes must succeed |

## Trust and data review

- Profile persist version remains 25; E2E fixtures import the live version constant.
- Existing ownership, signatures and quarantine remain the restore boundary.
  Shared profile import is not proof of ownership. Scene restore rejects invalid
  consent proof and never replaces an existing scene with older backup content.
- First-run recovery calls the same restore pipeline. Cancellation is checked
  before mutations; onboarding only completes after explicit successful recovery.
  A restored backup does not restore an app PIN.
- The cryptographic algorithm/iteration count is unchanged; base64 encoding now
  handles large buffers and typed-array offsets correctly.
- Compare discussion memory is a local conversation aid, not consent or a new
  answer. Profile/contract transitions invalidate stale discussed marks.
- The only direct HTML script injection found under app/components/lib is the
  static theme bootstrap in `app/layout.tsx`. Theme values are allow-listed;
  imported profile text is not interpolated into that script.
- Existing CSP allows inline scripts and forbids off-origin connections. It is
  not a nonce-based strict CSP. No protection against all same-origin script
  compromise is claimed. `SECURITY.md` exists and remains the trust reference.
- Offline/update, camera, native file saving and installed storage separation
  still need real-device checks; synthetic browser states do not settle them.

## Safe-area PR #451

The viewport flag is still absent in current dev. This is not proof of a bug:
Safari defaults to automatic safe-area insetting. #451 switches the entire app
to edge-to-edge layout while current TopNav/PageShell horizontal gutters do not
reference left/right safe-area insets. The existing test checks strings only.

Hold the PR pending a physical portrait/landscape/keyboard/standalone check. If
needed, refresh it onto current dev and fix the complete demonstrated boundary.
[WebKit's guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
explains the relationship between viewport coverage and safe-area content padding.

## Dependencies and open PRs

Locked versions already include Next 16.3.4, Vitest 4.1.11, js-yaml 4.3.2,
sharp 0.35.4, postcss 8.5.26, nanoid 3.3.18 and dompurify 3.4.13. Therefore old
main-targeted PRs #464, #461, #465, #463, #333, #332 and #300 do not justify
reintroducing old branch snapshots. Baseline-browser-mapping is 2.11.20; #462
proposes 2.11.22 and needs its own review if still relevant. #280 also needs
current-lockfile comparison rather than a blind merge. No dependency bump is
introduced by this follow-up.

The #468 CI audit step passed `npm audit --audit-level=high` in run
[36546059574](https://github.com/Jordybeer/kink/actions/runs/36546059574).
Final promotion must repeat the audit on its exact candidate.

Identity-anchor draft PRs #394/#395/#397/#399/#400/#401/#403/#411 remain outside
this release. Their draft status and explicit do-not-merge titles are preserved.

## Evidence and remaining gates

Recovery local verification: 782 units; build; lint 0 errors/30 existing warnings;
42 browser regressions; additional underage/cancel cases on mobile and desktop;
light/dark compact-phone and desktop visual review. #467 full CI was green before
its expected-head-guarded dev merge. #468 full CI is recorded in its PR, not
assumed from the successful local subset.

Final release PR must record current main/dev SHAs, merge result tree, required
checks/reviews, immutable preview URL and physical checklist results. The only
main-exclusive commit at this baseline is an empty deployment trigger. Normal
merge preserves it without restoring any obsolete code.

## Governance visibility

The repository rulesets endpoint returned an empty list, and the public main
branch snapshot explicitly reports `protected: false`, `enabled: false`, and
required-check enforcement `off`. This does not meet the release roadmap gate.
The detailed legacy-protection endpoint returns HTTP 403 because this integration
lacks administration access. An owner must enable and record PR-only main
protection, required release checks and disabled force pushes before promotion.
This task cannot configure those settings through the available connector.
