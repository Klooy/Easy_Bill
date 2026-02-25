// Edge Function: factus-radian-emit
// Emits a RADIAN event (acceptance, acknowledgment, etc.) on an invoice
// POST /v1/bills/radian/events/update/:number/:event_type

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth-guard.ts';
import { getFactusToken, getFactusApiUrl } from '../_shared/factus-token.ts';

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

  try {
    await verifyAuth(req);

    const body = await req.json();
    const { invoice_number, event_type, responsible } = body;

    if (!invoice_number || !event_type) {
      return new Response(
        JSON.stringify({ error: 'invoice_number y event_type son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate event_type
    const validEvents = ['030', '031', '032', '033', '034'];
    if (!validEvents.includes(event_type)) {
      return new Response(
        JSON.stringify({ error: `Tipo de evento inválido. Válidos: ${validEvents.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build request body for FACTUS
    const factusBody: Record<string, any> = {};

    if (responsible) {
      if (responsible.identification_document_code) factusBody.identification_document_code = responsible.identification_document_code;
      if (responsible.identification) factusBody.identification = responsible.identification;
      if (responsible.dv) factusBody.dv = responsible.dv;
      if (responsible.first_name) factusBody.first_name = responsible.first_name;
      if (responsible.last_name) factusBody.last_name = responsible.last_name;
      if (responsible.job_title) factusBody.job_title = responsible.job_title;
      if (responsible.organization_department) factusBody.organization_department = responsible.organization_department;
    }

    // For event 031 (Reclamo), claim_concept_code is required
    if (event_type === '031' && body.claim_concept_code) {
      factusBody.claim_concept_code = body.claim_concept_code;
    }

    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    const fullUrl = `${factusUrl}/v1/bills/radian/events/update/${invoice_number}/${event_type}`;
    console.log(`[factus-radian-emit] URL: ${fullUrl}`);
    console.log(`[factus-radian-emit] Body: ${JSON.stringify(factusBody)}`);

    const factusResponse = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(factusBody),
    });

    const factusText = await factusResponse.text();
    let factusResult: any;
    try { factusResult = JSON.parse(factusText); } catch { factusResult = { raw: factusText }; }

    if (!factusResponse.ok) {
      console.error('[factus-radian-emit] FACTUS error:', factusResponse.status, factusText);
      return new Response(
        JSON.stringify({
          error: factusResult.message || 'Error al emitir evento RADIAN',
          factus_response: factusResult,
          debug: {
            factus_url: fullUrl,
            factus_status: factusResponse.status,
            body_sent: factusBody,
          },
        }),
        { status: factusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[factus-radian-emit] Event ${event_type} emitted successfully for ${invoice_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: factusResult.message || 'Evento RADIAN emitido exitosamente',
        data: factusResult.data || factusResult,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-radian-emit] Error:', error.message);
    const status = error.message.includes('auth') || error.message.includes('token') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
