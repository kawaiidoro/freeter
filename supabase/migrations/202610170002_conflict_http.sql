-- Existing installations: replace the retry-triggering conflict SQLSTATE only.
-- Run as postgres in SQL Editor with Freeter tabs closed. Preserves records,
-- function privileges, search_path and any installed owner-account gate.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
do $repair$
declare
  target regprocedure := to_regprocedure('public.freeter_save_workspace(jsonb,bigint,bigint,boolean)');
  definition text;
begin
  if target is null then
    raise exception 'Freeter save function is missing. Apply setup-owner.sql first.';
  end if;
  definition := pg_get_functiondef(target);
  if position('FREETER_CONFLICT' in definition) = 0 then
    raise exception 'Unrecognized Freeter save function. Review it before repair.';
  end if;
  if position('''40001''' in definition) > 0 then
    execute replace(definition, '''40001''', '''PT409''');
  elsif position('''PT409''' in definition) = 0 then
    raise exception 'Unrecognized Freeter conflict code. Review it before repair.';
  end if;
end;
$repair$;
commit;
-- Existing looping requests can outlive this definition change. After success,
-- restart the project once to clear them, then reopen Freeter with the new build.
