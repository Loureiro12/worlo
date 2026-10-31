import type { Href } from 'expo-router';

/**
 * Every navigation target in the app (03_FLOWS → Mapa de navegação).
 * Screens call these instead of writing paths, so the route tree can change in
 * one place.
 *
 * - Tab roots use their explicit group ("/(tabs)/(map)/map") so switching tabs
 *   never pushes a tab root inside another tab's stack.
 * - Shared detail routes (trip, country, post…) keep the current tab: Expo
 *   Router resolves them inside the group you navigate from, so the tab bar
 *   stays and "back" returns to where the user was.
 * - Fullscreen routes (no tab bar) live in the root stack.
 */

export type TabKey = 'explore' | 'map' | 'trips' | 'community' | 'profile';

export type TripFormParams = {
  mode: 'onboarding' | 'new' | 'edit';
  kind: 'past' | 'future';
  id?: string;
  dest?: string;
};

export type ShareSubject = 'map' | 'year' | 'trip' | 'retro' | 'roteiro' | 'ach';

export type CfgSection =
  | 'account'
  | 'email'
  | 'security'
  | 'language'
  | 'currency'
  | 'units'
  | 'privacy'
  | 'export'
  | 'help'
  | 'delete';

const tab = (key: TabKey) => `/(tabs)/(${key})/${key}` as Href;

export const routes = {
  // Opening, account and onboarding (fullscreen)
  splash: '/' as Href,
  welcome: '/welcome' as Href,
  signup: '/signup' as Href,
  login: '/login' as Href,
  forgot: '/forgot' as Href,
  onboardingMap: '/onboarding/map' as Href,
  firstMap: '/onboarding/first-map' as Href,
  tripForm: (params: TripFormParams): Href => ({ pathname: '/trip-form', params }),

  // Tabs
  tab,
  explore: tab('explore'),
  map: tab('map'),
  trips: tab('trips'),
  community: tab('community'),
  profile: tab('profile'),

  // Shared detail screens (keep the tab bar)
  trip: (id: string): Href => `/trip/${id}`,
  future: (id: string): Href => `/future/${id}`,
  country: (id: string): Href => `/country/${id}`,
  region: (id: string): Href => `/region/${encodeURIComponent(id)}`,
  city: (id: string): Href => `/city/${encodeURIComponent(id)}`,
  place: (id: string): Href => `/place/${encodeURIComponent(id)}`,
  recs: '/recs' as Href,
  passeios: '/passeios' as Href,
  saved: '/saved' as Href,
  collections: '/collections' as Href,
  collection: (id: string): Href => `/collection/${id}`,
  post: (id: string): Href => `/post/${id}`,
  traveler: (id: string): Href => `/traveler/${encodeURIComponent(id)}`,
  photos: '/photos' as Href,
  settings: '/settings' as Href,

  // Fullscreen screens (no tab bar)
  retro: (tripId: string): Href => `/retro/${tripId}`,
  roteiro: (id: string, mode: 'mine' | 'rec' = 'mine'): Href => ({
    pathname: '/roteiro/[id]',
    params: { id, mode },
  }),
  live: '/live' as Href,
  passeio: (id: string): Href => `/passeio/${id}`,
  anuncie: '/anuncie' as Href,
  share: (subject: ShareSubject, params: { tripId?: string; roteiroId?: string } = {}): Href => ({
    pathname: '/share',
    params: { subject, ...params },
  }),
  chat: (id: string): Href => `/chat/${encodeURIComponent(id)}`,
  notifs: '/notifs' as Href,
  invite: (id: string): Href => `/invite/${id}`,
  search: '/search' as Href,
  compose: (
    params: { type?: 'Dica' | 'Avaliação' | 'Roteiro' | 'Pergunta'; place?: string } = {},
  ): Href => ({
    pathname: '/compose',
    params,
  }),
  cfg: (section: CfgSection): Href => `/cfg/${section}`,
  designSystem: '/design-system' as Href,
} as const;

export const TAB_KEYS: readonly TabKey[] = ['explore', 'map', 'trips', 'community', 'profile'];
