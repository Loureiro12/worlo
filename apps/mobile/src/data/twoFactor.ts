import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mfa } from '@/lib/auth';

/**
 * Two-factor state (Supabase Auth MFA, online). Unknown (`undefined`) while it
 * loads or without connection: the toggle stays off and disabled then.
 */
const KEY = ['twoFactor'] as const;

export type TwoFactorState = { factorId: string | null };

export function useTwoFactor() {
  const query = useQuery({
    queryKey: KEY,
    networkMode: 'always',
    queryFn: async (): Promise<TwoFactorState> => {
      const result = await mfa.status();
      if (!result.ok) throw new Error(result.code);
      return result.data;
    },
  });
  return { factorId: query.data?.factorId ?? null, known: query.data !== undefined };
}

/** Refresh after enrolling/unenrolling. */
export function useRefreshTwoFactor() {
  const client = useQueryClient();
  return (state: TwoFactorState) => {
    client.setQueryData(KEY, state);
  };
}
