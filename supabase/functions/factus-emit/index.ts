// Edge Function: factus-emit
// Emits an existing draft invoice to DIAN via FACTUS API
// Flow: auth → load draft → quota check → build FACTUS payload → call API → update invoice → decrement credit

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth-guard.ts';
import { getFactusToken, getFactusApiUrl } from '../_shared/factus-token.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── 1. Verify JWT and get seller info ──
    const authResult = await verifyAuth(req);

    if (!authResult.seller) {
      return new Response(
        JSON.stringify({ error: 'Solo vendedores pueden emitir facturas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sellerId = authResult.user.id;

    // ── 2. Parse request body ──
    const body = await req.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: 'invoice_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. Load draft invoice with items ──
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', invoice_id)
      .eq('seller_id', sellerId)
      .eq('status', 'draft')
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Borrador no encontrado o ya fue emitido' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Check seller can invoice (status + quota) ──
    const { data: checkResult, error: checkError } = await supabase
      .rpc('check_seller_can_invoice', { p_seller_id: sellerId });

    if (checkError) {
      throw new Error('Error verificando estado del vendedor');
    }

    const check = checkResult?.[0];
    if (!check?.can_invoice) {
      return new Response(
        JSON.stringify({ error: check?.reason || 'No puede facturar' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. Resolve numbering range ──
    const { data: range, error: rangeError } = await supabase
      .from('numbering_ranges')
      .select('id, factus_id, prefix, current_number')
      .eq('id', invoice.numbering_range_id)
      .single();

    if (rangeError || !range) {
      return new Response(
        JSON.stringify({ error: 'Rango de numeración no encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 6. Resolve client ──
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .eq('seller_id', sellerId)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Cliente no encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 7. Build reference_code ──
    const referenceCode = `${range.prefix}-${Date.now()}`;

    // ── 8. Build FACTUS customer object ──
    const customer: Record<string, any> = {
      identification_document_id: client.identification_document_id,
      identification: client.identification,
      names: client.names || client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      legal_organization_id: String(client.legal_organization_id || '2'),
      tribute_id: String(client.tribute_id || '21'),
    };

    if (client.dv) customer.dv = client.dv;
    if (client.company) customer.company = client.company;
    if (client.trade_name) customer.trade_name = client.trade_name;
    if (client.municipality_id) customer.municipality_id = parseInt(client.municipality_id);

    // ── 9. Build FACTUS items from invoice_items (unit_price es PRECIO BASE sin IVA) ──
    // FACTUS requiere precio con IVA incluido. Convertimos: base × (1 + rate/100)
    const items = invoice.invoice_items || [];
    const factusItems = items.map((item: any) => {
      const basePrice = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;
      const isExcluded = parseInt(item.is_excluded) || 0;
      // Convertir a IVA-inclusivo para FACTUS
      const factusPrice = (isExcluded || taxRate === 0)
        ? basePrice
        : Math.round(basePrice * (1 + taxRate / 100) * 100) / 100;

      return {
        code_reference: String(item.code_reference || 'ITEM'),
        name: String(item.name),
        quantity: parseInt(item.quantity) || 1,
        price: factusPrice,
        discount_rate: parseFloat(item.discount_rate) || 0,
        tax_rate: String(item.tax_rate ?? '19.00'),
        unit_measure_id: parseInt(item.unit_measure_id) || 70,
        standard_code_id: parseInt(item.standard_code_id) || 1,
        is_excluded: isExcluded,
        tribute_id: parseInt(item.tribute_id) || 1,
        withholding_taxes: [],
      };
    });

    // ── 10. Build complete FACTUS payload ──
    const factusPayload: Record<string, any> = {
      reference_code: referenceCode,
      observation: invoice.observation || '',
      payment_method_code: String(invoice.payment_method_code || '10'),
      customer,
      items: factusItems,
    };

    if (range.factus_id && parseInt(range.factus_id) > 0) {
      factusPayload.numbering_range_id = parseInt(range.factus_id);
    }

    if (invoice.payment_form_code === '2') {
      factusPayload.payment_form = {
        payment_form_code: '2',
      };
      if (invoice.payment_due_date) {
        factusPayload.payment_due_date = invoice.payment_due_date;
      }
    }

    // ── 11. Get FACTUS token and call API ──
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    console.log('[factus-emit] Emitting draft', invoice_id, 'to FACTUS');

    const sendToFactus = async () => {
      const resp = await fetch(`${factusUrl}/v1/bills/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(factusPayload),
      });
      const text = await resp.text();
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
      return { response: resp, result: parsed };
    };

    // Helper: find and delete stuck bills (status 0) from FACTUS
    const tryDeleteStuckBill = async () => {
      try {
        console.log('[factus-emit] 409 detected — searching for stuck bills to delete...');
        const listResp = await fetch(`${factusUrl}/v1/bills?page=1&per_page=5`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });
        if (!listResp.ok) return false;
        const listData = await listResp.json();
        const bills = listData.data?.data || [];
        const stuckBill = bills.find((b: any) => b.status === 0 || b.status === '0');
        if (!stuckBill?.reference_code) return false;
        console.log(`[factus-emit] Found stuck bill: ${stuckBill.number}. Deleting...`);
        const delResp = await fetch(`${factusUrl}/v1/bills/destroy/reference/${stuckBill.reference_code}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        });
        return delResp.ok;
      } catch {
        return false;
      }
    };

    let { response: factusResponse, result: factusResult } = await sendToFactus();

    // Auto-recovery for 409
    if (factusResponse.status === 409) {
      const deleted = await tryDeleteStuckBill();
      if (deleted) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retry = await sendToFactus();
        factusResponse = retry.response;
        factusResult = retry.result;
      }
    }

    console.log('[factus-emit] FACTUS response:', factusResponse.status);

    // ── 12. Handle FACTUS errors ──
    if (!factusResponse.ok) {
      console.error('[factus-emit] FACTUS error:', factusResponse.status, JSON.stringify(factusResult));

      // Update draft as rejected (except 409 which is transient)
      if (factusResponse.status !== 409) {
        await supabase
          .from('invoices')
          .update({
            status: 'rejected',
            reference_code: referenceCode,
            payload_json: factusPayload,
            response_json: factusResult,
          })
          .eq('id', invoice_id);
      }

      let errorMessage = factusResult.message || 'Error al validar la factura con FACTUS';

      if (factusResponse.status === 409) {
        errorMessage = 'FACTUS está procesando otra factura con la DIAN. Por favor intente de nuevo en unos segundos.';
      }

      const errorsSource = factusResult.errors || factusResult.data?.errors || {};
      let fieldErrors: string[] = [];
      for (const [field, messages] of Object.entries(errorsSource)) {
        if (Array.isArray(messages)) {
          fieldErrors.push(...messages.map((m: string) => `${field}: ${m}`));
        } else if (typeof messages === 'string') {
          fieldErrors.push(`${field}: ${messages}`);
        }
      }

      if (fieldErrors.length > 0) {
        errorMessage = `${errorMessage}: ${fieldErrors.join(' | ')}`;
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          field_errors: fieldErrors.length > 0 ? fieldErrors : undefined,
          factus_status: factusResponse.status,
          factus_response: factusResult,
        }),
        {
          status: factusResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ── 13. Extract data from successful response ──
    const bill = factusResult.data?.bill || {};

    console.log('[factus-emit] Success. Bill:', bill.number, 'CUFE:', bill.cufe);

    // ── 14. Calculate totals from original items (base prices, NOT factus IVA-inclusive prices) ──
    const calcSubtotal = items.reduce((sum: number, item: any) => {
      const base = parseFloat(item.unit_price) || 0;
      const qty = parseInt(item.quantity) || 1;
      const disc = parseFloat(item.discount_rate) || 0;
      return sum + (qty * base * (1 - disc / 100));
    }, 0);
    const calcTax = items.reduce((sum: number, item: any) => {
      if (parseInt(item.is_excluded)) return sum;
      const rate = parseFloat(item.tax_rate) || 0;
      if (rate === 0) return sum;
      const base = parseFloat(item.unit_price) || 0;
      const qty = parseInt(item.quantity) || 1;
      const disc = parseFloat(item.discount_rate) || 0;
      const taxable = qty * base * (1 - disc / 100);
      return sum + (taxable * rate / 100);
    }, 0);
    const calcDiscount = items.reduce((sum: number, item: any) => {
      const base = parseFloat(item.unit_price) || 0;
      const qty = parseInt(item.quantity) || 1;
      const disc = parseFloat(item.discount_rate) || 0;
      return sum + (qty * base * disc / 100);
    }, 0);
    const finalTotal = parseFloat(bill.total || '0') || (calcSubtotal + calcTax);

    // ── 15. Update draft → issued ──
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'issued',
        factus_bill_id: bill.id,
        reference_code: referenceCode,
        number: bill.number,
        subtotal: calcSubtotal,
        discount_total: calcDiscount,
        tax_total: calcTax,
        total: finalTotal,
        cufe: bill.cufe,
        qr_url: bill.qr_image || bill.qr || null,
        observation: invoice.observation,
        payload_json: factusPayload,
        response_json: factusResult,
        validated_at: new Date().toISOString(),
      })
      .eq('id', invoice_id);

    if (updateError) {
      console.error('[factus-emit] Error updating invoice:', updateError.message);
    }

    // ── 16. Consume one credit ──
    await supabase.rpc('consume_invoice_credit', { p_seller_id: sellerId });

    // ── 17. Return success response ──
    return new Response(
      JSON.stringify({
        success: true,
        message: factusResult.message || 'Factura emitida exitosamente',
        data: {
          invoice_id,
          number: bill.number,
          cufe: bill.cufe,
          qr_url: bill.qr_image || bill.qr,
          total: bill.total,
          status: 'issued',
          credits_remaining: (check.current_quota || 1) - 1,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-emit] Unhandled error:', error.message);

    const status = error.message.includes('auth') || error.message.includes('token')
      ? 401
      : error.message.includes('suspended') || error.message.includes('créditos')
      ? 403
      : 500;

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
