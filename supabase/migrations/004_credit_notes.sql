-- =============================================
-- Easy Bill — Migration 004: Credit/Debit Notes
-- =============================================
-- Extends invoices table to support credit notes (Notas Crédito)
-- and debit notes (Notas Débito) as required by DIAN
-- =============================================

-- Add document_type to distinguish invoice, credit_note, debit_note
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'invoice'
    CHECK (document_type IN ('invoice', 'credit_note', 'debit_note'));

-- Reference to the original invoice (for credit/debit notes)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS related_invoice_id UUID REFERENCES public.invoices(id);

-- DIAN correction concept code (required for credit notes)
-- 1 = Devolución parcial de bienes / no aceptación parcial del servicio
-- 2 = Anulación de factura electrónica
-- 3 = Rebaja o descuento parcial o total
-- 4 = Ajuste de precio
-- 5 = Otros
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS correction_concept_code INT;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON public.invoices(document_type);
CREATE INDEX IF NOT EXISTS idx_invoices_related ON public.invoices(related_invoice_id);
