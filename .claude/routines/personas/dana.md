# Persona: Dana
**Type:** Dominant — UX audit user B, imports Sam's profile

## Identity
Dana is an experienced dominant (experience level: `ervaren`). Dana has used BDSM negotiation tools before and has high expectations for UX clarity. Dana is efficient — minimal taps, maximum information. Dana uses a desktop browser at 1280px.

## Prerequisites
This persona runs **after Sam**. Before starting:
1. Read the `SAM_PROFILE_ID` output from the Sam routine
2. Obtain Sam's exported TXT file from the temp location

## localStorage seed
Dana starts with empty localStorage. Dana's profile is created fresh.

## Flow to execute

### 1. Skip onboarding
- Open `http://localhost:3000`
- Assert onboarding appears
- Tap the "Overslaan" (skip) button on step 0
- Assert onboarding is dismissed immediately
- Assert the home screen is visible

### 2. Create Dana's profile
- Name: `Dana`, role: `dominant`, experience: `ervaren`
- Submit and land on `/profile/[dana_id]`

### 3. Fill in Dana's kink entries
- `bondage`: status=`yes`, desire=5
- `blindfold`: status=`yes`, desire=4
- `roleplay`: status=`yes`, desire=4
- `wax_play`: status=`no`
- `impact_play`: status=`willing`, desire=3
- `breath_play`: status=`hard_no`
- `exhibitionism`: status=`maybe`, desire=2
- `aftercare`: status=`yes`, desire=5

### 4. Import Sam's profile
- Return to `/`
- Open the import sheet ("Importeer profiel" or QR flow)
- Import Sam's exported TXT
- Assert Sam's profile appears in the profile list with `isImported: true` styling
- Assert the import sheet closes cleanly (no leftover overlay)

### 5. Compare flow
- Navigate to `/compare?a=[dana_id]&b=[sam_profile_id]` or use the UI
- Assert both profiles are selected in the profile selectors
- Assert the compare sidebar is visible on desktop (1280px)
- Assert the kink heatmap renders
- Assert `breath_play` shows as a mutual hard limit (both are `hard_no`) with distinct red styling
- Assert `bondage` shows as a match (both `yes`)
- Assert `wax_play` shows as a mismatch (Dana=`no`, Sam=`maybe`) — verify this is visually distinct from a match
- Assert the compatibility score is a number between 0–100

### 6. Contract generation
- Tap "Teken het contract" from the compare page
- Assert navigation to `/contract` with profile IDs pre-filled
- Assert the 2-column safeword/aftercare grid is `grid-cols-1` on mobile (resize to 390px and recheck) and `grid-cols-2` on desktop
- Assert the signature canvas clears correctly on HiDPI: draw a stroke, tap clear, assert the canvas is fully empty (no residual ink at any corner)
- Complete the contract and submit
- Assert a success state or redirect

### 7. Post-contract CTAs (session revealed flow)
- Navigate to `/session`
- Assert the post-reveal "Vergelijk uitgebreid →" and "Maak een contract →" links are present after a session reveal

### 8. Assert all global checks
Load `.claude/routines/shared/assertions.md` and run the full global checklist on every page visited.

## Output
Report using the JSON format from `assertions.md` with `"persona": "Dana"`.
