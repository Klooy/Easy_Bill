// Edge Function: factus-invoice
// Creates and validates an invoice via FACTUS API
// Flow: auth → quota check → resolve references → build FACTUS payload → call API → persist → decrement credit

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

    // ── 2. Check seller can invoice (status + quota) ──
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

    // ── 3. Parse request body (wizard payload) ──
    const body = await req.json();

    // Validate required fields
    if (!body.numbering_range_id) {
      return new Response(
        JSON.stringify({ error: 'Rango de numeración es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body.client_id && !body.customer) {
      return new Response(
        JSON.stringify({ error: 'Cliente es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body.items || body.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Se requiere al menos un producto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Resolve numbering range: local UUID → FACTUS factus_id ──
    const { data: range, error: rangeError } = await supabase
      .from('numbering_ranges')
      .select('id, factus_id, prefix, current_number')
      .eq('id', body.numbering_range_id)
      .single();

    if (rangeError || !range) {
      return new Response(
        JSON.stringify({ error: 'Rango de numeración no encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 5. Resolve client: from DB or inline customer data (occasional sale) ──
    let customer: Record<string, any>;

    if (body.customer) {
      // Inline customer data — occasional sale (not saved to DB)
      const c = body.customer;
      customer = {
        identification_document_id: c.identification_document_id,
        identification: c.identification,
        names: c.names || c.company || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        legal_organization_id: String(c.legal_organization_id || '2'),
        tribute_id: String(c.tribute_id || '21'),
      };
      if (c.dv) customer.dv = c.dv;
      if (c.company) customer.company = c.company;
      if (c.trade_name) customer.trade_name = c.trade_name;
      if (c.municipality_id) customer.municipality_id = parseInt(c.municipality_id);
    } else {
      // Load from DB by client_id
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', body.client_id)
        .eq('seller_id', sellerId)
        .single();

      if (clientError || !client) {
        return new Response(
          JSON.stringify({ error: 'Cliente no encontrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customer = {
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
    }

    // ── 6. Build auto-generated reference_code ──
    const referenceCode = `${range.prefix}-${Date.now()}`;

    // ── 8. Build FACTUS items (unit_price es PRECIO BASE sin IVA) ──
    // FACTUS requiere precio con IVA incluido. Convertimos: base × (1 + rate/100)
    const factusItems = body.items.map((item: any) => {
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

    // ── 9. Build complete FACTUS payload ──
    // FACTUS API: payment_method_code goes at TOP LEVEL (string).
    // payment_form is optional — omit for contado (code 1, default).
    // payment_due_date at top level only for credit (payment_form code 2).
    // numbering_range_id is optional if only 1 active range.
    const factusPayload: Record<string, any> = {
      reference_code: referenceCode,
      observation: body.observation || '',
      payment_method_code: String(body.payment_method_code || '10'),
      customer,
      items: factusItems,
    };

    // Add numbering_range_id only if we have a valid factus_id (> 0)
    if (range.factus_id && parseInt(range.factus_id) > 0) {
      factusPayload.numbering_range_id = parseInt(range.factus_id);
    }

    // Add send_email control (default true in FACTUS — we let the wizard decide)
    if (body.send_email !== undefined) {
      factusPayload.send_email = Boolean(body.send_email);
    }

    // Add payment_form only for credit payments (code 2)
    if (body.payment_form_code === '2') {
      factusPayload.payment_form = {
        payment_form_code: '2',
      };
      // payment_due_date goes at TOP LEVEL per FACTUS docs, not inside payment_form
      if (body.payment_due_date) {
        factusPayload.payment_due_date = body.payment_due_date;
      }
    }

    // ── 11. Get FACTUS token and call API ──
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    console.log('[factus-invoice] Sending to FACTUS:', JSON.stringify(factusPayload, null, 2));

    // ── Helper: send payload to FACTUS ──
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

    // ── Helper: find and delete stuck bills (status 0) from FACTUS ──
    const tryDeleteStuckBill = async () => {
      try {
        console.log('[factus-invoice] 409 detected — searching for stuck bills to delete...');
        const listResp = await fetch(`${factusUrl}/v1/bills?page=1&per_page=5`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });
        if (!listResp.ok) return false;
        const listData = await listResp.json();
        const bills = listData.data?.data || [];
        const stuckBill = bills.find((b: any) => b.status === 0 || b.status === '0');
        if (!stuckBill?.reference_code) {
          console.log('[factus-invoice] No stuck bill found to delete');
          return false;
        }
        console.log(`[factus-invoice] Found stuck bill: ${stuckBill.number} (ref: ${stuckBill.reference_code}). Deleting...`);
        const delResp = await fetch(`${factusUrl}/v1/bills/destroy/reference/${stuckBill.reference_code}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        });
        console.log(`[factus-invoice] Delete result: ${delResp.status}`);
        return delResp.ok;
      } catch (e) {
        console.error('[factus-invoice] Error trying to delete stuck bill:', e);
        return false;
      }
    };

    let { response: factusResponse, result: factusResult } = await sendToFactus();

    // ── Auto-recovery: if 409, try deleting stuck bill and retry once ──
    if (factusResponse.status === 409) {
      console.log('[factus-invoice] Got 409 — attempting auto-recovery...');
      const deleted = await tryDeleteStuckBill();
      if (deleted) {
        // Wait a moment for FACTUS to process the deletion
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('[factus-invoice] Retrying after deleting stuck bill...');
        const retry = await sendToFactus();
        factusResponse = retry.response;
        factusResult = retry.result;
      }
    }

    console.log('[factus-invoice] FACTUS response:', factusResponse.status, JSON.stringify(factusResult).substring(0, 500));

    // ── 12. Handle FACTUS errors ──
    if (!factusResponse.ok) {
      console.error('[factus-invoice] FACTUS error:', factusResponse.status, JSON.stringify(factusResult));

      // Don't persist 409 Conflict — it's a temporary DIAN queue issue, not a failed invoice
      if (factusResponse.status !== 409) {
        await supabase.from('invoices').insert({
          seller_id: sellerId,
          reference_code: referenceCode,
          numbering_range_id: range.id,
          client_id: body.client_id || null,
          status: 'rejected',
          subtotal: 0,
          discount_total: 0,
          tax_total: 0,
          total: 0,
          observation: body.observation,
          payment_form_code: body.payment_form_code || '1',
          payment_method_code: String(body.payment_method_code || '10'),
          payment_due_date: body.payment_due_date || null,
          payload_json: factusPayload,
          response_json: factusResult,
        });
      }

      // Parse FACTUS error messages
      let errorMessage = factusResult.message || 'Error al validar la factura con FACTUS';

      // Handle 409 Conflict with user-friendly message
      if (factusResponse.status === 409) {
        errorMessage = 'FACTUS está procesando otra factura con la DIAN. Por favor intente de nuevo en unos segundos.';
      }

      // Collect field-level errors from both root.errors and data.errors (FACTUS nests them)
      const errorsSource = factusResult.errors || factusResult.data?.errors || {};
      let fieldErrors: string[] = [];
      for (const [field, messages] of Object.entries(errorsSource)) {
        if (Array.isArray(messages)) {
          fieldErrors.push(...messages.map((m: string) => `${field}: ${m}`));
        } else if (typeof messages === 'string') {
          fieldErrors.push(`${field}: ${messages}`);
        }
      }

      // Include field errors in the main error message for visibility
      if (fieldErrors.length > 0) {
        errorMessage = `${errorMessage}: ${fieldErrors.join(' | ')}`;
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          field_errors: fieldErrors.length > 0 ? fieldErrors : undefined,
          factus_status: factusResponse.status,
          factus_response: factusResult,
          sent_payload: factusPayload,
        }),
        {
          status: factusResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ── 13. Extract data from successful response ──
    const bill = factusResult.data?.bill || {};

    console.log('[factus-invoice] FACTUS success. Bill:', bill.number, 'CUFE:', bill.cufe);

    // ── 14. Calculate totals (unit_price es PRECIO BASE sin IVA) ──
    const calcSubtotal = body.items.reduce((sum: number, item: any) => {
      const base = parseFloat(item.unit_price) || 0;
      const qty = parseInt(item.quantity) || 1;
      const disc = parseFloat(item.discount_rate) || 0;
      return sum + (qty * base * (1 - disc / 100));
    }, 0);
    const calcTax = body.items.reduce((sum: number, item: any) => {
      if (parseInt(item.is_excluded)) return sum;
      const rate = parseFloat(item.tax_rate) || 0;
      if (rate === 0) return sum;
      const base = parseFloat(item.unit_price) || 0;
      const qty = parseInt(item.quantity) || 1;
      const disc = parseFloat(item.discount_rate) || 0;
      const taxable = qty * base * (1 - disc / 100);
      return sum + (taxable * rate / 100);
    }, 0);
    const calcDiscount = body.items.reduce((sum: number, item: any) => {
      const base = parseFloat(item.unit_price) || 0;
      const qty = parseInt(item.quantity) || 1;
      const disc = parseFloat(item.discount_rate) || 0;
      return sum + (qty * base * disc / 100);
    }, 0);

    // Use FACTUS total if available (authoritative), otherwise calculate
    const finalTotal = parseFloat(bill.total || '0') || (calcSubtotal + calcTax);

    // ── 15. Persist successful invoice ──
    const { data: savedInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        seller_id: sellerId,
        factus_bill_id: bill.id,
        numbering_range_id: range.id,
        client_id: body.client_id || null,
        reference_code: referenceCode,
        number: bill.number,
        status: 'issued',
        subtotal: calcSubtotal,
        discount_total: calcDiscount,
        tax_total: calcTax,
        total: finalTotal,
        cufe: bill.cufe,
        qr_url: bill.qr_image || bill.qr || null,
        pdf_url: null, // PDF is obtained via separate endpoint: GET /v1/bills/download-pdf/:number
        observation: body.observation,
        payment_form_code: body.payment_form_code || '1',
        payment_method_code: String(body.payment_method_code || '10'),
        payment_due_date: body.payment_due_date || null,
        payload_json: factusPayload,
        response_json: factusResult,
        validated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[factus-invoice] Error saving invoice:', insertError.message);
      // Still return success since FACTUS accepted it — the invoice exists in FACTUS
    }

    // ── 15. Save invoice items ──
    if (savedInvoice) {
      const itemsToInsert = body.items.map((item: any) => ({
        invoice_id: savedInvoice.id,
        product_id: item.product_id || null,
        code_reference: item.code_reference || 'ITEM',
        name: item.name,
        quantity: parseInt(item.quantity) || 1,
        unit_price: item.unit_price,
        discount_rate: item.discount_rate || 0,
        tax_rate: item.tax_rate || '19.00',
        unit_measure_id: item.unit_measure_id || 70,
        standard_code_id: item.standard_code_id || 1,
        is_excluded: item.is_excluded || 0,
        tribute_id: item.tribute_id || 1,
        subtotal: (parseInt(item.quantity) || 1) * (parseFloat(item.unit_price) || 0) * (1 - (parseFloat(item.discount_rate) || 0) / 100),
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('[factus-invoice] Error saving items:', itemsError.message);
      }
    }

    // ── 16. Consume one credit ──
    await supabase.rpc('consume_invoice_credit', { p_seller_id: sellerId });

    // ── 17. Return success response ──
    return new Response(
      JSON.stringify({
        success: true,
        message: factusResult.message || 'Factura emitida exitosamente',
        data: {
          invoice_id: savedInvoice?.id,
          number: bill.number,
          cufe: bill.cufe,
          qr_url: bill.qr_image || bill.qr,
          total: bill.total,
          status: 'issued',
          credits_remaining: (check.current_quota || 1) - 1,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-invoice] Unhandled error:', error.message);

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
