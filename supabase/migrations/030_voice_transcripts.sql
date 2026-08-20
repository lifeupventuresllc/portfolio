-- Voice transcription audit log. Every voice input through Coach Asa's chat
-- (dashboard modal + full-page /plan/coach) writes one row here, RAW and any
-- cleaned/post-processed version side by side — so transcript accuracy is
-- inspectable after the fact, not just trusted. See lib/voice/deepgram-server.ts.
create table if not exists voice_transcripts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references challenge_enrollments(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  source text not null,                    -- 'coach_hero' | 'operator_chat' | 'voice_test'
  raw_transcript text not null,             -- Deepgram output with punctuate=false, smart_format=false — closest thing to "what was actually said"
  cleaned_transcript text,                  -- only set if a distinct cleanup pass ran; null means raw was used as-is, nothing silently changed
  confidence real,                          -- Deepgram's utterance-level confidence, 0-1
  low_confidence boolean not null default false,
  model text not null default 'nova-3',
  duration_seconds real,
  word_count int,
  created_at timestamptz not null default now()
);

create index if not exists voice_transcripts_enrollment_idx on voice_transcripts(enrollment_id, created_at desc);
create index if not exists voice_transcripts_low_confidence_idx on voice_transcripts(low_confidence) where low_confidence = true;
