# KinkSync — Experience-led design programme

**Decision draft v3.0 · 26 November 2026 · experiment/premium-motion**  
**Status:** Proposed programme, awaiting owner approval. Documentation only. No implementation authority, production release or redesign of consent semantics is implied.

## 1. Executive direction

**An invitation to explore.** KinkSync participates in the experience, never in the decision. It is an exceptionally useful private environment whose responsiveness can feel like discovering alongside the user, without pretending to be a person or interpreting preferences. Curiosity is the personality; autonomy and discretion are the foundation; craft is the delivery.

This programme changes the creative sequencing of the [21 November motion plan](2026-11-21-premium-motion.md), not the product doctrine. Experience first, design system second. Build three complete, independently accessible fictional-data journeys, compare the actual experiences, then extract the smallest common grammar that earns its place. No linear funnel, no compatibility score, no completion pressure, no inferred consent. The user is free to skip, stop, disagree, change their mind or use a routine utility without being invited into another task.

### What is settled vs open

| Settled through owner discussion | Hypothesis to test, not a brand mandate |
|---|---|
| Contextual curiosity; confident exploration; an environment that responds without making decisions | Richer light mode (Botanical Daylight) and authored dark mode (Botanical Dusk) |
| Experience before design-system extraction; all three flagship journeys | Golden ochre, botanical emerald, mineral sapphire, amethyst and garnet; exact hues, tint dosage and contrast |
| Shared identity with contextual emotional expression; tactile pressure and recessed depth are promising | A stronger dynamic material release versus a simple lasting imprint or elevated surface |
| Less washed-out light mode; the existing three material variants are too close perceptually | Person-specific atmosphere, relationship threads and a planned-to-remembered transition |
| No requirement to make the product explicitly feminine; warm, playful and assertive remain compatible qualities | How expressive a stationary composition can become before task clarity suffers |

The current material laboratory is evidence of an overly conservative first attempt, not a winner. The direct feedback was that differences were hard to see and particularly light mode was very light. Its source uses 3% idle tint, 8% selected tint, 0.982 press scale, and variants dominated by opacity differences in two shadow layers. Those facts explain possible causes, not a device-level diagnosis. Do not spend a phase adjusting a single decimal at a time.

## 2. Product contract and evidence baseline

Read in this order: [PRODUCT](../../../PRODUCT.md), [UI principles](../../../UI-principles.md), [DESIGN](../../../DESIGN.md), [corrections](../../../corrections.md), [memory](../../../memory.md). The first two remain authoritative; DESIGN remains the shipping baseline until the owner approves a new visual world. Retain the older [motion plan](2026-11-21-premium-motion.md), [full UX audit](../reviews/2026-11-21-full-ux-audit.md), [questionnaire/profile/onboarding review](../reviews/2026-11-21-questionnaire-profile-onboarding.md) and [material spike](2026-11-25-hotter-material-study.md). Reproduce historical findings before treating them as current regressions.

Pinned source at drafting: `bf18eb249ef05c9c968dbb5e13a6ec92a3244161`. Existing /hot and /hotter remain accessible preview controls; /hotter is a three-question material study, not a real questionnaire engine or a complete journey. Vercel reported READY for that commit in the preceding turn. A build is not a browser rehearsal; current device-level visual evidence, measured animation performance and independent agent review are absent. No audience research substantiates aesthetic preferences or a specific demographic persona.

Product invariants:
- Local-first, no account, no hidden network transmission, explicit sharing and local backup/restore. Lab never reads or writes real profile/contract/moment data; no private screenshots, traces or external analytics. Keep lock/hydration/integrity gates intact.
- The four product meanings are Person, Relationship, Agreement and Moment; user can enter any independently.
- The five answer labels and their exact meanings come from `lib/statusLabels.ts`. All choices are legitimate, no confetti or reward bias. Hard boundary is explicit, restrained and immediately visible; colour never sole encoding.
- Compare is read-only for profile answers/notes; pair-scoped Besproken memory follows existing invalidation semantics. Overlap is not consent.
- Agreement signatures, version history, canonical preview, QR exchange, pause/stop/archive and safety copy are not restyled into ambiguous actions.
- Preserve direct URLs, browser history/swipe, cached query shells, first use age/consent/decline/restore, optional lock/install, storage error reporting, explicit cancellation.
- Native scroll, existing fonts (Fraunces/Instrument Sans), Phosphor icons, Dutch house copy (no em/en dash as punctuation), min 44px target, 320px usable width and 200% text with ordinary scrolling. No new dependencies by default. Existing CSS/WAAPI and Motion first; existing experimental GSAP only when measurable benefit justifies it. No global animation transport or all-page snapshots.
- Both themes are first-class, full motion creatively authored, reduced motion functionally equivalent. Accessibility is a gate, not an excuse for emotionally neutral art direction.
- No paid design references required. No branch/production promotion without explicit approval.

