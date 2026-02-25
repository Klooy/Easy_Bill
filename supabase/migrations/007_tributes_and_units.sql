-- Migration: Add tributes and measurement_units cache tables
-- These store reference data from FACTUS API with cache TTL

-- Tributes cache (IVA, IC, ICA, etc.)
CREATE TABLE IF NOT EXISTS tributes (
  id SERIAL PRIMARY KEY,
  factus_id INTEGER UNIQUE NOT NULL,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Measurement units cache
CREATE TABLE IF NOT EXISTS measurement_units (
  id SERIAL PRIMARY KEY,
  factus_id INTEGER UNIQUE NOT NULL,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tributes_factus_id ON tributes(factus_id);
CREATE INDEX IF NOT EXISTS idx_measurement_units_factus_id ON measurement_units(factus_id);

-- Allow authenticated users to read
ALTER TABLE tributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_tributes" ON tributes FOR SELECT USING (true);
CREATE POLICY "anyone_can_read_measurement_units" ON measurement_units FOR SELECT USING (true);
