import 'expo-sqlite/localStorage/install';
import { createSupabaseClient } from '@worlo/supabase';
import { env } from './env';

export const supabase = env.supabase
  ? createSupabaseClient({
      url: env.supabase.url,
      anonKey: env.supabase.key,
      storage: globalThis.localStorage,
    })
  : null;
