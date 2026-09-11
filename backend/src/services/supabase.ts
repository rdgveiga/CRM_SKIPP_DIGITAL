import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '../config/env';

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_KEY');
    }
    client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function isDbReachable(): boolean {
  if (!isSupabaseConfigured()) return false;
  try {
    void db();
    return true;
  } catch {
    return false;
  }
}