import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { createClient } from '@supabase/supabase-js';
import { wipeLocalData } from '@worlo/db';
import * as AppleAuthentication from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { dataEvents } from '@/data/events';
import { resetStore } from '@/store';
import { db } from './database';
import { env } from './env';
import { preferences } from './preferences';
import { setBadge } from './push';
import { supabase } from './supabase';

/**
 * Account actions (Supabase Auth). Screens call these and translate the
 * returned error code with `auth.errors.<code>`; data itself never goes through
 * here (that's the SQLite repositories + sync).
 */

export type AuthErrorCode =
  | 'invalidCredentials'
  | 'emailTaken'
  | 'weakPassword'
  | 'emailNotConfirmed'
  | 'rateLimited'
  | 'network'
  | 'notConfigured'
  | 'invalidCode'
  | 'unknown';

export type AuthResult =
  | { ok: true }
  | { ok: false; code: AuthErrorCode }
  | { ok: false; cancelled: true };

const ok: AuthResult = { ok: true };
const fail = (code: AuthErrorCode): AuthResult => ({ ok: false, code });
const cancelled: AuthResult = { ok: false, cancelled: true };

export function authErrorCode(error: unknown): AuthErrorCode {
  const e = error as { code?: string; status?: number; name?: string; message?: string } | null;
  switch (e?.code) {
    case 'invalid_credentials':
      return 'invalidCredentials';
    case 'user_already_exists':
    case 'email_exists':
      return 'emailTaken';
    case 'weak_password':
      return 'weakPassword';
    case 'email_not_confirmed':
      return 'emailNotConfirmed';
    case 'mfa_verification_failed':
    case 'mfa_challenge_expired':
      return 'invalidCode';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'rateLimited';
  }
  if (
    e?.name === 'AuthRetryableFetchError' ||
    e?.status === 0 ||
    /network/i.test(e?.message ?? '')
  ) {
    return 'network';
  }
  return 'unknown';
}

type Client = NonNullable<typeof supabase>;

/** Runs a Supabase Auth call with the configured client and maps its error. */
async function run(fn: (client: Client) => Promise<{ error: unknown }>): Promise<AuthResult> {
  if (!supabase) return fail('notConfigured');
  try {
    const { error } = await fn(supabase);
    return error ? fail(authErrorCode(error)) : ok;
  } catch (error) {
    return fail(authErrorCode(error));
  }
}

/** Name from Apple/Google (only sent on the first sign-in), applied to the profile once it syncs. */
let pendingName: string | null = null;
export const takePendingName = () => {
  const name = pendingName;
  pendingName = null;
  return name;
};

export const auth = {
  /** Without e-mail confirmation (current setup) the user is signed in right away. */
  signUp: (name: string, email: string, password: string) =>
    run(async (sb) => {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      });
      if (!error && !data.session) return { error: { code: 'email_not_confirmed' } };
      return { error };
    }),

  signIn: (email: string, password: string) =>
    run((sb) => sb.auth.signInWithPassword({ email: email.trim(), password })),

  /** iOS only (Apple doesn't offer native Sign in with Apple on Android). */
  appleAvailable: Platform.OS === 'ios',

  async signInWithApple(): Promise<AuthResult> {
    if (!supabase) return fail('notConfigured');
    try {
      const nonce = randomUUID();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: await digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce),
      });
      if (!credential.identityToken) return fail('unknown');
      const name = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ');
      if (name) pendingName = name;
      return run((sb) =>
        sb.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken as string,
          nonce,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return cancelled;
      return fail(authErrorCode(error));
    }
  },

  googleAvailable: env.google !== null,

  async signInWithGoogle(): Promise<AuthResult> {
    if (!supabase || !env.google) return fail('notConfigured');
    try {
      GoogleSignin.configure({
        webClientId: env.google.webClientId,
        iosClientId: env.google.iosClientId,
      });
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return cancelled;
      const { idToken, user } = response.data;
      if (!idToken) return fail('unknown');
      if (user.name) pendingName = user.name;
      return run((sb) => sb.auth.signInWithIdToken({ provider: 'google', token: idToken }));
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return cancelled;
      return fail(authErrorCode(error));
    }
  },

  /** The e-mail links back to the app (`worlo://reset-password`), see `sessionFromUrl`. */
  sendPasswordReset: (email: string) =>
    run((sb) =>
      sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: Linking.createURL('reset-password'),
      }),
    ),

  /** Signs in from a recovery link (`#access_token=…&refresh_token=…`). */
  async sessionFromUrl(url: string): Promise<AuthResult> {
    const params = new URLSearchParams(url.split('#')[1] ?? '');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return fail('unknown');
    return run((sb) => sb.auth.setSession({ access_token, refresh_token }));
  },

  updatePassword: (password: string) => run((sb) => sb.auth.updateUser({ password })),

  /**
   * Checks a password without touching the app's session: a throwaway client
   * signs in and out. (Signing in on the main client would replace the session,
   * and with 2FA on the new one would be AAL1 again, locked out of the data.)
   */
  async verifyPassword(email: string, password: string): Promise<AuthResult> {
    if (!env.supabase) return fail('notConfigured');
    const probe = createClient(env.supabase.url, env.supabase.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    try {
      const { error } = await probe.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return fail(authErrorCode(error));
      await probe.auth.signOut({ scope: 'local' });
      return ok;
    } catch (error) {
      return fail(authErrorCode(error));
    }
  },

  /** Confirms the current password first (Configurações → E-mail asks for it). */
  async updateEmail(currentEmail: string, password: string, newEmail: string): Promise<AuthResult> {
    const check = await auth.verifyPassword(currentEmail, password);
    if (!check.ok) return check;
    return run((sb) => sb.auth.updateUser({ email: newEmail.trim() }));
  },

  /** Signs out and erases this account's data from the device. */
  async signOut(): Promise<void> {
    await supabase?.auth.signOut({ scope: 'local' }).catch(() => {});
    clearDevice();
    setBadge(0);
  },

  /** Configurações → Excluir conta: removes the account and all its data on the server. */
  async deleteAccount(): Promise<AuthResult> {
    const result = await run(async (sb) => sb.rpc('delete_my_account'));
    if (result.ok) await auth.signOut();
    return result;
  },
};

