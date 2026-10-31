import { useTranslation } from '@worlo/i18n';
import {
  alpha,
  Button,
  colors,
  Icon,
  ListRow,
  layout,
  Photo,
  ProgressBar,
  radius,
  Screen,
  Sheet,
  StatusChip,
  Text,
  useToast,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useIsEmpty } from '@/components/DemoGate';
import { img } from '@/lib/images';
import type { Trip } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { GroupCard, PageTitle, StackHeader, SwitchRow } from './parts';
import { formatNumber } from './stats';

/** Simulated import (04_INTERACTIONS → Importação de fotos). */
export const IMPORT = {
  total: 146,
  inTrips: 123,
  loose: 23,
  /** Extra loose photos behind the "+15" tile. */
  hidden: 15,
  stepPct: 6,
  stepMs: 140,
  /** Where the upload stops when the connection drops (85 of 146). */
  failPct: 58,
  /** Trip that receives the organized photos and is suggested for the loose ones. */
  matchTripId: 'floripa',
} as const;

type Phase = 'idle' | 'running' | 'failed' | 'done' | 'assigned';

/** K1 · Importação de fotos. */
export function PhotosScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const empty = useIsEmpty();
  const allTrips = useStore((s) => s.trips);
  const updateTrip = useStore((s) => s.updateTrip);
  const autoOrganize = useStore((s) => s.autoOrganizePhotos);
  const setSettings = useStore((s) => s.setSettings);
  const trips = empty ? [] : allTrips;
  const [phase, setPhase] = useState<Phase>('idle');
  const [pct, setPct] = useState(0);
  const [assigning, setAssigning] = useState(false);
  const pctRef = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { width } = useWindowDimensions();
  const tile = (width - layout.gutter * 2 - 4 * 3) / 4;

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const setProgress = (value: number) => {
    pctRef.current = value;
    setPct(value);
  };

  const start = () => {
    stop();
    const demo = useStore.getState().demo;
    const failAt = demo === 'offline' || demo === 'error' ? IMPORT.failPct : Infinity;
    setProgress(phase === 'failed' ? IMPORT.failPct : 0);
    setPhase('running');
    timer.current = setInterval(() => {
      const previous = pctRef.current;
      const next = previous + IMPORT.stepPct;
      if (next >= failAt && previous < failAt) {
        stop();
        setProgress(IMPORT.failPct);
        setPhase('failed');
        toast.show(t('common.toasts.connectionLost'), 'error');
        return;
      }
      if (next >= 100) {
        stop();
        setProgress(100);
        setPhase('done');
        toast.show(t('profile.photos.done.toast'));
        return;
      }
      setProgress(next);
    }, IMPORT.stepMs);
  };

  const imported = phase === 'done' || phase === 'assigned';
  const photosOf = (trip: Trip) =>
    trip.photos + (imported && trip.id === IMPORT.matchTripId ? IMPORT.inTrips : 0);
  const totalPhotos = trips.reduce((sum, trip) => sum + photosOf(trip), 0);
  const lang = i18n.language;
  const photosLabel = (n: number) =>
    t('profile.photos.count', { count: n, n: formatNumber(n, lang) });

  const assign = (trip: Trip) => {
    updateTrip(trip.id, { photos: trip.photos + IMPORT.loose });
    setAssigning(false);
    setPhase('assigned');
    toast.show(t('profile.photos.assignSheet.done', { count: IMPORT.loose, trip: trip.title }));
  };

  return (
    <Screen
      testID="photos-screen"
      withTabBar
      gap={20}
      header={<StackHeader overline={t('profile.photos.overline')} />}
    >
      <PageTitle
        title={t('profile.photos.title')}
        sub={t('profile.photos.summary', {
          photos: photosLabel(totalPhotos),
          trips: t('common.count.trips', { count: trips.length }),
        })}
      />

      <View
        testID={`photos-import-${phase === 'assigned' ? 'done' : phase}`}
        style={{
          padding: 18,
          gap: 12,
          borderRadius: radius.r24,
          backgroundColor: colors.backgroundDark,
        }}
      >
        {phase === 'idle' ? (
          <>
            <Text variant="overline" tone="accentOnDark">
              {t('profile.photos.idle.overline')}
            </Text>
            <Text variant="h3" tone="inverse">
              {t('profile.photos.idle.title')}
            </Text>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button
                testID="photos-start"
                size="sm"
                icon="upload-simple"
                label={t('profile.photos.idle.cta')}
                onPress={start}
              />
            </View>
          </>
        ) : null}
        {phase === 'running' ? (
          <>
            <Text variant="overline" tone="accentOnDark">
              {t('profile.photos.running.overline', { pct })}
            </Text>
            <Text variant="h3" tone="inverse">
              {t('profile.photos.running.title', {
                done: Math.round((IMPORT.total * pct) / 100),
                total: IMPORT.total,
              })}
            </Text>
            <ProgressBar
              value={pct / 100}
              height={8}
              track={alpha.darkBorder}
              label={t('profile.photos.running.progress')}
            />
            <Text variant="caption" tone="inverseMuted">
              {t('profile.photos.running.text')}
            </Text>
          </>
        ) : null}
        {phase === 'failed' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="warning-circle" weight="fill" size={14} color={colors.accentOnDark} />
              <Text variant="overline" tone="accentOnDark">
                {t('profile.photos.failed.overline')}
              </Text>
            </View>
            <Text variant="h3" tone="inverse">
              {t('profile.photos.failed.title', {
                sent: Math.round((IMPORT.total * IMPORT.failPct) / 100),
                total: IMPORT.total,
              })}
            </Text>
            <Text variant="caption" tone="inverseMuted">
              {t('profile.photos.failed.text')}
            </Text>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button
                testID="photos-resume"
                size="sm"
                icon="arrow-clockwise"
                label={t('profile.photos.failed.cta')}
                onPress={start}
              />
            </View>
          </>
        ) : null}
        {imported ? (
          <>
            <Text variant="overline" tone="accentOnDark">
              {t('profile.photos.done.overline')}
            </Text>
            <Text variant="h3" tone="inverse">
              {t('profile.photos.done.title', {
                total: IMPORT.total,
                inTrips: IMPORT.inTrips,
                loose: IMPORT.loose,
              })}
            </Text>
          </>
        ) : null}
      </View>

      <GroupCard>
        <SwitchRow
          testID="photos-auto-organize"
          icon="map-pin-line"
          label={t('profile.photos.autoOrganize')}
          sub={t('profile.photos.autoOrganizeText')}
          value={autoOrganize}
          onChange={(value) => setSettings({ autoOrganizePhotos: value })}
        />
      </GroupCard>

      {phase === 'done' ? (
        <View style={{ gap: 10 }} testID="photos-loose">
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text variant="h3" accessibilityRole="header">
              {`${t('profile.photos.loose')} `}
              <Text variant="h3" tone="muted" weight={500}>
                {`(${IMPORT.loose})`}
              </Text>
            </Text>
            <Button
              testID="photos-assign"
              variant="ghost"
              label={t('profile.photos.assign')}
              onPress={() => setAssigning(true)}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
              borderRadius: radius.r16,
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <Photo
                key={i}
                uri={img(`loose-${i}`, 200, 200)}
                tint={colors.border}
                width={tile}
                height={tile}
                radius={0}
                accessibilityLabel={t('profile.photos.looseA11y')}
              >
                {i === 7 ? (
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: alpha.overlay,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="cardTitle" tone="inverse">{`+${IMPORT.hidden}`}</Text>
                  </View>
                ) : null}
              </Photo>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Text variant="h3" accessibilityRole="header">
          {t('profile.photos.byTrip')}
        </Text>
        {trips.map((trip) => (
          <ListRow
            key={trip.id}
            testID={`photos-trip-${trip.id}`}
            title={trip.title}
            meta={trip.period}
            thumbUri={img(`${trip.id}-a`, 160, 160)}
            thumbTint={colors.border}
            thumbSize={56}
            onPress={() => router.push(routes.trip(trip.id))}
            trailing={
              <Text variant="label" weight={700} style={{ paddingRight: 4 }}>
                {photosLabel(photosOf(trip))}
              </Text>
            }
          />
        ))}
      </View>

      <Sheet
        testID="photos-assign-sheet"
        visible={assigning}
        onClose={() => setAssigning(false)}
        closeLabel={t('common.actions.close')}
        title={t('profile.photos.assignSheet.title', { count: IMPORT.loose })}
        subtitle={t('profile.photos.assignSheet.text')}
      >
        {trips.map((trip) => {
          const suggested = trip.id === IMPORT.matchTripId;
          return (
            <Pressable
              key={trip.id}
              testID={`photos-assign-${trip.id}`}
              accessibilityRole="button"
              accessibilityLabel={[
                trip.title,
                trip.period,
                suggested ? t('profile.photos.assignSheet.sameDate') : '',
              ]
                .filter(Boolean)
                .join(', ')}
              onPress={() => assign(trip)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 10,
                borderRadius: radius.r16,
                borderWidth: 1,
                borderColor: suggested ? colors.primary : colors.border,
                backgroundColor: pressed ? colors.background : colors.surface,
              })}
            >
              <Photo
                uri={img(`${trip.id}-a`, 160, 160)}
                tint={colors.border}
                width={52}
                height={52}
                radius={12}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" weight={700}>
                  {trip.title}
                </Text>
                <Text variant="caption" tone="muted" weight={400}>
                  {trip.period}
                </Text>
              </View>
              {suggested ? (
                <StatusChip
                  kind="visited"
                  icon="calendar-check"
                  size="sm"
                  label={t('profile.photos.assignSheet.sameDate')}
                />
              ) : null}
            </Pressable>
          );
        })}
      </Sheet>
    </Screen>
  );
}
