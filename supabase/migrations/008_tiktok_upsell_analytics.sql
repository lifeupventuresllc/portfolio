-- Add TikTok to platform check constraint
ALTER TABLE outreach_prospects DROP CONSTRAINT IF EXISTS outreach_prospects_platform_check;
ALTER TABLE outreach_prospects ADD CONSTRAINT outreach_prospects_platform_check
  CHECK (platform IN ('email', 'instagram', 'tiktok', 'facebook', 'twitter', 'reddit', 'linkedin', 'text', 'in-person'));

-- Add tiktok handle column
ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS tiktok TEXT;

-- Track upsell sequence stage (1, 2, 3)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS upsell_stage INTEGER DEFAULT 1;

-- Funnel events enhancement: add source tracking
ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS referrer TEXT;
