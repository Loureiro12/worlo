import type { Photo as PhotoRow } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { alpha, colors, fontFamily, Photo, radius, Text } from '@worlo/ui';
import { View } from 'react-native';
import { tripPhotoCount, usePhotoFiles, useTripPhotos } from '@/data/photos';
import { img } from '@/lib/images';
import { demoKey } from '@/mocks/demo';
import type { Trip } from '@/mocks/types';
import { PhotoTile } from './PhotoTile';

const GRID = 6;
const photoTints = [colors.border, colors.accentSoft, colors.primaryPressed, colors.border];

/**
 * Trip page photo grid (C1): the trip's real photos (mine + the members'
 * uploaded ones); trips without any keep the prototype tiles of their legacy
 * count. Hidden when there are none.
 */
export function TripPhotoGrid({ trip }: { trip: Trip }) {
  const { t } = useTranslation();
  const photos = useTripPhotos(trip.id);
  const files = usePhotoFiles();
  const count = tripPhotoCount(trip, photos);
  if (count === 0) return null;
  const real = photos.length > 0;
  const key = demoKey(trip.id, 'trip');
  const tiles = real ? photos.slice(0, GRID) : Array.from({ length: GRID }, () => null);
  const more = (i: number) =>
    i === GRID - 1 && count > GRID - 1 ? (
      <View
        style={{
          flex: 1,
          backgroundColor: alpha.overlay,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="h3" tone="inverse">{`+${count - (GRID - 1)}`}</Text>
      </View>
    ) : null;
  return (
    <View style={{ gap: 10 }} testID="trip-photos">
      <Text variant="h3">
        {t('trips.detail.photos')}{' '}
        <Text variant="h3" color={colors.textMuted} style={{ fontFamily: fontFamily.title500 }}>
          {`(${count})`}
        </Text>
      </Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('trips.detail.photosLabel', { count })}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 4,
          borderRadius: radius.r16,
          overflow: 'hidden',
        }}
      >
        {tiles.map((photo: PhotoRow | null, i) => {
          const common = {
            tint: i === 0 ? trip.tint : photoTints[i % photoTints.length],
            radius: 0,
            aspectRatio: 1,
            width: '32.3%' as const,
            style: { flexGrow: 1 },
          };
          return photo ? (
            <PhotoTile
              key={photo.id}
              testID={`trip-photo-${i}`}
              photo={photo}
              status={files.get(photo.id)?.state}
              {...common}
            >
              {more(i)}
            </PhotoTile>
          ) : (
            <Photo key={i} uri={img(`${key}-p${i}`, 300, 300)} {...common}>
              {more(i)}
            </Photo>
          );
        })}
      </View>
    </View>
  );
}

/** Retro collage (C2): the trip's first three photos, else the prototype ones. */
export function TripCollage({ trip }: { trip: Trip }) {
  const photos = useTripPhotos(trip.id);
  const key = demoKey(trip.id, 'trip');
  const tile = (i: number, props: Parameters<typeof Photo>[0]) => {
    const photo = photos[i];
    return photo ? (
      <PhotoTile key={photo.id} testID={`retro-photo-${i}`} photo={photo} {...props} />
    ) : (
      <Photo
        key={i}
        uri={img(`${key}-p${i}`, i === 0 ? 500 : 300, i === 0 ? 600 : 300)}
        {...props}
      />
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 6, borderRadius: radius.r20, overflow: 'hidden' }}>
      {tile(0, { tint: trip.tint, radius: 0, height: 266, width: 0, style: { flex: 1.3 } })}
      <View style={{ flex: 1, gap: 6 }}>
        {tile(1, { tint: colors.border, radius: 0, height: 130 })}
        {tile(2, { tint: colors.accentSoft, radius: 0, height: 130 })}
      </View>
    </View>
  );
}

/** The trip's photo count: real photos when there are some, else the legacy number. */
export function useTripPhotoCount(trip: Trip | undefined) {
  const photos = useTripPhotos(trip?.id);
  return trip ? tripPhotoCount(trip, photos) : 0;
}
