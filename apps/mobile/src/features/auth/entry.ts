import type { useRouter } from 'expo-router';
import { type AuthErrorCode, type AuthResult, mfa } from '@/lib/auth';
import { routes } from '@/navigation/routes';

/**
 * After signing in / up / resetting the password, screens hand over to the
 * splash gate (`/`), which waits for the first sync and picks onboarding or
 * the tabs. The pending entry tells it to skip the brand intro (the user just
 * saw the app) and whether to greet ("Bem-vinda de volta, Ana."). With 2FA on,
 * the code screen comes first (the database answers only AAL2 sessions).
 */
type Entry = { greet: boolean };

let pending: Entry | null = null;

export async function enterApp(
  router: ReturnType<typeof useRouter>,
  entry: Entry = { greet: false },
): Promise<void> {
  pending = entry;
  router.replace((await mfa.needsChallenge()) ? routes.twoFactor : routes.splash);
}

export const peekEntry = () => pending;

export function clearEntry() {
  pending = null;
}

/** `auth.errors.server.<code>` of a failed result (null on success or cancel). */
export function failureCode(result: AuthResult): AuthErrorCode | null {
  return !result.ok && 'code' in result ? result.code : null;
}
