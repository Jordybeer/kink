# Home reload integration plan

Spec: `docs/superpowers/specs/2026-11-01-home-reload-integration-design.md`.
Base: dev `4b77ff5002f657f204479d2f11d36e498e6f2e8a`.
Source PR482: `02124ec824f664bb1a3557e2e5f295e27066e201`.

## Global constraints

Preserve current Home identity,32px top inset,44px controls,dynamic wrapping,help/Settings,shared motion and Reduced Motion. Preserve native reload restoration, consent/privacy/import safety and non-Home navigation. No dependencies/workflow changes, no local browser launch/install or workaround, no duplicate full local suite/build. Existing exact-candidate remote CI is the runtime gate. User's standing gated serial-programme authorization covers publication and merge after PASS.

## One cohesive task

1. Merge the historical PR482 head into the isolated current-dev worktree, preserving both ancestries. Resolve overlapping TopNav and test changes using the new spec. Integrate sticky positioning, occupied-height scroll budgeting and navigation focus behavior. Adapt meaningful reload/menu/Settings/enlarged-text regressions and bounded CI screenshots. Narrow the old first-run backup alert assertion only if its observed ambiguity remains applicable; no onboarding implementation changes. Run changed-file lint and TypeScript once, inspect diff, commit source/tests and these spec/plan files together, and write a report.
2. Controller obtains one independent combined spec/quality/design/source review of the delta from current dev. Publish to the existing PR482 branch with a lease and a tree identical to the reviewed local result. Await exact-head CI and inspect the changed-area screenshot evidence with that reviewer. Correct concrete defects only; merge only after the gate passes. Do not repeat finished Home/profile/settings/motion audits.
