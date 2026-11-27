# M2 — Conversational discovery implementation plan

**Scope:** owner said proceed; Botanical is provisional, not approved as final. Preserve all M1 candidates and prior lab routes. No shipping product or global changes.
**Spec:** [roadmap M2](2026-11-26-experience-led-roadmap.md), S1–S6 / G2a.
**Goal:** move from a three-question material comparison to a real engine-backed, private, conversational self-reflection study.
**Architecture:** /hotter/journey/self/conversation, preview-only inherited guard. Use production getDynamicFirstRound/getQuestionnaireRuntime and selectConversationQuestion with one synthetic Noor profile; in-memory session reducer lives within journey provider. Existing /self remains M1 reference. Production TriageDeck untouched. No new dependencies.

## Work units
1. Add reducer contract tests for positive canonical probe, hard boundary topic break, flags, explicit deferral/revisit, stale timers and editing. Verify red then green when runner available. Model state has entries, deferred IDs, current topic/relation, pending revision, reading mode and edit ID. Do not rank or infer an answer in the lab.
2. Build editorial deck from production getQuestionnairePresentation. Stable answer/marker lanes, immediate choice with existing 200ms acknowledgement before auto advance; same feedback all five statuses. Actual continuation gets locally drawn phrase underline; other topics arrive at rest. Respect reduced motion. Provide explicit Later, subject-first optional context, actual safety note, privacy/curiosity and two attention tags independent of status.
3. Build personal overview, answered and deferred groups, explicit edit and resume. Conceal private answers in summary. Recheck eligible current topic after edits. Preserve in-memory state when navigating between experiences; reload and explicit studio reset clear it. No comparison changes without deliberate sharing (not in scope).
4. Point journey entry and navigation to complete conversation, retain material comparison by link. Candidate controls remain available for both. Add browser cases for actual follow-up, boundary, independent flags, skip, resume and isolation; preserve M1 tests with reference link update.
5. Verify production build on exact commit, unit and E2E results, before/after mobile captures and repeated 20–50 interactions; report missing evidence. Stop at G2a, no M3 or production integration until review.

## Review focus
- Actual eligibility, not arbitrary synthetic follow-up. Start with real eligible dominance_submission for reproducibility; fallback engine picks if absent.
- Pending revisions cannot affect a different question. Deselect during hold cancels advancement. Skip during hold disabled because answer already explicit. Explicit stop commits pending answer and chooses next; leaving route cancels timer and restarts it on return, not background work.
- Deferred set exhausted stops without requeue; edits re-evaluate probe eligibility. No propagated preferences or consent.
- Private summary hides status; intentional edit reveals own fictional answer. Shared fixture remains unchanged.
- Normal copy uses reserved prompt height; long real catalogue text and enlarged text may wrap/scroll. Test real geometry before claiming stable lane.
