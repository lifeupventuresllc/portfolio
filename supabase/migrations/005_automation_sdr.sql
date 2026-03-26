-- P3: Automation + SDR Schema

-- Add lead scoring and follow-up tracking to funnel_leads
ALTER TABLE funnel_leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE funnel_leads ADD COLUMN IF NOT EXISTS follow_up_stage INTEGER DEFAULT 0;
ALTER TABLE funnel_leads ADD COLUMN IF NOT EXISTS last_email_at TIMESTAMPTZ;
ALTER TABLE funnel_leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE funnel_leads ADD COLUMN IF NOT EXISTS instagram TEXT;

-- Outreach Prospects (SDR pipeline)
CREATE TABLE IF NOT EXISTS outreach_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('email', 'instagram', 'facebook', 'twitter', 'reddit', 'linkedin', 'text', 'in-person')),
  prospect_type TEXT NOT NULL CHECK (prospect_type IN ('creator', 'artist', 'small-business', 'restaurant', 'realtor', 'fitness', 'salon', 'other')),
  instagram TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'replied', 'free-sample', 'pitched', 'closed', 'lost')),
  touch_count INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospects_status ON outreach_prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_platform ON outreach_prospects(platform);
CREATE INDEX IF NOT EXISTS idx_prospects_next_follow_up ON outreach_prospects(next_follow_up_at);

ALTER TABLE outreach_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage prospects" ON outreach_prospects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'support'))
  );

-- Outreach Log (every touch point)
CREATE TABLE IF NOT EXISTS outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES funnel_leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'outreach',
  message_content TEXT,
  touch_number INTEGER DEFAULT 1,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_log_prospect ON outreach_log(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_lead ON outreach_log(lead_id);

ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage outreach_log" ON outreach_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'support'))
  );

-- Follow-Up Sequences
CREATE TABLE IF NOT EXISTS follow_up_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES funnel_leads(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL CHECK (sequence_type IN ('funnel-nurture', 'free-sample', 'post-delivery', 'upsell', 'referral')),
  step INTEGER NOT NULL DEFAULT 1,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_pending ON follow_up_queue(status, scheduled_for) WHERE status = 'pending';

ALTER TABLE follow_up_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage follow_up_queue" ON follow_up_queue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'support'))
  );

-- Intake Submissions
CREATE TABLE IF NOT EXISTS intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES funnel_leads(id) ON DELETE SET NULL,
  prospect_id UUID REFERENCES outreach_prospects(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('content', 'audio')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'verified', 'approved', 'rejected')),
  form_data JSONB NOT NULL DEFAULT '{}',
  assets_link TEXT,
  delivery_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_status ON intake_submissions(status);
CREATE INDEX IF NOT EXISTS idx_intake_service ON intake_submissions(service_type);

ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage intake_submissions" ON intake_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'support'))
  );

-- Projects (fulfillment tracking)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT,
  intake_id UUID REFERENCES intake_submissions(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('content', 'audio')),
  package TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'in-progress', 'review', 'delivered', 'revision', 'complete')),
  deadline TIMESTAMPTZ,
  revenue INTEGER DEFAULT 0,
  revisions_used INTEGER DEFAULT 0,
  revision_limit INTEGER DEFAULT 2,
  assets_folder TEXT,
  delivery_folder TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage projects" ON projects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'support'))
  );
