// Edge Function: admin-create-seller
// Creates a new seller: auth user + seller profile in one step
// Only accessible by admin users

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth, verifyAdmin } from '../_shared/auth-guard.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Verify admin
    const authResult = await verifyAuth(req);
    verifyAdmin(authResult);

    // 2. Parse body
    const body = await req.json();
    const {
      email,
      password,
      company_name,
      nit,
      phone,
      address,
      invoice_quota = 0,
    } = body;

    // 3. Validate required fields
    if (!email || !password || !company_name) {
      return new Response(
        JSON.stringify({
          error: 'Email, contraseña y nombre de empresa son requeridos',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Create auth user with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'seller',
        company_name,
      },
    });

    if (authError) {
      const message = authError.message.includes('already registered')
        ? 'Este email ya está registrado'
        : authError.message;

      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    // 5. Create seller profile
    const { error: sellerError } = await supabase
      .from('sellers')
      .insert({
        id: userId,
        company_name,
        nit: nit || null,
        phone: phone || null,
        address: address || null,
        status: 'active',
        invoice_quota: 0,
        invoice_used: 0,
        must_change_password: true,
        created_by: authResult.user.id,
      });

    if (sellerError) {
      // Rollback: delete auth user if seller profile fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Error creating seller profile: ${sellerError.message}`);
    }

    // 6. Assign initial credits if provided
    if (invoice_quota > 0) {
      await supabase.rpc('assign_invoice_credits', {
        p_seller_id: userId,
        p_quantity: invoice_quota,
        p_assigned_by: authResult.user.id,
        p_note: 'Paquete inicial',
      });
    }

    // 7. Return success with credentials summary
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Vendedor creado exitosamente',
        data: {
          id: userId,
          email,
          password,
          company_name,
          nit,
          invoice_quota,
          must_change_password: true,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error('[admin-create-seller] Error:', error.message);

    const status = error.message.includes('auth') || error.message.includes('token')
      ? 401
      : error.message.includes('Admin')
      ? 403
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
