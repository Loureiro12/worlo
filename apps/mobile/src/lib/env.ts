const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const env = {
  /** Null when the backend is not configured: the app then runs fully local. */
  supabase: url && key ? { url, key } : null,
};
