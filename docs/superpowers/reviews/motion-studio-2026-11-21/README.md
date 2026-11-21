# Running the November motion studies

The starting point is the [review directory at 4cc8d95](https://github.com/Jordybeer/kink/tree/4cc8d956b178a0e34ac46b9c6c9f90595acbc6f5/docs/superpowers/reviews). This page records what was built against the [motion plan](../../plans/2026-11-21-premium-motion.md) and the [first-use addendum](../2026-11-21-questionnaire-profile-onboarding.md). The original modal evidence and October Home critique remain the baseline. The home study uses the existing wordmark, portrait treatment and role vocabulary. Empty Home, utility discovery and backup recovery from the October critique are outside this motion slice.

[Normal-speed direct and Open Folio comparison](folio-comparison.mp4) · [Contact sheet](overview.jpg)

| Study | What to try | Evidence and remaining decision |
|---|---|---|
| /hot/folio | Open Noor. Watch the avatar, italic name, role and divider arrive at the real destination. Open either Robin perspective to try a shared portrait with a distinct role. Compare Direct, Open Folio WAAPI, lazy GSAP and Opening. The review controls include quarter speed and automatic return at 25/50/75%. | Warm forward travel was observed in all three animated arms. Browser Back and the 50% return restored Home and the selected link. Reduced Motion opened the destination directly. The late-arrival switch exercises the direct fallback. Cold network timing, layered scenes across native back-swipes and physical-device midpoint readability still need review. |
| /hot/questions | Set Privé and Nieuwsgierig before answering. Compare the studio deck with the original using the header switch. Both agreements stay below the markers. Meer uitleg puts the actual subject above the extra context. | The two independent markers, help and both themes ran in Chromium. The question and help sheet had no document-level horizontal overflow at 320 CSS px with 200% root text. This checks geometry, not one-handed comfort. The answer targets stay put as the next topic arrives. |
| /hot/profile-study | Open Zoek in catalogus, type wax, press Escape, open an answer, change its status, then choose Klaar. Reveal the sample private response, hide it or switch treatments. | Closing search returned focus to the launcher. An inline edit completed. The synthetic private sentence appeared only after reveal and was absent from the DOM immediately after Hide. The soft comparison and travelling matte are local visual treatments. Real partner/share data and authorization are outside the fixture. |
| /hot/overlays | Try Instellingen → Appvergrendeling → Escape. In Moment plannen, submit without a time, then save a partnerless moment and reopen it. Compare Moment bijhouden and its note-first order. | The PIN task had one active dialog and focus returned to its launcher. Missing time focused the time field. One Escape closed the partner menu while retaining the composer. A partnerless save/edit/reopen kept the empty choice. The PIN and reminders are rehearsals. Production reminder scheduling, storage and lock configuration require the later integration. |
| /hot/scenes | Move between the three setlist cues, change intensity and enter a cue note. The selection and context surface draw from the same category colour. Compare direct and gradual changes from the header menu. | Cue selection updated immediately and the note survived selecting another cue and returning. The safeword remains visible. We still need a physical display check of contrast during the colour change. |
| /hot/onboarding | Complete welcome and age confirmation, try the answer vocabulary, continue through consent and choose the optional lock path or Niet nu. Try the real vault dial or Open KinkSync. | The real onboarding shell, local-only example, optional lock skip and accessible finale led back to the studio. The rehearsal does not set a real PIN or invoke biometric enrollment. Restore and full production onboarding persistence were not exercised here. |

## Engine decision

Recommend WAAPI for the measured Home-to-Profile handoff. Keep CSS for bounded materials and theme states, and existing Motion for disclosure, gestures and shared status selection. The production baseline is Next 16.4.6, React 19.2.4 and framer-motion 12.x. GSAP 3.15.1 is dynamically imported only when selected inside the studio. Selecting it fetched three additional chunks totaling 78,164 uncompressed bytes, about 31,449 bytes when individually gzipped in this build. Hosted transfer depends on compression and cache. The two implementations matched the chosen easing and endpoint geometry. Favor GSAP only if a reviewed choreography materially benefits from its timeline controls.

## What the capture measures

Local production webpack build 9XP1KxH2Yl-Ly-k0VeSH8, headless Chromium 153.0.8010.0, 390 × 844 CSS px, DPR 1. One warm 750 ms diagnostic per treatment. The route column is the first observed animation frame containing the destination hero. The frame columns measure requestAnimationFrame callbacks. They do not measure display presentation, GPU overdraw, event-to-paint p95 or 120 Hz capability.

| Treatment | First destination frame | Frame interval p95 | Maximum interval |
|---|---:|---:|---:|
| Direct | 20 ms | 16.7 ms | 16.8 ms |
| Open Folio · WAAPI | 26 ms | 16.7 ms | 16.8 ms |
| Open Folio · GSAP | 10 ms | 16.8 ms | 16.8 ms |
| Opening | 25 ms | 16.7 ms | 16.8 ms |

The recording is a separate browser capture encoded at 30 fps for review. Use it for visual continuity. Reuse the 14 synthetic screenshots in this directory for settled states. The capture runner also stores case results and screenshots under test-results/motion-studio by Next build ID, Chromium version and viewport. Start a local preview build on port 3038 and run node scripts/capture-motion-studio.mjs. A successful case reuses its cache. Personal device screenshots are excluded.

## Approval and promotion

Start with the halfway return on the target iPhone, then compare the two privacy treatments, marker reach, and the planned and recorded moment sheets. The product owner decides whether the travelling portrait stays identifiable and whether the controls feel comfortable. Device review should cover Safari, installed PWA, keyboard, VoiceOver and the previously documented offline profile-shell matcher. The bounded production performance gate and the fresh-viewer check remain open. The running Folio study is under /hot/folio so all six studies can have independent Next routes. Parallel lab routes permit review of later-stage ideas without implying release approval.

After approval, branch from current dev and port only the winning handoff with its participant refs and cleanup. Port modal correctness and subsequent surfaces as separate scoped changes. The mock composer uses the shared sheet, picker and production record shape. It currently has its own form layout and cannot be promoted wholesale. Extract the accepted fields into the existing planner before wiring real writes. The lab, fixture accounts, comparisons, recordings and GSAP remain isolated unless separately approved.
