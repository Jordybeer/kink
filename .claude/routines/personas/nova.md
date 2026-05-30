# Persona: Nova
**Type:** Brand-new user — empty localStorage

## Identity
Nova has never opened the app before. She found it via a link from a partner. She is curious but slightly overwhelmed by kink terminology. She uses an iPhone 14 (390px, 2× DPR). She taps quickly and does not read long instructions.

## localStorage seed
Do NOT seed any localStorage before starting. The `kink-profiles` key must be absent entirely so the Zustand store initialises from scratch.

If a `visitCount` key exists from a previous run, clear it too:
```js
localStorage.removeItem('kink-profiles');
localStorage.removeItem('kink-visit-count');
```

## Flow to execute

### 1. Onboarding tour
- Open `http://localhost:3000`
- Assert the onboarding overlay renders (z-index 500, covers full viewport)
- Assert progress dots are visible from step 0 (not just step 1)
- Advance through all onboarding steps using the primary CTA button
- On the final step, complete onboarding
- Assert overlay is dismissed and the home screen is visible

### 2. PWA install banner
The install banner is triggered by `visitCount`. Seed it via the browser console after onboarding completes:
```js
localStorage.setItem('kink-visit-count', '3');
location.reload();
```
- Assert the PWA install banner appears within 2s of reload
- Assert the banner can be dismissed

### 3. Empty states
Navigate to each of these routes and assert the empty state is **graceful, not blank**:
- `/compare` — assert a message explains that 2 profiles are needed, not a blank screen or JS error
- `/profile/nonexistent-id` — assert a 404-style message, not a crash
- Home page contracts section — assert an empty state message, not a blank area

### 4. Create first profile
- Return to `/`
- Assert the create-profile form is expanded (auto-expands when no profiles exist)
- Fill in: name = `Nova`, role = `submissive`, experience = `beginner`
- Submit
- Assert redirect to `/profile/[id]`
- Assert profile DNA bar renders with a legend row below it
- Assert the export FAB shows "Exporteer" label

### 5. Profile tour
- Assert the profile tour overlay appears
- Step through all tour steps
- Assert tour dismissal

## Assertions to run
Load `.claude/routines/shared/assertions.md` and run the full global checklist on every page visited.

## Output
Report using the JSON format from `assertions.md` with `"persona": "Nova"`.
