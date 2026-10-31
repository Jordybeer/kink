# Home clarity refinement

Accepted direction: the completed Home critique in `../reviews/2026-10-27-home-critique.md`, followed by the owner's request to resume without redundant testing. Mode: Operate with room for reflection. Preserve KinkSync's current visual world.

## Goal

Make Settings recognizable, calm the empty Home hierarchy, and give import operations visible progress and recovery. Preserve the centered Cormorant wordmark, subtitle, palette, brand motion, profile behavior and import trust boundaries.

## Requirements

- Home's existing 44px header utility becomes a GearSix button named `Instellingen`, directly dispatching `ks:open-settings`. Closing Settings returns focus to it. Other routes keep their existing overflow navigation.
- Both Home states expose quiet 44px help links: `Over KinkSync` to `/about`, and `Privacy & veiligheid` to `/security`. No new card or navigation system.
- Empty Home retains one intentional feature surface and its primary profile action. Scan becomes a generous borderless secondary row. Backup is tertiary below it, with exactly `Heb je al een back-up?` and `Importeer back-up`; no nested tinted or bordered secondary boxes.
- Wire existing `importReading` into visible polite `Back-up lezen…` feedback and disable duplicate activation and file input while reading. Reuse all existing import validation, encryption, identity confirmation, persistence and rollback logic.
- Invalid scan keeps its diagnosis and dismissal, adds guidance to request a new code and a retry action that clears the error and opens the existing scanner.
- Remove the doubled separator between populated utilities and profile actions. Give Compare a visible action verb if its current composition permits without duplicate headings.
- Keep local `ks-motion-choice`/`useMotionSafe` feedback and live Reduced Motion. No page choreography, new palette, fonts or dependencies.
- Preserve balanced normal-size mobile empty composition. Both themes and mobile/desktop remain first-class. At 320px with 200% actual text, header text and controls must fit without overlap or horizontal overflow; no shrinking text or clipping to hide overflow. The previous critique identified a source risk, not a proven browser failure.

## Scope and evidence

Main files: `components/TopNav.tsx`, `app/page.tsx`, existing Home hierarchy dependencies and directly affected E2E entry selectors. Do not change Settings internals, import/domain logic, dependencies or CI workflows.

One coherent implementation task and one combined independent task/whole-branch code and design review. Run targeted lint and TypeScript once. Existing CI owns unit/build/browser/device/offline verification; do not duplicate a full local suite or build. No local browser launch/install. Add meaningful busy, retry, focus/help and enlarged-header assertions and bundle light/dark empty/populated mobile/desktop captures in existing CI tests. Preserve unrelated assertions and strict existing geometry guards. Review changed-surface captures once, with one correction pass for concrete defects.

Base: merged `dev` at `ba64e7e5747defc85086386a843e112bfa8937e5`. PR #484 is complete and merged. Open PR #482 overlaps Home header/menu files but concerns sticky reload geometry; this refinement does not import or overwrite that unmerged behavior. Call out the overlap in the PR.
