# Home clarity implementation plan

Spec: `docs/superpowers/specs/2026-10-28-home-clarity-design.md`.

## Global Constraints

Read AGENTS.md and its project documents before UI work. Preserve incumbent identity, import security/persistence, shared motion and Reduced Motion. No dependency/workflow changes. No local browser launch/install. No duplicate full local suite/build. The owner's efficiency instruction overrides redundant verification process. Existing remote CI is the runtime gate.

### Task 1: Implement the accepted Home clarity direction

Read the spec as the binding requirements. Update Home header, empty hierarchy, help links and import feedback/recovery with current components/tokens. Preserve other-route navigation. Add focused behavioral/geometry assertions and captures through existing E2E fixtures; update only directly affected Home menu callers. Update DESIGN.md narrowly. Run changed-file lint and TypeScript once, self-review, and commit only the task's files. Record commands/results and known limitations in the report. Do not run a full local build or suite, launch a browser, publish, or spawn subagents.

Controller: package full diff from the base; obtain one combined independent spec/quality/design/whole-branch review, publish one CI candidate and inspect the targeted screenshot artifacts. Only concrete defects justify correction/retesting. Finish against the current dev with the standing gated serial-programme authorization.
