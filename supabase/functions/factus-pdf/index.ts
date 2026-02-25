// Edge Function: factus-pdf
// Downloads a PDF invoice from FACTUS API
// Endpoint: GET /v1/bills/download-pdf/{number}

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth-guard.ts';
import { getFactusToken, getFactusApiUrl } from '../_shared/factus-token.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Verify JWT
    await verifyAuth(req);

    // 2. Get invoice number from query params
    const url = new URL(req.url);
    const invoiceNumber = url.searchParams.get('number');

    if (!invoiceNumber) {
      return new Response(
        JSON.stringify({ error: 'Número de factura es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get FACTUS token and fetch PDF
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    // Detect document type by prefix to use the correct FACTUS endpoint
    const isCreditNote = invoiceNumber.startsWith('NC');
    const pdfEndpoint = isCreditNote
      ? `${factusUrl}/v1/credit-notes/download-pdf/${invoiceNumber}`
      : `${factusUrl}/v1/bills/download-pdf/${invoiceNumber}`;

    console.log(`[factus-pdf] Downloading PDF for: ${invoiceNumber} (type: ${isCreditNote ? 'credit_note' : 'invoice'})`);

    const pdfResponse = await fetch(pdfEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error(`[factus-pdf] Error: ${pdfResponse.status}`, errorText);
      return new Response(
        JSON.stringify({ error: 'No se pudo descargar el PDF desde FACTUS' }),
        { status: pdfResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FACTUS returns PDF as base64 in JSON: { "data": { "pdf_base_64_encoded": "..." } }
    const result = await pdfResponse.json();
    const pdfBase64 = result.data?.pdf_base_64_encoded || result.data?.pdf_base64;

    if (!pdfBase64) {
      // Fallback: maybe FACTUS returned the PDF directly as binary
      console.error('[factus-pdf] No PDF base64 found in response');
      return new Response(
        JSON.stringify({ error: 'FACTUS no devolvió el PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Return base64 PDF to frontend
    return new Response(
      JSON.stringify({
        success: true,
        pdf_base64: pdfBase64,
        filename: `factura-${invoiceNumber}.pdf`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-pdf] Error:', error.message);

    const status = error.message.includes('auth') || error.message.includes('token') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
