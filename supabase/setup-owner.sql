-- Freeter single-owner setup. Run as postgres in the Supabase SQL Editor.
-- Preserves workspace rows and revisions. Does not print or embed private keys.
begin;
-- Apply as the Supabase postgres migration role, not from a browser.
-- Owner deployments use supabase/setup-owner.sql, including the later migration.

create table if not exists public.freeter_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  generation bigint not null default 1 check (generation > 0),
  updated_at timestamptz not null default now(),
  constraint freeter_workspace_shape check (
    coalesce(jsonb_typeof(data) = 'object' and data->>'version' = '3'
      and jsonb_typeof(data->'records') = 'array'
      and jsonb_typeof(data->'schedule') = 'object'
      and jsonb_typeof(data->'settings') = 'object'
      and jsonb_typeof(data->'workplaces') = 'array'
      and jsonb_typeof(data->'workMemo') = 'string', false)
  ),
  constraint freeter_workspace_size check (octet_length(data::text) <= 2097152)
);
alter table public.freeter_workspaces enable row level security;
alter table public.freeter_workspaces force row level security;
revoke all on public.freeter_workspaces from public, anon, authenticated;
grant select on public.freeter_workspaces to authenticated;
drop policy if exists freeter_read_own on public.freeter_workspaces;
create policy freeter_read_own on public.freeter_workspaces for select to authenticated
  using ((select auth.uid()) = user_id);

-- All writes use a fixed, authenticated owner and compare-and-swap revision.
-- No user_id argument, dynamic SQL or caller-controlled search_path.
create or replace function public.freeter_save_workspace(
  p_data jsonb,
  p_expected_revision bigint,
  p_expected_generation bigint,
  p_reset boolean default false
) returns table(revision bigint, generation bigint, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  saved public.freeter_workspaces%rowtype;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  -- Reapplying this base migration must not remove an installed owner gate.
  if to_regprocedure('private.freeter_account_allowed()') is not null then
    if not private.freeter_account_allowed() then raise exception 'FREETER_ACCOUNT_NOT_ALLOWED' using errcode = '42501'; end if;
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_generation is null or p_expected_generation < 1 or p_reset is null then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  if p_expected_revision = 0 and p_expected_generation = 1 then
    insert into public.freeter_workspaces (user_id, data) values (actor, p_data)
      on conflict (user_id) do nothing returning * into saved;
  else
    update public.freeter_workspaces as w set data = p_data, revision = w.revision + 1,
      generation = w.generation + case when p_reset then 1 else 0 end, updated_at = clock_timestamp()
      where w.user_id = actor and w.revision = p_expected_revision and w.generation = p_expected_generation
      returning w.* into saved;
  end if;
  if saved.user_id is null then raise exception 'FREETER_CONFLICT' using errcode = '40001'; end if;
  return query select saved.revision, saved.generation, saved.updated_at;
end;
$$;
revoke all on function public.freeter_save_workspace(jsonb,bigint,bigint,boolean) from public, anon;
grant execute on function public.freeter_save_workspace(jsonb,bigint,bigint,boolean) to authenticated;

-- One verified Google account. Apply as postgres, never from the browser.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, supabase_auth_admin;
create table if not exists private.freeter_access_config (
  singleton boolean primary key default true check(singleton),
  owner_email_hash text not null check(owner_email_hash ~ '^[a-f0-9]{64}$')
);
revoke all on private.freeter_access_config from public, anon, authenticated;
grant select on private.freeter_access_config to supabase_auth_admin;

-- Auth records are authoritative. user_metadata and caller-supplied email are ignored.
create or replace function private.freeter_account_allowed()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u cross join private.freeter_access_config c
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
      and encode(sha256(convert_to(lower(btrim(u.email)), 'UTF8')), 'hex') = c.owner_email_hash
      and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')
  );
$$;
revoke all on function private.freeter_account_allowed() from public, anon;
grant execute on function private.freeter_account_allowed() to authenticated;

-- Restrictive policies also constrain any existing permissive policy.
drop policy if exists freeter_owner_gate on public.freeter_workspaces;
create policy freeter_owner_gate on public.freeter_workspaces as restrictive
  for all to authenticated
  using ((select private.freeter_account_allowed()))
  with check ((select private.freeter_account_allowed()));

-- Auth hooks must also be enabled in Authentication → Hooks.
-- Deny both first-time signups and tokens for users that already existed.
create or replace function public.freeter_before_user_created(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not exists (
    select 1 from private.freeter_access_config c
    where encode(sha256(convert_to(lower(btrim(event->'user'->>'email')), 'UTF8')), 'hex')=c.owner_email_hash
      and event->'user'->'app_metadata'->>'provider'='google'
  ) then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','This Google account is not allowed to access Freeter.'));
  end if;
  return '{}'::jsonb;
end;
$$;
create or replace function public.freeter_custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
begin
  if not exists (
    select 1 from auth.users u cross join private.freeter_access_config c
    where u.id=(event->>'user_id')::uuid and u.email_confirmed_at is not null
      and encode(sha256(convert_to(lower(btrim(u.email)), 'UTF8')), 'hex')=c.owner_email_hash
      and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')
  ) then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','This Google account is not allowed to access Freeter.'));
  end if;
  return jsonb_build_object('claims',event->'claims');
end;
$$;
revoke all on function public.freeter_before_user_created(jsonb) from public, anon, authenticated;
revoke all on function public.freeter_custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.freeter_before_user_created(jsonb) to supabase_auth_admin;
grant execute on function public.freeter_custom_access_token_hook(jsonb) to supabase_auth_admin;

create or replace function public.freeter_save_workspace(
  p_data jsonb,
  p_expected_revision bigint,
  p_expected_generation bigint,
  p_reset boolean default false
) returns table(revision bigint, generation bigint, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  saved public.freeter_workspaces%rowtype;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not private.freeter_account_allowed() then raise exception 'FREETER_ACCOUNT_NOT_ALLOWED' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_generation is null or p_expected_generation < 1 or p_reset is null then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  if p_expected_revision = 0 and p_expected_generation = 1 then
    insert into public.freeter_workspaces (user_id, data) values (actor, p_data)
      on conflict (user_id) do nothing returning * into saved;
  else
    update public.freeter_workspaces as w set data = p_data, revision = w.revision + 1,
      generation = w.generation + case when p_reset then 1 else 0 end, updated_at = clock_timestamp()
      where w.user_id = actor and w.revision = p_expected_revision and w.generation = p_expected_generation
      returning w.* into saved;
  end if;
  if saved.user_id is null then raise exception 'FREETER_CONFLICT' using errcode = '40001'; end if;
  return query select saved.revision, saved.generation, saved.updated_at;
end;
$$;
revoke all on function public.freeter_save_workspace(jsonb,bigint,bigint,boolean) from public, anon;
grant execute on function public.freeter_save_workspace(jsonb,bigint,bigint,boolean) to authenticated;

insert into private.freeter_access_config(singleton,owner_email_hash) values(true,'ef27bc8bb6355e66375322949c4d1b92ff3a29fac3446bd764c0f1782ab74b7f')
on conflict(singleton) do update set owner_email_hash=excluded.owner_email_hash;
commit;