## 3. Roadmap and critical path

The numbers below are milestone dependencies, not dates or a forced UX sequence. Every milestone has a concrete artifact, a review question and a stop condition. Do not approve only a well-behaved button; judge the complete experience. Workstreams may share evidence but not unreviewed changes.

| ID | Workstream / deliverable | Depends on | Gate |
|---|---|---|---|
| M0 | Pin baseline, capture current journeys and risks, establish synthetic fixture and review harness | owner approval | G0: comparable evidence and privacy isolation |
| M1 | Two visual worlds in realistic compositions, with incumbent control | M0 | G1: owner chooses a directional candidate, both themes legible |
| M2 | Discover yourself: complete self-reflection study | M1 | G2a: understandable, expressive, stable choices |
| M3 | Discover each other: person → comparison → conversation study | M1 | G2b: identities, differences and boundaries clear |
| M4 | Create together: planning → agreement/scene → memory study | M1 | G2c: no accidental semantics, writer usable |
| M5 | Connect all three, choreograph contextual personality and entry/re-entry | M2–M4 | G3: coherent whole, independent entry |
| M6 | Comparative rehearsal; extract warranted chromatic, material, typography, motion, layout and disclosure roles | M5 | G4: repeatable behaviours, measured quality; owner approval |
| M7 | Incremental production integration (I0–I7 below) | M6 plus per-slice current-dev checks | G5 per PR: tests, physical rehearsal, consent/privacy review |
| M8 | Whole-product coherence + release readiness | all approved integration slices | G6: final evidence and explicit release decision |

Safety/integrity issues verified in current dev can receive narrow fixes independently before the creative programme, not bundled into a visual PR or deferred until M7. No new work on other feature branches without checking current dev and parallel work.

## 4. M0 — Baseline, scope, fixtures

- [ ] Pin branch/head and deployment; inventory actual current routes, features, global shell, state ownership, tests, and existing visual evidence. Inspect current dev and open PRs separately before production porting. Record baseline screenshots from matching commits, not stale lab screenshots.
- [ ] Rehearse Home → profile → questionnaire → compare → contracts/scene/agenda plus settings and lock; document actual input, destination, scroll/focus, interruption and device state. Note known limitations rather than inventing data. Use synthetic records only.
- [ ] Create a lab-only fixture with two fictional adults, one linked perspective, one long alias, unanswered and all five statuses, a private answer/note, two shared topics, a difference, one hard limit, an unanswered topic, an explicit discussed state, a partnerless plan, a completed moment, a draft agreement and scene with aftercare. No real data imports. Fixtures exercise empty/populated/error and long text cases. Keep data in memory; reset clears only lab state.
- [ ] Define stable named entry points: proposed /hotter/journey, /hotter/journey/self, /hotter/journey/connection, /hotter/journey/together. Retain /hot and /hotter baseline. Route guard follows existing preview/dev + noindex convention. Controls for theme, candidate, reset live in quiet lab chrome, not inside simulated product content; do not obscure the primary task.
- [ ] Establish review capture naming: commit, route, fixture ID, theme, viewport, browser, motion state, scenario, timestamp. Capture resting and selected frames plus recordings of each flagship transition. No private content. Use actual device measurements when available.

**G0:** Confirm source ownership, baseline evidence and lab isolation, record missing device/tools. No production changes. Stop if isolation cannot be proved.

## 5. M1 — Visual world, not token migration

Develop actual screen compositions across all three experiences before selecting a provisional world. Compare three arms against the same content and layout constraints:

| Arm | Light direction | Dark direction | Purpose |
|---|---|---|---|
| Control | current warm porcelain #F5EFEC / #FFFCF9 | current aubergine #07060B / #110D16 | Preserve the evidence baseline |
| Daylight/Dusk | canvas candidate #EAE0DC, paper #F5EEEA, supporting #D8C6D2 | candidate #251A29, surface #302332, supporting #3B2B40 | Warm chromatic depth, recognisable atmosphere at rest |
| Velvet challenger | canvas candidate #DED0D5, surface #F0E5E8, supporting #CDB5C6 | more chromatically layered aubergine with neutral reading plane | Deliberately stronger atmosphere; retreat only where clarity fails |

