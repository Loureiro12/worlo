import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { repos, setCurrentUserId } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { onSessionUser, takePendingName } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: { id: string; email: string } };

const AuthContext = createContext<AuthState>({ status: 'loading', user: null });

/**
 * The Supabase session. `initial` fixes the state (tests); otherwise it follows
 * the persisted session, which loads before the first `INITIAL_SESSION` event.
 */
export function AuthProvider({ children, initial }: { children: ReactNode; initial?: AuthState }) {
  const [state, setState] = useState<AuthState>(() => {
    const first: AuthState =
      initial ??
      (supabase ? { status: 'loading', user: null } : { status: 'signedOut', user: null });
    setCurrentUserId(first.user?.id ?? null);
    return first;
  });

  useEffect(() => {
    if (!supabase || initial) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      onSessionUser(user?.id ?? null);
      setCurrentUserId(user?.id ?? null);
      setState(
        user
          ? { status: 'signedIn', user: { id: user.id, email: user.email ?? '' } }
          : { status: 'signedOut', user: null },
      );
    });
    return () => data.subscription.unsubscribe();
  }, [initial]);

  // Apple/Google send the name only on the first sign-in: apply it once the
  // server-created profile has synced down.
  const profile = useQuery(() => repos.profile.get(), []);
  useEffect(() => {
    if (!profile || profile.name) return;
    const name = takePendingName();
    if (name) repos.profile.update({ name });
  }, [profile]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
