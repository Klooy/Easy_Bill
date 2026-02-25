// Edge Function: factus-units
// Fetches measurement units from FACTUS API and caches them locally
// GET /v1/measurement-units

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
    const nameFilter = url.searchParams.get('name') || '';

    // Check cache (24h TTL since units rarely change)
    if (!forceRefresh) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let query = supabase
        .from('measurement_units')
        .select('*')
        .gte('fetched_at', oneDayAgo)
        .order('name');

      if (nameFilter) {
        query = query.ilike('name', `%${nameFilter}%`);
      }

      const { data: cached } = await query;

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

    let apiUrl = `${factusUrl}/v1/measurement-units`;
    if (nameFilter) apiUrl += `?name=${encodeURIComponent(nameFilter)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FACTUS units error: ${response.status}`);
    }

    const result = await response.json();
    let units: any[] = [];
    if (Array.isArray(result.data)) {
      units = result.data;
    } else if (result.data?.data && Array.isArray(result.data.data)) {
      units = result.data.data;
    }

    console.log(`[factus-units] Found ${units.length} measurement units`);

    // Upsert into cache
    for (const u of units) {
      await supabase
        .from('measurement_units')
        .upsert(
          {
            factus_id: u.id,
            code: u.code || '',
            name: u.name || '',
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'factus_id' }
        );
    }

    // Return fresh data
    let freshQuery = supabase
      .from('measurement_units')
      .select('*')
      .order('name');

    if (nameFilter) {
      freshQuery = freshQuery.ilike('name', `%${nameFilter}%`);
    }

    const { data: updated } = await freshQuery;

    return new Response(
      JSON.stringify({ success: true, data: updated || [], source: 'factus' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-units] Error:', error.message);
    const status = error.message.includes('auth') || error.message.includes('token') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