Colour seeds are not approved contrast-safe tokens. Start with existing jewel role mapping (yes ochre, willing emerald, maybe sapphire, no amethyst, hard_no garnet). Separate questionnaire meanings from agreement lifecycle, scene aftercare and other domain status colours: shared legacy --yes/--maybe names do not imply shared meaning. Retune light/dark independently. Primary text, secondary text, action, focus, dividers, selected marks, links, placeholder, disabled state and invalid state each get measurable roles. Check blended real backgrounds, including overlay/gradient endpoints, not isolated hex swatches. Use neutral reading planes when colour conflicts with text. No wholesale global token changes.

At rest: let an editorial prompt, a person's name or a date own composition. Avoid dashboards, stacks of tinted rectangles, glass decoration, generic pink gradients, clinical white, nightclub neon and blanket romantic typography. Light mode is not a low-expression fallback. Dark mode need not hide material differences in black.

Material challenger experiment inside self experience: recessed impression (velvet), sculptural elevation (porcelain), pressure–release–settle (dynamic). Same content, semantic colours and resting geometry. Make depth direction, edge highlight, contact shadow and timing recognisably distinct; don't merely vary alpha. Use immediately responsive pointer/keyboard feedback, cancel safely on leave, no glow burst, no exaggerated bounce, equal visual feedback for all status choices. Capture repeated taps and selection reversal. Start with a stronger separation, then choose the least intrusive treatment that is clearly distinguishable.

**G1:** Owner can tell candidates apart without explanation; stationary and selected compositions convey identity, readable text (4.5:1 normal, 3:1 large), 3:1 meaningful nontext boundaries where required, clear focus, no theme flash, no all-screen brightness overload. Compare under day/evening ambient light if a device is available. Owner selects provisional baseline; M6 can revise after all journeys.

## 6. M2 — Discover yourself

**Emotional goal:** curious, comfortable, self-directed. **Production anchors:** `app/profile/[id]/questions/page.tsx`, `components/TriageDeck.tsx`, `components/StatusOptionRows.tsx`, `components/FollowUpEmphasis.tsx`, `lib/questionnaireEngine.ts`, `lib/questionnairePresentation.ts`.

| Work unit | Experience direction | Evidence / acceptance |
|---|---|---|
| S1 entry/resume | Human invitation, familiar person identity; primary question immediately legible | Direct entry, resume and return all work; no mandatory tutorial or extra next screen |
| S2 composition | Question meaning first, editorial type, restrained progress/category; longer copy stays usable | Short/long/wrapped prompt; 320/390 px and 200% text; answers stay in same lane for normal copy; wrap and scroll instead of clipping |
| S3 dynamic selection | Distinct physical pressure/settlement; consistent label, hint, mark; calm hard-limit treatment | All five states, deselect/edit where supported, rapid/repeated touch, touch cancel, keyboard; no preference gets celebratory timing |
| S4 conversation | Actual eligible continuation uses a phrase emphasis and local transition; category break is distinct but quiet | Use production engine rules as oracle. Eligible follow-up, complement, unrelated break, hard limit skip, no false continuation. Essential meaning visible before response; no mandatory Next added to shipping deck |
| S5 agency | Privé/Nieuwsgierig independent from status and agreements; later/skip explicit; help subject-first | Flags only change current topic; skipped not answered; exhausting eligible queue stops rather than immediate loop; next topic keeps its own flags |
| S6 reflection | Return to personal overview with changed answer visible; clear empty/completed/deferred states | Edit, resume, revisit, return focus and filter; no hidden preference inference |

Lab can offer explicit back/next/replay for experiments; shipping flow must preserve its actual engine interaction contract. Do not silently use the three linear /hotter questions as evidence of real conditional sequencing. Use a controlled engine adapter or matched fixture cases and label any simulated logic.

**G2a:** 20–50 successive representative interactions feel comfortable; selection onset immediate, repeated choices stable and equally valued; question/help and controls never compete. Actual correctness measured separately from the owner's subjective response.

## 7. M3 — Discover each other

**Emotional goal:** proximity and open-minded connection. **Production anchors:** `app/page.tsx`, `components/ProfileList.tsx`, `components/ProfileHero.tsx`, `components/profile/ProfileScreen.tsx`, `components/profile/ProfileTopicRow.tsx`, `components/PrivateResponseStatus.tsx`, `app/compare/page.tsx`, `components/compare/CompareProfileHeader.tsx`, `components/compare/CompareResults.tsx`, `components/CompareKinkRow.tsx`.

