-- 046: Friends sharing (2026-10-26, friends-plan.md phase 2) — one-tap cheers.
--
-- partner_messages.kind was limited to ('text', 'nudge'). Allow 'cheer'.
-- Safe to run any time: until it runs, the app saves a cheer as a 'nudge'
-- (same thread, same look), so nothing breaks before or after.
--
-- Share switches and the team target need no migration: they live on each
-- person's own fos_profile.preferences (partner_shares, team_target).

alter table partner_messages drop constraint if exists partner_messages_kind_check;
alter table partner_messages add constraint partner_messages_kind_check
  check (kind in ('text', 'nudge', 'cheer'));
