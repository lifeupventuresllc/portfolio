-- 012: Coach voice/video reply link on weekly check-ins.
-- Lets Coach Asa attach a Loom/voice/video reply so she hears/sees him, not just text.
ALTER TABLE challenge_checkins ADD COLUMN IF NOT EXISTS coach_media_url TEXT;
