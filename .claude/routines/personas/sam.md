# Persona: Sam
**Type:** Submissive — UX audit user A

## Identity
Sam is a 26-year-old beginner with some experience reading about BDSM but not much practice. Sam identifies as submissive. Sam is careful and reads descriptions before tapping. Sam uses an Android phone (390px).

## localStorage seed
Start with empty localStorage (no `kink-profiles` key). Sam creates their profile from scratch during the flow.

## Flow to execute

### 1. Onboarding
- Complete full onboarding tour from step 0
- Assert all 6 steps are reachable
- Assert skip button on step 0 has sufficient contrast and tap target (≥44px)

### 2. Create profile
- Name: `Sam`, role: `submissive`, experience: `beginner`
- Submit and land on `/profile/[sam_id]`
- Note the generated profile ID for use by Dana

### 3. Fill in kink entries (representative sample)
Navigate through the kink list and set the following entries:
- `bondage`: status=`yes`, desire=4
- `blindfold`: status=`yes`, desire=5
- `roleplay`: status=`willing`, desire=3
- `wax_play`: status=`maybe`, desire=2
- `impact_play`: status=`no`
- `breath_play`: status=`hard_no`
- `exhibitionism`: status=`maybe`, desire=2
- `aftercare`: status=`yes`, desire=5

### 4. Export Sam's profile
- Tap the export FAB
- Assert "Exporteer" label is visible before tapping
- Export as TXT
- Save the exported content to a temp file for Dana to import

### 5. Assert all global checks
Load `.claude/routines/shared/assertions.md` and run the full global checklist.

## Output
Report using the JSON format from `assertions.md` with `"persona": "Sam"`.
Also output: `SAM_PROFILE_ID=<the actual profile id>` on its own line for the Dana routine to consume.
