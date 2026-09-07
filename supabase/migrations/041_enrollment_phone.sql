-- Real profile page (Asa's ask, 2026-09-07): a "My Profile" screen (name,
-- email, phone) modeled on a normal e-commerce account page, plus giving
-- Asa real contact info on every user from the admin roster. Phone never
-- existed anywhere on the actual user record before this -- the only
-- `phone` columns in this schema (funnel_leads, bookings) are for a
-- different, unrelated lead-gen flow.
ALTER TABLE challenge_enrollments ADD COLUMN IF NOT EXISTS phone TEXT;
