create table sim_personas (
  id                    text primary key,
  name                  text not null,
  role                  text not null,
  experience_level      text not null,
  session_count         int default 0,
  last_active           timestamptz,
  traits                jsonb not null default '{"curiosity": 2, "trust": 3, "impulsivity": 1, "thoroughness": 8}',
  features_discovered   jsonb default '[]',
  kinks_filled_count    int default 0,
  contracts_generated   int default 0,
  onboarding_complete   bool default false,
  profile_tour_complete bool default false,
  partners              jsonb default '[]',
  last_state            jsonb,
  notes                 text
);

create table sim_reports (
  id                  uuid primary key default gen_random_uuid(),
  date                date not null,
  persona             text not null,
  session_number      int,
  pass_count          int,
  fail_count          int,
  pages_visited       jsonb,
  observations        jsonb,
  recommendations     jsonb,
  screenshot_urls     jsonb,
  traits_before       jsonb,
  traits_after        jsonb,
  milestones          jsonb,
  regression_detected bool default false,
  created_at          timestamptz default now()
);

create index sim_reports_date_idx    on sim_reports(date desc);
create index sim_reports_persona_idx on sim_reports(persona);
create index sim_reports_regression  on sim_reports(regression_detected) where regression_detected = true;

insert into storage.buckets (id, name, public)
values ('sim-screenshots', 'sim-screenshots', false);
