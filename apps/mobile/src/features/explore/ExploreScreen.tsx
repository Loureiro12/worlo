import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  Chip,
  ChipRow,
  colors,
  Fab,
  Icon,
  IconButton,
  ListRow,
  makeStyles,
  Photo,
  Rating,
  Screen,
  SearchPill,
  SectionHeader,
  TabHeader,
  Text,
  useToast,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AddTripSheet } from '@/components/AddTripSheet';
import { DemoGate, useIsEmpty } from '@/components/DemoGate';
import { img } from '@/lib/images';
import { firstName } from '@/lib/people';
import { EXPERIENCES, PLACES, POPULAR, TRIPS } from '@/mocks/data.generated';
import type { PlaceToKnow } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { selectUnreadCount } from '@/store/slices/notifications';
import { placeToKnowTarget } from './searchIndex';

type Category = 'all' | 'beaches' | 'cities' | 'trails';
const CATEGORIES: readonly Category[] = ['all', 'beaches', 'cities', 'trails'];
const CATEGORY_FILTER: Record<Category, PlaceToKnow['cat'] | null> = {
  all: null,
  beaches: 'Praias',
  cities: 'Cidades',
  trails: 'Trilhas',
};

/** Featured tours on Explorar, in the order of EXPERIENCES. */
const EXPERIENCE_TOURS = ['tejo', 'nata', 'lagoinha'] as const;

/** B1 · Explorar (tab root). */
export function ExploreScreen() {
  return (
    <DemoGate loading error>
      <ExploreContent />
    </DemoGate>
  );
}

function ExploreContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const empty = useIsEmpty();
  const me = useStore((s) => s.me);
  const unread = useStore(selectUnreadCount);
  const [category, setCategory] = useState<Category>('all');
  const [addOpen, setAddOpen] = useState(false);

  const filter = CATEGORY_FILTER[category];
  const places = PLACES.filter((p) => !filter || p.cat === filter);

  return (
    <Screen
      testID="explore-screen"
      withTabBar
      header={
        <TabHeader
          greeting={t('explore.greeting', { name: firstName(me.name) })}
          title={t('explore.title')}
          actions={
            <>
              <IconButton
                testID="explore-notifs"
                icon="bell"
                size={44}
                label={t('explore.a11y.notifications')}
                badge={empty ? undefined : unread || undefined}
                onPress={() => router.push(routes.notifs)}
              />
              <IconButton
                testID="explore-saved"
                icon="bookmark-simple"
                size={44}
                label={t('explore.a11y.saved')}
                onPress={() => router.push(routes.saved)}
              />
              <Pressable
                testID="explore-avatar"
                accessibilityRole="button"
                accessibilityLabel={t('explore.a11y.profile')}
                onPress={() => router.navigate(routes.profile)}
              >
                <Avatar name={me.name} isMe photoUrl={me.avatar} size={44} />
              </Pressable>
            </>
          }
        />
      }
    >
      <View style={styles.searchRow}>
        <SearchPill
          testID="explore-search"
          label={t('explore.searchPlaceholder')}
          placeholder={t('explore.searchPlaceholder')}
          onPressAsButton={() => router.push(routes.search)}
        />
        <Fab
          testID="explore-add"
          label={t('explore.a11y.addTrip')}
          onPress={() => setAddOpen(true)}
        />
      </View>

      <View accessibilityLabel={t('explore.a11y.categories')}>
        <ChipRow>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              testID={`explore-cat-${c}`}
              label={t(`explore.categories.${c}`)}
              selected={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </ChipRow>
      </View>

      {empty ? null : (
        <>
          <LiveCard />
          <MemoryCard />
        </>
      )}

      <View style={styles.section}>
        <SectionHeader title={t('explore.places.title')} />
        {places.length === 0 ? (
          <View style={styles.emptyFilter}>
            <Text variant="body" tone="muted">
              {t('explore.places.empty')}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.carousel}
          >
            {places.map((p) => (
              <PlaceCard
                key={p.name}
                place={p}
                onOpen={() => {
                  const target = placeToKnowTarget(p);
                  if ('href' in target) router.push(target.href);
                  else toast.show(t('explore.places.soon', { name: target.soon }), 'info');
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('explore.popular.title')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.popularRow}
        >
          {POPULAR.map((p) => (
            <Pressable
              key={p.id}
              testID={`explore-popular-${p.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${p.meta}`}
              onPress={() => router.push(routes.country(p.id))}
              style={({ pressed }) => [styles.popularCard, pressed && styles.pressedShadow]}
            >
              <Text style={styles.flag}>{p.flag}</Text>
              <Text variant="cardTitleS">{p.name}</Text>
              <Text variant="caption" weight={600} tone="muted">
                {p.meta}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('explore.tours.title')}
          action={t('common.actions.seeAll')}
          onAction={() => router.push(routes.passeios)}
          testID="explore-tours-all"
        />
        {EXPERIENCES.map((e, i) => {
          const id = EXPERIENCE_TOURS[i] ?? EXPERIENCE_TOURS[0];
          return (
            <ListRow
              key={e.name}
              testID={`explore-tour-${id}`}
              title={e.name}
              meta={e.meta}
              thumbUri={img(`pas-${id}`, 160, 160)}
              thumbTint={e.tint}
              thumbSize={64}
              trailing={
                <View style={styles.rating}>
                  <Rating value={e.rating} />
                </View>
              }
              onPress={() => router.push(routes.passeio(id))}
            />
          );
        })}
      </View>

      <AddTripSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </Screen>
  );
}

/** Coral-100 "Sua viagem começa hoje" (off) / carvão "Viajando agora" (on). */
function LiveCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const live = useStore((s) => s.live);
  const itineraries = useStore((s) => s.itineraries);
  const startLive = useStore((s) => s.startLive);
  const itinerary = itineraries.find((it) => it.id === live.itineraryId) ?? itineraries[0];
  if (!itinerary) return null;

  const on = live.on;
  const overline = on ? t('explore.live.onOverline') : t('explore.live.offOverline');
  const meta = on
    ? t('explore.live.onMeta', {
        day: live.day,
        total: itinerary.days.length,
        label: itinerary.days[live.day - 1]?.label ?? '',
      })
    : t('explore.live.offMeta');

  const onPress = () => {
    if (!on) {
      startLive(itinerary.id);
      toast.show(t('explore.live.started'));
    }
    router.push(routes.live);
  };

  return (
    <Pressable
      testID="explore-live"
      accessibilityRole="button"
      accessibilityLabel={`${overline}. ${itinerary.title}. ${meta}`}
      onPress={onPress}
      style={[styles.liveCard, on ? styles.cardDark : styles.cardSoft]}
    >
      <View style={[styles.liveIcon, on ? styles.liveIconOn : styles.liveIconOff]}>
        <Icon
          name={on ? 'airplane-in-flight' : 'airplane-takeoff'}
          weight={on ? 'fill' : 'regular'}
          size={24}
          color={on ? colors.onPrimary : colors.link}
        />
      </View>
      <View style={styles.cardText}>
        <Text variant="overline" tone={on ? 'accentOnDark' : 'link'}>
          {overline}
        </Text>
        <Text variant="cardTitle" tone={on ? 'inverse' : 'default'} style={styles.liveTitle}>
          {itinerary.title}
        </Text>
        <Text variant="caption" weight={600} tone={on ? 'inverseMuted' : 'support'}>
          {meta}
        </Text>
      </View>
      <Icon name="caret-right" size={18} color={on ? colors.textInverse : colors.text} />
    </Pressable>
  );
}

/** Carvão "Há um ano · Você estava em Florianópolis". */
function MemoryCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const trips = useStore((s) => s.trips);
  const trip = trips.find((x) => x.id === 'floripa') ?? TRIPS.find((x) => x.id === 'floripa');
  if (!trip) return null;
  const title = t('explore.memory.title', { place: trip.place });
  const meta = `${t('common.count.photos', { count: trip.photos })} · ${t('common.count.places', { count: trip.places })}`;
  return (
    <Pressable
      testID="explore-memory"
      accessibilityRole="button"
      accessibilityLabel={`${t('explore.memory.overline')}. ${title}. ${meta}`}
      onPress={() => router.push(routes.trip(trip.id))}
      style={[styles.memoryCard, styles.cardDark]}
    >
      <Photo
        uri={img(`${trip.id}-mem`, 200, 200)}
        tint={colors.primaryPressed}
        width={84}
        height={84}
        radius={16}
      />
      <View style={styles.cardText}>
        <Text variant="overline" tone="accentOnDark">
          {t('explore.memory.overline')}
        </Text>
        <Text variant="cardTitle" tone="inverse" style={styles.memoryTitle}>
          {title}
        </Text>
        <Text variant="caption" weight={600} tone="inverseMuted">
          {meta}
        </Text>
      </View>
      <Icon name="caret-right" size={18} color={colors.textInverseMuted} />
    </Pressable>
  );
}

function PlaceCard({ place, onOpen }: { place: PlaceToKnow; onOpen: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const styles = useStyles();
  const wished = useStore((s) => Boolean(s.wishPlaces[place.name]));
  const toggleWishPlace = useStore((s) => s.toggleWishPlace);
  const wishLabel = wished ? t('explore.places.wished') : t('explore.places.wish');
  return (
    <View style={styles.placeCard}>
      <Pressable
        testID={`explore-place-${place.short}`}
        accessibilityRole="button"
        accessibilityLabel={`${place.name}, ${place.meta}`}
        onPress={onOpen}
        style={styles.placePress}
      >
        <Photo uri={img(`place-${place.short}`, 500, 360)} tint={place.tint} height={170} />
        <View style={styles.placeText}>
          <Text variant="cardTitle">{place.name}</Text>
          <Text variant="bodyS" tone="muted">
            {place.meta}
          </Text>
        </View>
      </Pressable>
      <Pressable
        testID={`explore-wish-${place.short}`}
        accessibilityRole="button"
        accessibilityState={{ selected: wished }}
        accessibilityLabel={`${wishLabel}: ${place.short}`}
        hitSlop={6}
        onPress={() => {
          toggleWishPlace(place.name);
          if (!wished) toast.show(t('explore.places.wishedToast', { name: place.short }));
        }}
        style={[styles.wish, wished ? styles.wishOn : styles.wishOff]}
      >
        <Icon
          name="diamond"
          size={14}
          weight={wished ? 'fill' : 'regular'}
          color={wished ? colors.onSelected : colors.text}
        />
        <Text variant="caption" weight={700} tone={wished ? 'inverse' : 'default'}>
          {wishLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  section: { gap: t.layout.cardGap },
  bleed: { marginHorizontal: -t.layout.gutter, flexGrow: 0 },
  carousel: { paddingHorizontal: t.layout.gutter, gap: 12 },
  popularRow: { paddingHorizontal: t.layout.gutter, gap: 10 },
  emptyFilter: { padding: 20, borderRadius: t.radius.r16, backgroundColor: t.colors.surface },
  cardDark: { backgroundColor: t.colors.backgroundDark },
  cardSoft: { backgroundColor: t.colors.accentSoft },
  liveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: t.radius.r24,
  },
  liveIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveIconOn: { backgroundColor: t.colors.primary },
  liveIconOff: { backgroundColor: t.colors.surface },
  liveTitle: { lineHeight: 23 },
  cardText: { flex: 1, gap: 2, minWidth: 0 },
  memoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: t.radius.r24,
  },
  memoryTitle: { fontSize: 19, lineHeight: 24 },
  placeCard: { width: 240 },
  placePress: { gap: 10 },
  placeText: { gap: 2 },
  wish: {
    position: 'absolute',
    top: 10,
    right: 10,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: t.radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wishOn: { backgroundColor: t.colors.selected, borderColor: t.colors.selected },
  wishOff: { backgroundColor: t.colors.surface, borderColor: t.colors.surface },
  popularCard: {
    width: 136,
    gap: 8,
    padding: 14,
    borderRadius: t.radius.r16,
    backgroundColor: t.colors.surface,
  },
  pressedShadow: { boxShadow: t.shadow.hover },
  flag: { fontSize: 28, lineHeight: 32 },
  rating: { paddingRight: 6 },
}));
