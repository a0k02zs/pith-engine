-- Pith M shared engine, contract v0.1.0. Postgres 16.
-- One database for all clients. Every row has client_id; row-level security keeps clients apart.
-- Codes (service, market, channel, basis, role, kpi) are listed in contracts/enums.json.

create extension if not exists pgcrypto;
create extension if not exists vector;

create schema if not exists engine;
set search_path = engine, public;

-- ---------------------------------------------------------------------------
-- 0. Tenancy and people
-- ---------------------------------------------------------------------------
create table clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  segment         text not null check (segment in ('b2b','b2c','both')),
  home_market     text not null,                      -- ISO 3166-1 alpha-2
  active_markets  text[] not null default '{}',       -- ISO codes the client sells in
  services        text[] not null default '{}',       -- service codes bought
  data_region     text not null default 'eu',         -- where personal data must live: eu, uk, us, sg, me, sa
  is_listed       boolean not null default false,     -- publicly traded (PR and disclosure rules)
  exchange        text,                               -- e.g. LSE, SGX, NASDAQ, TADAWUL
  created_at      timestamptz not null default now()
);

create table users (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  name        text not null,
  org         text not null check (org in ('pith','client')),
  created_at  timestamptz not null default now()
);

create table role_grants (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id),
  client_id  uuid references clients(id),             -- null = all clients (Pith staff)
  role       text not null
);
create unique index role_grants_unique on role_grants(user_id, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid), role);

-- ---------------------------------------------------------------------------
-- 1. Client brain (brand store)
-- ---------------------------------------------------------------------------
-- The full profile is one versioned JSON document (contracts/schemas/brand-profile.json).
-- Claims, banned terms and learnings are also rows so checks can query them fast.
create table brand_profiles (
  client_id   uuid not null references clients(id),
  version     int not null,
  status      text not null check (status in ('draft','approved','superseded')),
  doc         jsonb not null,
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  primary key (client_id, version)
);
create unique index brand_profiles_one_approved on brand_profiles(client_id) where status = 'approved';

create table claims (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id),
  text          text not null,
  category      text not null check (category in ('product','price','health','finance','legal','environmental','comparative','other')),
  markets       text[] not null,                     -- where the claim is approved
  evidence_url  text,
  status        text not null check (status in ('proposed','approved','retired')),
  approved_by   uuid references users(id),
  approved_at   timestamptz,
  expires_at    timestamptz
);

create table banned_terms (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients(id),            -- null = applies to all clients
  term       text not null,
  markets    text[],                                 -- null = all markets
  reason     text
);

create table brand_chunks (                          -- retrieval index over the brain
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id),
  source      text not null,                         -- 'profile', 'guideline', 'learning', 'asset'
  source_ref  text,
  locale      text,
  content     text not null,
  embedding   vector(1024),
  created_at  timestamptz not null default now()
);

create table learnings (                             -- results fed back to the brain
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id),
  service     text not null,
  market      text,
  insight     text not null,
  evidence    jsonb not null default '{}',            -- metric refs, test ids
  confidence  text not null check (confidence in ('low','medium','high')),
  run_id      uuid,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Data layer: contacts, companies, consent, parties
-- ---------------------------------------------------------------------------
create table companies (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id),
  name        text not null,
  domain      text,
  country     text,
  industry    text,
  size_band   text,
  tier        smallint check (tier between 1 and 3),   -- ABM tier
  fit_score   numeric(5,2),
  intent_score numeric(5,2),
  engagement_score numeric(5,2),
  cluster     text,
  scores_updated_at timestamptz,
  external_ids jsonb not null default '{}',          -- {"hubspot": "...", "salesforce": "..."}
  created_at  timestamptz not null default now()
);

