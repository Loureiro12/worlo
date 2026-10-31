const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const googleWeb = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIos = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export const env = {
  /** Null when the backend is not configured: nobody can sign in. */
  supabase: url && key ? { url, key } : null,
  /** Null until the Google Cloud OAuth clients exist: the Google button is hidden. */
  google: googleWeb ? { webClientId: googleWeb, iosClientId: googleIos } : null,
};
