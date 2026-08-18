# KinkSync — Independent Security, Privacy & PWA Audit Challenge

Date: 2026-08-18

## Scope

Independent challenge of `docs/release-candidate-audit-2026-08-17.md` against branch `claude/release-candidate-audits-2yi1nt`, using `main` commit `118c0de` as the stated baseline.

Work was read-only during the audit. No application, data, deployment, account, dependency, or configuration changes were made as part of the audit.

## 1. Audit baseline

- **Investigated branch:** `claude/release-candidate-audits-2yi1nt`
- **Observed HEAD:** `041ed1a30bdd071a6a55b5a9494929ebee4eb706`
- **Comparison baseline:** `118c0de`
- **Diff summary:** the RC contains the reported security/privacy changes around global security headers/CSP, BDSMTest URL sanitization, fragment-only profile sharing, destructive local-data cleanup, PWA cache/update handling, import limits/security tests, and dependency cleanup.

The four reported fixes are present in the RC. Negative-path review found that two of the claims are not fully closed: destructive reset does not demonstrably remove every runtime Service Worker cache, and existing persisted `bdsmtestUrl` values are not necessarily re-sanitized during hydration/migration.

## 2. Verification matrix

| Finding | Verdict | Evidence | Correction or nuance |
|---|---|---|---|
| **KS-SEC-001** | **Verified fixed** | Global CSP contains `frame-ancestors 'none'`, `connect-src 'self'`, `object-src 'none'`, `base-uri`, and `form-action`; `X-Frame-Options: DENY`, `nosniff`, and `Referrer-Policy: no-referrer` are configured. Effective deployed response headers were also observed. | No verified blocker/high remains. CSP still uses `unsafe-inline`, but that is not itself a demonstrated XSS vulnerability. Real Safari/Firefox remain manual launch gates. |
| **KS-SEC-002** | **Partially fixed** | The sanitizer allows only HTTPS `bdsmtest.org`/`www.bdsmtest.org` URLs and rejects unsafe schemes, look-alike hosts and malformed URLs. Relevant tests exist. | Existing profiles originating from the vulnerable baseline are not necessarily re-sanitized during hydration. A previously stored malicious value can therefore survive. Fresh input/import/share paths are materially hardened. |
| **KS-PRIV-001** | **Verified fixed** | Generated share links use fragment payloads (`#p3=...`); QR/share parsing reads the URL hash and does not use query parameters for profile payloads. | A manually crafted URL can of course contain an arbitrary query string, but KinkSync does not accept `?p=` as a profile transport. App-generated profile payloads do not use query strings. |
| **KS-PRIV-002** | **Partially fixed** | Destroy flow clears `localStorage`, `sessionStorage`, and the explicitly named KinkSync page cache. | The Service Worker also has Serwist/default runtime caching. The destroy flow does not prove deletion of every such runtime cache. See **KS-PRIV-003**. |
| **KS-PWA-001** | **Verified still open** | No `navigator.storage.persist()` was found. The application remains primarily browser-storage based. Backup/export exists, but there is no demonstrated mandatory/proactive backup gate before meaningful data entry. | Storage eviction/durability risk remains. The exact “seven day” behavior is too absolute and browser-dependent. Classify as a must-fix-before-launch item or explicitly accepted risk with a clear backup warning. |
| **KS-SEC-003** | **Verified still open — Low/acceptable under stated threat model** | `verifyPin()` retains a legacy unsalted SHA-256 branch with `hex === stored`; the PBKDF2 branch uses an XOR accumulator for comparison. | Legacy comparison is not constant-time. An attacker already needs access to local stored state. This is not a verified blocker/high under the stated local-first threat model. Safe migration is possible after successful legacy verification. |
| **KS-SUP-001** | **Verified fixed** | `html2canvas` is absent from dependencies and QR-code typings are dev-only. | Dependency-related claim is resolved. A fresh `npm audit` on this exact HEAD was not independently rerun, so a historical “0 vulnerabilities” result should not be treated as a newly verified fact. |

### Tests

The new security-focused tests referenced by the audit exist in the branch, including BDSMTest sanitizer and share-parser coverage.

Previously reported totals such as 605/605 unit tests, launch matrix 16/16, and offline 5/5 are treated as reported historical results, not as independently rerun results on this exact HEAD unless an exact-head workflow result is available.

## 3. New findings

### KS-PRIV-003

