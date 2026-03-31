-- Content schedule task completions (replaces localStorage)
CREATE TABLE IF NOT EXISTS schedule_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  task_type TEXT NOT NULL,
  task_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, task_type, task_id)
);

ALTER TABLE schedule_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view schedule_tasks"
  ON schedule_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert schedule_tasks"
  ON schedule_tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedule_tasks"
  ON schedule_tasks FOR UPDATE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_schedule_tasks_date ON schedule_tasks(date);
