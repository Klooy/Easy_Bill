// Auth guard for Edge Functions
// Verifies JWT and returns user + seller info

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AuthResult {
  user: {
    id: string;
    email: string;
    role: string;
  };
  seller: {
    id: string;
    company_name: string;
    status: string;
    invoice_quota: number;
    invoice_used: number;
    must_change_password: boolean;
  } | null;
}

export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new Error('No authorization header');
  }

  // Create client with user's JWT to get their identity
  const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    throw new Error('Invalid or expired token');
  }

  const role = user.user_metadata?.role || 'seller';

  // Use service role to read seller profile (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  let seller = null;

  if (role === 'seller') {
    const { data, error } = await supabaseAdmin
      .from('sellers')
      .select('id, company_name, status, invoice_quota, invoice_used, must_change_password')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      throw new Error('Seller profile not found');
    }

    if (data.status === 'suspended') {
      throw new Error('Account suspended');
    }

    seller = data;
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
      role,
    },
    seller,
  };
}

export function verifyAdmin(authResult: AuthResult): void {
  if (authResult.user.role !== 'admin') {
    throw new Error('Admin access required');
  }
}