- **Severity:** Medium
- **Location:** `app/sw.ts`, `DestroyAllSheet.tsx`
- **Evidence:** the Service Worker config combines KinkSync runtime caching with Serwist/default caching, while the destroy flow explicitly deletes only the named `kinksync-pages` cache in addition to local/session storage.
- **Safe reproduction:**
  1. Create local profile data.
  2. Visit dynamic profile/scene routes while online.
  3. Inspect Application → Cache Storage.
  4. Run “Vernietig alle data”.
  5. Inspect Cache Storage again.
  6. Confirm whether any Serwist-managed dynamic runtime caches remain.
- **Impact:** the application can retain dynamic request/route metadata after a user explicitly requested complete destruction. This is a privacy-consistency problem even if the remaining cache does not contain full profile answers.
- **Minimal fix:** centralize all dynamic cache names or otherwise ensure all KinkSync/Serwist runtime caches containing dynamic route/request data are removed during destruction. Keep only the non-personal application shell/precache.
- **Verification test:** after destruction, Cache Storage contains no dynamic profile/scene request keys; app shell remains available; reload and offline cold start cannot recover old personal state.
- **Launch status:** Must-fix-before-launch.

### KS-SEC-004

- **Severity:** Medium
- **Location:** `components/sheets/PinFlowSheet.tsx`, `components/AppLock.tsx`
- **Evidence:** PIN setup accepts 4–8 digits, while the lock verifier uses `PIN_LENGTH = 4` and attempts verification as soon as four digits have been entered.
- **Safe reproduction:**
  1. Enable App Lock.
  2. Set a five-digit PIN such as `12345`.
  3. Restart the app.
  4. Enter `12345`.
  5. Observe that verification is attempted after `1234`, before the fifth digit can participate.
- **Impact:** a user can configure a PIN that cannot be entered correctly through the lock UI, potentially locking themselves out.
- **Minimal fix:** either enforce exactly four digits during PIN creation, or make the lock input variable-length up to the configured maximum. Exact four digits is the lower-risk launch fix.
- **Verification test:** 4-digit PIN works; unsupported lengths cannot be saved; wrong PIN triggers cooldown; biometric fallback remains functional.
- **Launch status:** Must-fix-before-launch.

## 4. False positives or overstated claims

- **CSP `unsafe-inline` is not automatically a vulnerability.** It is a hardening limitation; a concrete XSS sink is required before calling it a vulnerability.
- **`Access-Control-Allow-Origin: *` is not automatically a privacy leak.** No authenticated/user-data API response was demonstrated where this creates an exploitable cross-origin read.
- **The BDSMTest allowlist cannot guarantee that the allowed origin itself never redirects.** That is a property of the destination, not a bypass of the KinkSync host allowlist.
- **“No local identifiers ever leave the browser” is too strong.** Normal navigation to a profile URL necessarily sends the URL to the origin. The relevant fix prevents background warmup/prefetch/share-payload leakage, not all URL transmission.
- **“Exactly seven days until Safari deletes storage” is too absolute.** Storage eviction is browser/context dependent. Treat this as a durability risk, not a guaranteed timer.
- **A dependency version alone is not a demonstrated vulnerability.** In particular, a current React version claim needs an applicable attack surface in this application before it should be classified as a security finding.

## 5. Exact release conditions remaining

1. **Resolve KS-PRIV-003:** destruction must remove all relevant dynamic Service Worker/runtime caches.
2. **Resolve KS-SEC-004:** PIN creation and verification must use identical length semantics.
3. **Close KS-SEC-002 fully:** sanitize/migrate existing persisted `bdsmtestUrl` values when upgrading/hydrating old profiles.
4. **Make a PWA durability decision:** preferably add best-effort `navigator.storage.persist()` where supported and a clear backup/export prompt; otherwise explicitly accept storage-eviction risk before launch.
5. Treat the following as **manual launch gates** because they are not fully AI-verifiable from repository inspection alone:
   - full test suite on exact HEAD;
   - Chromium, WebKit and Firefox smoke/security paths;
   - real iOS Safari/iPadOS Safari;
   - offline cold start and stale Service Worker update/recovery;
   - Cache Storage state before/after complete reset;
   - effective headers on `/`, `/sw.js`, and `/manifest.webmanifest`;
   - network trace confirming absence of analytics/third-party requests and unexpected data-bearing requests;
   - source-map exposure check;
   - malicious import/share payload checks;
   - App Lock 4–8 digit matrix and biometric fallback.

## Final assessment

The previous audit was broadly correct about the major remediation work, but it was too optimistic about complete reset coverage and migration of already persisted data. The independent negative-path review also found a genuine App Lock length mismatch.

There are no independently verified remaining Blocker or High findings. However, the two Medium findings above affect explicit privacy/security controls and should be resolved before launch.

**CONDITIONAL GO**
