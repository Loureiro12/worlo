import { useTranslation } from '@worlo/i18n';
import {
  alpha,
  Button,
  Chip,
  ChipRow,
  colors,
  Globe,
  type GlobeHandle,
  Icon,
  IconButton,
  layout,
  radius,
  Segmented,
  Sheet,
  StatusMarker,
  shadow,
  Text,
} from '@worlo/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddTripSheet } from '@/components/AddTripSheet';
import { DemoGate, useIsEmpty } from '@/components/DemoGate';
import { useCatalog } from '@/data/catalog';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { useVisitedMap } from '@/data/world';
import { countCities } from '@/features/profile/stats';
import { countryFlag, useCountryName } from '@/lib/countries';
import type { CountryId } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { CountrySummaryPanel } from './CountrySummaryPanel';
import { usePlannedCountries } from './shared';

export type MapFilter = 'all' | 'visited' | 'wishlist';

/** Layers shown on the globe for a filter + year (prototype `globeOpts('main')`). */
export function mapLayers(
  visitedMap: Record<CountryId, string[]>,
  wishlistIds: readonly CountryId[],
  filter: MapFilter,
  year: string,
  plannedIds: readonly CountryId[] = [],
) {
  let visited = Object.keys(visitedMap);
  let wishlist: readonly CountryId[] = wishlistIds;
  let planned: readonly CountryId[] = plannedIds;
  if (year !== 'all') {
    visited = visited.filter((id) => visitedMap[id]?.includes(year));
    wishlist = [];
    planned = [];
  }
  if (filter === 'visited') {
    wishlist = [];
    planned = [];
  }
  if (filter === 'wishlist') {
    visited = [];
    planned = [];
  }
  return { visited, wishlist, planned };
}

/** B2 · Mapa: fullscreen globe with filters, controls, legend and the country summary. */
export function MapScreen() {
  return (
    <DemoGate loading error dark>
      <MapContent />
    </DemoGate>
  );
}

function MapContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  // The tab bar may sit below the screen (in-flow) or over it: measure our area.
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const { width, height } = size;
  const globe = useRef<GlobeHandle>(null);
  const empty = useIsEmpty();

  const visitedMap = useVisitedMap();
  const wishIds = useQuery(
    () => repos.world.wishes().flatMap((w) => (w.countryIso ? [w.countryIso] : [])),
    [],
  );
  const tripsCount = useQuery(() => repos.trips.list().length, []);
  const { CITIES } = useCatalog();
  const globeCities = useMemo(
    () => CITIES.map((c) => ({ name: c.n, coordinates: c.c, photos: c.ph })),
    [CITIES],
  );
  const selected = useStore((s) => s.mapSelection);
  const select = useStore((s) => s.selectMapCountry);
  const rememberCountryName = useStore((s) => s.rememberCountryName);
  const countryName = useCountryName();

  const [filter, setFilter] = useState<MapFilter>('all');
  const [year, setYear] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  // Empty demo state: the map is "apagado" (nothing marked).
  const shownVisitedMap = empty ? {} : visitedMap;
  const wishlistIds = useMemo(() => (empty ? [] : wishIds), [empty, wishIds]);
  const plannedIds = usePlannedCountries();
  const layers = useMemo(() => {
    const l = mapLayers(shownVisitedMap, wishlistIds, filter, year, plannedIds);
    return empty ? { ...l, planned: [] } : l;
  }, [shownVisitedMap, wishlistIds, filter, year, empty, plannedIds]);
  const years = useMemo(
    () => [...new Set(Object.values(shownVisitedMap).flat())].sort().reverse(),
    [shownVisitedMap],
  );

  const visitedCount = Object.keys(shownVisitedMap).length;
  const citiesCount = empty ? 0 : countCities(repos.trips.list());
  const trips = empty ? 0 : tripsCount;
  const stats = [
    t('common.count.countries', { count: visitedCount }),
    t('common.count.cities', { count: citiesCount }),
    t('common.count.trips', { count: trips }),
  ].join(' · ');

  const pick = (id: CountryId, name: string) => {
    rememberCountryName(id, name);
    select(id);
  };

  const listIds = useMemo(() => {
    const ids = new Set<CountryId>([
      ...Object.keys(shownVisitedMap),
      ...(empty ? [] : plannedIds),
      ...wishlistIds,
    ]);
    return [...ids].sort((a, b) => countryName(a).localeCompare(countryName(b)));
  }, [shownVisitedMap, wishlistIds, plannedIds, empty, countryName]);

  const overlapsTabBar = height >= window.height - 1;
  const tabBarTop = overlapsTabBar ? layout.tabBarHeight + insets.bottom : 0;
  const sheetOpen = Boolean(selected);

  return (
    <View
      testID="map-screen"
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w > 0 && h > 0 && (w !== width || h !== height)) setSize({ width: w, height: h });
      }}
      style={{ flex: 1, backgroundColor: colors.backgroundDark, overflow: 'hidden' }}
    >
      <StatusBar style="light" />
      <View style={{ position: 'absolute', left: 0, top: 0 }}>
        <Globe
          ref={globe}
          testID="map-globe"
          width={width}
          height={height}
          visited={layers.visited}
          wishlist={layers.wishlist}
          planned={layers.planned}
          selected={selected}
          autoRotate={selected ? 0 : 0.05}
          initialRotation={[50, -5]}
          scale={0.98}
          offsetY={sheetOpen ? -150 : 20}
          markers
          cities={globeCities}
          photosLabel={(n) => t('common.count.photos', { count: n })}
          glow
          centerOnPick
          onPickCountry={pick}
          accessibilityLabel={t('map.globeLabel', {
            visited: layers.visited.length,
            wishlist: layers.wishlist.length,
            planned: layers.planned.length,
          })}
        />
      </View>

      {/* Header: gradient carvão → transparent */}
      <LinearGradient
        pointerEvents="box-none"
        colors={[colors.backgroundDark, colors.backgroundDark, 'transparent']}
        locations={[0, 0.6, 1]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top + 12,
          paddingHorizontal: layout.gutter,
          gap: 12,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text variant="h1" tone="inverse" accessibilityRole="header" numberOfLines={1}>
            {t('map.title')}
          </Text>
          <Text
            testID="map-stats"
            variant="caption"
            weight={600}
            tone="inverseMuted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {stats}
          </Text>
        </View>
        <Segmented<MapFilter>
          testID="map-filter"
          label={t('map.filter.label')}
          onDark
          height={36}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('map.filter.all') },
            { value: 'visited', label: t('map.filter.visited') },
            { value: 'wishlist', label: t('map.filter.wishlist') },
          ]}
        />
        <View accessibilityLabel={t('map.years.label')} style={{ paddingBottom: 12 }}>
          <ChipRow>
            {['all', ...years].map((y) => (
              <Chip
                key={y}
                testID={`map-year-${y}`}
                onDark
                label={y === 'all' ? t('map.years.all') : y}
                selected={year === y}
                onPress={() => setYear(y)}
              />
            ))}
          </ChipRow>
        </View>
      </LinearGradient>

      {/* Right column controls */}
      <View style={{ position: 'absolute', right: 16, top: 300, gap: 8 }}>
        <View style={{ marginBottom: 6 }}>
          <IconButton
            testID="map-share"
            icon="export"
            label={t('map.controls.share')}
            tone="coral"
            size={44}
            onPress={() => router.push(routes.share('map'))}
          />
        </View>
        <MapControl
          testID="map-zoom-in"
          icon="plus"
          label={t('map.controls.zoomIn')}
          onPress={() => globe.current?.zoomIn()}
        />
        <MapControl
          testID="map-zoom-out"
          icon="minus"
          label={t('map.controls.zoomOut')}
          onPress={() => globe.current?.zoomOut()}
        />
        <MapControl
          testID="map-recenter"
          icon="crosshair"
          label={t('map.controls.recenter')}
          onPress={() => {
            globe.current?.recenter();
            select(null);
          }}
        />
        <MapControl
          testID="map-country-list"
          icon="flag"
          label={t('map.controls.list')}
          onPress={() => setListOpen(true)}
        />
      </View>

      {empty && !selected ? (
        <View
          testID="map-empty"
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: tabBarTop + 16,
            padding: 18,
            gap: 8,
            borderRadius: radius.r24,
            backgroundColor: colors.surface,
            boxShadow: shadow.sheetMap,
          }}
        >
          <Text variant="overline" tone="link">
            {t('map.empty.overline')}
          </Text>
          <Text variant="h3">{t('map.empty.title')}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <Button
              testID="map-empty-mark"
              label={t('map.empty.mark')}
              size="sm"
              flex={1}
              onPress={() => router.push(routes.onboardingMap)}
            />
            <Button
              testID="map-empty-add"
              label={t('map.empty.addTrip')}
              variant="outline"
              size="sm"
              flex={1}
              onPress={() => setAddOpen(true)}
            />
          </View>
        </View>
      ) : null}

      {!selected && !empty ? <MapLegend bottom={tabBarTop + 16} /> : null}

      {selected ? (
        <CountrySummaryPanel
          id={selected}
          bottom={tabBarTop + 8}
          onClose={() => select(null)}
          onOpenPage={() => router.push(routes.country(selected))}
        />
      ) : null}

      <Sheet
        visible={listOpen}
        onClose={() => setListOpen(false)}
        title={t('map.list.title')}
        subtitle={t('map.list.subtitle')}
        testID="map-country-list-sheet"
        closeLabel={t('common.actions.close')}
      >
        <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 4 }}>
          {listIds.map((id) => (
            <Pressable
              key={id}
              testID={`map-country-${id}`}
              accessibilityRole="button"
              accessibilityLabel={countryName(id)}
              onPress={() => {
                setListOpen(false);
                select(id);
                globe.current?.focusCountry(id);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 48,
                paddingHorizontal: 4,
                borderRadius: radius.r12,
                backgroundColor: pressed ? colors.background : 'transparent',
              })}
            >
              <Text style={{ fontSize: 24, lineHeight: 30 }}>{countryFlag(id)}</Text>
              <Text variant="label" style={{ flex: 1 }}>
                {countryName(id)}
              </Text>
              <Icon name="caret-right" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>

      <AddTripSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </View>
  );
}