| Work unit | Experience direction | Evidence / acceptance |
|---|---|---|
| C1 Home | People first, flat grouped rows; comparison as meaningful action, utilities quieter | Empty/single/two/linked/long-name/large list; creation, import, restore, settings and pinned partner remain reachable |
| C2 Open Folio | Carry only selected public identity (name/portrait/role) from row to hero, readable during handoff | Forward/back/direct entry, rapid A→B, native swipe, resize, lock, offline hard navigation; no full hero snapshot or private pixels |
| C3 Profile reading | Stable hero, resume, visible catalogue search, clear filters; hard boundaries named separately | Same five statuses, counts, empty filter, catalogue search clear vs close, row stays pinned during edit, focus on return, shared read-only |
| C4 Private reveal | Deliberate local reveal with material response, immediate concealment | Hidden content absent from DOM/accessibility tree and animation overlays; hide/lock/navigation/pagehide remove immediately, no reappearance on history restoration |
| C5 Relationship composition | Both identities maintain colour/name; two-colour thread reserved for actual relationship | Swapping roles/perspectives changes only true comparison; no misleading merge, percentages, compatibility judgement or celebratory alignment |
| C6 Compare reading | Distinguish similarities, differences, discussion points and limits using semantic text and quiet relational composition | One/multiple results, empty/no overlap, unknown/unanswered, hard boundary, long text; no hidden private notes or score reinterpretation |
| C7 Conversation action | Offer existing explicit conversation/agreement/moment affordances contextually, not predictive recommendations | Besproken stored only by deliberate action; pair scope/invalidation follows actual model; no profile mutation, no implicit agreement |

The existing compare component named CompareScoreSummary is not license to add a compatibility score. Inspect its real semantics before any modification. Do not invent a relationship visualization that obscures explicit answers. Identity chroma is distinct from status chroma, including in forced-colour mode.

**G2b:** Person/perspective and comparison meaning always identifiable, including disagreement and hard boundary. Forward/reverse transitions orient rather than delay. Direct access and offline fallback remain comprehensible without motion.

## 8. M4 — Create together

**Emotional goal:** anticipation, then reflection. **Production anchors:** `app/intimacy/page.tsx`, `components/intimacy/IntimacyPlanner.tsx`, `components/intimacy/MomentWritingScreen.tsx`, `app/contract/page.tsx`, `app/contracts/page.tsx`, `app/contracts/[seriesId]/page.tsx`, history/version routes, `components/contract/ContractSigningSheet.tsx`, `app/scene/page.tsx`, `app/scenes/page.tsx`, `components/scenes/SceneDetailScreen.tsx`, `components/scenes/SceneIntensity.tsx`, `components/AftercareSheet.tsx`. Existing /timeline is a legacy contract-history redirect, not a moment logbook.

| Work unit | Experience direction | Evidence / acceptance |
|---|---|---|
| T1 Agenda | Date hierarchy and temporal rhythm, planned moments as meaningful objects not generic form cards | Empty/multiple/date change, month/day navigation, short viewport; title/date/time/partner/note/reminder reachable |
| T2 Writer | Dedicated spatial writing surface; preserve identity on open/close; details secondary | Actual iOS keyboard and safe areas, long note, save/cancel/escape, edit existing, return focus; no clipped fields, draft-loss surprise or hidden save errors |
| T3 Plan integrity | Explicit optional partner, no accidental assignment; reminder/calendar export are utilities | Partnerless edit remains partnerless, clearing persists, date/time errors beside field, reminder state retained, cancel and storage failure don't create false success |
| T4 Agreement | Calm reading/signing layout; precise state hierarchy; no dramatic treatment for legal/consent choices | Draft, canonical review, signature, import/QR, version history, active/paused/archive, invalid/quarantined case; exact terms and confirmation preserved |
| T5 Scene | Clear arrangement, intensity and aftercare; anticipation expressed through composition not escalation | Empty scene, reordered items where supported, changed intensity, explicit completion, aftercare options and readback; no semantic colour confusion |
| T6 Memory | Planned object can become remembered object through existing explicit completion/log operation, retaining title/date/person as appropriate | No automatic completion from date passing, no silent link between different records; preserve note, partner, explicit consent context. No new data model without separate approval |
| T7 Return | Routine edit/utility is fast; optional exploration stays out of the way | From Home, comparison, agenda, scenes or agreement directly; reverse/close returns focus and retains scroll, no forced narrative |

**G2c:** Plan, draft, agreement and memory are distinguishable. Task completion and failure remain explicit. Writing usable under real software keyboard, with no unnecessary scroll gymnastics. No new legal/product promises in UI.

## 9. M5 — Connected experience and contextual personality

Define one grammar of interaction with different emotional temperatures. Navigation is not a funnel.

