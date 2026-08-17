-- Anonymous access, Phase 1: let a visitor use the real app (intake -> real
-- plan) via supabase.auth.signInAnonymously() before ever creating a real
-- account. An anonymous Supabase user has email = NULL, which the current
-- schema/trigger can't handle — this migration is the fix, not new product
-- logic. Run this in the Supabase SQL editor before "Allow anonymous
-- sign-ins" is turned on in Auth settings, or signInAnonymously() will error
-- against the old handle_new_user() trigger.

ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE challenge_enrollments ALTER COLUMN email DROP NOT NULL;

-- Redefine to tolerate NEW.email IS NULL (anonymous signup): still creates
-- her profiles row (so every existing "user_id -> profiles" join keeps
-- working immediately), but skips the emails-log insert, since that table's
-- own email column is still NOT NULL and logging "she signed up with no
-- email" has no use.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'free');

  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.emails (user_id, email, type)
    VALUES (NEW.id, NEW.email, 'signup');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