function MapControl({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: 'plus' | 'minus' | 'crosshair' | 'flag';
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <View style={{ borderRadius: 22, borderWidth: 1, borderColor: alpha.darkBorder }}>
      <IconButton
        testID={testID}
        icon={icon}
        label={label}
        tone="map"
        size={44}
        onPress={onPress}
      />
    </View>
  );
}

function MapLegend({ bottom }: { bottom: number }) {
  const { t } = useTranslation();
  const item = (status: 'visited' | 'planned' | 'wishlist', label: string, size: number) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <StatusMarker status={status} size={size} />
      <Text variant="caption" weight={600} tone="inverse" style={{ fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
  return (
    <View
      testID="map-legend"
      pointerEvents="none"
      style={{ position: 'absolute', left: layout.gutter, right: layout.gutter, bottom, gap: 10 }}
    >
      <View
        accessible
        accessibilityLabel={[
          t('map.legend.visited'),
          t('map.legend.planned'),
          t('map.legend.wishlist'),
        ].join(', ')}
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row',
          gap: 14,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: radius.full,
          backgroundColor: alpha.mapControl,
          borderWidth: 1,
          borderColor: alpha.darkBorder,
        }}
      >
        {item('visited', t('map.legend.visited'), 14)}
        {item('planned', t('map.legend.planned'), 12)}
        {item('wishlist', t('map.legend.wishlist'), 12)}
      </View>
      <Text variant="caption" tone="inverseMuted" weight={400}>
        {t('map.legend.hint')}
      </Text>
    </View>
  );
}
