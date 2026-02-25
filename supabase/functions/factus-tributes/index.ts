// Edge Function: factus-tributes
// Fetches product tributes from FACTUS API and caches them locally
// GET /v1/tributes/products

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

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    await verifyAuth(req);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Check cache (24h TTL since tributes rarely change)
    if (!forceRefresh) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: cached } = await supabase
        .from('tributes')
        .select('*')
        .gte('fetched_at', oneDayAgo)
        .order('name');

      if (cached && cached.length > 0) {
        return new Response(
          JSON.stringify({ success: true, data: cached, source: 'cache' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch from FACTUS
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    const response = await fetch(`${factusUrl}/v1/tributes/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FACTUS tributes error: ${response.status}`);
    }

    const result = await response.json();
    let tributes: any[] = [];
    if (Array.isArray(result.data)) {
      tributes = result.data;
    } else if (result.data?.data && Array.isArray(result.data.data)) {
      tributes = result.data.data;
    }

    console.log(`[factus-tributes] Found ${tributes.length} tributes`);

    // Upsert into cache
    for (const t of tributes) {
      await supabase
        .from('tributes')
        .upsert(
          {
            factus_id: t.id,
            code: t.code || '',
            name: t.name || '',
            description: t.description || '',
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'factus_id' }
        );
    }

    // Return fresh data
    const { data: updated } = await supabase
      .from('tributes')
      .select('*')
      .order('name');

    return new Response(
      JSON.stringify({ success: true, data: updated || [], source: 'factus' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-tributes] Error:', error.message);
    const status = error.message.includes('auth') || error.message.includes('token') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
