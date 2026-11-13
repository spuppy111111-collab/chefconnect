import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key] as string;
    }
  } catch {
    // ignore
  }
  return '';
};

const SUPABASE_PROJECT_URL =
  getEnv('VITE_SUPABASE_URL') || 'https://zulksvxujzfpcgmidsfr.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  'sb_publishable_RBoG1DeZDNFbsqDi9NmkLw_QMS2_rKN';

export const isSupabaseConfigured = Boolean(
  SUPABASE_PROJECT_URL &&
  SUPABASE_PUBLISHABLE_KEY &&
  !SUPABASE_PROJECT_URL.includes('your-project') &&
  !SUPABASE_PROJECT_URL.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export const SUPABASE_CONFIG = {
  projectRef: 'zulksvxujzfpcgmidsfr',
  projectUrl: SUPABASE_PROJECT_URL,
  publishableKey: SUPABASE_PUBLISHABLE_KEY,
};
