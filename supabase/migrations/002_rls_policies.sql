-- =============================================
-- Easy Bill — Migration 002: RLS Policies
-- =============================================
-- Multi-tenant isolation: sellers only see
-- their own data. Admin sees everything.
-- =============================================

-- Enable RLS on all domain tables
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.numbering_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factus_tokens ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- Helper: check if current user is admin
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (raw_user_meta_data->>'role') = 'admin'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────
-- SELLERS policies
-- ─────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "admin_full_sellers"
  ON public.sellers FOR ALL
  USING (public.is_admin());

-- Seller: read own profile
CREATE POLICY "seller_read_own_profile"
  ON public.sellers FOR SELECT
  USING (id = auth.uid());

-- Seller: update own profile (limited fields)
CREATE POLICY "seller_update_own_profile"
  ON public.sellers FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────
-- INVOICE PACKAGES policies
-- ─────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "admin_full_packages"
  ON public.invoice_packages FOR ALL
  USING (public.is_admin());

-- Seller: read own packages
CREATE POLICY "seller_read_own_packages"
  ON public.invoice_packages FOR SELECT
  USING (seller_id = auth.uid());

-- ─────────────────────────────────────────────
-- CLIENTS policies
-- ─────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "admin_full_clients"
  ON public.clients FOR ALL
  USING (public.is_admin());

-- Seller: full CRUD on own clients
CREATE POLICY "seller_own_clients"
  ON public.clients FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ─────────────────────────────────────────────
-- PRODUCTS policies
-- ─────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "admin_full_products"
  ON public.products FOR ALL
  USING (public.is_admin());

-- Seller: full CRUD on own products
CREATE POLICY "seller_own_products"
  ON public.products FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ─────────────────────────────────────────────
-- SUPPLIERS policies
-- ─────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "admin_full_suppliers"
  ON public.suppliers FOR ALL
  USING (public.is_admin());

-- Seller: full CRUD on own suppliers
CREATE POLICY "seller_own_suppliers"
  ON public.suppliers FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ─────────────────────────────────────────────
-- INVOICES policies
-- ─────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "admin_full_invoices"
  ON public.invoices FOR ALL
  USING (public.is_admin());

-- Seller: full CRUD on own invoices
CREATE POLICY "seller_own_invoices"
  ON public.invoices FOR ALL
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ─────────────────────────────────────────────
-- INVOICE ITEMS policies
-- ─────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "admin_full_invoice_items"
  ON public.invoice_items FOR ALL
  USING (public.is_admin());

-- Seller: access items of own invoices
CREATE POLICY "seller_own_invoice_items"
  ON public.invoice_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.seller_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- NUMBERING RANGES policies (read-only for all)
-- ─────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "admin_full_ranges"
  ON public.numbering_ranges FOR ALL
  USING (public.is_admin());

-- Authenticated users: read active ranges
CREATE POLICY "authenticated_read_ranges"
  ON public.numbering_ranges FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- FACTUS TOKENS policies (no direct access)
-- ─────────────────────────────────────────────

-- Only service_role (Edge Functions) can access
-- No policy for authenticated users = no access
CREATE POLICY "admin_read_tokens"
  ON public.factus_tokens FOR SELECT
  USING (public.is_admin());