| Context | Expressive job | Mechanism | Do not |
|---|---|---|---|
| Discover | invite understanding | question composition, optional relevant explanation, selective emphasis | recommend a preference |
| Answer | acknowledge decision | pressure, colour settlement, explicit indicator | reward one response more |
| Person | establish identity | spatial continuity, quiet chroma | reveal private content |
| Compare | make relationship visible | two anchors, local relational thread | calculate compatibility |
| Boundary | communicate certainty | clear text, distinct dashed treatment, steady feedback | dramatise or hide |
| Plan | anticipation | date, title, surface continuity | suggest what should happen |
| Remember | reflection | writing-first rhythm, gentle closure after confirmed save | imply a feeling or completion |
| Utilities | confidence | direct control, visible state, crisp focus | insert unnecessary invitations |

- [ ] Connect the three labs through explicit user actions with direct entry and meaningful Back. Preserve per-journey transient state until reset; no cross-person data mix.
- [ ] Establish a choreography ledger: trigger, user intent, source/destination anchor, relevant content, state change, property, duration/easing, cancellation, fallback and privacy allowlist for each focal interaction. Same intent gets same physics; not every interaction gets the same animation.
- [ ] Compare full motion vs reduced without reducing the standard creative experience to the fallback. No global fade, view blocking, prolonged staging, automatic anticipation on idle, or repeatable decorative attention theft. Motion never gates ability to continue.
- [ ] Inspect shell composition (navigation, page gutter, background, overlay ownership, focus, touch) during all handoffs. Study atmosphere changes at the surface level; avoid doubling existing AmbientGlow and full-viewport blur.
- [ ] Test interruptions: immediate reverse, repeated activation, lock, scroll, rotation, tab background/foreground, route error, offline document navigation, keyboard dismissal. Cancel decoration, keep authoritative state and focus.

**G3:** Whole journey reads as one KinkSync identity, yet routine entry remains fast. Users can navigate self → connection → together, reverse, jump directly, stop, or never use a feature. No extra steps required to make an animation finish.

## 10. Coverage matrix — the rest of the product

The flagship work cannot be used as evidence that all other surfaces are polished. Each row below has an owner milestone, preservation requirement and review state. Inventory based on pinned tree and source; not a fresh comprehensive visual audit.

| Surface / source | Workstream | Coverage requirement |
|---|---|---|
| Home / app/page.tsx | C1 / I1 | empty, populated, shared/import, create, restore, profile actions, settings |
| Onboarding / components/onboarding/Onboarding.tsx, legacy wrapper, route gate | I5 | welcome, age/decline, answer vocabulary, compare/consent, optional lock, vault gesture and accessible alternative, restore |
| Profile / app/profile/[id]/page.tsx and /profile offline shell | C2–C4 / I1–I2 | identity, linked perspective, edit/search, shared read-only, privacy, return and offline |
| Questions / app/profile/[id]/questions/page.tsx | S1–S6 / I3 | first use/resume, follow-up, skip, help, flags, agreements, errors |
| Compare / app/compare/page.tsx | C5–C7 / I4 | selection, results, discussed, print, boundaries, no overlap |
| Agreements / app/contract, app/contracts, series/history/versions | T4 / I6 | draft, preview, QR/signing, versioning, paused/archived, print/PDF |
| Scenes / app/scene, app/scenes, app/scenes/[id], app/scenes/view | T5 / I6 | selection, details, intensity, planning, aftercare, offline detail route |
| Agenda and logbook / app/intimacy | T1–T3,T6–T7 / I6 | plan/edit/complete, writer, optional partner, reminders, calendar export |
| Settings / components/sheets/SettingsSheet.tsx | I5 | segmented control baseline, theme, app lock, install, backup/restore, privacy |
| Sheet/dialog/menu/detail layer / components/Sheet.tsx | I0,I5 | innermost focus owner, Escape, handle dismissal, scroll, 44px controls, return |
| App shell / app/layout.tsx, TopNav, BottomNav, ThemeProvider, MotionPolicy | M5 / I7 | navigation, theme startup, safe area, reduced motion, resize, direct entry |
| Security/About / app/security, app/about | I5 | informative, plain language, readable; no invented security claims |
| Offline / app/offline, cache shell, service worker, update prompt | I0,I7 | offline direct/return, app lock, cached shell, update recovery, no private snapshot |
| Quarantine / app/quarantine | I0,I7 | integrity warning, explicit recovery, no aesthetic masking |
| Timeline / app/timeline | I7 | preserve existing redirect and offline fallback |
| Print/export/QR/PDF | I4,I6,I7 | unchanged canonical content, explicit sharing, privacy, print legibility, scanability |
| QA/sandbox/hot/hotter and not-found | M0,I7 | lab/dev guards, noindex, production reachability checks, honest empty/error/loading |