/** A TOTP factor being enrolled: the secret goes into the authenticator app. */
export type TotpEnrollment = { factorId: string; secret: string; uri: string };

export type MfaResult<T> = { ok: true; data: T } | { ok: false; code: AuthErrorCode };

async function runData<T>(
  fn: (client: Client) => Promise<{ data: T | null; error: unknown }>,
): Promise<MfaResult<T>> {
  if (!supabase) return { ok: false, code: 'notConfigured' };
  try {
    const { data, error } = await fn(supabase);
    if (error || data === null) return { ok: false, code: authErrorCode(error) };
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: authErrorCode(error) };
  }
}

/**
 * Two-factor authentication (TOTP, Supabase Auth MFA). With a verified factor
 * the database only answers AAL2 sessions (`aal_ok()`), so a password/Apple/
 * Google sign-in must pass the code challenge before entering the app.
 */
export const mfa = {
  /** The verified TOTP factor (null = 2FA off). Online (reads the user). */
  status: () =>
    runData(async (sb) => {
      const { data, error } = await sb.auth.mfa.listFactors();
      return { data: data ? { factorId: data.totp[0]?.id ?? null } : null, error };
    }),

  /** Starts enrolling (drops half-finished enrollments first). */
  enroll: () =>
    runData<TotpEnrollment>(async (sb) => {
      const factors = await sb.auth.mfa.listFactors();
      if (factors.error) return { data: null, error: factors.error };
      for (const f of factors.data.all) {
        if (f.factor_type === 'totp' && f.status !== 'verified') {
          await sb.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', issuer: 'Worlo' });
      return {
        data: data ? { factorId: data.id, secret: data.totp.secret, uri: data.totp.uri } : null,
        error,
      };
    }),

  /** Activates an enrolled factor (or passes the sign-in challenge) with a 6-digit code. */
  verify: (factorId: string, code: string) =>
    run((sb) => sb.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })),

  unenroll: (factorId: string) => run((sb) => sb.auth.mfa.unenroll({ factorId })),

  /** Signed in at AAL1 with a verified factor: the code is still missing. Local (no network). */
  async needsChallenge(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      return data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
    } catch {
      return false;
    }
  },

  /** Sign-in challenge: verifies the code against the account's TOTP factor. */
  async challenge(code: string): Promise<AuthResult> {
    const current = await mfa.status();
    if (!current.ok) return current;
    if (!current.data.factorId) return fail('unknown');
    return mfa.verify(current.data.factorId, code);
  },
};

/** Erases local data so the next account starts clean. */
export function clearDevice() {
  wipeLocalData(db);
  resetStore();
  preferences.setLastUserId(null);
  dataEvents.emit();
}

/**
 * Called on every session change. A different account than the one whose data
 * is on the device (or a signed-out session) means the local data must go.
 */
export function onSessionUser(userId: string | null) {
  const last = preferences.getLastUserId();
  if (userId && last && last !== userId) clearDevice();
  if (userId) preferences.setLastUserId(userId);
}
