// Edge Function: factus-delete-bill
// Deletes an unvalidated invoice from FACTUS by reference_code
// DELETE /v1/bills/reference/:reference_code

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

  if (req.method !== 'DELETE') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authResult = await verifyAuth(req);
    const sellerId = authResult.user.id;

    // Get reference_code from query params
    const url = new URL(req.url);
    const referenceCode = url.searchParams.get('reference_code');
    const invoiceId = url.searchParams.get('invoice_id');

    if (!referenceCode) {
      return new Response(
        JSON.stringify({ error: 'reference_code es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the invoice belongs to this seller and is not validated
    if (invoiceId) {
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select('id, status, seller_id, reference_code')
        .eq('id', invoiceId)
        .eq('seller_id', sellerId)
        .single();

      if (invError || !invoice) {
        return new Response(
          JSON.stringify({ error: 'Factura no encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (invoice.status === 'issued') {
        return new Response(
          JSON.stringify({ error: 'No se puede eliminar una factura ya validada por la DIAN' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Call FACTUS to delete
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    console.log(`[factus-delete-bill] Deleting bill with reference: ${referenceCode}`);

    const factusResponse = await fetch(`${factusUrl}/v1/bills/reference/${referenceCode}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const factusText = await factusResponse.text();
    let factusResult: any;
    try { factusResult = JSON.parse(factusText); } catch { factusResult = { raw: factusText }; }

    // If FACTUS returns 404, the bill doesn't exist there (already deleted or never sent).
    // In that case, still clean up the local record.
    if (!factusResponse.ok && factusResponse.status !== 404) {
      console.error('[factus-delete-bill] FACTUS error:', factusResponse.status, factusText);
      return new Response(
        JSON.stringify({
          error: factusResult.message || 'Error al eliminar la factura en FACTUS',
          factus_response: factusResult,
        }),
        { status: factusResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (factusResponse.status === 404) {
      console.log(`[factus-delete-bill] Bill not found in FACTUS (already deleted or never sent): ${referenceCode}`);
    }

    // Update local record to 'deleted' status
    if (invoiceId) {
      await supabase
        .from('invoices')
        .update({ status: 'deleted' })
        .eq('id', invoiceId);
    }

    console.log(`[factus-delete-bill] Successfully deleted: ${referenceCode}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: factusResponse.status === 404
          ? 'Factura no existía en FACTUS, registro local eliminado'
          : (factusResult.message || 'Factura eliminada exitosamente'),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[factus-delete-bill] Error:', error.message);
    const status = error.message.includes('auth') || error.message.includes('token') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
