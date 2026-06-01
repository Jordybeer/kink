# Synthesis Routine

Runs after all persona sessions complete in the same nightly run.
Reads 14 days of reports, cross-references GitHub issues,
sends Telegram summary, opens issue if needed.

---

## Step 1 — Collect today's data and history

Fetch today's reports:
```
GET $SUPABASE_URL/rest/v1/sim_reports
  ?date=eq.{today}
  &persona=neq.synthesis
  -H apikey: $SUPABASE_SERVICE_KEY
```

Fetch 14-day history for regression comparison:
```
GET $SUPABASE_URL/rest/v1/sim_reports
  ?date=gte.{14_days_ago}
  &order=date.desc
  -H apikey: $SUPABASE_SERVICE_KEY
```

---

## Step 2 — Cross-reference open GitHub issues

Using the GitHub MCP (GITHUB_TOKEN must be set):
- Fetch all open issues on `Jordybeer/kink`
- Extract titles and bodies into a lookup list
- For each finding in today's reports:
  - If a similar issue already exists: note "already tracked in #N"
  - If not: mark as new finding eligible for a suggestions issue

---

## Step 3 — Regression detection

A regression is: a persona who **passed** an assertion in each of the last
3 sessions but **failed** it today.

- For each persona, compare today's `observations` against the previous
  3 `sim_reports` rows for that persona
- If a previously-passing assertion now fails: flag as regression
- Note the first session it passed and today's failure detail

---

## Step 4 — Build Telegram summary message

Always send this, even on fully clean runs.

```
🧪 KinkSync Sim — {YYYY-MM-DD}

{for each persona: robin, leo, iris}
{✅|⚠️|❌} *{Name}* (session {N}) — {pass}/{total} passed
_{session story — 2–3 sentences from observations.story}_
{if milestone hit}  🎯 {milestone label}
{if new route discovered}  🗺 First visit to {route}
{if failed assertions exist}  ⚠️ Failed: {top 2 fail items}
{if regression}  🚨 Regression: {assertion}
{/for}

{if new suggestions exist}
💡 {N} new suggestion(s) → #{issue_number}
{/if}

{if all clean and no suggestions}
✨ All clean
{/if}
```

Each persona block leads with the human story, not the numbers. The numbers are supporting
context, not the headline.

Send via:
```bash
curl -s -X POST \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id="$TELEGRAM_CHAT_ID" \
  -d parse_mode="Markdown" \
  -d text="{message}"
```

---

## Step 5 — Send key screenshot per persona (sendPhoto)

For each persona, pick the single most interesting screenshot from today:
- **Priority 1**: any page where a failure was detected
- **Priority 2**: first visit to a route not in `featuresDiscovered` before today
- **Priority 3**: final state of the session

Send via:
```bash
curl -s -X POST \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendPhoto" \
  -F chat_id="$TELEGRAM_CHAT_ID" \
  -F photo="{supabase_public_url}" \
  -F caption="{Name} — session {N}, {route}"
```

---

## Step 6 — Regression alert (only if regression detected)

Send a **separate** Telegram message immediately after the summary:

```
🚨 Regression detected — {YYYY-MM-DD}

{Persona} passed [{assertion}] on sessions {A}–{B}
but failed today (session {N}).

Suspect: changes since last clean run.
→ Opening GitHub issue now.
```

Then open a GitHub issue via MCP:
- **Title**: `Sim regression {date} — {persona}: {assertion}`
- **Body**: full context — last passing session number, today's failure
  detail, persona trait state, link to Supabase report row
- **Label**: `sim-regression`

---

## Step 7 — New suggestions issue (only if new untracked findings)

If any findings exist that are NOT already tracked in open GitHub issues:
- Open one GitHub issue:
  - **Title**: `Sim suggestions {date}`
  - **Body**: bulleted list of findings, each with persona name,
    session number, affected route, and recommended fix
  - **Label**: `sim-suggestion`

---

## Step 8 — Write synthesis report to Supabase

```
POST $SUPABASE_URL/rest/v1/sim_reports
{
  "date": "{today}",
  "persona": "synthesis",
  "observations": { ...all findings },
  "recommendations": { ...all suggestions },
  "regression_detected": {bool}
}
```

---

## Step 9 — Abort handling

If any persona session failed to complete entirely (server crash, Playwright
error, window exhaustion):
- Note it in the synthesis message with ⚠️
- Do not count it as a regression — mark as `incomplete`
- Still send the Telegram summary with available data
- Still write the synthesis report with `incomplete` personas noted
