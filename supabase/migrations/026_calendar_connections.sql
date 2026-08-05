-- Layer 1 Phase 2: calendar signal. A separate, dedicated Google OAuth
-- client (NOT the Supabase login provider) — this never touches her auth
-- session, purely an opt-in calendar read. Service-role only, same lockdown
-- pattern as push_subscriptions.
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id)
);

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service manages calendar connections" ON calendar_connections;
CREATE POLICY "service manages calendar connections" ON calendar_connections FOR ALL USING (true) WITH CHECK (true);
