-- DreamFund refund processing scheduler
--
-- Runs five minutes after the settlement processor.
--
-- Prerequisite:
-- Supabase Vault must contain a secret named:
--   dreamfund_cron_secret
--
-- The actual secret value must never be committed to Git.

create extension if not exists pg_net
with schema extensions;

do $$
declare
  v_job record;
begin
  -- Prevent duplicate schedules when this migration is reapplied
  -- or when the job was previously created from the Dashboard.
  for v_job in
    select jobid
    from cron.job
    where jobname = 'process-project-refunds'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;

  perform cron.schedule(
    'process-project-refunds',
    '10,25,40,55 * * * *',
    $cron$
    select net.http_post(
      url := 'https://dreamfund.jp/api/cron/process-refunds',
      headers := jsonb_build_object(
        'Content-Type',
        'application/json',
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'dreamfund_cron_secret'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    ) as request_id;
    $cron$
  );
end;
$$;