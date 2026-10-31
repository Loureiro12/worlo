import type { Photo as PhotoRow, TripRow } from '@worlo/db';
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useIsEmpty } from '@/components/DemoGate';
import {
  assignPhotos,
  autoOrganize,
  pickPhotos,
  suggestedTrip,
  tripPhotoCount,
  uploads,
  useImportBatch,
  useMyPhotos,
  usePhotoFiles,
  usePhotoUri,
  useVisiblePhotos,
} from '@/data/photos';
import { updatePrefs, useProfilePrefs } from '@/data/profile';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { PhotoTile } from '@/features/photos/PhotoTile';
import { useSync } from '@/features/sync/SyncProvider';
import { img } from '@/lib/images';
import { demoKey } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { GroupCard, PageTitle, StackHeader, SwitchRow } from './parts';
import { formatNumber } from './stats';

/** Loose photos shown in the grid; the last tile shows "+N" for the rest. */
const LOOSE_TILES = 8;

type Phase = 'idle' | 'running' | 'failed' | 'done';

const keyOf = (trip: TripRow) => demoKey(trip.id, 'trip');

/** K1 · Fotos: import from the gallery, upload progress, loose photos and photos by trip. */
export function PhotosScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const empty = useIsEmpty();
  const { online } = useSync();
  const allTrips = useQuery(() => repos.trips.list(), []);
  const trips = empty ? [] : allTrips;
  const { autoOrganizePhotos: autoOrganizeOn } = useProfilePrefs();
  const mine = useMyPhotos();
  const visible = useVisiblePhotos();
  const files = usePhotoFiles();
  const session = useImportBatch();
  const [assigning, setAssigning] = useState(false);
  const [picking, setPicking] = useState(false);
  const { width } = useWindowDimensions();
  const tile = (width - layout.gutter * 2 - 4 * 3) / 4;
  const lang = i18n.language;

  const byTrip = useMemo(() => {
    const map = new Map<string, PhotoRow[]>();
    for (const p of visible) {
      if (!p.tripId) continue;
      map.set(p.tripId, [...(map.get(p.tripId) ?? []), p]);
    }
    return map;
  }, [visible]);
  const loose = mine.filter((p) => !p.tripId);

  // The import card follows this session's last pick; after a restart, what is
  // still on the device waiting to upload.
  const batch = session.length
    ? session
    : [...files.values()].filter((f) => f.state !== 'done').map((f) => f.photoId);
  const states = batch.map((id) => files.get(id)?.state ?? 'done');
  const total = batch.length;
  const remaining = states.filter((s) => s !== 'done').length;
  const failedN = states.filter((s) => s === 'failed').length;
  const sent = total - remaining;
  const phase: Phase =
    total === 0 ? 'idle' : remaining === 0 ? 'done' : failedN > 0 || !online ? 'failed' : 'running';
  const pct = total ? Math.round((sent / total) * 100) : 0;
  const batchPhotos = mine.filter((p) => batch.includes(p.id));
  const inTrips = batchPhotos.filter((p) => p.tripId).length;

  const wasRemaining = useRef(remaining);
  useEffect(() => {
    if (wasRemaining.current > 0 && remaining === 0 && total > 0) {
      toast.show(t('profile.photos.done.toast'));
    }
    wasRemaining.current = remaining;
  }, [remaining, total, toast, t]);

  const photosLabel = (n: number) =>
    t('profile.photos.count', { count: n, n: formatNumber(n, lang) });
  const countOf = (trip: TripRow) => tripPhotoCount(trip, byTrip.get(trip.id) ?? []);
  const totalPhotos = trips.reduce((sum, trip) => sum + countOf(trip), 0) + loose.length;

  const startImport = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const result = await pickPhotos();
      if (result.status === 'added' && result.organized > 0) {
        toast.show(t('profile.photos.organized', { count: result.organized }));
      }
    } catch {
      toast.show(t('profile.photos.pickError'), 'error');
    } finally {
      setPicking(false);
    }
  };

  const resume = () => {
    if (!online) {
      toast.show(t('common.states.offlineBanner'), 'error');
      return;
    }
    void uploads.retry(batch);
  };

  const toggleAutoOrganize = (value: boolean) => {
    updatePrefs({ autoOrganizePhotos: value });
    if (!value) return;
    const moved = autoOrganize();
    if (moved > 0) toast.show(t('profile.photos.organized', { count: moved }));
  };

  const suggested = suggestedTrip(loose, trips);
  const assign = (trip: TripRow) => {
    const count = loose.length;
    assignPhotos(
      loose.map((p) => p.id),
      trip.id,
    );
    setAssigning(false);
    toast.show(t('profile.photos.assignSheet.done', { count, trip: trip.title }));
  };

  const dates = loose
    .map((p) => p.takenAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const first = dates[0];
  const last = dates.at(-1);
  const sheetText =
    first && last
      ? fmt(first) === fmt(last)
        ? t('profile.photos.assignSheet.textOne', { date: fmt(first) })
        : t('profile.photos.assignSheet.text', { from: fmt(first), to: fmt(last) })
      : t('profile.photos.assignSheet.textUndated');

  const importButton = (
    <View style={{ alignSelf: 'flex-start' }}>
      <Button
        testID="photos-start"
        size="sm"
        icon="upload-simple"
        label={t('profile.photos.idle.cta')}
        disabled={picking}
        onPress={() => void startImport()}
      />
    </View>
  );

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
        testID={`photos-import-${phase}`}
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
            {importButton}
          </>
        ) : null}
        {phase === 'running' ? (
          <>
            <Text variant="overline" tone="accentOnDark">
              {t('profile.photos.running.overline', { pct })}
            </Text>
            <Text variant="h3" tone="inverse">
              {t('profile.photos.running.title', { done: sent, total })}
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
              {t('profile.photos.failed.title', { sent, total })}
            </Text>
            <Text variant="caption" tone="inverseMuted">
              {online ? t('profile.photos.failed.textError') : t('profile.photos.failed.text')}
            </Text>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button
                testID="photos-resume"
                size="sm"
                icon="arrow-clockwise"
                label={t('profile.photos.failed.cta')}
                onPress={resume}
              />
            </View>
          </>
        ) : null}
        {phase === 'done' ? (
          <>
            <Text variant="overline" tone="accentOnDark">
              {t('profile.photos.done.overline')}
            </Text>
            <Text variant="h3" tone="inverse">
              {t('profile.photos.done.title', { total, inTrips, loose: total - inTrips })}
            </Text>
            {importButton}
          </>
        ) : null}
      </View>

      <GroupCard>
        <SwitchRow
          testID="photos-auto-organize"
          icon="map-pin-line"
          label={t('profile.photos.autoOrganize')}
          sub={t('profile.photos.autoOrganizeText')}
          value={autoOrganizeOn}
          onChange={toggleAutoOrganize}
        />
      </GroupCard>

      {loose.length > 0 ? (
        <View style={{ gap: 10 }} testID="photos-loose">
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text variant="h3" accessibilityRole="header">
              {`${t('profile.photos.loose')} `}
              <Text variant="h3" tone="muted" weight={500}>
                {`(${loose.length})`}
              </Text>
            </Text>
            {trips.length > 0 ? (
              <Button
                testID="photos-assign"
                variant="ghost"
                label={t('profile.photos.assign')}
                onPress={() => setAssigning(true)}
              />
            ) : null}
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
            {loose.slice(0, LOOSE_TILES).map((photo, i) => {
              const hidden = loose.length - LOOSE_TILES;
              const more = i === LOOSE_TILES - 1 && hidden > 0;
              return (
                <PhotoTile
                  key={photo.id}
                  testID={`photos-loose-${i}`}
                  photo={photo}
                  status={more ? null : files.get(photo.id)?.state}
                  tint={colors.border}
                  width={tile}
                  height={tile}
                  radius={0}
                  accessibilityLabel={t('profile.photos.looseA11y')}
                >
                  {more ? (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: alpha.overlay,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text variant="cardTitle" tone="inverse">{`+${hidden}`}</Text>
                    </View>
                  ) : null}
                </PhotoTile>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Text variant="h3" accessibilityRole="header">
          {t('profile.photos.byTrip')}
        </Text>
        {trips.map((trip) => (
          <TripPhotosRow
            key={trip.id}
            trip={trip}
            cover={byTrip.get(trip.id)?.[0]}
            label={photosLabel(countOf(trip))}
            onPress={() => router.push(routes.trip(trip.id))}
          />
        ))}
      </View>

      <Sheet
        testID="photos-assign-sheet"
        visible={assigning}
        onClose={() => setAssigning(false)}
        closeLabel={t('common.actions.close')}
        title={t('profile.photos.assignSheet.title', { count: loose.length })}
        subtitle={sheetText}
      >
        {trips.map((trip) => {
          const same = trip.id === suggested?.id;
          return (
            <Pressable
              key={trip.id}
              testID={`photos-assign-${keyOf(trip)}`}
              accessibilityRole="button"
              accessibilityLabel={[
                trip.title,
                trip.period,
                same ? t('profile.photos.assignSheet.sameDate') : '',
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
                borderColor: same ? colors.primary : colors.border,
                backgroundColor: pressed ? colors.background : colors.surface,
              })}
            >
              <TripThumb trip={trip} cover={byTrip.get(trip.id)?.[0]} size={52} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" weight={700}>
                  {trip.title}
                </Text>
                <Text variant="caption" tone="muted" weight={400}>
                  {trip.period}
                </Text>
              </View>
              {same ? (
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

/** Cover of a trip: its newest real photo, else the demo placeholder. */
function useCover(trip: TripRow, cover: PhotoRow | undefined, size: number) {
  const uri = usePhotoUri(cover);
  return cover ? uri : img(`${keyOf(trip)}-a`, size * 3, size * 3);
}

function TripThumb({ trip, cover, size }: { trip: TripRow; cover?: PhotoRow; size: number }) {
  const uri = useCover(trip, cover, size);
  return <Photo uri={uri} tint={colors.border} width={size} height={size} radius={12} />;
}

function TripPhotosRow({
  trip,
  cover,
  label,
  onPress,
}: {
  trip: TripRow;
  cover?: PhotoRow;
  label: string;
  onPress: () => void;
}) {
  const uri = useCover(trip, cover, 56);
  return (
    <ListRow
      testID={`photos-trip-${keyOf(trip)}`}
      title={trip.title}
      meta={trip.period}
      thumbUri={uri ?? undefined}
      thumbTint={colors.border}
      thumbSize={56}
      onPress={onPress}
      trailing={
        <Text variant="label" weight={700} style={{ paddingRight: 4 }}>
          {label}
        </Text>
      }
    />
  );
}
