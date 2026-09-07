# KinkSync Design Context

`DESIGN.md` describes the current visual world and the design decisions future agents should preserve. It does **not** outrank `UI-principles.md`. When aesthetics conflict with consent, safety, privacy, readability or stable interaction geometry, the higher principle wins.

## Authority order for UI work

Read and apply in this order:

1. `PRODUCT.md` for durable product truth and non-goals;
2. `UI-principles.md` for binding interface doctrine and conflict priority;
3. this `DESIGN.md` for the current visual language and surface-level decisions;
4. `corrections.md` for known mistakes and regressions;
5. the incumbent implementation, screenshots and tests as evidence of what currently ships.

Impeccable, `frontend-design`, screenshots, trends and agent taste are review lenses only. They may sharpen the work but may not replace this hierarchy.

## Surface mode

KinkSync's product UI is primarily **Operate with room for reflection**.

The user is doing real tasks, but speed is not the only success metric. Interfaces should be scannable and stable while still leaving enough air to think about sensitive choices.

## Emotional target

The product should feel:

- private;
- intimate;
- editorial rather than corporate;
- warm rather than clinical;
- adult rather than gimmicky;
- calm but not sterile;
- designed, without constantly announcing that it was designed.

A useful test: the screen should feel like a thoughtful private space, not a dashboard assembled from component-library cards.

## Core visual language

### Typography

- Editorial/display serif is reserved for brand identity, names, meaningful headings and selected section moments.
- Body copy, metadata and controls use the established sans/body system.
- Use existing font variables and components. Do not introduce a new font family locally to solve one surface.
- Hierarchy comes from scale, weight, whitespace and placement before borders or badges.

### Colour

Use semantic design roles from `app/design-role-tokens.css`. Do not hard-code new mode-specific colours inside components when an existing role expresses the intent.

Current palette character:

- dark base: near-black aubergine rather than neutral black;
- light base: warm near-white with pink/lilac undertone;
- matte rose/salmon carries action and progress;
- lavender carries identity, focus and supporting structure;
- status hues retain their semantic meaning.

Colour can be expressive while visual weight stays restrained.

### Geometry

- Mobile page gutter is the shared token, currently 1.25rem on small screens.
- Minimum touch target is 2.75rem / 44px.
- Respect safe areas, browser viewport behaviour and installed-PWA geometry explicitly.
- Browser and installed PWA may expose different chrome, but content should not reserve invisible controls.
- Repeated interaction geometry must stay stable.

### Depth

Use depth sparingly. Shadows, borders, glow and tinted surfaces are accents, not default wrappers.

One meaningful feature surface is stronger than five equally decorated cards.

## Container discipline

This is a locked design direction.

**Do not wrap every concept in a card. Do not nest cards merely to create hierarchy.**

Prefer, in order:

1. whitespace and grouping;
2. typography and alignment;
3. subtle dividers;
4. a shared surface when a group truly needs containment;
5. a distinct feature surface only when an action or concept deserves focal weight.

Avoid "container lasagne": card inside card, bordered pill inside card, then another bordered section immediately below.

Ordinary labels should not become pills merely because a pill component exists. Metadata should usually read as metadata.

## Home

### Shared masthead

Empty and populated Home use the same brand masthead and the same post-masthead rhythm. The wordmark and subtitle are one identity block, not separate page content.

Do not independently nudge empty and populated Home unless there is a real behavioural reason. A spacing fix that makes one state pretty while breaking the other is a regression.

### Empty Home

The first-profile state may use one deliberate feature surface because it is the entire activation task.

Hierarchy:

1. create my profile;
2. scan/import a partner profile;
3. restore an existing backup as tertiary utility.

Locked backup-import treatment, not necessarily implemented yet:

- place it below `Scan partnerprofiel` within the empty-state area;
- do **not** make it a third equal large card;
- use quiet utility treatment, for example `Heb je al een back-up?` followed by `Importeer back-up`;
- invoking it should reuse the established backup import/restore path rather than inventing a parallel restore system.

### Populated Home

The current heavy stack of bordered surfaces is an anti-reference for the next refinement.

Locked direction:

