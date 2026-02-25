// Edge Function: send-invoice-email
// Downloads PDF from FACTUS and sends it to the client via email
// Uses Supabase's built-in SMTP or FACTUS's own email sending

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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Verify JWT
    const authResult = await verifyAuth(req);
    if (!authResult.seller) {
      return new Response(
        JSON.stringify({ error: 'Solo vendedores pueden enviar facturas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sellerId = authResult.user.id;

    // 2. Parse body
    const body = await req.json();
    const { invoice_id, email } = body;

    if (!invoice_id || !email) {
      return new Response(
        JSON.stringify({ error: 'ID de factura y email son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch invoice (verify ownership)
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('id, number, reference_code, status, total, seller_id, clients(names, company, email)')
      .eq('id', invoice_id)
      .eq('seller_id', sellerId)
      .single();

    if (invError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Factura no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invoice.number) {
      return new Response(
        JSON.stringify({ error: 'La factura no tiene número asignado (no fue validada por la DIAN)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Get seller info for email context
    const { data: seller } = await supabase
      .from('sellers')
      .select('company_name, nit, phone')
      .eq('id', sellerId)
      .single();

    // 5. Download PDF from FACTUS
    const token = await getFactusToken();
    const factusUrl = getFactusApiUrl();

    const pdfResponse = await fetch(`${factusUrl}/v1/bills/download-pdf/${invoice.number}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    let pdfBase64 = null;
    if (pdfResponse.ok) {
      const pdfResult = await pdfResponse.json();
      pdfBase64 = pdfResult.data?.pdf_base_64_encoded || pdfResult.data?.pdf_base64;
    }

    // 6. Send email via Resend (if RESEND_API_KEY is configured)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev';

    if (resendKey) {
      const clientName = invoice.clients?.names || invoice.clients?.company || 'Cliente';
      const sellerName = seller?.company_name || 'Easy Bill';

      const emailPayload: Record<string, any> = {
        from: `${sellerName} <${fromEmail}>`,
        to: [email],
        subject: `Factura electrónica ${invoice.number} — ${sellerName}`,
        html: `
          <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7C3AED;">Factura electrónica ${invoice.number}</h2>
            <p>Estimado(a) ${clientName},</p>
            <p>Adjunto encontrará la factura electrónica <strong>${invoice.number}</strong> emitida por <strong>${sellerName}</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #FAF5FF;">
                <td style="padding: 10px; border: 1px solid #E9D5FF; font-weight: bold;">Número</td>
                <td style="padding: 10px; border: 1px solid #E9D5FF;">${invoice.number}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #E9D5FF; font-weight: bold;">Total</td>
                <td style="padding: 10px; border: 1px solid #E9D5FF;">$${Number(invoice.total).toLocaleString('es-CO')}</td>
              </tr>
            </table>
            ${pdfBase64 ? '<p>El PDF de la factura se encuentra adjunto a este correo.</p>' : '<p>Puede descargar la factura desde el portal de Easy Bill.</p>'}
            <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
              Este correo fue enviado por ${sellerName}${seller?.nit ? ` (NIT: ${seller.nit})` : ''} a través de Easy Bill.
            </p>
          </div>
        `,
      };

      // Attach PDF if available
      if (pdfBase64) {
        emailPayload.attachments = [
          {
            filename: `factura-${invoice.number}.pdf`,
            content: pdfBase64,
          },
        ];
      }

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!emailResponse.ok) {
        const emailError = await emailResponse.text();
        console.error('[send-invoice-email] Resend error:', emailError);
        return new Response(
          JSON.stringify({ error: 'Error al enviar el correo. Verifica la configuración de email.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[send-invoice-email] Email sent to ${email} for invoice ${invoice.number}`);
    } else {
      // Fallback: no email provider configured
      console.warn('[send-invoice-email] No RESEND_API_KEY configured. Email not sent.');
      return new Response(
        JSON.stringify({ error: 'Servicio de email no configurado. Contacta al administrador.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Factura enviada exitosamente a ${email}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[send-invoice-email] Error:', error.message);

    const status = error.message.includes('auth') || error.message.includes('token') ? 401 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
