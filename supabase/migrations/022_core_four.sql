-- 022: Core Four — Asa's daily ops/team-meeting dashboard state.
-- Separate from Founder OS (personal cockpit): this is the business review
-- (Promise/Offer, Feedback, The Machine, Marketing/Awareness + Financials).
-- Same isolated pattern: a single JSONB blob per user, own table/namespace.
CREATE TABLE IF NOT EXISTS core_four_state (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE core_four_state ENABLE ROW LEVEL SECURITY;

-- Owner can read/write only their own row.
DROP POLICY IF EXISTS "Owner manages own core_four" ON core_four_state;
CREATE POLICY "Owner manages own core_four" ON core_four_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role (server API route) full access.
DROP POLICY IF EXISTS "Service manages core_four" ON core_four_state;
CREATE POLICY "Service manages core_four" ON core_four_state
  FOR ALL USING (true) WITH CHECK (true);
