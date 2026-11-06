import { useTranslation } from '@worlo/i18n';
import { Avatar, colors, Icon, Text, useToast } from '@worlo/ui';
import { Fragment, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { getCatalog } from '@/data/catalog';
import { updateItinerary, useItineraries } from '@/data/planning';
import { repos } from '@/data/repositories';
import { isSaved, toggleSaved, useIsSaved as useSavedFlag } from '@/data/saved';
import { useQuery } from '@/data/useQuery';
import { countryIdForFlag, withDay, withStop } from '@/features/planning/planning';
import type { CityItem, CityTabKey, CountryId, PlaceTip, SavedItem } from '@/mocks/types';

/** Countries "em roteiro/planejamento" on the map: where my itineraries go. */
function plannedCountries(): CountryId[] {
  const ids = repos.planning.itineraries().map((it) => countryIdForFlag(it.flag));
  return [...new Set(ids.filter((id): id is CountryId => Boolean(id)))];
}

export function usePlannedCountries(): CountryId[] {
  return useQuery(plannedCountries, []);
}

export type CountryStatus = 'visited' | 'planned' | 'wishlist' | 'none';

/** Precedence follows the globe: visited > planned > wishlist > none. */
export function useCountryStatus(id: CountryId | null | undefined): CountryStatus {
  return useQuery((): CountryStatus => {
    if (!id) return 'none';
    if (repos.world.visitedMap()[id]) return 'visited';
    if (plannedCountries().includes(id)) return 'planned';
    if (repos.world.wishes().some((w) => w.countryIso === id)) return 'wishlist';
    return 'none';
  }, [id]);
}

export const hasCountryPage = (id: CountryId) => Boolean(getCatalog().COUNTRY_PAGES[id]);

/** Lisboa is the only city with a page in the mocks; the region and places hang off it. */
export const LISBOA = {
  name: 'Lisboa',
  countryId: '620',
  country: 'Portugal',
  region: 'Lisboa e Vale do Tejo',
  flag: '🇵🇹',
} as const;

/** Tabs of the city page, in the prototype order (content per tab is catalog). */
export const CITY_TAB_KEYS: readonly CityTabKey[] = ['attr', 'food', 'shop', 'move', 'serv'];

/** Finds a Lisboa item (any category) by name, for the place page fallback. */
export function findCityItem(name: string): { item: CityItem; tab: CityTabKey } | null {
  for (const tab of CITY_TAB_KEYS) {
    const item = getCatalog().CITY_TABS[tab]?.items.find((i) => i.name === name);
    if (item) return { item, tab };
  }
  return null;
}

export const savedIdFor = (name: string) => `ci-${name}`;

/** SavedItem built from a city row (prototype `toggleSave` payload). */
export function savedItemFor(item: CityItem, tab: CityTabKey | null): SavedItem {
  return {
    id: savedIdFor(item.name),
    name: item.name,
    // SavedCategory has no "Compras"/"Transporte": everything but food is an attraction.
    cat: tab === 'food' ? 'Gastronomia' : 'Atrações',
    city: LISBOA.name,
    flag: LISBOA.flag,
    meta: item.meta.split(' · ')[0] ?? item.meta,
    rating: item.rating ?? '—',
  };
}

export function useIsSaved(id: string) {
  return useSavedFlag(id);
}

/** Toggles a saved place with the F8 toasts ("Salvo nos seus lugares." / "Removido dos salvos."). */
export function useToggleSaved() {
  const { t } = useTranslation();
  const toast = useToast();
  return useCallback(
    (item: SavedItem) => {
      const was = isSaved(item.id);
      toggleSaved(item);
      if (was) toast.show(t('map.toasts.savedRemoved'), 'info');
      else toast.show(t('map.toasts.savedAdded'));
    },
    [t, toast],
  );
}

export type Crumb = { label: string; onPress?: () => void; testID?: string };

/** "Europa › Portugal › Lisboa": earlier crumbs can be links (coral-700); the last is the current page. */
export function Breadcrumb({ items }: { items: readonly Crumb[] }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={t('map.breadcrumb', { path: items.map((i) => i.label).join(', ') })}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}
    >
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <Fragment key={item.label}>
            {item.onPress ? (
              <Pressable
                testID={item.testID}
                accessibilityRole="link"
                accessibilityLabel={item.label}
                hitSlop={8}
                onPress={item.onPress}
              >
                <Text variant="caption" weight={600} tone="link">
                  {item.label}
                </Text>
              </Pressable>
            ) : (
              <Text variant="caption" weight={600} tone={last ? 'default' : 'muted'}>
                {item.label}
              </Text>
            )}
            {last ? null : (
              <Text variant="caption" weight={600} tone="muted" accessibilityElementsHidden>
                ›
              </Text>
            )}
          </Fragment>
        );
      })}
    </View>
  );
}

/** "Dicas de quem foi" card: avatar 28, author, time, text, "% confirmam". */
export function TipCard({ tip, avatarSize = 28 }: { tip: PlaceTip; avatarSize?: number }) {
  const { t } = useTranslation();
  return (
    <View
      style={{
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: colors.surface,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Avatar name={tip.who} initials={tip.ini} size={avatarSize} />
        <Text variant="label" weight={700}>
          {tip.who}
        </Text>
        <Text variant="caption" tone="muted" style={{ fontSize: 12 }}>
          {tip.when}
        </Text>
      </View>
      <Text variant="body">{tip.text}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="seal-check" size={14} color={tip.pct ? colors.success : colors.textMuted} />
        <Text
          variant="caption"
          weight={700}
          tone={tip.pct ? 'success' : 'muted'}
          style={{ fontSize: 12 }}
        >
          {tip.pct ? t('map.place.confirm', { pct: tip.pct }) : t('community.reliability.waiting')}
        </Text>
      </View>
    </View>
  );
}

/** Bookmark toggle used on city rows and the place hero. */
export function SaveToggle({
  saved,
  onPress,
  onLongPress,
  label,
  testID,
}: {
  saved: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  label: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: saved }}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon
        name="bookmark-simple"
        size={20}
        weight={saved ? 'fill' : 'regular'}
        color={saved ? colors.primary : colors.text}
      />
    </Pressable>
  );
}

/** Route params arrive decoded already; decode defensively for deep links. */
export function decodeParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * "Adicionar ao roteiro": the stop goes to the last day of my latest itinerary
 * (the toast names it). Without an itinerary there is nowhere to put it: says so.
 */
export function useAddToItinerary() {
  const { t } = useTranslation();
  const toast = useToast();
  const itineraries = useItineraries();
  return (name: string, note: string) => {
    const target = itineraries[0];
    if (!target) {
      toast.show(t('map.place.noItinerary'), 'info');
      return;
    }
    // The same experience once per itinerary (the city is its context, not a stop).
    const already = target.days.some((d) =>
      d.items.some((s) => s.title === name && (s.note === note || !s.note)),
    );
    if (already) {
      toast.show(
        t('map.place.alreadyInItinerary', { place: name, itinerary: target.title }),
        'info',
      );
      return;
    }
    const stop = {
      time: t('map.place.timeTbd'),
      icon: 'map-pin' as const,
      title: name,
      note,
      cost: 0,
    };
    updateItinerary(target.id, (it) => {
      const days = it.days.length ? it.days : withDay(it.days, '');
      return { ...it, days: withStop(days, days.length - 1, stop) };
    });
    toast.show(t('map.place.addedToItinerary', { place: name, itinerary: target.title }));
  };
}
