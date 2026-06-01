# Sim Engine — Trait-to-Behaviour Rules

## Overview
At the start of each persona session, read the persona's current trait values
from Supabase and use this file to derive exactly what they will do this session.
Traits are integers 0–10. Do not follow a hardcoded script — derive the session
behaviour dynamically from the current trait state.

---

## Traits

### curiosity (0–10)
Controls how much of the app the persona explores unprompted.
- **0–3**: Opens home, creates/views profile only. Does not navigate to compare,
  contract, or session unprompted. Ignores custom kinks.
- **4–6**: Explores 3–4 kink categories. May tap the compare tab if they notice it.
  Tries one feature they haven't used before (check `featuresDiscovered`).
- **7–10**: Visits every nav tab. Tries custom kinks. Reads kink descriptions.
  Explores settings. Attempts every feature available.

### impulsivity (0–10)
Controls how carefully the persona reads and navigates.
- **0–3**: Reads all descriptions before tapping. Completes every step fully.
  Uses BottomNav exclusively. Never uses browser back.
- **4–6**: Skips some descriptions. Occasionally uses browser back mid-flow.
  May bulk-skip a kink category if impatient.
- **7–10**: Rapid taps. Opens routes directly via URL. Tries to submit forms
  half-filled. Uses browser back frequently. May trigger bulk-skip.

### trust (0–10)
Controls willingness to engage with partner-facing and commitment features.
- **0–3**: Never imports a partner. Never generates a contract. Exports TXT only.
- **4–6**: Imports a partner profile if one is available in persona state.
  Views compare page. Does not sign contract.
- **7–10**: Signs contract. Shares profile via QR. Enables session mode.
  Generates at least one contract per session.

### thoroughness (0–10)
Controls depth of kink list engagement.
- **0–3**: Fills 3–5 kinks total. Skips most categories.
- **4–6**: Fills kinks in 3–4 categories. Leaves comments on 1–2 entries.
- **7–10**: Fills every visible kink. Sets desire sliders. Adds a private note.
  Reads the DNA bar legend. Checks all status options before choosing.

---

## Trait evolution (apply after each session)
Update traits in Supabase after the run completes:

| Event | Trait change |
|---|---|
| Completed full onboarding | curiosity +1 |
| Discovered a new route | curiosity +1 (max once per session) |
| Hit a confusing empty state with no guidance | curiosity -1 |
| Completed contract flow end-to-end | trust +1 |
| Import succeeded cleanly | trust +1 |
| Import failed or confused persona | trust -1 |
| Bulk-skipped a category | impulsivity +1 |
| Used browser back and got lost | impulsivity +1 |
| Read all descriptions in a category | thoroughness +1 |
| Filled every kink in a category | thoroughness +1 |
| Abandoned a flow mid-way | thoroughness -1 |

Traits are clamped to 0–10. Never go below 0 or above 10.

---

## Milestone thresholds
When a trait crosses these values, note it in the session report as a milestone:

| Threshold | Label |
|---|---|
| curiosity reaches 5 | "becoming exploratory" |
| curiosity reaches 8 | "power user curiosity" |
| trust reaches 5 | "ready to collaborate" |
| trust reaches 8 | "fully committed user" |
| thoroughness reaches 8 | "obsessive filler" |
| impulsivity reaches 7 | "chaos territory" |

---

## Session behaviour derivation — step by step

1. Read all 4 trait values from Supabase `sim_personas`
2. For each trait, identify which band (low / mid / high) applies
3. Check interaction eligibility (see Persona Interactions section below)
4. Compose the session plan:
   - Which pages to visit
   - How carefully to read and interact
   - What kink categories and depth to fill
   - Whether to import a partner / generate a contract / sign it
   - Whether to use shortcuts or read carefully
   - Whether to use another persona's last_state as an import target
