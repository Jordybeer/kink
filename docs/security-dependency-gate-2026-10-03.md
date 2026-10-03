# Dependency safeword — 2026-10-03

Candidate based on `dev` at `cc751e28c1e6c3cff85773bb846e96d056b3eadd`.
Separate from the Profile read-view mock in #472.

## Patch

- Pin `next` and `eslint-config-next` together at 16.3.8 (was 16.3.4).
- Refresh jsPDF's existing optional DOMPurify dependency to 3.4.16 (was 3.4.13).
- Keep React, jsPDF, product code, consent semantics and CI policy unchanged.

Primary advisories:

- [Next.js ImageResponse RCE](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j): affected 16.2.0–16.3.5; patched at 16.3.6.
- [DOMPurify detached-hook XSS](https://github.com/advisories/GHSA-p98j-92pf-mc4p): affected 3.4.13–3.4.15; patched at 3.4.16.
- [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): affected through 3.0.3; no patched release available on this date.

## Verification

- Baseline and patched unit suites: 795/795 tests, 96 files.
- Patched production webpack/Serwist build: PASS.
- Full lint and icon audit: PASS.
- Clean `npm ci` from the patched lockfile: PASS; resolved versions confirmed.
- Three targeted Chromium production checks at 360px: PASS. Critical launch
  routes hydrate with real content and fit the viewport; background work does
  not send seeded local record IDs to the origin; every fixed room opens offline
  without an earlier visit. These are not physical Safari or standalone tests.
- `npm audit --omit=dev`: zero vulnerabilities after the patch.
- Full `npm audit`: reduced from 1 critical + 5 high + 1 low to 5 high.

The five remaining entries are one development-tool dependency chain:
`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`.
The installed Next ESLint plugin invokes glob processing for configured
`settings.next.rootDir`; this repository does not configure that setting.
This bounds the inspected path but does **not** resolve or waive the advisory.
The existing `npm audit --audit-level=high` CI gate remains blocked.
Do not force npm's suggested downgrade to Next ESLint config 14.2.35, remove
lint coverage, invent a patched braces version, or relax CI to hide the finding.
Next step: recheck upstream for a compatible fix, then repeat audit/lint/tests/build.

## Bounded Impeccable audit

Implementation integrity: the product source and UI are byte-identical to the
base; only paired framework/tooling pins and an existing transitive dependency
change. The detector reports no findings for the changed manifest.

Accessibility, theming and responsive design receive no new full-app score:
this dependency patch does not supply evidence for a comprehensive WCAG or
visual audit. Existing lint and targeted production browser checks are the
regression evidence; physical iPhone/Safari/installed-PWA sign-off remains open.
Performance evidence is limited to a successful production build; no benchmark
or bundle-size improvement is claimed.

The generated mobile Profile screenshot was inspected: identity, questionnaire
entry, public hard boundary and export controls remain readable in this sample.
This does not establish contrast compliance or all viewport/theme combinations.

Independent code review: no important or critical patch defects and no
unrelated dependency churn found. The PR remains a draft while the complete
dependency audit gate is blocked.
