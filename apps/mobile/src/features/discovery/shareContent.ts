import { useTranslation } from '@worlo/i18n';
import { type AvatarProps, alpha, type IconName, palette } from '@worlo/ui';
import { useCatalog } from '@/data/catalog';
import { collaboratorsOf, isListed } from '@/data/collab';
import { useMe } from '@/data/profile';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { countryFlag, WORLD_COUNTRIES } from '@/lib/countries';
import { img } from '@/lib/images';
import { avatarFor, firstName, joinNames, ME } from '@/lib/people';
import { demoKey } from '@/mocks/demo';
import type { ItineraryDay } from '@/mocks/types';
import type { ShareSubject } from '@/navigation/routes';
import type { ShareFormat, ShareTheme } from '@/store/slices/discovery';

export const SHARE_SUBJECTS: readonly { key: ShareSubject; icon: IconName }[] = [
  { key: 'map', icon: 'globe-hemisphere-west' },
  { key: 'year', icon: 'chart-bar' },
  { key: 'trip', icon: 'suitcase-rolling' },
  { key: 'retro', icon: 'film-strip' },
  { key: 'roteiro', icon: 'map-trifold' },
  { key: 'ach', icon: 'medal' },
];

export const SHARE_FORMATS: readonly ShareFormat[] = ['story', 'post', 'square'];
export const SHARE_THEME_KEYS: readonly ShareTheme[] = ['dark', 'coral', 'sand'];

export function isShareSubject(value: unknown): value is ShareSubject {
  return SHARE_SUBJECTS.some((s) => s.key === value);
}

/** Preview size in pt (02_SCREENS → J). Export scales to 1080 px wide. */
export const PREVIEW_SIZE: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 232, height: 412 },
  post: { width: 290, height: 362 },
  square: { width: 300, height: 300 },
};

/** `#RRGGBB` + opacity → rgba(), so translucent layers still come from palette tokens. */
export function withAlpha(hex: string, opacity: number): string {
  const v = Number.parseInt(hex.replace('#', ''), 16);
  return `rgba(${v >> 16},${(v >> 8) & 0xff},${v & 0xff},${opacity})`;
}

export type PreviewTheme = {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  pin: string;
  onPin: string;
  card: string;
  line: string;
};

/** The three share themes (02_SCREENS → J → Temas), mapped to palette tokens. */
export const SHARE_THEMES: Record<ShareTheme, PreviewTheme> = {
  dark: {
    bg: palette.carvao,
    fg: palette.branco,
    muted: palette.linha,
    accent: palette.coral300,
    pin: palette.coral,
    onPin: palette.carvao,
    card: alpha.darkChip,
    line: alpha.darkBorder,
  },
  coral: {
    bg: palette.coral,
    fg: palette.carvao,
    muted: palette.cinza800,
    accent: palette.carvao,
    pin: palette.carvao,
    onPin: palette.branco,
    card: withAlpha(palette.carvao, 0.1),
    line: withAlpha(palette.carvao, 0.18),
  },
  sand: {
    bg: palette.areia,
    fg: palette.carvao,
    muted: palette.cinza600,
    accent: palette.coral700,
    pin: palette.coral,
    onPin: palette.carvao,
    card: palette.branco,
    line: palette.linha,
  },
};

/** Achievements that can be shared (prototype → ACH). Mock content, pt-BR. */
export const ACHIEVEMENTS: Record<string, { icon: IconName; meta: string }> = {
  'Primeira viagem': { icon: 'airplane-takeoff', meta: 'Rio de Janeiro · 2019' },
  '5 países': { icon: 'globe-hemisphere-west', meta: 'Desbloqueada em mar 2024' },
  'Fim do mundo': { icon: 'mountains', meta: 'Patagônia · 2024' },
};
export const DEFAULT_ACHIEVEMENT = 'Fim do mundo';

/** Read-only views of the user's trips / itineraries (rows from SQLite). */
function useShareRecords() {
  const trips = useQuery(
    () =>
      // Shared trips I joined count; invites I haven't answered don't.
      repos.trips
        .list()
        .filter((row) => isListed('trip', row))
        .map((row) => ({
          id: row.id,
          /** Prototype key for demo trips (`floripa`): picks the mock photos. */
          imgKey: demoKey(row.id, 'trip'),
          title: row.title,
          place: row.place,
          country: row.country,
          flag: row.flag,
          period: row.period,
          year: row.year,
          days: row.days,
          photos: row.photos,
          places: row.places,
          collab: collaboratorsOf('trip', row),
          best: typeof row.details?.best === 'string' ? row.details.best : '',
        })),
    [],
  );
  const itineraries = useQuery(
    () =>
      repos.planning.itineraries().map((row) => ({
        id: row.id,
        imgKey: demoKey(row.id, 'itinerary'),
        title: row.title,
        place: row.place,
        flag: row.flag,
        dates: row.dates,
        days: row.days as ItineraryDay[],
      })),
    [],
  );
  const visitedMap = useQuery(() => repos.world.visitedMap(), []);
  return { trips, itineraries, visitedMap };
}

