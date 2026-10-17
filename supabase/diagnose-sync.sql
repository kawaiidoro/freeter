-- Read-only, one result. No record bodies, emails or client SQL text.
select jsonb_build_object(
  'checkedAt',current_timestamp,
  'workspace',jsonb_build_object(
    'tableExists',to_regclass('public.freeter_workspaces') is not null,
    'saveRpcExists',to_regprocedure('public.freeter_save_workspace(jsonb,bigint,bigint,boolean)') is not null,
    'conflictUsesRetryCode',coalesce(position('''40001''' in pg_get_functiondef(to_regprocedure('public.freeter_save_workspace(jsonb,bigint,bigint,boolean)')))>0,false),
    'conflictUsesHttp409',coalesce(position('''PT409''' in pg_get_functiondef(to_regprocedure('public.freeter_save_workspace(jsonb,bigint,bigint,boolean)')))>0,false),
    'dbMaxConnections',current_setting('max_connections')::integer),
  'roleLimits',(select coalesce(jsonb_agg(x),'[]') from (
    select rolname,rolconnlimit from pg_roles where rolname in ('authenticator','authenticated','postgres')
  ) x),
  'connections',(select coalesce(jsonb_agg(x),'[]') from (
    select application_name,usename,state,wait_event_type,wait_event,count(*)::integer as connections,
      max(clock_timestamp()-xact_start) as oldest_transaction,max(clock_timestamp()-state_change) as longest_state
    from pg_stat_activity where backend_type='client backend'
    group by application_name,usename,state,wait_event_type,wait_event order by connections desc
  ) x),
  'blockedOrIdleTransactions',(select coalesce(jsonb_agg(x),'[]') from (
    select pid,pg_blocking_pids(pid) as blocking_pids,application_name,state,wait_event_type,wait_event,
      clock_timestamp()-xact_start as transaction_age
    from pg_stat_activity where backend_type='client backend'
      and (cardinality(pg_blocking_pids(pid))>0 or state='idle in transaction') order by xact_start nulls last
  ) x),
  'rls',(select to_jsonb(x) from (
    select relrowsecurity,relforcerowsecurity from pg_class where oid=to_regclass('public.freeter_workspaces')
  ) x),
  'policies',(select coalesce(jsonb_agg(x),'[]') from (
    select policyname,permissive,roles,cmd from pg_policies where schemaname='public' and tablename='freeter_workspaces'
  ) x),
  'ownerHooks',(select coalesce(jsonb_agg(routine_name),'[]') from information_schema.routines
    where routine_schema='public' and routine_name in ('freeter_before_user_created','freeter_custom_access_token_hook'))
) as diagnosis;
