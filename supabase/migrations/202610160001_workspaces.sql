-- Apply as the Supabase postgres migration role, not from a browser.
begin;
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
commit;