create table contacts (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients(id),
  kind             text not null check (kind in ('b2b','b2c')),
  email            text,
  email_type       text check (email_type in ('personal','corporate','unknown')),
  phone_e164       text,
  first_name       text,
  last_name        text,
  country          text not null,                    -- ISO 3166-1 alpha-2; drives compliance
  subdivision      text,                             -- ISO 3166-2, e.g. CA-QC, US-CA
  language         text,                             -- BCP 47, e.g. en-GB, fr-CA, ar-AE
  timezone         text,
  company_id       uuid references companies(id),
  job_title        text,
  lifecycle_stage  text,
  source           text not null,                    -- form, import, crm_sync, apollo, event, ...
  source_is_third_party boolean not null default false,
  art14_notice_sent_at timestamptz,                   -- EU/UK: notice when data came from a third party
  gpc_opt_out      boolean not null default false,
  whatsapp_window_open_until timestamptz,          -- 24 h WhatsApp service window
  push_tokens      jsonb not null default '[]',      -- [{token, platform, app_id, updated_at}]   -- US state privacy: Global Privacy Control
  dnc_checked_at   timestamptz,                      -- SG Do Not Call Registry
  dnc_listed       boolean,
  suppressed       boolean not null default false,   -- global suppression (hard bounce, complaint, erasure)
  suppression_reason text,
  external_ids     jsonb not null default '{}',
  attributes       jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  erased_at        timestamptz                        -- right to erasure: PII cleared, row kept for counts
);
create unique index contacts_email on contacts(client_id, lower(email)) where email is not null and erased_at is null;
create index contacts_country on contacts(client_id, country);

-- One row per (contact, channel, purpose). History is kept in consent_events.
create table consents (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid references contacts(id),
  party_id      uuid,                                -- partners, affiliates, creators contacted for recruitment (FK added below)
  client_id     uuid not null references clients(id),
  channel       text not null,                       -- email, sms, whatsapp, push, phone_call, direct_mail, tracking
  purpose       text not null default 'marketing',
  status        text not null check (status in ('granted','withdrawn','expired','unknown')),
  basis         text not null,                       -- see enums.consent_bases
  captured_at   timestamptz,
  expires_at    timestamptz,                         -- CASL implied consent has an end date
  source        text,                                -- form id, import batch, double opt-in id
  evidence_ref  text,                                -- link to proof: form snapshot, checkbox text, IP, timestamp
  wording       text,                                -- consent text shown to the person
  updated_at    timestamptz not null default now(),
  check (contact_id is not null or party_id is not null)
);
create unique index consents_contact on consents(contact_id, channel, purpose) where contact_id is not null;
create unique index consents_party on consents(party_id, channel, purpose) where party_id is not null;

create table consent_events (                        -- append-only audit trail
  id           bigserial primary key,
  contact_id   uuid not null references contacts(id),
  client_id    uuid not null,
  channel      text not null,
  purpose      text not null,
  status       text not null,
  basis        text not null,
  actor        text not null,                        -- 'contact', 'user:<id>', 'agent:<run>', 'system'
  evidence_ref text,
  at           timestamptz not null default now()
);

-- People who are not customer contacts: creators, talent, journalists, partners, experts.
create table parties (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id),         -- null = shared Pith directory
  kind          text not null check (kind in ('creator','talent','journalist','partner','affiliate','expert','vendor')),
  name          text not null,
  email         text,
  country       text,
  handles       jsonb not null default '{}',
  do_not_contact boolean not null default false,     -- global opt-out when client_id is null
  consent_basis text,          -- {"instagram":"@x","tiktok":"@y","linkedin":"..."}
  licences      jsonb not null default '[]',          -- [{"type":"uae_media_council","number":"...","expires_at":"..."}, {"type":"mawthooq",...}]
  attributes    jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

alter table consents add foreign key (party_id) references parties(id);

-- Likeness, voice and content-usage rights for a person (video, influencer, UGC).
create table rights_grants (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id),
  party_id      uuid references parties(id),
  contact_id    uuid references contacts(id),        -- UGC from a customer
  scope         text[] not null,                     -- likeness, voice_clone, avatar, ugc_reuse, paid_usage, whitelisting
  markets       text[] not null,
  channels      text[],
  starts_at     timestamptz not null,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  evidence_ref  text not null,                       -- signed document
  check (party_id is not null or contact_id is not null)
);

