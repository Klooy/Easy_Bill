// Edge Function: factus-auth
// Proxy endpoint to test FACTUS authentication
// Returns token status (not the actual token)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth, verifyAdmin } from '../_shared/auth-guard.ts';
import { getFactusToken } from '../_shared/factus-token.ts';

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only admin can test FACTUS auth
    const authResult = await verifyAuth(req);
    verifyAdmin(authResult);

    // Get/refresh token
    const token = await getFactusToken();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'FACTUS authentication successful',
        token_preview: `${token.substring(0, 20)}...`,
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
