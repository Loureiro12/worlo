import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type { Database } from './database.types';
export type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export type SupabaseClientOptions = {
  url: string;
  anonKey: string;
  /** Persistent storage for the auth session (e.g. expo-sqlite's localStorage). */
  storage: SupportedStorage;
};

export function createSupabaseClient({ url, anonKey, storage }: SupabaseClientOptions) {
  return createClient<Database>(url, anonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
