# KinkSync Nightly Sim — Routine Prompt
# Schedule: 06:00 CEST (04:00 UTC) daily
# Branch: sim
# Paste this entire file as the routine instruction body in Claude Code

---

## Before starting

IMPORTANT: Work on the sim branch. Run `git checkout sim && git pull origin sim` before reading any files.

Read these files from the repo:
- `sim/engine.md`
- `sim/synthesis.md`
- `.claude/routines/shared/app-context.md` (if it exists)
- `.claude/routines/shared/boot.md` (if it exists)
- `.claude/routines/shared/assertions.md` (if it exists)

## Required environment variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (service role key — never the anon key)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `GITHUB_TOKEN` (read scope is sufficient)

---

## ⚠️ Context window guard

Before starting **each step** (3a through 3i for every persona, and Step 4), check your context window usage.

If usage exceeds **90%**:
1. Immediately stop — do not begin the next step.
2. Send this Telegram message:
```bash
curl -s -X POST \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id="$TELEGRAM_CHAT_ID" \
  -d parse_mode="Markdown" \
  -d text="⚠️ *KinkSync Sim $(date +%Y-%m-%d)* — context window limit (>90%) hit before {next_step}.\nCompleted: {comma-separated list of what finished}.\nSkipped: {comma-separated list of what was not reached}."
```
3. Exit cleanly. Do not attempt the remaining steps.

This guard fires **before each step**, not after. At 90% there is still enough runway to compose and send the message.

---

## Step 1 — Fetch all persona states from Supabase

```bash
curl -s "$SUPABASE_URL/rest/v1/sim_personas?select=*" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

Parse the JSON response. You now have the current traits, session counts,
features discovered, and last localStorage state for each persona.

---

## Step 2 — Boot the dev server

Install dependencies and start the Next.js dev server:
```bash
npm install
npm run dev &
```

Poll until ready (max 30 seconds):
```bash
for i in $(seq 1 30); do
  curl -s http://localhost:3000 > /dev/null && echo 'ready' && break
  sleep 1
done
```

If not ready after 30 seconds, send Telegram abort message and stop:
```bash
curl -s -X POST \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id="$TELEGRAM_CHAT_ID" \
  -d text="🔴 KinkSync Sim $(date +%Y-%m-%d) — dev server failed to start. Run aborted."
```

---

## Step 3 — Run each persona

For each persona in this order: **robin**, **leo**, **iris**

### 3a. Derive session behaviour
Read engine.md. Using the persona's current trait values, compose the
session plan: which routes to visit, how to interact, what to fill in,
whether to import/compare/contract/sign. Check interaction eligibility
per the Persona Interactions section of engine.md.

### 3b. Seed localStorage
Using Playwright, before navigation:
```javascript
await context.addInitScript((state) => {
  if (state) {
    Object.entries(state).forEach(([k, v]) => localStorage.setItem(k, v));
  }
}, persona.last_state || {});
```

### 3c. Set viewport
- robin: 390px mobile (iPhone 14)
- leo: 390px mobile (iPhone 14)
- iris: 1280px desktop

### 3d. Execute session
Follow the derived behaviour plan. Use Playwright to navigate and interact.

Take a screenshot at each of these moments:
1. First page load
2. First meaningful interaction (first tap/click)
3. Any failure, error, or unexpected empty state
4. First visit to any route not in `featuresDiscovered`
5. Any interaction cross-over moment (import, compare, contract with another persona's data)
6. Final state at session end

Name screenshots: `{persona_id}/{YYYY-MM-DD}_{step:02d}_{route_slug}.png`

### 3e. Upload screenshots to Supabase Storage
For each screenshot file:
```bash
curl -s -X POST \
  "$SUPABASE_URL/storage/v1/object/sim-screenshots/{persona_id}/{filename}" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: image/png" \
  --data-binary @{filename}
```

Capture the returned URL for use in the report.

### 3f. Write report to Supabase
```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/sim_reports" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "{today}",
    "persona": "{persona_id}",
    "session_number": {session_count + 1},
    "pass_count": {N},
    "fail_count": {N},
    "pages_visited": [...],
    "observations": [...],
    "recommendations": [...],
    "screenshot_urls": [...],
    "traits_before": {...},
    "traits_after": {...},
    "milestones": [...]
  }'
```

### 3g. Update persona state in Supabase
```bash
curl -s -X PATCH \
  "$SUPABASE_URL/rest/v1/sim_personas?id=eq.{persona_id}" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "session_count": {new_count},
    "last_active": "{now}",
    "traits": {...updated_traits...},
    "features_discovered": [...updated_list...],
    "last_state": {...current_localStorage_snapshot...},
    "notes": "Session {N}: {one-line narrative of what happened}"
  }'
```

### 3h. Send per-persona heartbeat to Telegram
After 3g completes successfully for this persona, immediately send:
```bash
curl -s -X POST \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id="$TELEGRAM_CHAT_ID" \
  -d parse_mode="Markdown" \
  -d text="{emoji} *{Name}* done (session {N}) — {pass}/{total} passed{milestone_line}"
```

Where:
- emoji: ✅ if fail_count === 0, ⚠️ if fail_count > 0 but session completed, ❌ if session failed entirely
- milestone_line: if a milestone was hit this session, append `\n🎯 {milestone label}` — otherwise omit

This heartbeat fires before moving to the next persona. If the token window
dies after this point, you still know exactly what ran.

### 3i. If a persona run fails entirely
Send heartbeat with ❌ emoji and reason. Note it as incomplete.
Continue to the next persona. Do not abort the entire run.

---

## Step 4 — Run synthesis

Follow `sim/synthesis.md` exactly, in order from Step 1 through Step 9.

---

## Notes
- The repo is read-only. Do not commit or push anything.
- All state lives in Supabase. The repo provides instructions only.
- Priority order if window is tight: 3g (persona update) → 3h (heartbeat) → next persona → synthesis last.
