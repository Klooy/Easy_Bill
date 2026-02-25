import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sileo } from 'sileo';
import { ArrowLeft, ArrowRight, Loader2, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmissionOverlay } from '@/components/common/EmissionOverlay';
import { useInvoiceStore } from '@/store/invoice.store';
import { useSellerQuota } from '@/hooks/useSellerQuota';
import { factusService } from '@/services/factus.service';
import { invoicesService } from '@/services/invoices.service';
import { clientsService } from '@/services/clients.service';
import { parseDianErrors } from '@/components/invoice/parseDianErrors';
import { StepIndicator } from '@/components/invoice/StepIndicator';
import { StepGeneral } from '@/components/invoice/StepGeneral';
import { StepClient } from '@/components/invoice/StepClient';
import { StepItems } from '@/components/invoice/StepItems';
import { StepSummary } from '@/components/invoice/StepSummary';

/* ─── Main Wizard ─── */
const NewInvoicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const store = useInvoiceStore();
  const { refresh: refreshQuota } = useSellerQuota();

  // Reset on mount, or prefill if duplicating / editing draft
  useEffect(() => {
    const duplicateData = location.state?.duplicate;
    const editDraft = location.state?.editDraft;
    if (editDraft) {
      store.prefill(editDraft);
    } else if (duplicateData) {
      store.prefill(duplicateData);
    } else {
      store.reset();
    }
  }, []);

  const editingDraftId = location.state?.editDraft?.id || null;

  const canGoNext = () => {
    switch (store.step) {
      case 1: return !!store.numberingRangeId;
      case 2: return !!store.clientId;
      case 3: {
        const validItems = store.items.filter((i) => i.name && i.quantity > 0 && i.unit_price > 0);
        return validItems.length > 0;
      }
      default: return true;
    }
  };

  const [retryStatus, setRetryStatus] = useState(null);
  const [lastPayload, setLastPayload] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const buildPayload = () => {
    const isTemp = store.clientId === 'temp';
    const payload = {
      numbering_range_id: store.numberingRangeId,
      payment_form_code: store.paymentFormCode,
      payment_method_code: store.paymentMethodCode,
      payment_due_date: store.paymentFormCode === '2' ? (store.paymentDueDate || null) : null,
      observation: store.observation || null,
      items: store.items.filter((i) => i.name).map((item) => ({
        product_id: item.product_id || null,
        code_reference: item.code_reference,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_rate: item.discount_rate,
        tax_rate: item.tax_rate,
        unit_measure_id: item.unit_measure_id,
        standard_code_id: item.standard_code_id,
        is_excluded: item.is_excluded,
        tribute_id: item.tribute_id,
      })),
    };

    if (isTemp && store.selectedClient) {
      const { _isTemporary, ...clientData } = store.selectedClient;
      payload.customer = {
        identification_document_id: clientData.identification_document_id,
        identification: clientData.identification,
        dv: clientData.dv || null,
        names: clientData.names || clientData.company || '',
        company: clientData.company || null,
        trade_name: clientData.trade_name || null,
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        municipality_id: clientData.municipality_id || null,
        legal_organization_id: String(clientData.legal_organization_id || '2'),
        tribute_id: String(clientData.tribute_id || '21'),
      };
    } else {
      payload.client_id = store.clientId;
    }

    return payload;
  };

  /* ── Helper: auto-create temp client for draft persistence ── */
  const ensureClientForDraft = async (payload) => {
    if (store.clientId === 'temp' && store.selectedClient) {
      const { _isTemporary, ...clientData } = store.selectedClient;
      const cleaned = Object.fromEntries(
        Object.entries(clientData).map(([k, v]) => [k, v === '' ? null : v])
      );
      const newClient = await clientsService.create(cleaned);
      payload.client_id = newClient.id;
      delete payload.customer;
      store.setClient(newClient.id, newClient);
      sileo.info({
        title: 'Cliente registrado automáticamente',
        description: 'Necesario para guardar el borrador',
      });
    }
    return payload;
  };

  /* ── Save as draft (local DB only, no DIAN) ── */
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const payload = buildPayload();
      await ensureClientForDraft(payload);
      let invoice;

      if (editingDraftId) {
        invoice = await invoicesService.updateDraft(editingDraftId, payload);
      } else {
        invoice = await invoicesService.saveDraft(payload);
      }

      store.reset();

      sileo.success({
        title: editingDraftId ? 'Borrador actualizado' : 'Borrador guardado',
        description: 'Puedes emitirla a la DIAN cuando estés listo.',
        button: { title: 'Emitir a DIAN', onClick: () => navigate(`/invoices/${invoice.id}`) },
        duration: 10000,
      });

      navigate('/invoices');
    } catch (error) {
      sileo.error({ title: 'Error al guardar borrador', description: error.message });
    } finally {
      setSavingDraft(false);
    }
  };

  /* ── Emit directly to DIAN (existing flow) ── */
  const sendInvoice = async (payload) => {
    store.setSubmitting(true);
    setRetryStatus(null);
    setLastPayload(payload);

    try {
      const result = await factusService.createInvoice(payload, {
        maxRetries: 5,
        initialDelay: 3000,
        onRetry: (attempt, max, delay) => {
          setRetryStatus(`Reintentando... (${attempt}/${max}) — próximo intento en ${Math.round(delay / 1000)}s`);
          sileo.clear();
          sileo.info({ title: `DIAN ocupada. Reintentando (${attempt}/${max})...` });
        },
      });

      setRetryStatus(null);
      setLastPayload(null);

      // If editing a draft that got emitted, delete the draft
      if (editingDraftId) {
        try {
          await invoicesService.deleteDraft(editingDraftId);
        } catch { /* ignore — draft may have already been handled */ }
      }

      store.reset();

      const invoiceId = result.data?.invoice_id;

      // Refresh quota in global store
      refreshQuota();

      sileo.success({
        title: `Factura ${result.data?.number || ''} emitida`,
        description: `Validada por la DIAN. Créditos restantes: ${result.data?.credits_remaining ?? '—'}`,
        button: invoiceId ? { title: 'Ver factura', onClick: () => navigate(`/invoices/${invoiceId}`) } : undefined,
        duration: 15000,
      });

      navigate(invoiceId ? `/invoices/${invoiceId}` : '/invoices');
    } catch (error) {
      const isDianBusy = error.message?.includes('procesando otra factura') ||
        error.message?.includes('pendiente por enviar') ||
        error.message?.includes('409');

      if (isDianBusy) {
        setRetryStatus('dian_busy');
        sileo.error({ title: 'La DIAN sigue ocupada', description: 'Puedes guardar como borrador o reintentar.' });
      } else {
        setRetryStatus(null);
        setLastPayload(null);

        // Parse DIAN validation errors from FACTUS response for user-friendly messages
        const dianErrors = parseDianErrors(error.factusResponse);
        if (dianErrors.length > 0) {
          sileo.error({
            title: 'Factura rechazada por la DIAN',
            description: dianErrors.join(' | '),
            duration: 10000,
          });
        } else if (error.fieldErrors?.length > 0) {
          sileo.error({
            title: 'Errores de validación',
            description: error.fieldErrors.join(' | '),
            duration: 8000,
          });
        } else {
          sileo.error({ title: 'Error al emitir la factura', description: error.message || 'Ocurrió un error inesperado.' });
        }
      }
    } finally {
      store.setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    await sendInvoice(payload);
  };

  const handleManualRetry = async () => {
    if (lastPayload) {
      await sendInvoice(lastPayload);
    }
  };

  /* ── Save as draft when DIAN is busy ── */
  const handleSaveDraftFromRetry = async () => {
    setSavingDraft(true);
    try {
      const payload = lastPayload || buildPayload();
      await ensureClientForDraft(payload);
      const invoice = await invoicesService.saveDraft(payload);
      store.reset();
      setRetryStatus(null);
      setLastPayload(null);

      sileo.info({
        title: 'Guardado como borrador',
        description: 'La DIAN estaba ocupada. Puedes emitir la factura más tarde.',
        button: { title: 'Emitir a DIAN', onClick: () => navigate(`/invoices/${invoice.id}`) },
        duration: 10000,
      });

      navigate('/invoices');
    } catch (error) {
      sileo.error({ title: 'Error al guardar borrador', description: error.message });
    } finally {
      setSavingDraft(false);
    }
  };

  const renderStep = () => {
    switch (store.step) {
      case 1: return <StepGeneral />;
      case 2: return <StepClient />;
      case 3: return <StepItems />;
      case 4: return <StepSummary />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <EmissionOverlay visible={store.isSubmitting} onCancel={() => store.setSubmitting(false)} />
      <div>
        <h1 className="title-accent font-outfit text-2xl font-bold text-gray-900 dark:text-white">
          {editingDraftId ? 'Editar borrador' : 'Nueva Factura'}
        </h1>
      </div>

      <StepIndicator step={store.step} totalSteps={store.totalSteps} />

      <div className="rounded-card bg-white dark:bg-gray-800 p-5 shadow-card md:p-6 overflow-hidden">
        {renderStep()}
      </div>

      {/* Retry status banner */}
      {retryStatus && retryStatus !== 'dian_busy' && (
        <div className="flex items-center gap-3 rounded-input bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
          <span className="font-jakarta">{retryStatus}</span>
        </div>
      )}

      {/* DIAN busy — manual retry OR save as draft */}
      {retryStatus === 'dian_busy' && !store.isSubmitting && (
        <div className="rounded-input border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm text-amber-800 font-jakarta">
            <strong>La DIAN está ocupada.</strong> Puedes reintentar o guardar como borrador para emitir después.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="min-h-[44px] flex-1 rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md sm:flex-none"
              onClick={handleManualRetry}
            >
              <Loader2 className="mr-2 h-4 w-4" />
              Reintentar factura
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] flex-1 rounded-input border-primary-300 text-primary-700 hover:bg-primary-50 sm:flex-none"
              onClick={handleSaveDraftFromRetry}
              disabled={savingDraft}
            >
              <Save className="mr-2 h-4 w-4" />
              {savingDraft ? 'Guardando...' : 'Guardar borrador'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] flex-1 rounded-input sm:flex-none"
              onClick={() => { setRetryStatus(null); setLastPayload(null); }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] rounded-input"
          onClick={store.step === 1 ? () => navigate('/invoices') : store.prevStep}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {store.step === 1 ? 'Cancelar' : 'Anterior'}
        </Button>

        {store.step < store.totalSteps ? (
          <Button
            type="button"
            disabled={!canGoNext()}
            className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
            onClick={store.nextStep}
          >
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            {/* Save as draft */}
            <Button
              type="button"
              variant="outline"
              disabled={savingDraft || store.isSubmitting}
              className="min-h-[44px] rounded-input border-primary-300 text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
              onClick={handleSaveDraft}
            >
              {savingDraft ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Guardar borrador</span>
                  <span className="sm:hidden">Borrador</span>
                </>
              )}
            </Button>
            {/* Emit to DIAN */}
            <Button
              type="button"
              disabled={store.isSubmitting || savingDraft}
              className="min-h-[44px] rounded-input bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-primary-md transition-all hover:-translate-y-0.5 hover:shadow-primary-lg"
              onClick={handleSubmit}
            >
              {store.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Emitiendo...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Emitir a DIAN</span>
                  <span className="sm:hidden">Emitir</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewInvoicePage;
