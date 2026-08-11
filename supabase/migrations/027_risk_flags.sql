-- Beta metrics — every time the acute pattern engine (lib/fos/pattern.ts) flags
-- someone at-risk from a nudge cron, and whether a push intervention actually went
-- out for it. A separate table from fos_events on purpose: this is a MUTABLE record
-- (flag -> intervention -> backtested outcome written back onto the same row ~7 days
-- later), not an append-only life event, and the backtest cron needs a real indexed
-- "not yet backtested" query rather than a jsonb payload filter.
CREATE TABLE IF NOT EXISTS fos_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  flagged_on DATE NOT NULL,
  source TEXT NOT NULL,                    -- 'daily-nudge' | 'meal-nudge'
  signals TEXT[] NOT NULL,                 -- PatternSignal[] that fired
  score INT NOT NULL,
  risk_band TEXT NOT NULL,                 -- 'low' | 'medium' | 'high'
  intervention_sent BOOLEAN NOT NULL DEFAULT false,
  intervention_sent_at TIMESTAMPTZ,
  -- Filled in ~7 days later by /api/cron/risk-backtest
  backtested_at TIMESTAMPTZ,
  prediction_outcome TEXT,                 -- 'went_quiet' | 'false_alarm'
  response_outcome TEXT,                   -- 'reengaged' | 'no_response' | 'accelerated_dropoff'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One flag per enrollment/day/source — caps logging even from a stateless caller.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fos_risk_flags_per_day ON fos_risk_flags(enrollment_id, flagged_on, source);
CREATE INDEX IF NOT EXISTS idx_fos_risk_flags_pending_backtest ON fos_risk_flags(flagged_on) WHERE backtested_at IS NULL;

-- Service-role only, deliberately no "own read" policy for her own user_id: this
-- table is a backend targeting/measurement mechanism (score, risk_band, prediction
-- outcomes like 'went_quiet'/'accelerated_dropoff'), never something she should be
-- able to query directly — that would read as a surveillance log, not "recovery not
-- punishment." Only the aggregate stats on app/admin/beta-metrics are ever shown,
-- and only to the coach.
ALTER TABLE fos_risk_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service fos_risk_flags" ON fos_risk_flags;
CREATE POLICY "service fos_risk_flags" ON fos_risk_flags FOR ALL USING (true) WITH CHECK (true);
