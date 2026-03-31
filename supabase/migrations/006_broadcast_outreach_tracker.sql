-- Broadcast Log (email blasts)
CREATE TABLE IF NOT EXISTS broadcast_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by TEXT
);

ALTER TABLE broadcast_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view broadcast_log" ON broadcast_log
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert broadcast_log" ON broadcast_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Daily Outreach Tracker
CREATE TABLE IF NOT EXISTS daily_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  platform TEXT NOT NULL,
  dms_sent INTEGER NOT NULL DEFAULT 0,
  responses_received INTEGER NOT NULL DEFAULT 0,
  meetings_booked INTEGER NOT NULL DEFAULT 0,
  deals_closed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_outreach_date ON daily_outreach(date);
CREATE INDEX IF NOT EXISTS idx_daily_outreach_platform ON daily_outreach(platform);

ALTER TABLE daily_outreach ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view daily_outreach" ON daily_outreach
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert daily_outreach" ON daily_outreach
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update daily_outreach" ON daily_outreach
  FOR UPDATE USING (auth.role() = 'authenticated');