create table events (                                -- behavioural events from web, app, CRM
  id           bigserial primary key,
  client_id    uuid not null,
  contact_id   uuid,
  anonymous_id text,
  name         text not null,                        -- page_view, form_submit, cart_add, purchase, ...
  props        jsonb not null default '{}',
  occurred_at  timestamptz not null,
  received_at  timestamptz not null default now()
);
create index events_contact on events(client_id, contact_id, occurred_at);

-- ---------------------------------------------------------------------------
-- 3. Agent workflow layer
-- ---------------------------------------------------------------------------
create table workflow_definitions (
  id          text not null,                         -- e.g. 'email.monthly_calendar'
  version     int not null,
  service     text not null,
  doc         jsonb not null,                        -- contracts/schemas/workflow-definition.json
  created_at  timestamptz not null default now(),
  primary key (id, version)
);

create table runs (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id),
  workflow_id    text not null,
  workflow_version int not null,
  service        text not null,
  markets        text[] not null default '{}',
  parent_run_id  uuid references runs(id),           -- campaigns start child runs in other services
  status         text not null check (status in ('running','waiting_approval','waiting_event','succeeded','failed','cancelled')),
  input          jsonb not null default '{}',
  output         jsonb,
  started_by     text not null,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz
);

create table step_runs (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references runs(id),
  step_id      text not null,
  type         text not null,
  attempt      int not null default 1,
  status       text not null check (status in ('running','succeeded','failed','skipped','waiting')),
  input        jsonb,
  output       jsonb,
  error        text,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz
);

create table artifacts (                             -- drafts and assets produced by steps
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id),
  run_id       uuid references runs(id),
  service      text not null,
  kind         text not null,                        -- email, post, ad, script, video, page, brief, report, contract, ...
  channel      text,
  markets      text[] not null default '{}',
  locale       text,
  version      int not null default 1,
  status       text not null check (status in ('draft','in_review','approved','rejected','live','retired')),
  content      jsonb not null,                       -- structured content (subject, body, captions, ...)
  file_urls    text[] not null default '{}',
  claims_used  uuid[] not null default '{}',
  brand_score  numeric(5,2),
  compliance_check_id uuid,
  created_at   timestamptz not null default now()
);

create table agent_actions (                         -- every agent and tool action, append-only
  id           bigserial primary key,
  client_id    uuid not null,
  run_id       uuid,
  step_id      text,
  actor        text not null,                        -- 'agent:<name>', 'tool:<name>', 'user:<id>'
  action       text not null,
  target       text,
  model        text,
  input_tokens  int,
  output_tokens int,
  cost_usd     numeric(10,4),
  allowed      boolean not null,                     -- false = guardrail blocked it
  guardrail    text,
  detail       jsonb not null default '{}',
  at           timestamptz not null default now()
);

create table spend_policies (                        -- hard caps the agents cannot change
  client_id        uuid not null references clients(id),
  platform         text not null,                    -- google_ads, meta_ads, linkedin_ads, tiktok_ads, snapchat_ads, ...
  daily_cap        numeric(14,2) not null,
  total_cap        numeric(14,2),
  currency         text not null,
  max_auto_change_pct numeric(5,2) not null default 20,
  cpa_pause_pct    numeric(5,2) not null default 50, -- auto-pause when CPA is this % over target
  cpa_pause_days   int not null default 3,
  set_by           uuid not null references users(id),
  updated_at       timestamptz not null default now(),
  primary key (client_id, platform)
);

-- ---------------------------------------------------------------------------
-- 4. Approval inbox
-- ---------------------------------------------------------------------------
create table approvals (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients(id),
  run_id         uuid references runs(id),
  step_id        text,
  service        text not null,
  kind           text not null,                      -- see enums.approval_kinds
  title          text not null,
  summary        text,
  artifact_ids   uuid[] not null default '{}',
  payload        jsonb not null default '{}',         -- kind-specific: budget numbers, contract terms, ...
  brand_score    numeric(5,2),
  compliance_check_id uuid,
  required_roles text[] not null,                    -- any one of these roles can decide
  required_count int not null default 1,             -- e.g. 2 = strategist AND client
  assignee_ids   uuid[] not null default '{}',
  priority       text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  sla_due_at     timestamptz not null,
  status         text not null check (status in ('open','approved','rejected','changes_requested','expired','cancelled')),
  created_at     timestamptz not null default now(),
  closed_at      timestamptz
);
create index approvals_open on approvals(client_id, status, sla_due_at);

