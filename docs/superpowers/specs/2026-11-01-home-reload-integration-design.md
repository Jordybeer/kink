# Home reload navigation integration

Continue the already authorized PR482 repair on current dev `4b77ff5002f657f204479d2f11d36e498e6f2e8a`, retaining the reviewed Home clarity work from PR485. This is a bounded integration and regression repair, not a redesign.

## Behavior

- Keep the Home masthead visible after scrolling and native reload restoration, using sticky positioning and an opaque existing background. The Home surface must intercept taps over covered content; retain content-route pointer behavior. Preserve native `history.scrollRestoration = auto`; do not reset scrolling on load/reload or use browser-navigation workarounds.
- Preserve the current centered wordmark/subtitle, 32px utility top inset, fixed 44px utility slots, dynamic text wrapping, help links, Settings gear, page gutters and normal/enlarged-text hierarchy. PR482's older 8px downward nudge and fixed-height row are superseded by the subsequently reviewed PR485 design.
- Reserve the masthead's actual occupied height for Home scroll padding and its empty-state viewport budget. Height must stay correct after enlarged text/font/viewport changes. Non-Home routes and onboarding must recover their current navigation budget when the Home masthead leaves. Do not introduce a measurement/animation feedback loop.
- Activating and closing Home Settings while scrolled must preserve reading position and restore focus to Settings. Other TopNav overflow menus must support keyboard navigation/dismissal without unexpectedly moving the underlying document. Preserve non-navigation menu focus behavior.
- Consent/privacy, import recovery/identity, local data, shared component/motion behavior, Reduced Motion and all other routes remain unchanged. No dependency or CI configuration changes.

## Evidence and acceptance

PR482 already established the original WebKit defect: after a Home scroll of 80px and reload, native scrollY remained80 while the relative header moved to y=-80. Its old CI1388 navigation regression passed, but both projects failed an editorial utility-position assertion after the obsolete8px nudge. An onboarding backup alert selector was also ambiguous against the Next route announcer. Current dev is the reviewed, green CI1404 candidate.

Adapt the existing PR482 behavioral tests to today's Home Settings flow; retain scrolled native reload and focus/scroll assertions. Cover actual masthead height at normal320/390 and320px/200% text, including returning to a content route. The real WebKit reload case must run in an existing launch/device smoke file, without changing runner configuration. Cover a scrolled content overflow keyboard menu because Home now has a direct Settings control.

Use existing CI artifact directories for a bounded screenshot set: scrolled Home normal mobile light/dark, enlarged text light/dark and one desktop. Reuse unchanged PR485 visual evidence; review only sticky behavior, clipping, the opaque surface and actual-height integration. Linux WebKit/Chromium emulation is not physical-device certification.

No local browser launch/install or workaround, no duplicate baseline/full local suite/build. Run changed-file lint and TypeScript once; rely on existing exact-candidate remote CI for runtime. Publish one coherent candidate after independent source review; require all CI lanes and the bounded visual gate before merging to dev.
