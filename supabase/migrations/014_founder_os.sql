-- 014: Founder OS — Asa's private founder dashboard state.
-- Fully isolated from all other backend data: a single JSONB blob per user,
-- prefixed founder_os_* (a namespace nothing else in the app uses).
CREATE TABLE IF NOT EXISTS founder_os_state (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE founder_os_state ENABLE ROW LEVEL SECURITY;

-- Owner can read/write only their own row.
DROP POLICY IF EXISTS "Owner manages own founder_os" ON founder_os_state;
CREATE POLICY "Owner manages own founder_os" ON founder_os_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role (server API route) full access.
DROP POLICY IF EXISTS "Service manages founder_os" ON founder_os_state;
CREATE POLICY "Service manages founder_os" ON founder_os_state
  FOR ALL USING (true) WITH CHECK (true);
