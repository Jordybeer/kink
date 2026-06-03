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

**Complete this step before writing the Telegram message.**

Use `GITHUB_TOKEN` with the REST API — no MCP connector is required:
```bash
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/Jordybeer/kink/issues?state=open&per_page=100"
```
- Extract titles and bodies into a lookup set
- For each finding in today's reports:
  - If a similar issue already exists: mark it `already_tracked:#N` — **do not include it in the 🐛 issues section of the Telegram summary**
  - If no similar issue exists: mark it `new_finding` — include in 🐛 section and eligible for Step 7

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

Always send, even on fully clean runs.

**Use `parse_mode: HTML`** — not Markdown. Underscores in identifiers like `last_state` break Telegram's Markdown v1 parser.

### Message structure — strict order, do not reorder sections

```html
🧪 <b>KinkSync Sim — {YYYY-MM-DD}</b>
<b>{X}/3 passed</b> · {total_pass}/{total_assertions} checks

{✅|⚠️|❌} <b>Robin</b> · session {N}
<i>{story — exactly 2 sentences, no dashes}</i>
{if milestone}🎯 {label}
{if regression}🚨 Regression: {assertion}

{✅|⚠️|❌} <b>Leo</b> · session {N}
<i>{story — exactly 2 sentences, no dashes}</i>
{if milestone}🎯 {label}
{if regression}🚨 Regression: {assertion}

{✅|⚠️|❌} <b>Iris</b> · session {N}
<i>{story — exactly 2 sentences, no dashes}</i>
{if milestone}🎯 {label}
{if regression}🚨 Regression: {assertion}

{ONLY if new_finding issues exist — omit section entirely if all issues are already_tracked}
🐛 <b>Issues ({N} unique):</b>
1. {description} — {personas} — {route}
2. ...

{ONLY if new_finding suggestions exist from Step 2}
💡 <b>{N} new suggestion(s)</b> → #{issue_number}

{ONLY if zero new_finding issues AND zero new suggestions}
✨ All clean
```

### Deduplication rules — mandatory

Build a deduplicated issue set BEFORE writing the message:
- One numbered line per distinct failure class — never per persona
- If 2 personas hit the same root cause: `"leo, iris"` on that one line
- If all 3 hit it: `"all personas"` — never list the same bug three times
- Same issue on every page → `"all pages"` not a per-route list
- Already-tracked issues (Step 2 `already_tracked:#N`) are omitted from the 🐛 section entirely
- Order: regressions first, then new failures

### Story rules — mandatory

- Exactly 2 sentences. Never 3. Cut to the 2 most significant events.
- Past tense, third person ("Robin opened…").
- Name specific routes, actions, or failures — no vague summaries.
- No dashes of any kind (em-dash, en-dash, hyphen used as pause).

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

Always send this message — even on clean runs.

If there are no failures, send exactly:
```html
<pre><code>No fixes needed from {date}. All assertions passed.</code></pre>
```

If there are failures, send a token-optimised Claude Code prompt the developer can copy-paste directly. Format — just the prompt in a code block, nothing else:
```html
<pre><code>{prompt}</code></pre>
```

Prompt body rules:
- Plain text only (no HTML inside the `<pre>` block)
- First line: `Fix these sim findings from {date}. Work on the redesign branch.`
- One numbered item per distinct issue class — deduplicate across personas
- Each item: one-line description → `file/path:line` reference → fix in ≤2 sentences
- No preamble, no sign-off, no labels like "Bug:" or "Suggestion:"
- Build from `observations.fail` and `recommendations` across all three persona reports plus any regression findings
- Omit issues already tracked in GitHub (already_tracked:#N) unless they are regressions

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
