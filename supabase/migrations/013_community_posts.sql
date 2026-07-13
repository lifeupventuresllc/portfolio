-- 013: The Curve Collective — in-app community feed.
CREATE TABLE IF NOT EXISTS challenge_community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_community_created ON challenge_community_posts(created_at DESC);

ALTER TABLE challenge_community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Logged-in can read community" ON challenge_community_posts;
CREATE POLICY "Logged-in can read community" ON challenge_community_posts FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users create their own posts" ON challenge_community_posts;
CREATE POLICY "Users create their own posts" ON challenge_community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service manages community" ON challenge_community_posts;
CREATE POLICY "Service manages community" ON challenge_community_posts FOR ALL USING (true) WITH CHECK (true);
