-- Cache table for FACTUS municipalities (Colombia ~1,123 entries)
-- Populated automatically by the factus-municipalities edge function on first use

CREATE TABLE IF NOT EXISTS public.municipalities (
  id          INT PRIMARY KEY,
  name        TEXT NOT NULL,
  department  TEXT
);

-- Index for fast ilike searches
CREATE INDEX IF NOT EXISTS idx_municipalities_name
  ON public.municipalities USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_municipalities_department
  ON public.municipalities USING gin (department gin_trgm_ops);

-- Enable the pg_trgm extension for trigram-based fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- RLS: allow all authenticated users to read municipalities (reference data)
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "municipalities_readable_by_authenticated"
  ON public.municipalities FOR SELECT
  TO authenticated
  USING (true);

-- Service role can insert/update (for the edge function sync)
CREATE POLICY "municipalities_writable_by_service"
  ON public.municipalities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
