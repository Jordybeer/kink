# KinkSync Product Truth

This file records durable product context. It is intentionally about **what KinkSync is and must protect**, not about temporary visual preferences. For UI work, read this together with `UI-principles.md` and `DESIGN.md`.

## What KinkSync is

KinkSync is a private, local-first browser app and installable PWA for adults who want to articulate kink interests, limits and context clearly, compare profiles with a partner, and turn that shared understanding into concrete plans or agreements.

The product exists to make sensitive conversations easier to start and safer to continue. It should help people express what they want, what they might try, what is only for the other person, and what is a hard limit without inferring intent for them.

## Core jobs

KinkSync helps a user:

- create one or more explicit profile perspectives;
- work through a large kink catalogue using the established consent/status semantics;
- add private notes, conditions and context without making those details public by default;
- explore relevant or freely chosen topics without the app inventing preferences;
- share a profile deliberately through explicit transfer mechanisms such as QR/import flows;
- compare two profiles and surface overlaps, mismatches, discussion points and concrete limits;
- plan scenes and aftercare;
- create and sign agreements/contracts;
- back up and restore local data.

## Audience and usage context

The primary audience is consenting adults using KinkSync for real private negotiation, self-reflection or relationship planning. The interface must work when the subject is emotionally charged, intimate, uncertain or new to the user.

Primary physical context:

- phone first;
- often one-handed;
- iOS Safari and installed PWA are first-class surfaces;
- offline use must remain viable;
- desktop and tablet may expand the experience but may not redefine the fundamental interaction model.

## Trust model

KinkSync earns trust through architecture and behaviour, not through badges or reassuring copy.

Durable invariants:

- no account is required;
- no backend or cloud sync is part of the product model;
- user data is stored locally in the browser/PWA unless the user explicitly exports or shares it;
- sharing is explicit;
- private context must not leak into shared outputs unless the flow explicitly says it will;
- role or profile perspective never silently predicts a concrete act, direction, preference or consent answer;
- one answer must never be copied into another semantically distinct answer without explicit user action;
- hard limits and consent semantics survive compare, sharing, import, scenes and contracts intact;
- convenience, aesthetics and automation never outrank consent, safety or privacy.

## Product personality

KinkSync is intimate, human, confident and adult. It may be playful and sensual, but it is not a novelty kink skin over a generic productivity app.

It should feel more like a private conversation space than a dashboard, spreadsheet, clinical intake form or social network.

## Non-goals

KinkSync is not:

- a dating app or public social network;
- a public profile-hosting service;
- a cloud account system;
- a clinical diagnostic or therapeutic tool;
- a generic task manager or productivity dashboard;
- an engagement-maximisation product;
- a system that infers hidden sexual preferences from role, demographics, previous answers or partner data.

## Information architecture principles

Users should be able to understand where they are without memorising product terminology. Major routes should answer one clear job at a time.

The questionnaire may offer guided and free-exploration modes, but every relevant topic must remain reachable somewhere without requiring the app to infer consent. Mode names and exact mechanics may evolve; the accessibility of explicit choice may not.

## Sources of truth

When product documents disagree, use this order:

1. explicit consent, safety and privacy contracts in the security/domain documentation;
2. explicit user-approved durable product decisions recorded in repository guidance;
3. this `PRODUCT.md` for product purpose, trust model and non-goals;
4. the current implementation for behaviour that is not specified above.

The current UI is evidence of what ships today, not permission to override an approved future product decision.

Visual rules do not belong here. `UI-principles.md` is the binding UI doctrine and `DESIGN.md` records the current visual world.