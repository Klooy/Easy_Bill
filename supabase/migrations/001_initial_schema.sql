-- =============================================
-- Easy Bill — Migration 001: Initial Schema
-- =============================================
-- Multi-tenant schema for electronic invoicing
-- All domain tables use seller_id as tenant key
-- =============================================

-- ─────────────────────────────────────────────
-- SELLERS (extends auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sellers (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name          TEXT NOT NULL,
  nit                   TEXT,
  phone                 TEXT,
  address               TEXT,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended')),
  invoice_quota         INT NOT NULL DEFAULT 0,
  invoice_used          INT NOT NULL DEFAULT 0,
  must_change_password  BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES auth.users(id),
  suspended_at          TIMESTAMPTZ,
  suspended_by          UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.sellers IS 'Seller profiles extending auth.users. Tenant root.';
COMMENT ON COLUMN public.sellers.invoice_quota IS 'Credits available for issuing invoices';
COMMENT ON COLUMN public.sellers.invoice_used IS 'Historical count of invoices issued';
COMMENT ON COLUMN public.sellers.must_change_password IS 'Force password change on first login';

-- ─────────────────────────────────────────────
-- INVOICE PACKAGES (credit assignments)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_packages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  quantity    INT NOT NULL CHECK (quantity > 0),
  assigned_by UUID REFERENCES auth.users(id),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invoice_packages IS 'History of invoice credit assignments to sellers';

-- ─────────────────────────────────────────────
-- CLIENTS (per seller)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id                 UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  identification_document_id INT,
  identification            TEXT NOT NULL,
  dv                        TEXT,
  company                   TEXT,
  trade_name                TEXT,
  names                     TEXT,
  address                   TEXT,
  email                     TEXT,
  phone                     TEXT,
  legal_organization_id     INT,
  tribute_id                INT,
  municipality_id           INT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clients IS 'Clients belonging to a seller (tenant-scoped)';

-- ─────────────────────────────────────────────
-- PRODUCTS / SERVICES (per seller)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id         UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  code_reference    TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  price             NUMERIC(12,2) NOT NULL CHECK (price > 0),
  tax_rate          TEXT NOT NULL DEFAULT '19.00',
  unit_measure_id   INT NOT NULL DEFAULT 70,
  standard_code_id  INT NOT NULL DEFAULT 1,
  is_excluded       INT NOT NULL DEFAULT 0 CHECK (is_excluded IN (0, 1)),
  tribute_id        INT NOT NULL DEFAULT 1,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.products IS 'Product/service catalog belonging to a seller';

-- ─────────────────────────────────────────────
-- SUPPLIERS (per seller - internal reference)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  document_type   TEXT,
  document_number TEXT,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.suppliers IS 'Suppliers belonging to a seller (internal reference)';

-- ─────────────────────────────────────────────
-- NUMBERING RANGES (FACTUS/DIAN cache)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.numbering_ranges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factus_id           INT NOT NULL UNIQUE,
  document            TEXT,
  prefix              TEXT,
  from_number         BIGINT,
  to_number           BIGINT,
  current_number      BIGINT,
  resolution_number   TEXT,
  start_date          TEXT,
  end_date            TEXT,
  technical_key       TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.numbering_ranges IS 'Cached DIAN/FACTUS numbering ranges';

-- ─────────────────────────────────────────────
-- FACTUS TOKENS (OAuth cache - single row)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.factus_tokens (
  id            INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.factus_tokens IS 'Single-row cache for FACTUS OAuth token';

-- ─────────────────────────────────────────────
-- INVOICES (per seller)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  factus_bill_id      INT,
  numbering_range_id  UUID REFERENCES public.numbering_ranges(id),
  client_id           UUID REFERENCES public.clients(id),
  reference_code      TEXT NOT NULL,
  number              TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'issued', 'rejected', 'annulled')),
  subtotal            NUMERIC(14,2),
  discount_total      NUMERIC(14,2) DEFAULT 0,
  tax_total           NUMERIC(14,2),
  total               NUMERIC(14,2),
  cufe                TEXT,
  qr_url              TEXT,
  pdf_url             TEXT,
  observation         TEXT,
  payment_form_code   TEXT DEFAULT '1',
  payment_method_code TEXT DEFAULT '10',
  payment_due_date    DATE,
  payload_json        JSONB,
  response_json       JSONB,
  validated_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invoices IS 'Invoices issued by sellers via FACTUS';
COMMENT ON COLUMN public.invoices.cufe IS 'DIAN unique electronic invoice code';
COMMENT ON COLUMN public.invoices.payload_json IS 'Request payload sent to FACTUS API';
COMMENT ON COLUMN public.invoices.response_json IS 'Response received from FACTUS API';

-- ─────────────────────────────────────────────
-- INVOICE ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.products(id),
  code_reference  TEXT,
  name            TEXT NOT NULL,
  quantity        INT NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(12,2) NOT NULL,
  discount_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_rate        TEXT NOT NULL DEFAULT '19.00',
  unit_measure_id INT NOT NULL DEFAULT 70,
  standard_code_id INT NOT NULL DEFAULT 1,
  is_excluded     INT NOT NULL DEFAULT 0,
  tribute_id      INT NOT NULL DEFAULT 1,
  subtotal        NUMERIC(14,2)
);

COMMENT ON TABLE public.invoice_items IS 'Line items for each invoice';

-- ─────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_seller ON public.clients(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_seller ON public.suppliers(seller_id);
CREATE INDEX IF NOT EXISTS idx_invoices_seller ON public.invoices(seller_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_packages_seller ON public.invoice_packages(seller_id);
CREATE INDEX IF NOT EXISTS idx_numbering_ranges_factus ON public.numbering_ranges(factus_id);

-- ─────────────────────────────────────────────
-- Function: auto-update updated_at timestamp
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
