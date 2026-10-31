import type { Profile } from '@worlo/db';
import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * The signed-in user's profile (SQLite `profiles`, synced). Screens use the
 * `Me` view shape of the visual phase; the e-mail comes from the auth session.
 */

export type Me = {
  name: string;
  user: string;
  city: string;
  bio: string;
  email: string;
  avatar: string | null;
};

export type Privacy = Profile['privacy'];
export type Currency = Profile['currency'];
export type Units = Profile['units'];
export type PrivacyDetail = Profile['privacyDetail'];
export type NotificationPrefs = Profile['notificationPrefs'];

/** Account preferences stored on the profile (follow the user across devices). */
export type ProfilePrefs = {
  currency: Currency;
  units: Units;
  privacy: Privacy;
  privacyDetail: PrivacyDetail;
  notifications: NotificationPrefs;
  autoOrganizePhotos: boolean;
};

/** Same defaults as the server (`profiles` columns). Only used before the profile syncs. */
export const DEFAULT_PREFS: ProfilePrefs = {
  currency: 'BRL',
  units: 'metric',
  privacy: 'friends',
  privacyDetail: { map: true, trips: true, photos: false, search: true },
  notifications: { memories: true, community: true, itineraries: true, promos: false },
  autoOrganizePhotos: true,
};

export function toMe(profile: Profile | undefined, email: string): Me {
  return {
    name: profile?.name ?? '',
    user: profile?.username ?? '',
    city: profile?.city ?? '',
    bio: profile?.bio ?? '',
    email,
    avatar: profile?.avatarUrl ?? null,
  };
}

export function toPrefs(profile: Profile | undefined): ProfilePrefs {
  if (!profile) return DEFAULT_PREFS;
  return {
    currency: profile.currency,
    units: profile.units,
    privacy: profile.privacy,
    privacyDetail: profile.privacyDetail,
    notifications: profile.notificationPrefs,
    autoOrganizePhotos: profile.autoOrganizePhotos,
  };
}

/** The raw profile row (undefined until the first sync lands it). */
export function useProfile(): Profile | undefined {
  return useQuery(() => repos.profile.get(), []);
}

export function useMe(): Me {
  const profile = useProfile();
  const { user } = useAuth();
  const email = user?.email ?? '';
  return useMemo(() => toMe(profile, email), [profile, email]);
}

export function useProfilePrefs(): ProfilePrefs {
  const profile = useProfile();
  return useMemo(() => toPrefs(profile), [profile]);
}

/** Editar perfil / foto. The e-mail is an auth change (`auth.updateEmail`), not a profile field. */
export function updateMe(patch: Partial<Omit<Me, 'email'>>) {
  const { user, avatar, ...rest } = patch;
  repos.profile.update({
    ...rest,
    ...(user !== undefined && { username: user }),
    ...(avatar !== undefined && { avatarUrl: avatar }),
  });
}

export function updatePrefs(patch: Partial<ProfilePrefs>) {
  const { notifications, ...rest } = patch;
  repos.profile.update({
    ...rest,
    ...(notifications !== undefined && { notificationPrefs: notifications }),
  });
}

/** Onboarding done (or skipped): the gate sends the user to the tabs from now on. */
export function completeOnboarding() {
  repos.profile.update({ onboardedAt: new Date().toISOString() });
}
