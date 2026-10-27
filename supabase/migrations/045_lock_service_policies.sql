-- 2026-10-26: close the "service" policies that were open to everyone.
--
-- Migrations 017, 018, 030, 031, 032, 035, 038, 039 and 040 created policies
-- named "service ..." as `for all using (true) with check (true)` with no
-- `to service_role`. Without a role, a policy applies to PUBLIC, so anyone
-- holding the public anon key (it ships in every visitor's browser) could
-- read and write these tables — coach chat, voice transcripts, partner
-- messages, invite codes, push endpoints. Confirmed with count-only probes.
--
-- The app only ever touches these tables through the server's service-role
-- client, which bypasses RLS entirely, so these policies were never needed.
-- Recreate each one scoped to service_role. The per-user "own read/write"
-- policies stay as they are.

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and qual = 'true'
      and (with_check = 'true' or with_check is null)
      and cmd = 'ALL'
      and roles = '{public}'
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    execute format('create policy %I on %I.%I for all to service_role using (true) with check (true)', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- builder_action_tier_map / builder_tier_config also have a "read ..." policy
-- open to everyone. They're fixed config (no user data), so public read is
-- fine; nothing to change there.
