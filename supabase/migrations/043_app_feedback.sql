CREATE TABLE IF NOT EXISTS app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  message TEXT NOT NULL,
  screen TEXT,
  app_version TEXT,
  os TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_feedback_created_at ON app_feedback(created_at DESC);

ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;

-- Inserts always go through the service-role API route (app/api/feedback),
-- same pattern as every other write in this app — no public INSERT policy.
CREATE POLICY "Admins can view feedback" ON app_feedback FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'support')));

CREATE POLICY "Admins can update feedback" ON app_feedback FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'support')));
