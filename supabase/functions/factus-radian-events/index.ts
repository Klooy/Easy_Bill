// Edge Function: factus-radian-events
// Gets RADIAN events for an invoice from FACTUS
// GET /v1/bills/:number/radian/events

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

    console.log(`[factus-radian-events] Fetching events for: ${invoiceNumber}`);

    const factusResponse = await fetch(`${factusUrl}/v1/bills/${invoiceNumber}/radian/events`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!factusResponse.ok) {
      const errorText = await factusResponse.text();
      console.error('[factus-radian-events] Error:', factusResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'No se pudieron obtener los eventos RADIAN' }),
        { status: factusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await factusResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data || result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-radian-events] Error:', error.message);
    const status = error.message.includes('auth') || error.message.includes('token') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
