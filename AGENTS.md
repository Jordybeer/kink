<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# KinkSync agent contract

The generated Next.js block above is not the product brief. For KinkSync work, every agent and every new conversation must recover repository context from the repo instead of improvising a fresh product or visual direction.

## Required reading

Before any UI/UX work, read in this order:

1. `PRODUCT.md` — durable product purpose, trust model and non-goals.
2. `UI-principles.md` — binding interface doctrine and conflict priority.
3. `DESIGN.md` — current visual world, locked surface decisions and anti-patterns.
4. `corrections.md` — known mistakes and rules learned from regressions.
5. `memory.md` when present in the active harness — cross-session operational decisions.

For non-UI product work, still read `PRODUCT.md` before changing user-visible semantics.

## Authority

`UI-principles.md` is the highest UI/UX authority. `DESIGN.md` may refine appearance but may never weaken consent, safety, privacy, readability or stable interaction geometry.

The incumbent implementation, screenshots and tests are evidence, not automatic design authority. Preserve behaviour intentionally; do not preserve visual clutter merely because it already exists.

## Impeccable

Use Impeccable as a supplementary design director when the native skill/CLI is available. Load its project context only after the KinkSync documents above.

When Impeccable is not available as a native skill, apply the same vocabulary manually:

`shape → implement → critique → audit → distill when needed → bounded polish`

Never let Impeccable, another design skill, a trend, or agent taste override the KinkSync brief.

## UI branch discipline

For the active UI/UX improvement programme, use serial branches from the latest merged `dev`. Do not start the next visual branch until the previous branch has passed its quality gate and merged.

A UI branch gate includes:

- one coherent scope;
- explicit before/after UX reasoning;
- mobile geometry and relevant browser/PWA states;
- semantic and accessibility review;
- contrast and overflow checks;
- regression-test review;
- diff review against current `dev`;
- CI and available visual rehearsal evidence.

Green CI is necessary, not sufficient. "Mostly good" is a failed foundation.

## Container discipline

Do not solve hierarchy by wrapping more things in cards, bordered pills or nested surfaces. Prefer whitespace, type, alignment and dividers. See `DESIGN.md` for the locked container rules and current Home/Profile directions.

## Persistent decisions

When the user says to remember a project decision or asks for consistency across conversations, put the durable decision in the appropriate repository source of truth rather than relying on conversational memory alone:

- product truth → `PRODUCT.md`;
- UI doctrine → `UI-principles.md`;
- visual/surface direction → `DESIGN.md`;
- operational/session rule → `memory.md` or harness guidance;
- a mistake that must not recur → `corrections.md`.
