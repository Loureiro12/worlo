import { useTranslation } from '@worlo/i18n';
import {
  Button,
  Card,
  colors,
  EmptyState,
  FormError,
  Icon,
  IconButton,
  Mosaic,
  ProgressBar,
  palette,
  Screen,
  Segmented,
  Sheet,
  TabHeader,
  Text,
  TextField,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { AddTripSheet } from '@/components/AddTripSheet';
import { DemoGate, useIsEmpty } from '@/components/DemoGate';
import { DestinationField } from '@/components/DestinationField';
import { useCatalog } from '@/data/catalog';
import { createItinerary, useItineraries } from '@/data/planning';
import { useTrips } from '@/data/trips';
import { useFutures, wishKey } from '@/data/world';
import { img } from '@/lib/images';
import { firstName, joinNames } from '@/lib/people';
import type { Place } from '@/lib/places';
import { demoKey } from '@/mocks/demo';
import type { Future, Itinerary, Trip } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import type { TripsSegment } from '@/store/slices/trips';
import { DashedButton, PlanCard } from './parts';

/**
 * "Criar roteiro": asks where to (search, or anything typed), then opens a blank
 * itinerary with one free day in the editor.
 */
export function useCreateItinerary(): { open: () => void; sheet: ReactNode } {
  const { t } = useTranslation();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [dest, setDest] = useState('');
  const [picked, setPicked] = useState<Place | null>(null);

  const create = () => {
    const typed = dest.trim();
    const place = picked?.label ?? typed;
    const itinerary = createItinerary({
      title: place
        ? t('trips.rot.titleFor', { place: picked?.name ?? typed.split(',')[0] })
        : t('trips.rot.newTitle'),
      place: place || t('trips.rot.newPlace'),
      flag: picked?.flag ?? '📍',
      dates: t('trips.rot.newDates'),
      status: t('trips.rot.newStatus'),
      sugKey: 'generic',
      days: [{ label: t('trips.rot.newDay'), items: [] }],
    });
    setVisible(false);
    setDest('');
    setPicked(null);
    router.push(routes.roteiro(itinerary.id));
  };

  const sheet = (
    <Sheet
      testID="rot-new-sheet"
      visible={visible}
      onClose={() => setVisible(false)}
      closeLabel={t('common.actions.close')}
      title={t('trips.rot.create')}
      footer={
        <Button
          testID="rot-new-create"
          fullWidth
          label={t('trips.rot.createCta')}
          onPress={create}
        />
      }
    >
      <DestinationField
        testID="rot-new-dest"
        label={t('tripForm.dest')}
        placeholder={t('tripForm.destPlaceholder')}
        value={dest}
        onChangeText={setDest}
        onPick={setPicked}
      />
    </Sheet>
  );

  return { open: () => setVisible(true), sheet };
}

/** B3 · Viagens: Realizadas (by year), Quero ir and Roteiros. */
export function TripsScreen() {
  const { t } = useTranslation();
  const segment = useStore((s) => s.tripsSegment);
  const setSegment = useStore((s) => s.setTripsSegment);
  const [adding, setAdding] = useState(false);
  const [joining, setJoining] = useState(false);

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
        <Button
          testID="trips-join"
          variant="ghost"
          icon="ticket"
          label={t('trips.joinCode.open')}
          onPress={() => setJoining(true)}
        />
      </Screen>
      <AddTripSheet visible={adding} onClose={() => setAdding(false)} />
      <JoinSheet visible={joining} onClose={() => setJoining(false)} />
    </DemoGate>
  );
}

/** "worlo://join/abc123", "…/join/abc123" or just "abc123" → the invite token. */
export function inviteToken(text: string): string | null {
  const value = text.trim();
  const fromLink = /join\/([A-Za-z0-9_-]+)/.exec(value)?.[1];
  const token = fromLink ?? value;
  return /^[A-Za-z0-9_-]{6,}$/.test(token) ? token : null;
}

/** "Tenho um convite": the code (or the whole link) someone sent. */
function JoinSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const join = () => {
    const token = inviteToken(text);
    if (!token) return setInvalid(true);
    setText('');
    onClose();
    router.push(routes.join(token));
  };
  return (
    <Sheet
      testID="trips-join-sheet"
      visible={visible}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      title={t('trips.joinCode.title')}
      footer={
        <Button testID="trips-join-go" fullWidth label={t('trips.joinCode.go')} onPress={join} />
      }
    >
      <Text variant="body" tone="support">
        {t('trips.joinCode.text')}
      </Text>
      <TextField
        testID="trips-join-code"
        label={t('trips.joinCode.label')}
        value={text}
        invalid={invalid}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(v) => {
          setText(v);
          setInvalid(false);
        }}
        onSubmitEditing={join}
      />
      {invalid ? (
        <FormError testID="trips-join-error" message={t('trips.joinCode.invalid')} />
      ) : null}
    </Sheet>
  );
}

function PastSegment() {
  const { t } = useTranslation();
  const router = useRouter();
  const trips = useTrips();
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
  // Demo trips keep their prototype key (testIDs, photo seeds); others use the uuid.
  const key = demoKey(trip.id, 'trip');
  return (
    <Card
      testID={`trip-card-${key}`}
      radius={24}
      padding={10}
      style={{ paddingBottom: 16 }}
      onPress={onPress}
      accessibilityLabel={`${trip.title}. ${place}. ${period}`}
    >
      <Mosaic
        photos={[
          { uri: img(`${key}-a`, 700, 500), tint: trip.tint },
          { uri: img(`${key}-b`, 400, 400) },
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
  const futures = useFutures();
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
  const { COUNTRIES } = useCatalog();
  const best = COUNTRIES[future.cid]?.best;
  const meta = best ? t('trips.wish.best', { value: best }) : future.saved;
  const subtitle = [future.note, meta].filter(Boolean).join(' · ');
  return (
    <PlanCard
      testID={`future-row-${wishKey(future.id)}`}
      onPress={onPress}
      accessibilityLabel={[future.name, t('trips.wish.status'), meta].filter(Boolean).join('. ')}
      cover={future.cover}
      tint={future.tint || palette.coral100}
      flag={future.flag}
      status={{ kind: 'wishlist', label: t('trips.wish.status') }}
      title={future.name}
      subtitle={subtitle}
    />
  );
}

function RotSegment() {
  const { t } = useTranslation();
  const router = useRouter();
  const itineraries = useItineraries();
  const empty = useIsEmpty() || itineraries.length === 0;
  const { open: create, sheet: createSheet } = useCreateItinerary();

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
      {createSheet}
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
    <PlanCard
      testID={`rot-card-${demoKey(itinerary.id, 'itinerary')}`}
      onPress={onPress}
      accessibilityLabel={`${itinerary.title}. ${place}. ${itinerary.status}. ${progressText}`}
      tint={palette.coral100}
      flag={itinerary.flag}
      status={{ kind: 'planned', label: itinerary.status }}
      title={itinerary.title}
      subtitle={place}
    >
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
    </PlanCard>
  );
}
