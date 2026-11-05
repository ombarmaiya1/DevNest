import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || process.env || {};

const supabaseUrl =
  env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabasePublishableKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-publishable-key';

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    'VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not defined in the environment. Using fallback configuration.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