/** Matches a route id: the row uuid, or the prototype key of a demo record. */
const byRouteId = (id: string | undefined) => (x: { id: string; imgKey: string }) =>
  id !== undefined && (x.id === id || x.imgKey === id);

/** Everything the preview draws, from SQLite + the catalog (prototype → shareVals). */
export function useShareContent(params: {
  format: ShareFormat;
  tripId?: string;
  roteiroId?: string;
  achievement?: string;
}) {
  const { t, i18n } = useTranslation();
  const me = useMe();
  const { trips, itineraries, visitedMap } = useShareRecords();
  const { CITIES } = useCatalog();
  const lang = i18n.language;
  const number = (n: number) => n.toLocaleString(lang);

  const visited = Object.keys(visitedMap);
  const nCountries = visited.length;
  const nCities = Math.max(CITIES.length - 1, 0);
  const nTrips = trips.length;
  const nPhotos = trips.reduce((sum, trip) => sum + trip.photos, 0);
  const nDays = trips.reduce((sum, trip) => sum + trip.days, 0);
  const pct = ((nCountries / WORLD_COUNTRIES) * 100).toLocaleString(lang, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const trip = trips.find(byRouteId(params.tripId)) ?? trips[0];
  const collaborators = (trip?.collab ?? []).filter((c) => c.status === 'ok').map((c) => c.name);
  const roteiro = itineraries.find(byRouteId(params.roteiroId)) ?? itineraries[0];
  const achTitle =
    params.achievement && ACHIEVEMENTS[params.achievement]
      ? params.achievement
      : DEFAULT_ACHIEVEMENT;
  const ach = ACHIEVEMENTS[achTitle] ?? { icon: 'medal' as IconName, meta: '' };
  const tripsLabel = t('common.count.trips', { count: nTrips });
  const countriesLabel = t('common.count.countries', { count: nCountries });

  return {
    handle: `@${me.user}`,
    user: me.user,
    link: `https://worlo.app/${me.user}`,
    map: {
      visited,
      countries: number(nCountries),
      countriesUnit: t('share.units.countries', { count: nCountries }),
      worldLine: t('share.preview.worldLine', {
        pct,
        cities: t('common.count.cities', { count: nCities }),
        trips: tripsLabel,
      }),
      flags: visited.map(countryFlag).join(''),
    },
    year: {
      title:
        params.format === 'story'
          ? t('share.preview.yearTitleLong', { trips: tripsLabel, countries: countriesLabel })
          : t('share.preview.yearTitleShort', { trips: tripsLabel, countries: countriesLabel }),
      stats: [
        { n: number(nCountries), l: t('share.units.countries', { count: nCountries }) },
        { n: number(nCities), l: t('share.units.cities', { count: nCities }) },
        { n: number(nPhotos), l: t('share.units.photos', { count: nPhotos }) },
        { n: number(nDays), l: t('share.units.daysTraveling', { count: nDays }) },
      ],
      favoriteImg: img('patagonia-a', 500, 400),
      favorite: t('share.preview.favorite', { name: 'Patagônia de carro' }),
    },
    trip: {
      img: img(`${trip?.imgKey}-a`, 600, 700),
      place:
        `${trip?.flag ?? ''} ${trip?.place ?? ''}${trip?.country ? `, ${trip.country}` : ''}`.trim(),
      title: trip?.title ?? '',
      period: trip?.period ?? '',
      year: trip?.year ?? '',
      people: [ME, ...collaborators]
        .slice(0, 4)
        .map((name) => avatarFor(name, name === ME ? me.avatar : null)) as Omit<
        AvatarProps,
        'size' | 'ringColor'
      >[],
      withText: collaborators.length
        ? t('share.preview.with', {
            names: joinNames(collaborators.map(firstName), t('common.list.and')),
          })
        : '',
      stats: [
        { n: number(trip?.days ?? 0), l: t('share.units.days', { count: trip?.days ?? 0 }) },
        { n: number(trip?.photos ?? 0), l: t('share.units.photos', { count: trip?.photos ?? 0 }) },
        { n: number(trip?.places ?? 0), l: t('share.units.places', { count: trip?.places ?? 0 }) },
      ],
      collage: [0, 1, 2].map((i) =>
        img(`${trip?.imgKey}-p${i}`, i === 0 ? 500 : 300, i === 0 ? 600 : 300),
      ),
      best: trip?.best || trip?.title || '',
    },
    roteiro: {
      img: img(`rot-${roteiro?.imgKey}`, 600, 300),
      title: roteiro?.title ?? '',
      meta: `${roteiro?.flag ?? ''} ${roteiro?.place ?? ''} · ${roteiro?.dates ?? ''}`.trim(),
      days: (roteiro?.days ?? []).slice(0, params.format === 'square' ? 2 : 4).map((d, i) => ({
        n: t('share.preview.day', { n: i + 1 }),
        label: d.items[0]?.title ?? d.label,
      })),
    },
    ach: { title: achTitle, icon: ach.icon, meta: ach.meta },
  };
}

export type ShareContent = ReturnType<typeof useShareContent>;
