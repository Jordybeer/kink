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
3. Compose the session plan:
   - Which pages to visit
   - How carefully to read and interact
   - What kink categories and depth to fill
   - Whether to import a partner / generate a contract / sign it
   - Whether to use shortcuts or read carefully
4. Execute the plan using Playwright
5. Take screenshots at:
   - First page load
   - First meaningful interaction
   - Any failure or unexpected state
   - Any first-visit to a new route (not in `featuresDiscovered`)
   - Final state of the session
6. Upload each screenshot to Supabase Storage:
   `sim-screenshots/{persona_id}/{YYYY-MM-DD}_{step:02d}_{route_slug}.png`
7. After the session, compute trait deltas and update `sim_personas` in Supabase

---

## localStorage seed

Derive the localStorage state from the persona's Supabase record:
- `onboarding_complete`, `profile_tour_complete` from persona state
- If `session_count === 0`: empty localStorage — persona starts completely fresh
- If `session_count > 0`: seed with the snapshot stored in `last_state` (jsonb)
  which was saved at the end of the previous session

After the session ends, capture the current localStorage state and write it
back to `sim_personas.last_state` so the next run can resume accurately.
