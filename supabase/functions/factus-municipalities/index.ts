// Edge Function: factus-municipalities
// Searches municipalities from FACTUS API for the client form
// Supports ?all=true to fetch the complete list for client-side caching

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

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify authenticated user
    await verifyAuth(req);

    const url = new URL(req.url);
    const fetchAll = url.searchParams.get('all') === 'true';
    const name = url.searchParams.get('name') || '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Check if we have cached municipalities ──
    const { count } = await supabase
      .from('municipalities')
      .select('id', { count: 'exact', head: true });

    const hasCachedData = (count ?? 0) > 0;

    // If no cache, populate from FACTUS API (paginate through all pages)
    if (!hasCachedData) {
      console.log('[factus-municipalities] Cache empty — syncing from FACTUS...');
      const token = await getFactusToken();
      const factusUrl = getFactusApiUrl();
      const allMunicipalities: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch(
          `${factusUrl}/v1/municipalities?page=${page}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );

        if (!res.ok) {
          console.error(`[factus-municipalities] FACTUS page ${page} error:`, res.status);
          break;
        }

        const json = await res.json();
        const items = json.data?.data || json.data || [];

        if (items.length === 0) {
          hasMore = false;
        } else {
          allMunicipalities.push(...items);
          // Check pagination — FACTUS uses Laravel pagination
          const lastPage = json.data?.last_page || json.last_page;
          if (lastPage && page >= lastPage) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      console.log(`[factus-municipalities] Fetched ${allMunicipalities.length} municipalities from FACTUS`);

      // Upsert into cache table in batches of 200
      if (allMunicipalities.length > 0) {
        const rows = allMunicipalities.map((m: any) => ({
          id: m.id,
          name: m.name,
          department: m.department || null,
        }));

        for (let i = 0; i < rows.length; i += 200) {
          const batch = rows.slice(i, i + 200);
          const { error: upsertError } = await supabase
            .from('municipalities')
            .upsert(batch, { onConflict: 'id' });
          if (upsertError) {
            console.error('[factus-municipalities] Upsert error:', upsertError.message);
          }
        }
      }
    }

    // ── Serve from cache ──
    if (fetchAll) {
      // Return everything for client-side caching (Colombia has ~1,122 municipalities)
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: page, error: pageError } = await supabase
          .from('municipalities')
          .select('id, name, department')
          .order('name')
          .range(from, from + pageSize - 1);

        if (pageError) throw pageError;
        if (page && page.length > 0) {
          allData.push(...page);
          from += pageSize;
          if (page.length < pageSize) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: allData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtered search with ilike
    if (!name || name.length < 1) {
      return new Response(
        JSON.stringify({ success: true, data: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('municipalities')
      .select('id, name, department')
      .or(`name.ilike.%${name}%,department.ilike.%${name}%`)
      .order('name')
      .limit(30);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data: data || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[factus-municipalities] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
