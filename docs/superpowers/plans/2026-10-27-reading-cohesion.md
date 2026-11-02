# Reading content cohesion plan

Spec: docs/superpowers/specs/2026-10-27-reading-cohesion-design.md
Baseline: cff0959973bd427e4843a7e72427bd6bfec85b10, PR484.

## Global constraints

- Preserve the current Sheet viewport caps, fixed44px close, focus trap, dismiss behavior and single scroll body. No local browser install/launch; remote CI supplies runtime evidence.
- Preserve exact factual copy and its caller-owned source: questionnaire-curated presentation versus full Profile catalogue description. No status, privacy, consent, category-memory or data changes.
- Keep existing motion and row primitives. No large-list animation, new palette/font/dependency, nested cards or generic config-driven renderer.
- Text stays enlarged at200%; non-text geometry remains bounded. Both themes use existing semantic tokens.

## Task 1: Implement the shared reading composition

1. Extend existing EditorialHeading with a compact20px display heading and optional eyebrow. Preserve existing hero/section callers exactly; support the heading levels needed by topic/category contexts without duplicate headings.
2. Introduce a focused explanation-content module in the existing component structure. Share content-root rhythm, readable prose, labelled sections and visible safety treatment. Topic essence has one borderless surface2 tint; supporting sections are flat. Body prose uses the existing readable16px/28px rhythm and stronger labels, subject uses compact EditorialHeading. Do not replace intentional domain copy differences.
3. Add an optional semantic icon slot to Sheet's existing titled header; default output remains unchanged. Use fixed decorative sizing and preserve the close target, wrapping and existing viewport behavior.
4. Migrate TriageDeck's info/safety/category bodies and StatusExplainerSheet to these primitives. Restore accent Info/ShieldCheck icons and category mark using existing colors. Preserve dots, star, curiosity disclaimer, aliases, labels, availability, state and accessible names.
5. Reuse prose/safety treatment in ProfileTopicRow, leaving editor privacy/motion/persistence untouched. Use compact EditorialHeading for Profile overview/catalogue/custom category headings. Remove dead InfoSheet only after confirming all callers/tests.
6. Update DESIGN.md narrowly with this correction: reuse includes content hierarchy, not merely the outer shell; a borderless essence emphasis is intentional. Keep other locked decisions unchanged.
7. Extend existing relevant browser captures to show the changed readers in light/dark, current mobile/desktop/enlarged states and representative Profile category/prose use. Bundle needed captures before publication. Keep all current assertions, adding only meaningful semantic/regression checks where changed behavior needs evidence.

Validation: focused affected unit tests, TypeScript/targeted lint, one production build after all changes. No speculative tests that mirror class names. One scoped independent source/design review, then publish one coherent patch and run existing fullCI. Inspect relevant fresh images once; one bounded correction round only if concrete defects appear. No merge/deploy.
