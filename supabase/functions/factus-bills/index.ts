// Edge Function: factus-bills
// Lists invoices from FACTUS API with pagination
// Admin-only endpoint to view all bills from the FACTUS account

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth, verifyAdmin } from '../_shared/auth-guard.ts';
import { getFactusToken, getFactusApiUrl } from '../_shared/factus-token.ts';

serve(async (req: Request) => {
  // CORS preflight
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
    // 1. Verify JWT — admin only
    const authResult = await verifyAuth(req);
    verifyAdmin(authResult);

    // 2. Parse query params for pagination and filters
    const url = new URL(req.url);
    const page = url.searchParams.get('page') || '1';
    const perPage = url.searchParams.get('per_page') || '10';
    const search = url.searchParams.get('search') || '';

    // 3. Get FACTUS token
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    // 4. Build FACTUS request URL
    let endpoint = `${factusUrl}/v1/bills?page=${page}&per_page=${perPage}`;
    if (search) {
      // FACTUS uses filter[field] syntax — search by number and identification
      endpoint += `&filter[number]=${encodeURIComponent(search)}`;
      endpoint += `&filter[identification]=${encodeURIComponent(search)}`;
      endpoint += `&filter[names]=${encodeURIComponent(search)}`;
    }

    console.log('[factus-bills] Fetching:', endpoint);

    // 5. Call FACTUS API
    const factusResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const factusResult = await factusResponse.json();

    if (!factusResponse.ok) {
      console.error('[factus-bills] FACTUS error:', JSON.stringify(factusResult));
      return new Response(
        JSON.stringify({
          error: factusResult.message || 'Error al obtener facturas de FACTUS',
          details: factusResult,
        }),
        {
          status: factusResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Return FACTUS response (includes pagination metadata)
    return new Response(
      JSON.stringify({
        success: true,
        data: factusResult.data || {},
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-bills] Error:', error.message);

    const status = error.message.includes('Admin access')
      ? 403
      : error.message.includes('auth') || error.message.includes('token')
      ? 401
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
