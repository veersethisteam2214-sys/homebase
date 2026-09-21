-- Server-only data access. Sites supplies the authenticated owner identity.
-- No publishable/anon key or ordinary Supabase user can access planner rows.
create table if not exists public.homebase_state (
 owner text primary key,
 payload jsonb not null check (jsonb_typeof(payload) = 'object'),
 revision bigint not null default 0 check (revision >= 0),
 updated_at timestamptz not null default now()
);
alter table public.homebase_state enable row level security;
revoke all on table public.homebase_state from public, anon, authenticated;
grant select, insert, update on table public.homebase_state to service_role;

create or replace function public.homebase_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
 new.updated_at = now();
 return new;
end;
$$;
revoke all on function public.homebase_updated_at() from public, anon, authenticated;
drop trigger if exists homebase_updated_at on public.homebase_state;
create trigger homebase_updated_at before update on public.homebase_state
for each row execute function public.homebase_updated_at();

create table if not exists public.homebase_bridge_keys (
 token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
 enabled boolean not null default true
);
alter table public.homebase_bridge_keys enable row level security;
revoke all on table public.homebase_bridge_keys from public, anon, authenticated;
grant select on table public.homebase_bridge_keys to service_role;
