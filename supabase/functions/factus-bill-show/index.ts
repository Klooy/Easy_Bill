// Edge Function: factus-bill-show
// Gets a single invoice detail from FACTUS API
// GET /v1/bills/show/:number

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
    await verifyAuth(req);

    const url = new URL(req.url);
    const invoiceNumber = url.searchParams.get('number');

    if (!invoiceNumber) {
      return new Response(
        JSON.stringify({ error: 'Número de factura es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    // Detect credit notes by NC prefix → different FACTUS endpoint
    // Bills: /v1/bills/show/:number   Credit notes: /v1/credit-notes/:number
    const isCreditNote = invoiceNumber.toUpperCase().startsWith('NC');
    const endpoint = isCreditNote
      ? `${factusUrl}/v1/credit-notes/${invoiceNumber}`
      : `${factusUrl}/v1/bills/show/${invoiceNumber}`;

    console.log(`[factus-bill-show] Fetching ${isCreditNote ? 'credit note' : 'bill'}: ${invoiceNumber}`);

    const factusResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!factusResponse.ok) {
      const errorText = await factusResponse.text();
      console.error('[factus-bill-show] FACTUS error:', factusResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'No se pudo obtener la factura desde FACTUS' }),
        { status: factusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const factusResult = await factusResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        data: factusResult.data || factusResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-bill-show] Error:', error.message);
    const status = error.message.includes('auth') || error.message.includes('token') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
