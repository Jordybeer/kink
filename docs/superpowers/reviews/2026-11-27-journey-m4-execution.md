# M4 execution ledger · 27 November 2026

Pinned M3 commit 4b405c2d97b92f2803b6d704e8670587b1f2b61a, deployment dpl_J7GTrLKVUdHyEvddRhmYdtMAADgr READY. Owner explicitly requested M4 and orchestrated subagent review. Tool discovery found only read-only agent-run observability, no independent dispatch. Implemented inline, review lenses documented, independent team not claimed.

## Coverage
- T1 agenda and logbook: date-led flat list, month/day filters, empty period, multiple moments, new/edit.
- T2 dedicated writing surface, secondary details, dirty discard guard, in-memory draft across internal route navigation, recoverable one-shot simulated save failure. Native keyboard/safe area, actual return scroll, full reload and history behaviour need browser/device rehearsal. Reload/reset clears fictional draft.
- T3 optional partner remains blank until explicit selection; clearing clears name and ID; validation rejects date/time and invalid reminder; reminder preference retained, no notification permission. Reuse real pure ICS builder, discreet default and explicit include-details. Browser download only on deliberate action.
- T4 read-only agreement lifecycle examples and version reading, including integrity warning. No signature, QR, import, real lifecycle mutation or claims of verification. Canonical signed-document rendering and exchange verification deferred to production integration, not marked complete.
- T5 ordered scene items, reorder/intensity controls, explicit scene completion, separately saved aftercare with house labels. No automatic record or contract link. Empty scene rendering supported but no empty fixture selector, item creation/removal not included.
- T6 planned moment converts on explicit log save, same identity and date, note and optional partner retained, completion removes reminder. No automatic completion or automatic scene link.
- T7 direct agenda/agreements/scenes, M1 reference, existing M2/M3 links; all previous palettes preserved.

## Review and decisions
UX: use one reading plane and dates, avoid modal/form-card stack; details are secondary and validation reveals relevant panel. Writer and agreement status examples not treated as identical activities.
Lifecycle: production IntimacyRecord shape and actual calendar builder, sample only. No signing impersonation; actual signature and QR flow untouched; no consent inference. Separate scene status and aftercare. 
Trust: no store imports at runtime (IntimacyRecord type only), no network/storage effects in sample, optional partner explicit, draft survives navigation within lab, cancel asks before discarding changed draft, default ICS content discreet. Export real only for deliberately entered sample data; no real records read.
Frontend: local CSS and scoped WAAPI no snapshots, reduced motion and interruption fallbacks, no dependencies/global tokens. Source review not physical-device or visual QA.
Regression: M1 route preserved; corrected stale M1 E2E navigation expectation introduced in M3. Five model tests and three browser cases added, not run; red-green and independent review unavailable. Build checked separately. No G2c completion or production promotion claim.

## Bounded verification and correction

Initial M4 d28adb27c92c37f72c1c226ce1034c77a2dd5548 deployment dpl_H6cKT4EG2ZRx7PtcVSRB8aivR2VS confirmed READY; icon audit passed. GitHub Actions branch query returned no runs. The local container has Node 22.16 but GitHub DNS and a full dependency checkout are unavailable. To obtain genuine runtime evidence, copied exact togetherSession.ts and production intimacyCalendar.ts into a temporary directory, verified Git blob hashes against GitHub (323e68f5dbbdb97eb384915793c0ef7b1cce8dfb and dcaac85f20438e5f17e6ef8d4b89c8e6610b3281), resolved the existing alias with a temporary Node hook, and ran seven standalone Node assertions under TZ=Europe/Brussels. All seven passed: optional partner/clearing, invalid date/time and draft recovery, explicit completion, calendar disclosure, separate scene/aftercare, dirty discard, DST gap/reminder/reordering. This is not a full Vitest or Playwright run.

One batched source-review correction: ensure writer subject is brought into view when opening from lower list entries (fall back to direct navigation rather than offscreen animation), recover return target from a resumed draft, bound month/day inputs, tighten duplicate-text agreement E2E locator, and give the first planned moment a larger date/title hierarchy instead of increasing all row weights. No global tokens changed. Added two more repository unit cases. Exact final logic must be rechecked after the bounded patch; physical device and browser evidence still missing. No independent review agents, no cryptographic agreement operations, no G2c signoff.
