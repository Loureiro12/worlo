import { useTranslation } from '@worlo/i18n';
import { Card, colors, Icon, Photo, radius, Text } from '@worlo/ui';
import { View } from 'react-native';
import { usePhotoRef } from '@/data/photos';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import type { TripDetails } from '@/mocks/types';

/**
 * "Dia a dia" of a trip (Viagem tab and Retrospectiva): each day's stops and
 * what was recorded in travel mode, photos with their captions.
 */
export function DayByDay({ details, onDark = false }: { details?: TripDetails; onDark?: boolean }) {
  const { t } = useTranslation();
  const days = details?.days ?? [];
  if (days.length === 0) {
    return (
      <Card testID="trip-days-empty" padding={20} gap={6}>
        <Text variant="bodyL" weight={700}>
          {t('trips.detail.daysEmptyTitle')}
        </Text>
        <Text variant="bodyS" weight={400} tone="muted">
          {t('trips.detail.daysEmptyText')}
        </Text>
      </Card>
    );
  }
  return (
    <View style={{ gap: 20 }}>
      {days.map((day) => (
        <View key={day.label}>
          <Text
            variant="cardTitle"
            tone={onDark ? 'inverse' : 'default'}
            style={{ marginBottom: 12 }}
          >
            {day.label}
          </Text>
          {day.items.map((item) => (
            <View
              key={`${item.time}-${item.title}-${item.photos?.[0] ?? ''}`}
              style={{ flexDirection: 'row', gap: 12 }}
            >
              <View style={{ width: 36, alignItems: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={item.icon} size={18} />
                </View>
                <View
                  style={{ flex: 1, width: 1.5, minHeight: 14, backgroundColor: colors.border }}
                />
              </View>
              <View style={{ flex: 1, gap: 2, paddingTop: 6, paddingBottom: 18, minWidth: 0 }}>
                <Text variant="caption" weight={700} tone="muted" style={{ fontSize: 12 }}>
                  {item.time}
                </Text>
                <Text variant="body" weight={700} tone={onDark ? 'inverse' : 'default'}>
                  {item.title}
                </Text>
                {item.note ? (
                  <Text variant="bodyS" weight={400} tone={onDark ? 'inverseMuted' : 'support'}>
                    {item.note}
                  </Text>
                ) : null}
                {item.photos?.length ? (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    {item.photos.map((id) => (
                      <DayPhoto key={id} id={id} onDark={onDark} />
                    ))}
                  </View>
                ) : null}
                {item.extra ? (
                  <View
                    style={{
                      marginTop: 6,
                      alignSelf: 'flex-start',
                      height: 26,
                      paddingHorizontal: 10,
                      borderRadius: radius.full,
                      backgroundColor: colors.accentSoft,
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="caption" weight={700} tone="link" style={{ fontSize: 12 }}>
                      {item.extra}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** A photo recorded that day, with the caption it was saved with. */
function DayPhoto({ id, onDark }: { id: string; onDark: boolean }) {
  const uri = usePhotoRef(id);
  const caption = useQuery(() => repos.photos.get(id)?.caption ?? '', [id]);
  return (
    <View testID={`day-photo-${id}`} style={{ gap: 4 }}>
      <Photo uri={uri} tint={colors.border} height={180} radius={radius.r12} />
      {caption ? (
        <Text variant="caption" tone={onDark ? 'inverseMuted' : 'muted'}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