- section heading should be simply `Mijn profielen`; a redundant right-aligned profile count adds noise when the profiles are already visible;
- profile entries should read primarily as **content/people**, not independent dashboard cards competing for attention;
- profile rows may share a flatter grouping with whitespace/dividers rather than one heavy container per person;
- `Vergelijk` may retain stronger feature-surface treatment because it represents a combined action across profiles;
- Contracts, Scenes and Agenda should be quieter utility rows;
- `Nieuw profiel` and `Scan profiel` remain clear actions but must not make the lower half of Home another equal-weight card grid.

The goal is fewer simultaneous rectangles and a clearer visual sentence.

## Profile surfaces

### Profile Hero

Locked direction for the upcoming redesign:

- the person comes first: avatar/photo, name, role/perspective and meaningful experience/context;
- remove thick pills for ordinary ownership/edit metadata such as `Eigen profiel` and `Profiel bewerken`;
- reduce badge clusters;
- trust/source metadata should be legible but quieter;
- FetLife/BDSMTest/contract/context integrations should not overpower the human identity;
- a private note should not automatically become another loud section card.

A profile should feel like a person with context, not a stack of metadata widgets.

### Profile Edit

Target structure:

1. **Identiteit**: photo/avatar, name/alias, explicit perspective/role, linked perspective when relevant;
2. **Vragenlijst**: interest areas and how the user continues filling the profile.

Keep the step indicator if it improves orientation. Keep photo copy concise. Avoid redundant helper paragraphs.

Do not invent a generic `Privacy & boundaries` section unless real editable settings justify it.

Do not use a tab-semantic segmented control for a choice that is not actually tab navigation. Use controls whose accessibility semantics match the decision.

## Motion

Motion must explain state or provide tactile feedback. It should be bounded and local.

For ambient brand motion, preserve the existing doctrine from `memory.md`: slow cycles, shallow opacity/position changes, and no attention-seeking blink language.

No bounce or elastic motion merely to look polished.

## Light and dark themes

Both themes are first-class. Do not design in one mode and mechanically invert the other.

Use the semantic roles already defined in `app/design-role-tokens.css`; contrast must be measured on the actual tinted surface, not assumed from the raw token pair.

Never use low-contrast grey text on a coloured/tinted background because it looks "soft".

## Anti-patterns to catch during review

Fail the review when a change introduces any of these without a strong product reason:

- card-in-card structure;
- a bordered container for every row;
- multiple equally loud primary surfaces in one viewport;
- decorative pills for ordinary metadata;
- redundant counts, labels or helper copy that repeat visible information;
- generic purple-gradient SaaS styling detached from KinkSync tokens;
- hard-coded colours that bypass semantic roles;
- hiding essential context to make geometry cleaner;
- moving repeated controls between items;
- browser/PWA spacing that only works in one display mode;
- visual polish that silently changes consent or privacy semantics.

## Impeccable review workflow

Impeccable is the preferred supplementary design vocabulary when the skill/CLI is available. When it is not available, apply the same workflow manually.

For a meaningful UI branch:

1. **shape** before code: define the user task, hierarchy and what should become quieter/louder;
2. implement the smallest coherent surface change;
3. **critique** once against hierarchy, clarity, emotional fit and incumbent identity;
4. **audit** accessibility, responsive behaviour, overflow, contrast, touch targets and interaction semantics;
5. use **distill** when the surface accumulated containers, copy or chrome;
6. use **polish** only as a bounded final pass, never as an open-ended loop.

The brief and KinkSync doctrine always win over generic Impeccable taste.

## Branch quality gate

For the active UI/UX programme, a branch is not a foundation merely because CI is green.

Before merge, explicitly review:

- scope: one coherent problem;
- UX: genuinely better, not merely different;
- visual geometry on relevant mobile sizes and browser/PWA states;
- semantics and behaviour unchanged unless intentionally specified;
- accessibility and contrast;
- code quality, especially selector hacks and duplicated chrome;
- regression surface and existing tests;
- diff against the current `dev`;
- CI and available rehearsal screenshots.

If the result is only "mostly good", fix or discard it. Do not make the next branch inherit a compromised foundation.