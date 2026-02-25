-- ============================================================
-- 005 — Recurring Invoices (Facturas Recurrentes)
-- ============================================================

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Template data (same structure as invoice wizard)
  numbering_range_id TEXT NOT NULL,
  payment_form_code TEXT NOT NULL DEFAULT '1',
  payment_method_code TEXT NOT NULL DEFAULT '10',
  observation TEXT,
  items JSONB NOT NULL DEFAULT '[]',

  -- Recurrence config
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  name TEXT NOT NULL DEFAULT 'Factura recurrente',
  total_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_recurring_invoices_seller ON recurring_invoices(seller_id);
CREATE INDEX idx_recurring_invoices_next_run ON recurring_invoices(next_run_date) WHERE active = TRUE;

-- RLS
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_own_recurring" ON recurring_invoices
  FOR ALL
  USING (seller_id = auth.uid());

CREATE POLICY "admin_full_recurring" ON recurring_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );
