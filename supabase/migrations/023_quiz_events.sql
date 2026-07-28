-- Quiz funnel step-level tracking (Find Your Fix, and any future quiz).
-- Anonymous session id lets us reconstruct drop-off before a lead ever
-- gives contact info; no PII required until contact_submitted, at which
-- point it's fine to include email/phone in metadata (see route.ts).
CREATE TABLE IF NOT EXISTS quiz_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz TEXT NOT NULL DEFAULT 'find-your-fix',
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'quiz_started', 'step_reached', 'teaser_shown', 'contact_submitted', 'quiz_completed'
  )),
  step INTEGER,
  step_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_events_session ON quiz_events(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_events_quiz ON quiz_events(quiz);
CREATE INDEX IF NOT EXISTS idx_quiz_events_type ON quiz_events(event_type);
CREATE INDEX IF NOT EXISTS idx_quiz_events_created ON quiz_events(created_at);

ALTER TABLE quiz_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read (funnel drop-off reporting)
CREATE POLICY "Admins can view quiz_events" ON quiz_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Service role inserts on behalf of anonymous quiz-takers (API route)
CREATE POLICY "Service role can insert quiz_events" ON quiz_events
  FOR INSERT WITH CHECK (true);

-- Example funnel drop-off report (last 7 days):
-- SELECT step_name, COUNT(DISTINCT session_id) AS sessions
-- FROM quiz_events
-- WHERE quiz = 'find-your-fix' AND event_type = 'step_reached' AND created_at > now() - interval '7 days'
-- GROUP BY step_name, step ORDER BY step;
