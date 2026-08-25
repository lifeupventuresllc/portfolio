-- 033: Fixes from a blind adversarial review of the Next Action engine
-- (032_next_action_engine.sql), 2026-08-25. 032 is already live, so fixes
-- land as their own migration rather than editing an applied one.
--
-- Backstop for the GET race condition (route.ts's check-then-insert can let
-- two concurrent requests both miss the "already open" check): a partial
-- unique index makes "at most one unresolved row per enrollment" a real DB
-- guarantee, not just an application-level assumption. The application code
-- (lib/next-action/index.ts) now catches the resulting unique-violation and
-- returns the row the other request just inserted, instead of erroring.
create unique index if not exists idx_next_action_log_one_open_per_enrollment
  on next_action_log (enrollment_id)
  where completed_at is null and skipped_at is null and superseded_at is null;
