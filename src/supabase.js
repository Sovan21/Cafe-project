import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)) ||
  '';
const supabaseAnonKey =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)) ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseUrl.startsWith('http')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

if (typeof window !== 'undefined') {
  if (!isSupabaseConfigured) {
    console.info(
      "%c[L'Aura Hybrid Engine] Running in Instant Interactive Mode with Multi-Tab Realtime Broadcast.",
      "color: #e6a147; font-weight: bold; font-size: 12px;"
    );
  } else {
    console.info(
      "%c[L'Aura Hybrid Engine] Successfully connected to Live Supabase Backend & Cloud Realtime!",
      "color: #22c55e; font-weight: bold; font-size: 12px;"
    );
  }
}
