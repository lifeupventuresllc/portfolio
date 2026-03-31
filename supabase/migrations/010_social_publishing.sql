-- Connected social media accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'facebook')),
  account_name TEXT,
  account_id TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  page_id TEXT,
  page_access_token TEXT,
  ig_user_id TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view social_accounts" ON social_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert social_accounts" ON social_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update social_accounts" ON social_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete social_accounts" ON social_accounts FOR DELETE TO authenticated USING (true);

-- Scheduled posts queue
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'both')),
  content_type TEXT NOT NULL DEFAULT 'reel' CHECK (content_type IN ('reel', 'post', 'story', 'carousel')),
  caption TEXT NOT NULL,
  hashtags TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'video',
  thumbnail_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  published_at TIMESTAMPTZ,
  published_id TEXT,
  error_message TEXT,
  planner_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view scheduled_posts" ON scheduled_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert scheduled_posts" ON scheduled_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update scheduled_posts" ON scheduled_posts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete scheduled_posts" ON scheduled_posts FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
