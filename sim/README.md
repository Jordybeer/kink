# KinkSync Sim

Autonomous UX simulation system for KinkSync. Synthetic personas only.

## Privacy boundary
This system has zero contact with real user data.
- End-user app: localStorage only, no network, no telemetry
- Sim layer: fake personas, fake data, dev tooling only
- Supabase project used here is separate from any future app backend

## How it works
1. Nightly routine fires at 06:00 CEST
2. Reads persona state from Supabase (`sim_personas` table)
3. Derives behaviour from traits using `engine.md`
4. Boots the Next.js dev server
5. Runs each persona through the app with Playwright
6. Uploads screenshots to Supabase Storage
7. Writes reports to Supabase (`sim_reports` table)
8. Synthesis reads 14 days of history + open GitHub issues
9. Sends Telegram summary always, regression alert when needed

## Cloud environment secrets required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` ← service role, never anon
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `GITHUB_TOKEN` ← read-only, for issue cross-reference

## Repo role
The repo is read-only from the routine's perspective.
No commits, no pushes. All live state lives in Supabase.

## Files
- `engine.md` — trait-to-behaviour rules
- `synthesis.md` — synthesis + Telegram + GitHub issue logic
- `routine-prompt.md` — paste this into the Claude Code routine UI
- `personas/` — schema reference only, not live state
- `sql/` — Supabase table definitions and seed data
