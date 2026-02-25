// Edge Function: factus-ranges-manage
// Admin-only range management: create, update consecutive, delete, sync DIAN
// Supports: POST (create), PATCH (update), DELETE (delete), GET (sync DIAN)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth, verifyAdmin } from '../_shared/auth-guard.ts';
import { getFactusToken, getFactusApiUrl } from '../_shared/factus-token.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await verifyAuth(req);
    verifyAdmin(authResult);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();
    const url = new URL(req.url);
    const action = url.searchParams.get('action'); // create, update, delete, sync-dian

    // ── GET: Sync DIAN ranges ──
    if (req.method === 'GET' && action === 'sync-dian') {
      const response = await fetch(`${factusUrl}/v1/numbering-ranges/dian`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FACTUS DIAN ranges error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return new Response(
        JSON.stringify({ success: true, data: result.data || result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── GET: List all ranges (including inactive) ──
    if (req.method === 'GET') {
      const response = await fetch(`${factusUrl}/v1/numbering-ranges`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`FACTUS ranges error: ${response.status}`);
      }

      const result = await response.json();
      let ranges: any[] = [];
      if (Array.isArray(result.data)) ranges = result.data;
      else if (result.data?.data && Array.isArray(result.data.data)) ranges = result.data.data;

      return new Response(
        JSON.stringify({ success: true, data: ranges }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── POST: Create a new range ──
    if (req.method === 'POST') {
      const body = await req.json();
      const { document, prefix, current, resolution_number } = body;

      if (!document || !prefix) {
        return new Response(
          JSON.stringify({ error: 'document y prefix son requeridos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const factusBody: Record<string, any> = { document, prefix };
      if (current !== undefined) factusBody.current = current;
      if (resolution_number) factusBody.resolution_number = resolution_number;

      const response = await fetch(`${factusUrl}/v1/numbering-ranges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(factusBody),
      });

      const result = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: result.message || 'Error al crear rango',
            factus_response: result,
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Also cache the new range locally
      const newRange = result.data || result;
      if (newRange.id) {
        await supabase.from('numbering_ranges').upsert(
          {
            factus_id: newRange.id,
            document: newRange.document?.name || String(document),
            prefix: newRange.prefix,
            from_number: newRange.from,
            to_number: newRange.to,
            current_number: newRange.current,
            resolution_number: newRange.resolution_number,
            start_date: newRange.start_date,
            end_date: newRange.end_date,
            technical_key: newRange.technical_key || null,
            is_active: true,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'factus_id' }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Rango creado exitosamente', data: newRange }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── PATCH: Update consecutive ──
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { range_id, current } = body;

      if (!range_id || current === undefined) {
        return new Response(
          JSON.stringify({ error: 'range_id y current son requeridos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${factusUrl}/v1/numbering-ranges/${range_id}/current`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ current }),
      });

      const result = await response.json();

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: result.message || 'Error al actualizar consecutivo',
            factus_response: result,
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update local cache
      await supabase
        .from('numbering_ranges')
        .update({ current_number: current, fetched_at: new Date().toISOString() })
        .eq('factus_id', range_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Consecutivo actualizado', data: result.data || result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── DELETE: Delete a range ──
    if (req.method === 'DELETE') {
      const rangeId = url.searchParams.get('range_id');

      if (!rangeId) {
        return new Response(
          JSON.stringify({ error: 'range_id es requerido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${factusUrl}/v1/numbering-ranges/${rangeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const resultText = await response.text();
      let result: any;
      try { result = JSON.parse(resultText); } catch { result = { raw: resultText }; }

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            error: result.message || 'Error al eliminar rango',
            factus_response: result,
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Remove from local cache
      await supabase.from('numbering_ranges').delete().eq('factus_id', parseInt(rangeId));

      return new Response(
        JSON.stringify({ success: true, message: result.message || 'Rango eliminado exitosamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-ranges-manage] Error:', error.message);
    const status = error.message.includes('Unauthorized') || error.message.includes('admin')
      ? 403
      : error.message.includes('auth') || error.message.includes('token')
        ? 401
        : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
