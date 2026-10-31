import { useTranslation } from '@worlo/i18n';
import {
  Card,
  colors,
  EmptyState,
  Icon,
  IconButton,
  Mosaic,
  Photo,
  ProgressBar,
  radius,
  Screen,
  Segmented,
  StatusChip,
  StatusMarker,
  TabHeader,
  Text,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AddTripSheet } from '@/components/AddTripSheet';
import { DemoGate, useIsEmpty } from '@/components/DemoGate';
import { img } from '@/lib/images';
import { firstName, joinNames } from '@/lib/people';
import { COUNTRIES } from '@/mocks/data.generated';
import type { Future, Itinerary, Trip } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import type { TripsSegment } from '@/store/slices/trips';
import { DashedButton } from './parts';

/** Blank itinerary ("Criar roteiro"): one free day, opens in the editor. */
export function useCreateItinerary() {
  const { t } = useTranslation();
  const router = useRouter();
  const addItinerary = useStore((s) => s.addItinerary);
  return () => {
    const itinerary: Itinerary = {
      id: `r${Date.now()}`,
      title: t('trips.rot.newTitle'),
      place: t('trips.rot.newPlace'),
      flag: '📍',
      dates: t('trips.rot.newDates'),
      status: t('trips.rot.newStatus'),
      sugKey: 'generic',
      days: [{ label: t('trips.rot.newDay'), items: [] }],
    };
    addItinerary(itinerary);
    router.push(routes.roteiro(itinerary.id));
  };
}

/** B3 · Viagens: Realizadas (by year), Quero ir and Roteiros. */
export function TripsScreen() {
  const { t } = useTranslation();
  const segment = useStore((s) => s.tripsSegment);
  const setSegment = useStore((s) => s.setTripsSegment);
  const [adding, setAdding] = useState(false);

  return (
    <DemoGate loading error>
      <Screen
        testID="trips-screen"
        withTabBar
        gap={20}
        header={
          <TabHeader
            title={t('trips.title')}
            actions={
              <IconButton
                testID="trips-add"
                icon="plus"
                size={44}
                label={t('trips.add')}
                onPress={() => setAdding(true)}
              />
            }
          />
        }
      >
        <Segmented<TripsSegment>
          testID="trips-seg"
          label={t('trips.segments.label')}
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'past', label: t('trips.segments.past') },
            { value: 'wish', label: t('trips.segments.wish') },
            { value: 'rot', label: t('trips.segments.rot') },
          ]}
        />
        {segment === 'past' ? <PastSegment /> : null}
        {segment === 'wish' ? <WishSegment /> : null}
        {segment === 'rot' ? <RotSegment /> : null}
      </Screen>
      <AddTripSheet visible={adding} onClose={() => setAdding(false)} />
    </DemoGate>
  );
}

function PastSegment() {
  const { t } = useTranslation();
  const router = useRouter();
  const trips = useStore((s) => s.trips);
  const empty = useIsEmpty() || trips.length === 0;

  if (empty) {
    return (
      <EmptyState
        testID="trips-empty-past"
        icon="suitcase-rolling"
        title={t('trips.empty.pastTitle')}
        text={t('trips.empty.pastText')}
        action={{
          label: t('trips.empty.pastCta'),
          onPress: () => router.push(routes.tripForm({ mode: 'new', kind: 'past' })),
        }}
        secondary={{
          label: t('trips.empty.pastSecondary'),
          onPress: () => router.push(routes.photos),
        }}
      />
    );
  }

  const years = [...new Set(trips.map((trip) => trip.year))].sort().reverse();
  return (
    <View style={{ gap: 20 }}>
      {years.map((year) => (
        <View key={year} style={{ gap: 12 }}>
          <Text variant="overline" tone="muted" accessibilityRole="header">
            {year}
          </Text>
          {trips
            .filter((trip) => trip.year === year)
            .map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() => router.push(routes.trip(trip.id))}
              />
            ))}
        </View>
      ))}
    </View>
  );
}

/** "com Marina e João" / "Viagem solo". */
export function useWithText() {
  const { t } = useTranslation();
  return (trip: Trip) =>
    trip.collab.length
      ? t('trips.card.with', {
          names: joinNames(
            trip.collab.map((c) => firstName(c.name)),
            t('common.list.and'),
          ),
        })
      : t('trips.card.solo');
}

/** "Florianópolis, Brasil". */
export const placeLabel = (trip: Trip) =>
  trip.country ? `${trip.place}, ${trip.country}` : trip.place;

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const { t } = useTranslation();
  const withText = useWithText();
  const place = t('trips.card.place', {
    flag: trip.flag,
    place: placeLabel(trip),
    days: t('common.count.days', { count: trip.days }),
  });
  const period = t('trips.card.period', { period: trip.period, people: withText(trip) });
  return (
    <Card
      testID={`trip-card-${trip.id}`}
      radius={24}
      padding={10}
      style={{ paddingBottom: 16 }}
      onPress={onPress}
      accessibilityLabel={`${trip.title}. ${place}. ${period}`}
    >
      <Mosaic
        photos={[
          { uri: img(`${trip.id}-a`, 700, 500), tint: trip.tint },
          { uri: img(`${trip.id}-b`, 400, 400) },
        ]}
        extra={Math.max(0, trip.photos - 3) || undefined}
      />
      <View style={{ paddingHorizontal: 6, gap: 4 }}>
        <Text variant="h3">{trip.title}</Text>
        <Text variant="bodyS" tone="support">
          {place}
        </Text>
        <Text variant="caption" weight={600} tone="muted">
          {period}
        </Text>
      </View>
    </Card>
  );
}

