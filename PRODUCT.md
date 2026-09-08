# KinkSync Product Truth

<!-- impeccable:product-schema 1 -->

This file records durable product context. It is intentionally about **what KinkSync is and must protect**, not about temporary visual preferences. For UI work, read this together with `UI-principles.md` and `DESIGN.md`.

## Platform

web

## Users

KinkSync is for consenting adults using the product for real private negotiation, self-reflection and relationship planning around kink, intimacy, boundaries and agreements.

The interface must remain understandable when the subject is intimate, emotionally charged, uncertain or new to the user. Phone use is primary, often one-handed, with iOS Safari and the installed PWA treated as first-class contexts. Offline use is part of the normal product model rather than an exceptional fallback.

## Product Purpose

KinkSync helps people articulate what they want, might try, want only for the other person, or consider a limit, then carry that explicit information into comparison, conversation, planning and agreements without the product silently inferring consent.

The product succeeds when it makes sensitive conversations easier to start and safer to continue while keeping the user, not the software, in control of meaning.

## Positioning

KinkSync is not a compatibility scorer or a generic checklist with a kink theme. Its distinctive mechanism is an explicit, user-authored local profile of interests, limits and context that can be deliberately shared, compared with another explicit profile, and carried forward into scenes or agreements without converting role, demographics, prior answers or partner data into hidden preference assumptions.

Comparison is intended to surface overlap, differences, discussion points and concrete limits. It does not decide whether two people are compatible and does not turn overlap into consent.

## Operating Context

KinkSync's durable product model is organised around four connected kinds of meaning:

1. **Person**: a profile or explicit perspective describing one person's stated interests, limits and context.
2. **Relationship**: a comparison between two explicit profiles that reveals shared ground, differences, discussion points and boundaries.
3. **Agreement**: a concrete negotiated contract or other explicit set of arrangements derived from what two people actually discuss and confirm.
4. **Moment**: a planned or remembered scene or intimate moment, including relevant preparation, consent context and aftercare.

These are product concepts, not mandatory navigation labels. Future information architecture and surface design should make their relationships legible instead of presenting KinkSync as a collection of unrelated feature modules.

A typical journey may move from Person to Relationship to Agreement or Moment, but the product must not force a linear funnel. Users may return to a profile, compare again, plan a scene without a contract, or use an agreement without treating it as permanent truth.

## Capabilities and Constraints

KinkSync supports:

- creating one or more explicit profile perspectives;
- working through a large kink catalogue using established consent/status semantics;
- adding private notes, conditions and context without making them public by default;
- exploring relevant or freely chosen topics without the app inventing preferences;
- deliberate profile sharing through explicit transfer mechanisms such as QR/import flows;
- comparing two profiles and surfacing overlaps, mismatches, discussion points and limits;
- planning scenes and recording aftercare;
- planning or logging intimate moments;
- creating, confirming and reviewing agreements/contracts;
- local backup and restore.

Durable technical and trust constraints:

- no account is required;
- no backend or cloud sync is part of the product model;
- user data is stored locally in the browser/PWA unless the user explicitly exports or shares it;
- sharing is explicit;
- private context must not leak into shared outputs unless the flow explicitly says it will;
- role or profile perspective never silently predicts a concrete act, direction, preference or consent answer;
- one answer must never be copied into another semantically distinct answer without explicit user action;
- hard limits and consent semantics survive compare, sharing, import, scenes and contracts intact;
- convenience, aesthetics and automation never outrank consent, safety or privacy;
- desktop and tablet may expand the experience but may not redefine the fundamental interaction model established on mobile.

## Brand Commitments

The product name is **KinkSync**.

KinkSync is intimate, human, confident and adult. It may be playful and sensual, but it is not a novelty kink skin over a generic productivity app. It should behave like a private conversation space rather than a public social network, clinical intake system or engagement-maximisation product.

The established product voice values direct, human language and explicit meaning. Playfulness may add character but must never make consent, privacy, boundaries or consequences ambiguous.

## Evidence on Hand

The repository contains working product flows for profiles, questionnaire data, explicit sharing/import, comparison, contracts, scenes, intimacy planning/logging, local persistence, backup/restore and PWA/offline behaviour. Those flows and their regression tests are implementation evidence, not permission to reinterpret the product principles above.

`UI-principles.md`, `DESIGN.md`, domain/security documentation, regression tests and the current implementation are the main internal evidence available for future work.

No public testimonials, customer counts, clinical claims, compatibility benchmarks or independent efficacy evidence are established here. Future product or marketing work must not fabricate them.

## Product Principles

1. **Explicit before inferred.** The user states preferences, limits and context; the product does not fill semantic gaps on their behalf.
2. **Conversation before verdict.** Compare, scenes and agreements help people talk and decide together rather than producing a compatibility judgment.
3. **Private by architecture.** Local storage and deliberate sharing are structural product choices, not decorative reassurance.
4. **One coherent journey, several valid paths.** Person, Relationship, Agreement and Moment should feel connected while remaining independently useful and non-linear.
5. **Sensitive work deserves reflection.** KinkSync should support considered choices and revisiting context rather than optimise for completion speed or engagement.

## Accessibility & Inclusion

The product must remain usable on a phone, with mobile interaction as the baseline. Essential consent, safety and privacy meaning must be readable and directly available rather than depending on colour, hidden inference or expert terminology.

KinkSync must not assume that a role label, relationship structure, gender, body, orientation, experience level or prior answer determines another preference or direction of activity. Explicit user input remains the authority.

## Non-goals

KinkSync is not:

- a dating app or public social network;
- a public profile-hosting service;
- a cloud account system;
- a clinical diagnostic or therapeutic tool;
- a generic task manager or productivity dashboard;
- an engagement-maximisation product;
- a system that infers hidden sexual preferences from role, demographics, previous answers or partner data.

## Sources of truth

When product documents disagree, use this order:

1. explicit consent, safety and privacy contracts in the security/domain documentation;
2. explicit user-approved durable product decisions recorded in repository guidance;
3. this `PRODUCT.md` for product purpose, operating model, trust constraints and non-goals;
4. the current implementation for behaviour that is not specified above.

The current UI is evidence of what ships today, not permission to override an approved future product decision.

Visual rules do not belong here. `UI-principles.md` is the binding UI doctrine and `DESIGN.md` records the current visual world.