// Edge Function: factus-credit-note
// Creates and validates a credit note via FACTUS API
// Credit notes reference an existing invoice and correct/cancel it

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth-guard.ts';
import { getFactusToken, getFactusApiUrl } from '../_shared/factus-token.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
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
    // 1. Verify JWT and get seller
    const authResult = await verifyAuth(req);
    if (!authResult.seller) {
      return new Response(
        JSON.stringify({ error: 'Solo vendedores pueden emitir notas crédito' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sellerId = authResult.user.id;

    // 2. Check seller quota
    const { data: checkResult, error: checkError } = await supabase
      .rpc('check_seller_can_invoice', { p_seller_id: sellerId });

    if (checkError) {
      throw new Error('Error verificando estado del vendedor');
    }

    const check = checkResult?.[0];
    if (!check?.can_invoice) {
      return new Response(
        JSON.stringify({ error: check?.reason || 'Sin créditos disponibles para emitir notas crédito' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    const body = await req.json();

    if (!body.invoice_id) {
      return new Response(
        JSON.stringify({ error: 'ID de factura original es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body.correction_concept_code) {
      return new Response(
        JSON.stringify({ error: 'Concepto de corrección es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body.items || body.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Se requiere al menos un ítem' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch the original invoice (must belong to this seller)
    const { data: originalInvoice, error: invError } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('id', body.invoice_id)
      .eq('seller_id', sellerId)
      .eq('status', 'issued')
      .eq('document_type', 'invoice')
      .single();

    if (invError || !originalInvoice) {
      return new Response(
        JSON.stringify({ error: 'Factura original no encontrada o no es válida para nota crédito' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!originalInvoice.number || !originalInvoice.cufe) {
      return new Response(
        JSON.stringify({ error: 'La factura original no tiene número o CUFE válido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!originalInvoice.factus_bill_id) {
      return new Response(
        JSON.stringify({ error: 'La factura original no tiene ID de FACTUS (factus_bill_id)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Resolve numbering range for credit notes
    const { data: range, error: rangeError } = await supabase
      .from('numbering_ranges')
      .select('id, factus_id, prefix, current_number')
      .eq('id', body.numbering_range_id)
      .single();

    if (rangeError || !range) {
      return new Response(
        JSON.stringify({ error: 'Rango de numeración para notas crédito no encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Build reference code
    const referenceCode = `NC-${range.prefix}-${Date.now()}`;

    // 6. Build FACTUS customer from original invoice's client
    const client = originalInvoice.clients;
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

    // 7. Build FACTUS items (unit_price es PRECIO BASE sin IVA)
    // FACTUS requiere precio con IVA incluido. Convertimos: base × (1 + rate/100)
    const factusItems = body.items.map((item: any) => {
      const basePrice = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;
      const isExcluded = parseInt(item.is_excluded) || 0;
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

    // 8. Build FACTUS credit note payload
    const factusPayload: Record<string, any> = {
      reference_code: referenceCode,
      observation: body.observation || '',
      payment_method_code: String(originalInvoice.payment_method_code || '10'),
      correction_concept_code: parseInt(body.correction_concept_code),
      customization_id: 20, // Nota Crédito que referencia una factura electrónica
      bill_id: parseInt(originalInvoice.factus_bill_id),
      customer,
      items: factusItems,
    };

    if (range.factus_id && parseInt(range.factus_id) > 0) {
      factusPayload.numbering_range_id = parseInt(range.factus_id);
    }

    // 9. Send to FACTUS
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    console.log('[factus-credit-note] Sending to FACTUS:', JSON.stringify(factusPayload, null, 2));

    const factusResponse = await fetch(`${factusUrl}/v1/credit-notes/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(factusPayload),
    });

    const factusText = await factusResponse.text();
    let factusResult: any;
    try { factusResult = JSON.parse(factusText); } catch { factusResult = { raw: factusText }; }

    console.log('[factus-credit-note] FACTUS response:', factusResponse.status, JSON.stringify(factusResult).substring(0, 500));

    // 10. Handle FACTUS errors
    if (!factusResponse.ok) {
      console.error('[factus-credit-note] FACTUS error:', factusResponse.status, JSON.stringify(factusResult));

      // Persist as rejected
      await supabase.from('invoices').insert({
        seller_id: sellerId,
        reference_code: referenceCode,
        numbering_range_id: range.id,
        client_id: originalInvoice.client_id,
        related_invoice_id: body.invoice_id,
        document_type: 'credit_note',
        correction_concept_code: parseInt(body.correction_concept_code),
        status: 'rejected',
        subtotal: 0, discount_total: 0, tax_total: 0, total: 0,
        observation: body.observation,
        payment_form_code: originalInvoice.payment_form_code || '1',
        payment_method_code: String(originalInvoice.payment_method_code || '10'),
        payload_json: factusPayload,
        response_json: factusResult,
      });

      let errorMessage = factusResult.message || 'Error al validar la nota crédito con FACTUS';
      const errorsSource = factusResult.errors || factusResult.data?.errors || {};
      const fieldErrors: string[] = [];
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
          sent_payload: factusPayload,
        }),
        { status: factusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 11. Extract data from successful response
    const bill = factusResult.data?.credit_note || factusResult.data?.bill || {};

    // 12. Calculate totals (unit_price es PRECIO BASE sin IVA)
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
    const finalTotal = parseFloat(bill.total || '0') || (calcSubtotal + calcTax);

    // 13. Persist successful credit note
    const { data: savedNote, error: insertError } = await supabase
      .from('invoices')
      .insert({
        seller_id: sellerId,
        factus_bill_id: bill.id,
        numbering_range_id: range.id,
        client_id: originalInvoice.client_id,
        related_invoice_id: body.invoice_id,
        document_type: 'credit_note',
        correction_concept_code: parseInt(body.correction_concept_code),
        reference_code: referenceCode,
        number: bill.number,
        status: 'issued',
        subtotal: calcSubtotal,
        discount_total: calcDiscount,
        tax_total: calcTax,
        total: finalTotal,
        cufe: bill.cufe || bill.cude,
        qr_url: bill.qr_image || bill.qr || null,
        pdf_url: null,
        observation: body.observation,
        payment_form_code: originalInvoice.payment_form_code || '1',
        payment_method_code: String(originalInvoice.payment_method_code || '10'),
        payload_json: factusPayload,
        response_json: factusResult,
        validated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[factus-credit-note] Error saving credit note:', insertError.message);
    }

    // 14. Save items
    if (savedNote) {
      const itemsToInsert = body.items.map((item: any) => ({
        invoice_id: savedNote.id,
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

      await supabase.from('invoice_items').insert(itemsToInsert);
    }

    // 15. Consume one credit (credit notes also cost 1 document in FACTUS)
    await supabase.rpc('consume_invoice_credit', { p_seller_id: sellerId });

    // 16. Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: factusResult.message || 'Nota crédito emitida exitosamente',
        data: {
          credit_note_id: savedNote?.id,
          number: bill.number,
          cufe: bill.cufe || bill.cude,
          total: bill.total,
          status: 'issued',
          credits_remaining: (check.current_quota || 1) - 1,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-credit-note] Unhandled error:', error.message);

    const status = error.message.includes('auth') || error.message.includes('token')
      ? 401 : error.message.includes('suspended') ? 403 : 500;

    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
