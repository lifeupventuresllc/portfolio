-- Bookings table (Calendly-style scheduling)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_interest TEXT NOT NULL DEFAULT 'content',
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bookings"
  ON bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can insert bookings"
  ON bookings FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings"
  ON bookings FOR UPDATE TO authenticated USING (true);

-- Client check-ins tracking
CREATE TABLE IF NOT EXISTS client_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  checkin_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded BOOLEAN DEFAULT FALSE,
  response_date TIMESTAMPTZ
);

ALTER TABLE client_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view checkins"
  ON client_checkins FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert checkins"
  ON client_checkins FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update checkins"
  ON client_checkins FOR UPDATE TO authenticated USING (true);
