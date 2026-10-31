import type { Slice } from '../types';

export type Me = {
  name: string;
  user: string;
  city: string;
  bio: string;
  email: string;
  avatar: string | null;
};

export type SessionSlice = {
  me: Me;
  signedIn: boolean;
  /** Finished welcome → signup → onboarding. */
  onboarded: boolean;
  signIn: (patch?: Partial<Me>) => void;
  signOut: () => void;
  completeOnboarding: () => void;
  updateMe: (patch: Partial<Me>) => void;
};

export const initialMe: Me = {
  name: 'Ana Ribeiro',
  user: 'anaviaja',
  city: 'São Paulo',
  bio: 'Viajo devagar, como bem e volto sempre com uma lista maior do que fui.',
  email: 'ana@gmail.com',
  avatar: null,
};

export const createSessionSlice: Slice<SessionSlice> = (set) => ({
  me: initialMe,
  signedIn: false,
  onboarded: false,
  signIn: (patch) => set((s) => ({ signedIn: true, me: { ...s.me, ...patch } })),
  signOut: () => set({ signedIn: false }),
  completeOnboarding: () => set({ onboarded: true, signedIn: true }),
  updateMe: (patch) => set((s) => ({ me: { ...s.me, ...patch } })),
});