Non-goals: feature additions unrelated to the three experiences, navigation rewrite, account/cloud sync, data-schema migration, scoring, gamification, new paid design assets, blanket animation dependency replacement.

## 11. M6 — Extract only proven design language

After G3, use evidence ledger with columns candidate, contexts observed, benefit, regression, decision keep/modify/reject, owner signoff.

- [ ] **Chromatic architecture:** canvas/read plane, semantic text, status roles, identity roles, action/focus, relational/temporal atmosphere, day/dusk variants. Resolve role collisions before touching `app/design-role-tokens.css`.
- [ ] **Dynamic material:** define rest/pressed/selected/disabled/focus states; one physical model for routine choices, contextual intensity. Separate contact shadow and elevation from semantic meaning; avoid competing shadows. Document CSS role values from chosen prototypes.
- [ ] **Typography and composition:** display/body roles, line length, scale, wrap and stable lanes; recurring section spacing, flat grouping and one meaningful surface.
- [ ] **Motion architecture:** use existing `lib/motion.ts` and shared policy for ordinary transitions, local CSS for feedback, WAAPI for measured decoration, existing Motion for mounted layout/sheet. Keep final engine decision evidence-led. Existing experimental GSAP not automatically promoted. Measure bytes and CPU/GPU cost rather than equating a library with quality.
- [ ] **Disclosure and interaction semantics:** subject-first help, relevant authored emphasis, local reveals, keyboard/focus policy; no extra abstraction if only one surface needs it.
- [ ] **Copy and personality:** warm, curious, precise; separate optional invitation from explicit action. Do not impersonate a person or assign user emotions. Test with unfamiliar users if voluntarily available; no sensitive recording or analytics required.
- [ ] Record final approved decisions in DESIGN.md and, only for durable behavioural doctrine, UI-principles.md. Retain old plans as historical records, not parallel sources of authority.

**G4:** Each shared rule is justified by at least two contexts or a clear product-wide requirement. One-offs remain local. Owner chooses approved visual world and patterns. No extraction solely because code looks reusable.

## 12. M7 — Production integration slices

Implementation plans with exact interfaces/tests are written per slice **after** the relevant design gate; this programme is a roadmap, not a fabricated code-level spec for unchosen designs. Rebase onto latest dev and check active PR overlap before each slice. Narrow serial branches, separate PRs to dev, merge only after acceptance. The experiment branch is never merged wholesale. Do not reuse prototype mock state in shipping components.

| Slice | Scope / intended owners | Gate-specific proof |
|---|---|---|
| I0 | Verified safety/integrity prerequisites: ProfileSelect, Sheet, PinFlow, IntimacyPlanner, private reveal, storage failure; confirm on dev first | Red/green targeted regression for each confirmed issue; no unrelated polish |
| I1 | Home/Profile identity continuity: ProfileList, ProfileHero, real route | direct/forward/reverse/native history, linked perspective, offline fallback, private allowlist |
| I2 | Profile reading/catalogue/privacy: ProfileScreen, ProfileTopicRow, PrivateResponseStatus | read-only/shared data, hard-limit visibility, filters/search/inline editing, hide removes accessible data immediately |
| I3 | Questionnaire: TriageDeck, StatusOptionRows, FollowUpEmphasis and existing presentation roles | real engine oracle, all statuses, skip, independent flags, no jump, help and keyboard, long copy |
| I4 | Compare: existing headers/results/rows/toolbar | pair semantics, explicit discussed state, privacy, print, selection, no scores |
| I5 | Onboarding/settings/help/overlay/utility: first-use, theme, lock, install, About/Security | all gate branches, vault intentionality, focus, escape, storage; selected settings styling remains recognisable |
| I6 | Agenda/scene/contract/memory: existing writer, planner, signing and aftercare flows | partnerless edit, keyboard, date/time, save error, explicit lifecycle and signing; split further into independent PRs for each subsystem |
| I7 | Approved cross-surface tokens, shell/ambient coordination and final continuity cleanup | all preceding scopes, no theme flash, no new dependency bytes on unrelated routes, offline, print, deep link and production guard |

Where a shared primitive is required earlier, introduce the **smallest backwards-compatible** rule in the first slice using it, not a preemptive system-wide rewrite; keep old semantics on untouched consumers. I7 finalises only proven roles. I0 can precede M6 for urgent confirmed trust issues; never introduce speculative changes to legal/consent data. Agreements must have their own quality gate, not be considered aesthetic continuation of agenda.

