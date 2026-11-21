# First use, answering and reading a profile

Planning addendum to the [UX audit](2026-11-21-full-ux-audit.md). Same application baseline, dev at 38105b6. The questionnaire and profile observations combine reviewed CI captures with source. Onboarding and queue behavior were traced in source and existing test scenarios. This review did not run a new participant or device session.

## Onboarding

The full path is Welcome → age gate → answer vocabulary → comparison and consent → optional lock setup → vault dial. Both the intro shortcut and backup restore still pass through age confirmation and the comparison/consent step. Preserve the decline path, restore, local-first explanation, optional PIN and biometric choice. The vault is already a distinctive signature. A test specifically calls for a deliberate 236° turn that can be completed in two grips. Keyboard and assistive activation have a separate path. Do not convert a tap on the dial into an accidental completion. Explore a separate plainly labelled standard action for people who cannot make a circular pointer gesture. It should invoke the same completion after the same gates.

The costly part is repeated instruction. Discover displays five labels as rounded example pills. The questionnaire uses five answer rows, then eligible first visits can receive a seven-step spotlight tour after 500 ms. Let Discover show the actual answer-row vocabulary in a clearly illustrative example without saving a preference. Offer the complete questionnaire walkthrough from help. Put “Privé” and “Nieuwsgierig” within reach of first-time users who decline the tour, with their meanings accessible before answering. Give the vault the one expressive finish. Keep the consent and lock choices steady.

[Onboarding and skip/restore branches](../../../components/onboarding/Onboarding.tsx#L220) · [Dial](../../../components/onboarding/TurnDial.tsx#L175) · [Vault gesture contract](../../../e2e/onboarding-vault.spec.ts#L50) · [Tour eligibility](../../../app/profile/%5Bid%5D/questions/page.tsx#L29) · [Tour contents](../../../components/tours/QuestionnaireTour.tsx#L7)

## Questionnaire

Keep one topic, its plain-language meaning, explicit statuses, independent privacy/curiosity and optional agreements. The captured screen already has a stable answer area and distinct hard-limit treatment. Preserve tap geometry and the existing 200 ms answer feedback. In the lab let the selected mark settle immediately, then replace just the topic and explanation along a shared baseline. Leave all five answer targets still. Never add a global page exit, another progress header or a mandatory Next button. Keep Safety easy to reach and retain the privacy and agreements set for the original topic.

**One-handed controls.** The current star and eye sit beside the category at the top of the topic. Move both controls out of the header. In the reachable area directly under the five answers, put **Privé** and **Nieuwsgierig** side by side, immediately above the existing **Eerst vragen** and **Eerste keer** pair. Keep two independent groups in the markup. Use visible text, 44 px minimum targets and a clear pressed state. Tapping a marker updates only the current topic and leaves it open until a status is chosen. Preserve the next topic's own stored flags. Reserve the same space throughout the topic transition. At enlarged text allow wrapping and normal scrolling. Check on a 390 px phone, one-handed, that both markers can be set before answering without reaching towards the header or moving the agreements out of comfortable reach. Compare the middle-of-screen and bottom-row positions with both hands before finalizing the placement.

The engine already distinguishes continuation, complement and a topic break. A related follow-up after an eligible positive answer can make the sequence feel conversational. Give the follow-up its own unanswered state. A hard limit requests a topic break. Avoid motion that reads as praise, disappointment or an inferred next answer.

**Concrete flow issue.** Later adds the topic to the session's skipped set. Once all remaining unanswered candidates are skipped, the deck repopulates its queue from those same candidates. With one eligible item, Later can immediately show it again. The component also contains a “Voor nu klaar” state with a way to revisit skipped items. Reconcile these two behaviors. Prefer offering “Toon opnieuw” after the available set has been deferred and keep the items unanswered for future sessions.

[Queue and selection](../../../components/TriageDeck.tsx#L63) · [Feedback and skip](../../../components/TriageDeck.tsx#L82) · [Finish state](../../../components/TriageDeck.tsx#L190) · [Adaptive sequencing](../../../lib/questionnaireEngine.ts#L396)

## Profile

Give returning users three landmarks: who this is, where to continue answering, and what the person has already stated. Keep the questionnaire resume row high on the owner's profile. Put a visible “Zoek in catalogus” action beside interests. Preserve public status counts, separate hard limits and the private section. Keep shared profiles in their read-only flow.

Open an editor directly beneath its subject. If an answer changes category, keep the row pinned while editing and finish the move once the person closes the editor. Preserve immediate writes. Supply a stable visible focus destination if the row leaves the active filter. The private reveal can have a local travelling matte after a permitted reveal. Remove the status from the visual and accessible output immediately on Hide. Reserve the longest motion for the person's arrival from Home and keep repeated filter changes quick.

[Profile structure](../../../components/profile/ProfileScreen.tsx#L325) · [Pinned rows and focus](../../../components/profile/ProfileScreen.tsx#L196) · [Inline and private editing](../../../components/profile/ProfileTopicRow.tsx#L65)

## One review journey

Use a synthetic local profile on the isolated branch. Open first use, verify age and consent, skip optional lock, complete the vault, and create a profile through the normal Home action. Open the questionnaire, find privacy before answering, answer a topic, inspect a related follow-up, and defer the last eligible question in a controlled fixture. Return to Profile and locate the answer. Change it inline, reveal and conceal a private status, then reopen the catalogue. Check that skip records no answer, editing preserves focus and the shared read-only view retains its exclusions. Repeat only the affected steps with enlarged text, reduced motion and keyboard activation. Preserve restore and the age-decline route with the existing targeted coverage. The questionnaire skip edge and first-use tour are the first additions to the lab after the flagship Home → Profile handoff.
