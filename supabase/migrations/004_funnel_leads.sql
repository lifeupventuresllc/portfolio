-- Funnel Leads CRM Table
CREATE TABLE IF NOT EXISTS funnel_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('content', 'audio', 'fitness')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  source TEXT DEFAULT 'funnel',
  notes TEXT,
  follow_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_funnel_leads_email ON funnel_leads(email);
CREATE INDEX IF NOT EXISTS idx_funnel_leads_status ON funnel_leads(status);
CREATE INDEX IF NOT EXISTS idx_funnel_leads_service ON funnel_leads(service);

-- RLS
ALTER TABLE funnel_leads ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage leads
CREATE POLICY "Admins can manage funnel_leads" ON funnel_leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Service role can insert (for API route)
CREATE POLICY "Service role can insert funnel_leads" ON funnel_leads
  FOR INSERT WITH CHECK (true);
