// Edge Function: factus-ranges
// Fetches numbering ranges from FACTUS API and caches them locally

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

  try {
    // Verify authenticated user
    await verifyAuth(req);

    // Check if we have fresh cached ranges (less than 1 hour old)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: cachedRanges } = await supabase
      .from('numbering_ranges')
      .select('*')
      .gte('fetched_at', oneHourAgo)
      .order('prefix');

    // Return cache if fresh
    if (cachedRanges && cachedRanges.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: cachedRanges,
          source: 'cache',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch from FACTUS
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    const response = await fetch(`${factusUrl}/v1/numbering-ranges`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FACTUS ranges error: ${response.status} ${errorText}`);
    }

    const factusData = await response.json();
    console.log('[factus-ranges] FACTUS raw response keys:', Object.keys(factusData));

    // FACTUS may return ranges in different structures:
    // { data: [...] } or { data: { data: [...] } } (paginated)
    let ranges: any[] = [];
    if (Array.isArray(factusData.data)) {
      ranges = factusData.data;
    } else if (factusData.data?.data && Array.isArray(factusData.data.data)) {
      ranges = factusData.data.data;
    } else if (Array.isArray(factusData)) {
      ranges = factusData;
    }

    console.log('[factus-ranges] Found', ranges.length, 'ranges');

    // Upsert ranges into cache
    for (const range of ranges) {
      console.log('[factus-ranges] Upserting range:', range.id, range.prefix, range.document);
      await supabase
        .from('numbering_ranges')
        .upsert(
          {
            factus_id: range.id,
            document: range.document?.name || range.document || '',
            prefix: range.prefix,
            from_number: range.from,
            to_number: range.to,
            current_number: range.current,
            resolution_number: range.resolution_number,
            start_date: range.start_date,
            end_date: range.end_date,
            technical_key: range.technical_key || null,
            is_active: range.is_active === 1 || range.is_active === true,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'factus_id' }
        );
    }

    // Fetch updated cache to return consistent data
    const { data: updatedRanges } = await supabase
      .from('numbering_ranges')
      .select('*')
      .eq('is_active', true)
      .order('prefix');

    return new Response(
      JSON.stringify({
        success: true,
        data: updatedRanges || [],
        source: 'factus',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const error = err as Error;
    const status = error.message.includes('auth') || error.message.includes('token')
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
