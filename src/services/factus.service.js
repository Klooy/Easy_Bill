import { supabase } from '@/lib/supabase';

const getAuthToken = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('No hay sesión activa');
  return token;
};

const callEdgeFunction = async (functionName, options = {}) => {
  const token = await getAuthToken();
  const { method = 'POST', body, params } = options;

  let url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const result = await response.json();

  if (!response.ok) {
    // Log full FACTUS error details for debugging
    if (result.factus_response || result.sent_payload || result.debug) {
      console.error(`[${functionName}] FACTUS error details:`, {
        status: result.factus_status,
        response: result.factus_response,
        payload_sent: result.sent_payload,
        field_errors: result.field_errors,
        debug: result.debug,
      });
    }

    const error = new Error(result.error || `Error en ${functionName}`);
    error.factusStatus = result.factus_status;
    error.factusResponse = result.factus_response;
    error.fieldErrors = result.field_errors;
    error.httpStatus = response.status;
    throw error;
  }

  return result;
};

const factusService = {
  async testAuth() {
    return callEdgeFunction('factus-auth');
  },

  async getNumberingRanges() {
    return callEdgeFunction('factus-ranges', { method: 'GET' });
  },

  async createInvoice(invoiceData, { maxRetries = 5, initialDelay = 3000, onRetry } = {}) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await callEdgeFunction('factus-invoice', { body: invoiceData });
      } catch (error) {
        // Retry on 409 Conflict (DIAN queue busy) — not a real failure
        const isConflict = error.message?.includes('procesando otra factura') ||
          error.message?.includes('pendiente por enviar') ||
          error.message?.includes('409');
        if (isConflict && attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1); // 3s, 6s, 12s, 24s
          console.warn(`[factus] DIAN queue busy, retrying in ${delay / 1000}s (attempt ${attempt}/${maxRetries})`);
          if (onRetry) onRetry(attempt, maxRetries, delay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  },

  async getBills(page = 1, perPage = 10, search = '') {
    return callEdgeFunction('factus-bills', {
      method: 'GET',
      params: { page, per_page: perPage, search },
    });
  },

  async searchMunicipalities(name = '', all = false) {
    const params = {};
    if (all) {
      params.all = 'true';
    } else {
      params.name = name;
    }
    return callEdgeFunction('factus-municipalities', {
      method: 'GET',
      params,
    });
  },

  async createCreditNote(creditNoteData) {
    return callEdgeFunction('factus-credit-note', { body: creditNoteData });
  },

  async emitDraftInvoice(invoiceId, { maxRetries = 5, initialDelay = 3000, onRetry } = {}) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await callEdgeFunction('factus-emit', { body: { invoice_id: invoiceId } });
      } catch (error) {
        const isConflict = error.message?.includes('procesando otra factura') ||
          error.message?.includes('pendiente por enviar') ||
          error.message?.includes('409');
        if (isConflict && attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.warn(`[factus] DIAN queue busy, retrying emit in ${delay / 1000}s (attempt ${attempt}/${maxRetries})`);
          if (onRetry) onRetry(attempt, maxRetries, delay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  },

  async downloadPdf(invoiceNumber) {
    return callEdgeFunction('factus-pdf', {
      method: 'GET',
      params: { number: invoiceNumber },
    });
  },

  async sendInvoiceEmail(invoiceId, email) {
    return callEdgeFunction('send-invoice-email', {
      body: { invoice_id: invoiceId, email },
    });
  },

  // ── Nota crédito email ──
  async sendCreditNoteEmail(invoiceId, email) {
    return callEdgeFunction('factus-send-credit-note-email', {
      body: { invoice_id: invoiceId, email },
    });
  },

  // ── Eliminar factura no validada ──
  async deleteUnvalidatedBill(referenceCode, invoiceId) {
    return callEdgeFunction('factus-delete-bill', {
      method: 'DELETE',
      params: { reference_code: referenceCode, invoice_id: invoiceId },
    });
  },

  // ── Ver factura desde FACTUS ──
  async getBillFromFactus(number) {
    return callEdgeFunction('factus-bill-show', {
      method: 'GET',
      params: { number },
    });
  },

  // ── Eventos RADIAN ──
  async getRadianEvents(number) {
    return callEdgeFunction('factus-radian-events', {
      method: 'GET',
      params: { number },
    });
  },

  async emitRadianEvent(data) {
    return callEdgeFunction('factus-radian-emit', {
      body: data,
    });
  },

  // ── Tributos y unidades de medida ──
  async getTributes(refresh = false) {
    return callEdgeFunction('factus-tributes', {
      method: 'GET',
      params: refresh ? { refresh: 'true' } : {},
    });
  },

  async getMeasurementUnits(name = '', refresh = false) {
    const params = {};
    if (name) params.name = name;
    if (refresh) params.refresh = 'true';
    return callEdgeFunction('factus-units', {
      method: 'GET',
      params,
    });
  },

  // ── Gestión avanzada de rangos (admin) ──
  async listAllRanges() {
    return callEdgeFunction('factus-ranges-manage', { method: 'GET' });
  },

  async syncDianRanges() {
    return callEdgeFunction('factus-ranges-manage', {
      method: 'GET',
      params: { action: 'sync-dian' },
    });
  },

  async createRange(rangeData) {
    return callEdgeFunction('factus-ranges-manage', {
      body: { action: 'create', ...rangeData },
    });
  },

  async updateRangeConsecutive(rangeId, consecutive) {
    return callEdgeFunction('factus-ranges-manage', {
      method: 'PATCH',
      body: { range_id: rangeId, current_consecutive: consecutive },
    });
  },

  async deleteRange(rangeId) {
    return callEdgeFunction('factus-ranges-manage', {
      method: 'DELETE',
      params: { range_id: rangeId },
    });
  },
};

export { factusService };
