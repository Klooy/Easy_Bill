-- =============================================
-- Easy Bill — Migration 003: Sellers Quota Logic
-- =============================================
-- Functions for credit management:
-- - Assign credits to seller
-- - Decrement on invoice emission
-- - Check available credits
-- =============================================

-- ─────────────────────────────────────────────
-- Function: assign invoice credits to a seller
-- Called by admin when creating/recharging
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assign_invoice_credits(
  p_seller_id UUID,
  p_quantity INT,
  p_assigned_by UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update seller quota
  UPDATE public.sellers
  SET invoice_quota = invoice_quota + p_quantity
  WHERE id = p_seller_id;

  -- Log the assignment
  INSERT INTO public.invoice_packages (seller_id, quantity, assigned_by, note)
  VALUES (p_seller_id, p_quantity, p_assigned_by, p_note);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- Function: consume one invoice credit
-- Called by Edge Function after successful FACTUS emission
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_invoice_credit(p_seller_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_quota INT;
BEGIN
  -- Get current quota with lock
  SELECT invoice_quota INTO v_quota
  FROM public.sellers
  WHERE id = p_seller_id
  FOR UPDATE;

  -- Check if credits available
  IF v_quota IS NULL OR v_quota <= 0 THEN
    RETURN false;
  END IF;

  -- Decrement quota, increment used
  UPDATE public.sellers
  SET
    invoice_quota = invoice_quota - 1,
    invoice_used = invoice_used + 1
  WHERE id = p_seller_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- Function: check seller status and quota
-- Used by Edge Functions before invoice emission
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_seller_can_invoice(p_seller_id UUID)
RETURNS TABLE (
  can_invoice BOOLEAN,
  reason TEXT,
  current_quota INT
) AS $$
DECLARE
  v_seller RECORD;
BEGIN
  SELECT s.status, s.invoice_quota
  INTO v_seller
  FROM public.sellers s
  WHERE s.id = p_seller_id;

  IF v_seller IS NULL THEN
    RETURN QUERY SELECT false, 'Vendedor no encontrado'::TEXT, 0;
    RETURN;
  END IF;

  IF v_seller.status = 'suspended' THEN
    RETURN QUERY SELECT false, 'Cuenta suspendida'::TEXT, v_seller.invoice_quota;
    RETURN;
  END IF;

  IF v_seller.invoice_quota <= 0 THEN
    RETURN QUERY SELECT false, 'Sin créditos disponibles'::TEXT, v_seller.invoice_quota;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'OK'::TEXT, v_seller.invoice_quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- Function: suspend seller
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.suspend_seller(
  p_seller_id UUID,
  p_suspended_by UUID
)
RETURNS void AS $$
BEGIN
  UPDATE public.sellers
  SET
    status = 'suspended',
    suspended_at = now(),
    suspended_by = p_suspended_by
  WHERE id = p_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- Function: reactivate seller
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reactivate_seller(p_seller_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.sellers
  SET
    status = 'active',
    suspended_at = NULL,
    suspended_by = NULL
  WHERE id = p_seller_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