function WishSegment() {
  const { t } = useTranslation();
  const router = useRouter();
  const futures = useStore((s) => s.futures);
  const empty = useIsEmpty() || futures.length === 0;

  return (
    <View style={{ gap: 10 }}>
      <Text variant="bodyS" weight={400} tone="muted" style={{ marginBottom: 4 }}>
        {t('trips.wish.intro')}
      </Text>
      {empty ? (
        <EmptyState
          testID="trips-empty-wish"
          icon="diamond"
          title={t('trips.empty.wishTitle')}
          text={t('trips.empty.wishText')}
          action={{
            label: t('trips.empty.wishCta'),
            onPress: () => router.navigate(routes.explore),
          }}
          secondary={{
            label: t('trips.empty.wishSecondary'),
            onPress: () => router.navigate(routes.map),
          }}
        />
      ) : (
        futures.map((future) => (
          <FutureRow
            key={future.id}
            future={future}
            onPress={() => router.push(routes.future(future.id))}
          />
        ))
      )}
      <DashedButton
        testID="trips-add-destination"
        label={t('trips.wish.add')}
        onPress={() => router.push(routes.tripForm({ mode: 'new', kind: 'future' }))}
      />
    </View>
  );
}

function FutureRow({ future, onPress }: { future: Future; onPress: () => void }) {
  const { t } = useTranslation();
  const best = COUNTRIES[future.cid]?.best;
  const meta = best ? t('trips.wish.best', { value: best }) : future.saved;
  return (
    <Card
      testID={`future-row-${future.id}`}
      onPress={onPress}
      padding={14}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}
      accessibilityLabel={meta ? `${future.name}, ${meta}` : future.name}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 26, lineHeight: 32 }}>{future.flag}</Text>
      </View>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text variant="cardTitle">{future.name}</Text>
        {meta ? (
          <Text variant="caption" weight={600} tone="muted">
            {meta}
          </Text>
        ) : null}
      </View>
      <StatusMarker status="wishlist" size={14} onDark={false} />
    </Card>
  );
}

function RotSegment() {
  const { t } = useTranslation();
  const router = useRouter();
  const itineraries = useStore((s) => s.itineraries);
  const empty = useIsEmpty() || itineraries.length === 0;
  const create = useCreateItinerary();

  return (
    <View style={{ gap: 12 }}>
      {empty ? (
        <EmptyState
          testID="trips-empty-rot"
          icon="map-trifold"
          title={t('trips.empty.rotTitle')}
          text={t('trips.empty.rotText')}
          action={{ label: t('trips.empty.rotCta'), onPress: create }}
          secondary={{
            label: t('trips.empty.rotSecondary'),
            onPress: () => router.push(routes.recs),
          }}
        />
      ) : (
        itineraries.map((it) => (
          <ItineraryCard
            key={it.id}
            itinerary={it}
            onPress={() => router.push(routes.roteiro(it.id))}
          />
        ))
      )}
      <DashedButton testID="trips-create-rot" label={t('trips.rot.create')} onPress={create} />
      <Card
        testID="trips-recs"
        surface="dark"
        radius={24}
        padding={18}
        onPress={() => router.push(routes.recs)}
        accessibilityLabel={`${t('trips.rot.recsTitle')}. ${t('trips.rot.recsText')}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Text variant="overline" tone="accentOnDark">
            {t('trips.rot.recsOverline')}
          </Text>
          <Text variant="h3" tone="inverse">
            {t('trips.rot.recsTitle')}
          </Text>
          <Text variant="bodyS" weight={400} tone="inverseMuted">
            {t('trips.rot.recsText')}
          </Text>
        </View>
        <Icon name="arrow-right" size={22} color={colors.accentOnDark} />
      </Card>
    </View>
  );
}

/** Progresso de roteiro = dias com ≥1 parada / total de dias (04 → Regras). */
export function itineraryProgress(it: Itinerary) {
  const total = it.days.length;
  const done = it.days.filter((d) => d.items.length > 0).length;
  return { done, total, value: total ? done / total : 0 };
}

function ItineraryCard({ itinerary, onPress }: { itinerary: Itinerary; onPress: () => void }) {
  const { t } = useTranslation();
  const progress = itineraryProgress(itinerary);
  const progressText = t('trips.rot.progress', { done: progress.done, total: progress.total });
  const place = `${itinerary.flag} ${itinerary.place} · ${itinerary.dates}`;
  return (
    <Card
      testID={`rot-card-${itinerary.id}`}
      radius={24}
      padding={10}
      style={{ paddingBottom: 16 }}
      onPress={onPress}
      accessibilityLabel={`${itinerary.title}. ${place}. ${itinerary.status}. ${progressText}`}
    >
      <Photo
        uri={img(`rot-${itinerary.id}`, 700, 300)}
        tint={colors.border}
        height={120}
        radius={radius.r16}
      >
        <StatusChip
          kind="planned"
          size="sm"
          label={itinerary.status}
          style={{ position: 'absolute', top: 10, left: 10 }}
        />
      </Photo>
      <View style={{ paddingHorizontal: 6, gap: 4 }}>
        <Text variant="h3">{itinerary.title}</Text>
        <Text variant="bodyS" tone="support">
          {place}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <ProgressBar
              value={progress.value}
              track={colors.background}
              label={t('trips.rot.progressLabel')}
            />
          </View>
          <Text variant="caption" weight={700} tone="muted" style={{ fontSize: 12 }}>
            {progressText}
          </Text>
        </View>
      </View>
    </Card>
  );
}
