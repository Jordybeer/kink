# Persona: Jordan
**Type:** Experienced user — pre-seeded localStorage state

## Identity
Jordan has been using KinkSync for 3 months with their partner Alex. Jordan is a switch with `ervaren` experience level. Jordan knows the app well and navigates quickly. Tests the power-user paths: timeline, contract history, new contract generation, tour restart.

## localStorage seed
Before opening the browser, inject the following state into localStorage. Use Playwright's `addInitScript` or inject via `page.evaluate` before navigating:

```js
const PROFILE_JORDAN_ID = 'jordan_test_001';
const PROFILE_ALEX_ID = 'alex_test_001';

const now = Date.now();
const month = 30 * 24 * 60 * 60 * 1000;

const jordanProfile = {
  id: PROFILE_JORDAN_ID,
  name: 'Jordan',
  role: 'switch',
  experienceLevel: 'ervaren',
  relationshipStatus: 'partner',
  customKinks: [],
  createdAt: now - 3 * month,
  updatedAt: now - 1000 * 60 * 60,
  entries: {
    // Sample entries — mix of statuses for DNA bar validation
    'bondage': { status: 'yes', score: null, comment: '', desire: 4, experienced: true },
    'blindfold': { status: 'yes', score: null, comment: '', desire: 5, experienced: true },
    'roleplay': { status: 'willing', score: null, comment: 'depends on mood', desire: 3, experienced: false },
    'wax_play': { status: 'maybe', score: null, comment: '', desire: 2, experienced: false },
    'impact_play': { status: 'no', score: null, comment: '', desire: null, experienced: false },
    'breath_play': { status: 'hard_no', score: null, comment: 'absolute limit', desire: null, experienced: false },
    'exhibitionism': { status: 'yes', score: null, comment: '', desire: 3, experienced: true },
    'aftercare': { status: 'yes', score: null, comment: 'essential', desire: 5, experienced: true },
  },
};

const alexProfile = {
  id: PROFILE_ALEX_ID,
  name: 'Alex',
  role: 'dominant',
  experienceLevel: 'gevorderd',
  isImported: true,
  customKinks: [],
  createdAt: now - 2 * month,
  updatedAt: now - 2 * 24 * 60 * 60 * 1000,
  entries: {
    'bondage': { status: 'yes', score: null, comment: '', desire: 5, experienced: true },
    'blindfold': { status: 'yes', score: null, comment: '', desire: 4, experienced: true },
    'roleplay': { status: 'yes', score: null, comment: '', desire: 4, experienced: true },
    'wax_play': { status: 'no', score: null, comment: '', desire: null, experienced: false },
    'impact_play': { status: 'willing', score: null, comment: '', desire: 3, experienced: false },
    'breath_play': { status: 'hard_no', score: null, comment: 'hard limit', desire: null, experienced: false },
    'exhibitionism': { status: 'maybe', score: null, comment: '', desire: 2, experienced: false },
    'aftercare': { status: 'yes', score: null, comment: '', desire: 5, experienced: true },
  },
};

// 5 ContractSnapshots spread over 3 months with varying compatibility
const contracts = [
  { id: 'c1', date: now - 3 * month, profileAId: PROFILE_JORDAN_ID, profileBId: PROFILE_ALEX_ID, profileAName: 'Jordan', profileBName: 'Alex', matchCount: 3, hardLimitCount: 1, softLimitCount: 2, discussCount: 4 },
  { id: 'c2', date: now - 2.5 * month, profileAId: PROFILE_JORDAN_ID, profileBId: PROFILE_ALEX_ID, profileAName: 'Jordan', profileBName: 'Alex', matchCount: 4, hardLimitCount: 1, softLimitCount: 1, discussCount: 3 },
  { id: 'c3', date: now - 2 * month, profileAId: PROFILE_JORDAN_ID, profileBId: PROFILE_ALEX_ID, profileAName: 'Jordan', profileBName: 'Alex', matchCount: 5, hardLimitCount: 1, softLimitCount: 1, discussCount: 2 },
  { id: 'c4', date: now - 1 * month, profileAId: PROFILE_JORDAN_ID, profileBId: PROFILE_ALEX_ID, profileAName: 'Jordan', profileBName: 'Alex', matchCount: 6, hardLimitCount: 1, softLimitCount: 1, discussCount: 1 },
  { id: 'c5', date: now - 7 * 24 * 60 * 60 * 1000, profileAId: PROFILE_JORDAN_ID, profileBId: PROFILE_ALEX_ID, profileAName: 'Jordan', profileBName: 'Alex', matchCount: 7, hardLimitCount: 1, softLimitCount: 0, discussCount: 1 },
];

localStorage.setItem('kink-profiles', JSON.stringify({
  state: {
    profiles: [jordanProfile, alexProfile],
    contracts,
    onboardingComplete: true,
    profileTourComplete: true,
    installPromptDismissed: true,
    theme: 'midnight',
    pinnedProfileId: PROFILE_JORDAN_ID,
  },
  version: 8,
}));
```

## Flow to execute

### 1. Home screen — experienced user view
- Open `http://localhost:3000`
- Assert onboarding does NOT appear (already complete)
- Assert create-profile form is collapsed (profiles exist → toggle hidden by default)
- Assert both Jordan and Alex appear in the profile list
- Assert Jordan's card shows the pinned indicator

### 2. Profile page — DNA bar + kink list
- Navigate to `/profile/jordan_test_001`
- Assert the Kink-DNA bar renders with 5 coloured segments
- Assert the legend row is present below the bar (`✓ Ja · ↗ Graag · ♡ Misschien · ✕ Nee · ✕✕ Grens`)
- Assert `breath_play` entry shows `hard_no` styling (red, visually distinct from `no` amber)
- Assert the profile tour does NOT fire (already complete)

### 3. Contract history — 5 entries
- Navigate to the contract history section (home page or dedicated route)
- Assert exactly 5 contracts are listed
- Assert entries span recognisably different dates (not all the same day)
- Assert compatibility scores trend upward across the 5 snapshots (matchCount: 3 → 4 → 5 → 6 → 7)

### 4. Timeline SVG — 5 data points
- Open the compare page: `/compare?a=jordan_test_001&b=alex_test_001` (or navigate via UI)
- Assert the compatibility timeline SVG renders
- Assert the SVG contains exactly 5 data points (circles or path segments)
- Use: `page.locator('svg [data-point], svg circle').count()` — assert count === 5

### 5. Generate a new contract → bump to 6
- Trigger the "Teken het contract" action from the compare page
- Complete the contract flow (fill required fields, submit)
- Navigate back to contract history
- Assert 6 contracts are now listed
- Return to compare page and assert the timeline SVG now shows 6 data points

### 6. Tour restart from Settings
- Open the settings sheet from the home page
- Locate the "Herstart tour" option
- Activate it
- Assert `profileTourComplete` is reset (navigate to `/profile/jordan_test_001` and assert the profile tour overlay appears again)
- Dismiss the tour
- Assert tour is marked complete again

### 7. Settings sheet drag-to-dismiss
- Open the settings sheet
- Simulate a downward drag of >80px using Playwright touch events
- Assert the sheet closes

## Assertions to run
Load `.claude/routines/shared/assertions.md` and run the full global checklist on every page visited.

## Output
Report using the JSON format from `assertions.md` with `"persona": "Jordan"`.