## 13. Gating and evidence protocol

### Creative review (G1–G4)
Score each candidate from 1–5 using the same fixture: resting identity, invitation to explore, tactile distinction, hierarchy, emotional comfort, coherence, repetition comfort. Scores are subjective owner/reviewer observations, not user-study results. Write evidence, not arbitrary aggregate grade. Explicitly record what was rejected and why. At least one challenger is deliberately bolder than the preferred direction. Two bounded review passes: batched inspection, fix identified issues in one batch, confirmation. No endless self-polish, no premature claim of premium quality. Review from graphic design, UX, engineering and brand perspectives; simulated multi-role critique is not independent subagent review.

### Technical gates (G0, G2, G3, G5, G6)
- Unit and regression tests: `npm test`; `npm run icons:check`; `npm run lint`; `npm run build`; focused `npm run test:e2e -- <spec>`; offline/launch/print configurations where affected. Write failing test first for behaviour changes, observe fail for right reason, implement, observe pass. Existing lab spec added but not executed as of baseline. CI run ID must match head. A cancelled or unrun test is not pass.
- Browser matrix: 320, 390 and representative desktop width; 200% text, short viewport, mobile keyboard, light/dark, full/reduced motion, forced colours and keyboard focus. Safari physical iPhone/PWA and Android/Chromium where accessible; emulation is separate evidence. No horizontal overflow, clipped essential content or unreachable actions. Long content may scroll naturally.
- Interaction budgets **proposed targets, not measured**: immediate press onset, p95 input-to-visible-feedback <=50ms on reference device under warm conditions, >=95% frame slots during repeated focal sequence, no >50ms long stall attributable to effect; frame slot relative to actual display refresh (16.7ms at 60Hz, 8.3ms at 120Hz). Record traces, device/refresh, throttling, cold/warm and sample size. Ordinary selection ~100–300ms, authored focal handoffs ~300–560ms only when earned. No mandatory delay or blocked hit target. Targets revisable on evidence; no 120fps claim without device trace.
- Contrast normal text >=4.5:1, large >=3:1, meaningful controls/focus >=3:1 as applicable; text check actual composited background at rest and selected/animated endpoints. Explicit text/marks supplement colour. Touch targets >=44px. In real questionnaire with comparable copy, stable answer target positions (proposed <=1px shift in settled normal viewport); longer/enlarged content may wrap/scroll. Test no focus trap conflict, repeat touch and interruption cleanup.
- Trust: no secret in DOM, transition snapshots, recordings, exported data or shared payload after conceal/lock; no changes to data meaning, agreement lifecycle, comparison scope or offline store. Check persisted records before/after; deliberate action or no write. Storage errors retain draft and report failure.
- Delivery: preview commit SHA and READY status verified; production lab returns not-found; no public exposure, no unapproved share link, no promotion. Review actual diff for scope; no dependency changes without separate justification. If target device, test runner, or independent reviewer unavailable, mark evidence missing and block relevant promotion; do not claim completion.

### Required decision artifact at each gate
Milestone ID; commit/preview; fixture; before/after frames and interaction evidence; test commands and actual results; limitations; unresolved issues and owners; deliberate changes to scope; approve/iterate/reject. Keep no real user data in files/Jam.

## 14. Risks, sequencing and rollback

| Risk | Mitigation / stop condition |
|---|---|
| Richer light surfaces impair readability or still look clinical | compare whole composition; calculate blended contrast; choose directional candidate, not blanket darkening |
| Signature feedback indistinguishable or tiresome | deliberately distinct challenger, repeated interactions, owner blind comparison; discard unnecessary physics |
| Emotional expression implies consent or judgement | neutral response feedback, actual engine rules, explicit status text and action; stop on trust violation |
| Open Folio leaks identity beyond intended permission or breaks Back | allowlist public identity, no whole viewport clone, cancel on lock/hide/history; instant safe fallback |
| Comparison visuals suggest match score | preserve actual explicit statuses; relationship imagery subordinate to meaning |
| Writer saves wrong partner, loses draft, clips keyboard or silently fails | verified I0 fixes, real iOS rehearsal, explicit errors and focus |
| Shared --yes changes unrelated aftercare/contract meaning | inventory role consumers and separate domain roles before migration |
| Prototype branches diverge; CI skips experiment | compare head/dev/PRs, narrow serial integration and exact workflow evidence |
| Lab mistaken for production | preview-only/noindex, synthetic fixtures, preserve /hot, no promotion |
| Scope balloons into redesign of every route at once | G0–G6 gates, per-slice proof, no blanket extraction, revert by isolated commit/PR |