create table approval_decisions (
  id           uuid primary key default gen_random_uuid(),
  approval_id  uuid not null references approvals(id),
  decided_by   uuid not null references users(id),
  role         text not null,
  decision     text not null check (decision in ('approved','rejected','changes_requested')),
  comment      text,
  edits        jsonb,                                -- inline edits to the artifact
  at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. Compliance gate
-- ---------------------------------------------------------------------------
create table compliance_checks (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id),
  run_id        uuid,
  artifact_id   uuid,
  channel       text not null,
  markets       text[] not null,
  rules_version text not null,
  outcome       text not null check (outcome in ('pass','warn','block')),
  findings      jsonb not null default '[]',          -- [{rule_id, severity, market, message, fix}]
  overridden_by uuid references users(id),            -- only 'warn' can be overridden, never 'block'
  checked_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. Measurement
-- ---------------------------------------------------------------------------
create table outbound_events (                       -- what we sent or posted, and what happened
  id           bigserial primary key,
  client_id    uuid not null,
  service      text not null,
  channel      text not null,
  type         text not null,                        -- see enums.outbound_event_types
  contact_id   uuid,
  artifact_id  uuid,
  run_id       uuid,
  campaign_id  text,
  flow_id      text,
  variant_id   text,
  market       text,
  platform     text,
  value        numeric(14,4),
  currency     text,
  props        jsonb not null default '{}',
  occurred_at  timestamptz not null
);
create index outbound_events_campaign on outbound_events(client_id, campaign_id, occurred_at);

create table metrics_daily (                         -- one KPI value per day and dimension set
  client_id    uuid not null,
  date         date not null,
  service      text not null,
  kpi          text not null,                        -- see enums.kpis
  market       text not null default '*',
  channel      text not null default '*',
  campaign_id  text not null default '*',
  value        numeric(18,6) not null,
  currency     text,
  source       text not null,                        -- ga4, meta_ads, crm, engine, model
  primary key (client_id, date, service, kpi, market, channel, campaign_id)
);

create table touchpoints (                           -- attribution input
  id           bigserial primary key,
  client_id    uuid not null,
  contact_id   uuid,
  anonymous_id text,
  service      text not null,
  channel      text not null,
  campaign_id  text,
  utm          jsonb not null default '{}',
  occurred_at  timestamptz not null
);

create table conversions (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null,
  contact_id   uuid,
  anonymous_id text,
  kind         text not null,                        -- purchase, lead, mql, sql, opportunity, closed_won
  value        numeric(14,2),
  currency     text,
  occurred_at  timestamptz not null
);

create table attributions (
  conversion_id uuid not null references conversions(id),
  touchpoint_id bigint not null references touchpoints(id),
  model        text not null,                        -- see enums.attribution_models: last_touch, last_non_direct, first_touch, linear, time_decay, position_based, b2b_account, data_driven
  credit       numeric(6,5) not null,
  primary key (conversion_id, touchpoint_id, model)
);

-- ---------------------------------------------------------------------------
-- Row-level security: a request sets app.client_ids; staff with all-client access set '*'.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['brand_profiles','claims','brand_chunks','learnings','companies','contacts','consents',
    'consent_events','rights_grants','events','runs','artifacts','agent_actions','spend_policies','approvals',
    'compliance_checks','outbound_events','metrics_daily','touchpoints','conversions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy tenant_isolation on %I using (
      current_setting('app.client_ids', true) = '*'
      or client_id::text = any(string_to_array(current_setting('app.client_ids', true), ','))
    )$p$, t);
  end loop;
end $$;