5. Execute the plan using Playwright
6. Take screenshots at:
   - First page load
   - First meaningful interaction
   - Any failure or unexpected state
   - Any first-visit to a new route (not in `featuresDiscovered`)
   - Any interaction cross-over moment (import, compare, contract with another persona's data)
   - Final state of the session
7. Upload each screenshot to Supabase Storage:
   `sim-screenshots/{persona_id}/{YYYY-MM-DD}_{step:02d}_{route_slug}.png`
8. After the session, compute trait deltas and update `sim_personas` in Supabase
9. Write a third-person session story (see below) and store it in `sim_reports.observations.story`

---

## Session story (mandatory)

After each session, compose a 3–6 sentence third-person narrative describing what the persona
actually experienced. This is not a test log — it is a human-readable account of their visit.

**Rules:**
- Write in past tense, third person ("Robin opened…", "Leo barely glanced…")
- Let the trait values drive the voice and detail: impulsivity=9 means rushed sentences; thoroughness=7 means careful, deliberate ones
- Name specific things that happened: routes visited, imports attempted, kinks rated, failures hit
- Note emotional texture where trait context allows: trust thresholds, confusion at empty states, delight at working features
- If a cross-persona interaction ran, narrate it like an encounter — not just "import succeeded"
- End with one sentence about what changed: a trait bump, a milestone, a finding to follow up

**Example (Leo, trust=4, impulsivity=9, curiosity=9):**
> Leo launched the app and was already in settings before the home screen had finished rendering. He
> slid Robin's profile in via the backup restore — trusting enough for that, at least. He barely read
> the compare page before typing `/contract` directly into the URL bar. Half-filled form, immediate
> submit attempt, predictable block. He bounced through session and timeline before landing back on
> home, satisfied with nothing in particular. Trust ticked up to 5 — he finally let someone in.

Store the story in `observations.story` (string) alongside `pass`, `fail`, and `notes`.

---

## localStorage seed

Derive the localStorage state from the persona's Supabase record:
- `onboarding_complete`, `profile_tour_complete` from persona state
- If `session_count === 0`: empty localStorage — persona starts completely fresh
- If `session_count > 0`: seed with the snapshot stored in `last_state` (jsonb)
  which was saved at the end of the previous session

After the session ends, capture the current localStorage state and write it
back to `sim_personas.last_state` so the next run can resume accurately.

---

## Persona Interactions

Personas run in order: robin → leo → iris. Each session completes fully
before the next begins. This ordering is intentional — it allows earlier
personas' output to serve as input for later personas in the same run.

Interactions are opt-in and gated by trait thresholds and session count.
If prerequisites are not met, the persona runs in isolation as normal.
Never force an interaction — if the data is not available or the trait
threshold is not met, skip it silently.

---

### Interaction 1 — Leo imports Robin's profile

**When eligible:**
- Robin `session_count >= 2` AND Robin `last_state` is not null
- Leo `trust >= 4`

**What happens:**
Before Leo's Playwright session starts, extract Robin's profile data from
her `last_state` snapshot and make it available as an importable partner
file (JSON export format the app uses). Seed Leo's localStorage with his
own state as normal, then during the session:
- Leo navigates to the import flow
- Imports Robin's exported profile
- Views the compare page
- If Leo `trust >= 7`: attempts to generate a contract
- If Leo `trust < 7`: views compare only, does not generate

**Trait evolution additions:**
| Event | Trait change |
|---|---|
| Import of Robin succeeded | leo trust +1 |
| Compare page rendered correctly with Robin's data | leo curiosity +1 |
| Contract generated with Robin's data | leo trust +1, robin contracts_generated +1 |
| Import failed or data was malformed | leo trust -1 |

**Report note:** Label this session as `interaction: leo_imports_robin`
in the report observations.

---

### Interaction 2 — Robin receives Leo's contract

**When eligible:**
- Leo has generated at least one contract in a previous session
  (`contracts_generated >= 1`) AND Leo `last_state` contains a contract snapshot
- Robin `session_count >= 3`
- Robin `trust >= 3`

**What happens:**
Seed Robin's localStorage as normal, then additionally inject a pre-generated
contract (from Leo's last_state) into her incoming state. During Robin's session:
- Robin sees an incoming contract notification or entry
- Navigates to the contract view
- Reads through it (thoroughness >= 6: reads every field)
- If Robin `trust >= 5`: signs the contract
- If Robin `trust < 5`: views it, does not sign, exits

**What this tests:**
- Contract view renders correctly for the receiving party
- Signing flow works end-to-end from the receiver's perspective
- Empty/graceful state if no contract exists yet

**Trait evolution additions:**
| Event | Trait change |
|---|---|
| Robin viewed contract successfully | robin trust +1 |
| Robin signed contract | robin trust +1 |
| Contract view had layout issues | note in report, no trait change |

**Report note:** Label as `interaction: robin_receives_leo_contract`.

---

### Interaction 3 — Iris compares Robin and Leo

**When eligible:**
- Both Robin and Leo `session_count >= 2` AND both `last_state` not null
- Iris `trust >= 5`

**What happens:**
Before Iris's session, prepare two importable partner profiles — one from
Robin's `last_state`, one from Leo's `last_state`. During Iris's session:
- Iris imports Robin as partner 1
- Iris imports Leo as partner 2
- Navigates to the compare page with both loaded
- If the app supports multi-partner compare: tests it
- If not: notes the limitation in the report as a suggestion
- If Iris `trust >= 7`: generates a contract targeting Robin

**What this tests:**
- Multi-import flow
- Compare page with two different partner profiles loaded
- DNA bar rendering with two data sets
- Whether the UI handles a dominant-perspective user managing multiple partners

**Trait evolution additions:**
| Event | Trait change |
|---|---|
| Both imports succeeded | iris trust +1 |
| Compare rendered with both profiles | iris curiosity +1 |
| Multi-partner compare not supported | note as suggestion: "multi-partner compare not yet available" |

**Report note:** Label as `interaction: iris_compares_robin_and_leo`.

---

## Interaction run order summary

```
Run order each night:
  1. Robin   — always solo (no prerequisites to check)
  2. Leo     — check Interaction 1 (import Robin)
  3. Iris    — check Interaction 3 (compare Robin + Leo)

Robin also checks Interaction 2 (receive Leo's contract)
but only if Leo ran successfully this session or in a previous one.
If Robin runs before Leo has ever generated a contract: solo run.
```

---

## Interaction eligibility check (routine step)

Before each persona session, run this check:

```
For leo:
  eligible_for_import = (robin.session_count >= 2
                         AND robin.last_state != null
                         AND leo.traits.trust >= 4)

For robin (contract receive):
  eligible_for_contract = (leo.contracts_generated >= 1
                           AND robin.session_count >= 3
                           AND robin.traits.trust >= 3)

For iris:
  eligible_for_compare = (robin.session_count >= 2
                          AND leo.session_count >= 2
                          AND robin.last_state != null
                          AND leo.last_state != null
                          AND iris.traits.trust >= 5)
```

If eligible: run the interaction version of the session.
If not eligible: run solo as normal. Do not mention it in the report.
