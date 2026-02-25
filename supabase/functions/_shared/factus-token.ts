// FACTUS Token Manager
// Handles OAuth token acquisition, caching, and refresh
// Stores tokens in the factus_tokens table (single row)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FACTUS_API_URL = Deno.env.get('FACTUS_API_URL') || 'https://api-sandbox.factus.com.co';
const FACTUS_CLIENT_ID = Deno.env.get('FACTUS_CLIENT_ID')!;
const FACTUS_CLIENT_SECRET = Deno.env.get('FACTUS_CLIENT_SECRET')!;
const FACTUS_EMAIL = Deno.env.get('FACTUS_EMAIL')!;
const FACTUS_PASSWORD = Deno.env.get('FACTUS_PASSWORD')!;

// Buffer: refresh 2 minutes before expiration
const EXPIRY_BUFFER_MS = 2 * 60 * 1000;

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Get a valid FACTUS access token.
 * First checks the cache (factus_tokens table).
 * If expired, attempts refresh. If refresh fails, does full auth.
 */
export async function getFactusToken(): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Check cached token
  const { data: cached } = await supabase
    .from('factus_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('id', 1)
    .single();

  if (cached) {
    const expiresAt = new Date(cached.expires_at).getTime();
    const now = Date.now();

    // Token still valid
    if (now < expiresAt - EXPIRY_BUFFER_MS) {
      return cached.access_token;
    }

    // Try refresh
    if (cached.refresh_token) {
      try {
        const refreshed = await refreshFactusToken(cached.refresh_token);
        await saveToken(supabase, refreshed);
        return refreshed.access_token;
      } catch {
        // Refresh failed, will do full auth below
        console.log('[FACTUS] Refresh failed, doing full auth');
      }
    }
  }

  // 2. Full authentication
  const tokenData = await authenticateFactus();
  await saveToken(supabase, tokenData);
  return tokenData.access_token;
}

/**
 * Authenticate with FACTUS using password grant
 */
async function authenticateFactus(): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: FACTUS_CLIENT_ID,
    client_secret: FACTUS_CLIENT_SECRET,
    username: FACTUS_EMAIL,
    password: FACTUS_PASSWORD,
  });

  const response = await fetch(`${FACTUS_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FACTUS auth failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

/**
 * Refresh FACTUS token using refresh_token grant
 */
async function refreshFactusToken(refreshToken: string): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: FACTUS_CLIENT_ID,
    client_secret: FACTUS_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${FACTUS_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`FACTUS refresh failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

/**
 * Save token to factus_tokens table (upsert single row)
 */
async function saveToken(supabase: ReturnType<typeof createClient>, tokenData: TokenData) {
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  const { error } = await supabase
    .from('factus_tokens')
    .upsert({
      id: 1,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[FACTUS] Error saving token:', error.message);
  }
}

/**
 * Get FACTUS API base URL
 */
export function getFactusApiUrl(): string {
  return FACTUS_API_URL;
}