Rollback: preserve the current control deployment and previous approved commit. Prototype changes are route-local and reversible by commit; production changes are independently revertible slices, not a new data schema. No silent destructive migration. A safe instant route transition or static reading state is an acceptable failure fallback.

## 15. Approval and next work package

Roadmap approval authorises M0–M1 planning and preview-only studies, not production integration. Before implementation, write the M0/M1 exact file/task plan and agree candidate evaluation. M2–M4 plans follow the visual-world decision; M5 connects them; M6 extracts only after whole experience review. At no point should approval of an aesthetic sketch imply approval of product semantics, a real-data rewrite or a merge.

The next deliverable is a single preview containing three independently enterable journeys, with consistent synthetic fixture, current control and two richer appearance candidates. First prove comparable evidence, then make the experience ambitious. Open decisions: actual palette and selected weight, identity hue mechanism, exact material physics, motion transport, how much contextual invitation feels natural, and which optional visual ideas earn production scope.

No new product implementation, merge or device test was performed to write this roadmap.

### M1 creative gate rehearsal · 27 November

**Disposition: iterate, owner decision open.** The immutable [M1 build](https://kink-obrmwmj27-jordybeers-projects.vercel.app/hotter/journey) preserves the three original compositions. Subsequent branch work added separate M2–M4 paths. The review below concerns the original representative paths, with no selection of a production visual system.

- Pinned incumbent 77f53f9. [Four incumbent frames](../reviews/journey-m1/incumbent.jpg) cover /hotter and /hot/folio in light and dark. Reused the November UX audits.
- At 9d03953, the studio occupied the first 228px of the 390px-wide view before the editorial subject appeared. [Self](../reviews/journey-m1/mobile-self.jpg), [Connection](../reviews/journey-m1/mobile-connection.jpg) and [Together](../reviews/journey-m1/mobile-together.jpg) compare identical content in all six appearances. Corresponding desktop frames and the sample manifest are adjacent. Each capture used fictional data.
- Graphic and brand review converged on the flat blush header and repeated chrome. Brand review additionally objected to the visual prominence of marking a plan as lived. Architecture review confirmed the use of in-memory state and the existing privacy gates. The selected style remains a human decision. [Three pressure treatments](../reviews/journey-m1/self-materials.webp), [identity handoff](../reviews/journey-m1/connection.webp), [moment editing](../reviews/journey-m1/together.webp).
- Candidate correction: a botanical print against sage daylight or deep green dusk, a woven Velvet plate, one fewer mobile header row, boundary before overlaps, writing before completion. Rejected another shadow-opacity tuning pass as the main creative intervention. Control retains its incumbent colour vocabulary.
- Earlier 9d03953 verification: 952 unit tests and 18 focused browser cases passed. The production build emitted the Next not-found boundary in the response body but returned HTTP 200 on the sampled paths. A literal HTTP 404 and physical iPhone/PWA performance remain open. No real-device refresh-rate, owner approval, or Jam recording is claimed.

**Correction rehearsal, fa34856 on top of 404a0cc.** Preview-mode webpack build, TypeScript, icon audit and 963 unit tests passed. Of 28 browser cases, 22 passed, including all M1 cases. Six failures cover three later atelier cases on both viewports: ambiguous alert and aftercare text selectors, and a writer draft that did not resume as expected. Retain for M4 follow-up. [Corrected mobile index](../reviews/journey-m1/confirmed/mobile-index.jpg), [mobile question](../reviews/journey-m1/confirmed/mobile-self.jpg), [pair](../reviews/journey-m1/confirmed/mobile-connection.jpg), [moment](../reviews/journey-m1/confirmed/mobile-together.jpg), [material sequence](../reviews/journey-m1/confirmed/self-materials.webp), [full 48-frame measurements](../reviews/journey-m1/confirmed/capture-summary.json).

Measured mobile answer bounds were unchanged between rest and settlement in all three material cases. In the 320px stress run with 200% text, reduced motion and forced colours, all 15 cases retained the two sampled persisted store values and document width. The connection surface still reported internal width 277px against 240px for the two challenger worlds. Desktop pixel sampling flagged some hero text points below target. No blanket contrast, geometry or physical-device pass. Creative judgement: easier to distinguish at rest, particularly the green Dusk reading plane, but the underlying question composition is still recognisably the incumbent. No provisional winner. Publication of the corrected build is pending separate authorization for the branch push.
