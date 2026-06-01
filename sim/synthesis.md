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

**Use `parse_mode: HTML`** — not Markdown. Underscores in identifiers like
`last_state` break Telegram's Markdown v1 parser.

```html
🧪 <b>KinkSync Sim — {YYYY-MM-DD}</b>

{for each persona: robin, leo, iris}
{✅|⚠️|❌} <b>{Name}</b> (session {N}) — {pass}/{total} passed
<i>{session story — 2–3 sentences from observations.story}</i>
{if milestone hit}  🎯 {milestone label}
{if new route discovered}  🗺 First visit to {route}
{if regression}  🚨 Regression: {assertion}
{/for}

🐛 <b>Issues this run:</b>
{• one line per unique failure group, deduplicated across all personas:
• Hydration: data-theme + BottomNav absent on first paint — all pages, all N personas
• Import: backup restore rejects profiles already in last_state — cross-persona blocked
• Touch targets: {element} {X}px, ... (below 44px minimum)
• {route}: {specific issue — e.g. missing h1, horizontal scroll}
...
omit if no failures}

{if new suggestions exist}
💡 {N} new suggestion(s) → #{issue_number}
{/if}

{if all clean and no suggestions}
✨ All clean
{/if}
```

Rules:
- Each persona block leads with the human story, not the numbers
- The `🐛 Issues` section groups and deduplicates failures from all three personas —
  don't repeat the same failure three times; say "all 3 personas" instead
- Failures that are identical across all pages and personas belong in one bullet, not six

Send via Python (curl cannot reliably handle special characters):
```python
import urllib.request, json
payload = json.dumps({
    "chat_id": TELEGRAM_CHAT_ID,
    "parse_mode": "HTML",
    "text": message
}).encode()
req = urllib.request.Request(
    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
urllib.request.urlopen(req)
```

---

## Step 5 — Send key screenshot per persona (sendPhoto)

For each persona, pick the single most interesting screenshot from today:
- **Priority 1**: any page where a failure was detected
- **Priority 2**: first visit to a route not in `featuresDiscovered` before today
- **Priority 3**: final state of the session

**Supabase Storage requires auth headers** — Telegram cannot fetch the URL
directly. Download each image first, then upload as multipart:

```python
import urllib.request, json, time

def download_screenshot(persona, filename):
    url = f"{SUPABASE_URL}/storage/v1/object/sim-screenshots/{persona}/{filename}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    })
    with urllib.request.urlopen(req) as r:
        return r.read()

def send_photo(chat_id, image_bytes, filename, caption):
    boundary = "----KinkSimBoundary"
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{chat_id}\r\n"
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"caption\"\r\n\r\n{caption}\r\n"
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"{filename}\"\r\n"
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + image_bytes + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    urllib.request.urlopen(req)

# caption format: "{Name} — session {N}, {route}"
```

Send one photo per persona, then sleep 0.4s between each to avoid rate limits.

---

## Step 5b — Send fixup prompt (always, after photos)

After the three persona photos, send one final message: a token-optimised
Claude Code prompt the developer can copy-paste directly to fix every issue
found this run.

Format — just the prompt in a code block, nothing else:
```html
<pre><code>{prompt}</code></pre>
```

The prompt body must be:
- Plain text only (no HTML inside the `<pre>` block)
- One numbered item per distinct issue class (not per persona — deduplicate)
- Each item: one-line description, then `file/path:line` reference, then the
  exact fix in ≤2 sentences
- First line: `Fix these sim findings from {date}. Work on the redesign branch.`
- No other preamble, no sign-off, no labels like "Bug:" or "Suggestion:"
- Token-efficient: assume the reader knows the codebase

Build the prompt from `observations.fail` and `recommendations` across all
three persona reports, plus any regression findings. Group identical failures
(e.g. the same assertion failing on all three personas) into one item.

Example item format:
```
3. Touch targets below 44px — multiple files
   Settings gear (app/page.tsx:237): 26px. Profile pin/edit: 36px. Back
   buttons: 36px. Session back: 20px. Add min-h-[44px] to each.
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
