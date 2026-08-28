# Standing test account

**Email:** `fitnesstesasaluke@gmail.com`
**Enrollment ID:** `22904113-7ee4-4edc-a4d7-37980e04e386`
**User ID:** `a756cda3-5ed1-4906-9450-d60e4c72916a`
**Name shown in-app:** "Fitness test account" (Inner Circle tier, intake completed)

This is a real, dedicated dummy account — never a real client. Asa designated it 2026-08-28 specifically so testing isn't blocked by waiting for real calendar days to pass or by "don't touch prod data" caution.

**Standing pre-authorization, scoped ONLY to this one account:**
- Direct reads AND writes against this account's own rows (e.g. `challenge_progress`, `next_action_log`, `challenge_food_log`, `challenge_enrollments`, `challenge_intake`) via service-role scripts are pre-approved for test setup/reset — no need to ask permission first, e.g. resetting today's workout-done flag, backdating a row, seeding food log entries, clearing streaks, etc.
- "Test it in the test account" (from any chat, any session) means this exact account — use it, don't ask which account.
- This authorization does NOT extend to any other account, real or test-named. Every other account still needs the normal confirm-first treatment for anything destructive or data-mutating.

**This does NOT relax final verification standards** — see the `luf-feedback-ui-only-testing` memory: DB mutations here are for *setting up* a test scenario only. The actual fix still has to be verified by clicking/typing through the real rendered UI (Claude in Chrome or Asa live) before calling something fixed.
