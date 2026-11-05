import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Creates an isolated, ephemeral Supabase client instance.
 *
 * Concurrency & Safety:
 * - Each invocation returns a distinct client instance with its own configuration.
 * - When an accessToken is provided, it is forwarded in the Authorization bearer header,
 *   scoping all database and storage operations to the authenticated user under Row Level Security (RLS).
 * - Never cache or share an authenticated client across multiple concurrent requests to prevent
 *   credential leakage between users.
 * - Session persistence and auto-refresh are disabled for stateless server execution.
 *
 * @param {string|null} [accessToken=null] - Optional user JWT access token.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export const createSupabaseClient = (accessToken = null) => {
  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  };

  if (accessToken && typeof accessToken === 'string' && accessToken.trim().length > 0) {
    options.global = {
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
      },
    };
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, options);
};

/**
 * Default unauthenticated/anonymous Supabase client instance using the publishable key.
 * Strictly used for public/unauthenticated queries. Does NOT hold user state or tokens.
 */
export const supabase = createSupabaseClient();
