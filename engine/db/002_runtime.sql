-- Pith M shared engine: tables and columns that the runtime (engine/runtime) needs. Postgres 16.
-- Additive. Apply after 001_core.sql. You can apply this file 2 times; the second time changes nothing.

set search_path = engine, public;

-- The runner keeps the state of each step (status, attempts, waits, outputs) in 1 JSON document.
-- step_runs stays the queryable copy: 1 row for each attempt that ended.
alter table runs add column if not exists state jsonb not null default '{}';        -- { steps, history, trigger_event }
alter table runs add column if not exists error text;
alter table runs add column if not exists parent_step_id text;                      -- the subflow step in the parent run
alter table runs add column if not exists next_wake_at timestamptz;                 -- earliest wait, retry or timeout
alter table runs add column if not exists waiting_events text[] not null default '{}';
alter table runs add column if not exists step_rows int not null default 0;         -- how many history rows are in step_runs
create index if not exists runs_due on runs(next_wake_at) where next_wake_at is not null;
create index if not exists runs_waiting on runs using gin(waiting_events) where status in ('running','waiting_approval','waiting_event');
create index if not exists runs_by_client on runs(client_id, started_at desc);
create index if not exists step_runs_by_run on step_runs(run_id);

-- The SLA reminder (engine/approval.overdue) is sent 1 time for each approval.
alter table approvals add column if not exists overdue_sent boolean not null default false;
create index if not exists approvals_by_run on approvals(run_id);

-- Events of the engine itself and of the services (engine/* and svc.*). Append-only.
-- The table 'events' in 001_core.sql is a different thing: behaviour of contacts on web, app and CRM.
create table if not exists engine_events (
  id         uuid primary key default gen_random_uuid(),
  seq        bigserial not null,                      -- the order in which the engine sent the events
  client_id  uuid,
  run_id     uuid,
  name       text not null,
  data       jsonb not null default '{}',
  at         timestamptz not null default now()
);
create index if not exists engine_events_by_run on engine_events(run_id, seq);
create index if not exists engine_events_by_name on engine_events(name, seq);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'engine' and tablename = 'engine_events' and policyname = 'tenant_isolation') then
    alter table engine_events enable row level security;
    create policy tenant_isolation on engine_events using (
      current_setting('app.client_ids', true) = '*'
      or client_id::text = any(string_to_array(current_setting('app.client_ids', true), ','))
    );
  end if;
end $$;
