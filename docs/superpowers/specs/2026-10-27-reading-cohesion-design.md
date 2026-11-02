# Reading content cohesion

The owner rejected the current kink-info presentation as overly basic and identified inconsistent component reuse. The previous branch reused the modal shell but removed the information hierarchy and authored bodies separately. This correction stays on PR484; its green geometry is a constraint, not evidence of visual acceptance.

## Direction

Keep the existing Sheet surface geometry, close/focus handling and single scroll body. Restore a restrained semantic icon/category mark, a stronger named subject, an emphasized essence, and quieter supporting sections through reusable content primitives. Retain the aubergine/rose materials in dark mode and warm light mode. Explanations should read as intentional private guidance, not unformatted documents.

Use one bounded explanation-content family for the active topic, safety, category and status readers. Reuse its prose/safety presentation in Profile without replacing Profile's full catalogue description with questionnaire-curated copy. Add a compact variant to the existing EditorialHeading for topic and category headings, rather than duplicating the serif recipe again. Use it for Profile overview, catalogue and custom category headings.

One borderless, subtly tinted essence treatment is allowed as meaningful emphasis. It is not a new rounded/bordered card; supporting sections stay flat. Reintroduce the established Phosphor Info/ShieldCheck and category dot through an optional icon slot in the existing Sheet header. Do not build a second header or another generic modal wrapper.

## Considered approaches

- Restore the old bottom sheets: rejects the already-fixed close, scrolling and mobile geometry; not chosen.
- Restyle TriageDeck alone: could restore appearance but would preserve the reuse problem; not chosen.
- Share the reading composition while preserving the current shell: chosen by the implementer under standing autonomous authorization. It addresses both the visible regression and related live inconsistencies without a new design system.

## Boundaries

No new palette, fonts, dependencies, motion system, global row redesign or data transformations. Keep all status/curiosity/consent/safety/privacy semantics, category learning, directional names, aliases and underlying question state. Questionnaire uses getQuestionnairePresentation; Profile uses the complete catalogue description. Existing Profile rows, answer controls, DisclosureBody and Accordion already reuse correctly and retain their behavior. Remove unused InfoSheet only after confirming no code/test callers; it is not the live regression.

## Acceptance

All four readers share content rhythm and semantic accents; topic essence regains visible emphasis. Profile prose/safety uses the same primitives, category headings use the same compact heading component, and existing row/disclosure behavior remains intact. Verify both themes, 390px,320px/200% text and desktop from one bundled CI capture round. Keep strict current geometry and focus assertions. No repeated full audit of unchanged Profile layout or Settings.
