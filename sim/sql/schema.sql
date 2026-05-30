-- KinkSync Sim — Supabase schema
-- Run once in a dedicated Supabase project (separate from any app backend)
-- All data here is synthetic. No real user data ever enters this schema.

-- Persona state (replaces persona JSON files for live state)
create table sim_personas (
  id                   text primary key,
  name                 text not null,
  role                 text not null,
  experience_level     text not null,
  session_count        int default 0,
  last_active          timestamptz,
  traits               jsonb not null default '{"curiosity": 2, "trust": 3, "impulsivity": 1, "thoroughness": 8}',
  features_discovered  jsonb default '[]',
  kinks_filled_count   int default 0,
  contracts_generated  int default 0,
  onboarding_complete  bool default false,
  profile_tour_complete bool default false,
  partners             jsonb default '[]',
  last_state           jsonb,
  notes                text
);

-- Per-run reports (one row per persona per day, plus one 'synthesis' row)
create table sim_reports (
  id                   uuid primary key default gen_random_uuid(),
  date                 date not null,
  persona              text not null,        -- 'robin' | 'leo' | 'iris' | 'synthesis'
  session_number       int,
  pass_count           int,
  fail_count           int,
  pages_visited        jsonb,
  observations         jsonb,
  recommendations      jsonb,
  screenshot_urls      jsonb,                -- array of Supabase Storage URLs
  traits_before        jsonb,
  traits_after         jsonb,
  milestones           jsonb,
  regression_detected  bool default false,
  created_at           timestamptz default now()
);

-- Indexes for synthesis queries
create index sim_reports_date_idx    on sim_reports(date desc);
create index sim_reports_persona_idx on sim_reports(persona);
create index sim_reports_regression  on sim_reports(regression_detected) where regression_detected = true;

-- Storage bucket
-- Run this separately in the Supabase dashboard SQL editor,
-- or via the Storage section in the dashboard UI:
--
-- insert into storage.buckets (id, name, public)
-- values ('sim-screenshots', 'sim-screenshots', false);
--
-- Keep the bucket PRIVATE. The service role key bypasses RLS and
-- is used only by the routine. URLs in sim_reports are signed URLs,
-- not public URLs.
