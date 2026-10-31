import { useTranslation } from '@worlo/i18n';
import {
  alpha,
  Button,
  colors,
  Icon,
  IconButton,
  layout,
  Photo,
  radius,
  Screen,
  StatTile,
  Text,
  TileGrid,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { img } from '@/lib/images';
import { TRIP_DETAILS } from '@/mocks/data.generated';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { formatAmount, summarizeMoney } from './money';

const STORY_PARTS = 4;
const STORY_CURRENT = 2;
const NO_EXPENSES: never[] = [];

/** C2 · Retrospectiva: carvão story with collage, stats and the best moment. */
export function RetroScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useStore((s) => s.trips.find((x) => x.id === id) ?? s.trips[0]);
  const added = useStore((s) => (id ? s.expenses[id] : undefined)) ?? NO_EXPENSES;
  const close = () => (router.canGoBack() ? router.back() : router.navigate(routes.trips));

  if (!trip) return null;
  const details = TRIP_DETAILS[trip.id];
  const money = summarizeMoney(trip, details, added);
  const total = money ? formatAmount(money.total, money.currency) : trip.total;
  const stats = [
    { value: String(trip.days), label: t('trips.retro.days', { count: trip.days }) },
    { value: String(trip.photos), label: t('trips.retro.photos', { count: trip.photos }) },
    { value: String(trip.places), label: t('trips.retro.places', { count: trip.places }) },
    { value: total, label: t('trips.retro.expenses') },
  ];

  const header = (
    <View
      style={{
        paddingTop: insets.top + layout.headerGap,
        paddingHorizontal: layout.gutter,
        paddingBottom: 6,
        gap: 20,
        backgroundColor: colors.backgroundDark,
      }}
    >
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('trips.retro.progress', {
          current: STORY_CURRENT,
          total: STORY_PARTS,
        })}
        style={{ flexDirection: 'row', gap: 4 }}
      >
        {Array.from({ length: STORY_PARTS }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i < STORY_CURRENT ? colors.textInverse : alpha.darkBorderStrong,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="overline" tone="accentOnDark">
          {t('trips.retro.overline', { year: trip.year })}
        </Text>
        <IconButton
          testID="retro-close"
          icon="x"
          tone="dark"
          label={t('common.actions.close')}
          onPress={close}
        />
      </View>
    </View>
  );

  return (
    <Screen testID="retro-screen" tone="dark" header={header} gap={20}>
      <Text variant="statL" tone="inverse" style={{ fontSize: 44, lineHeight: 46 }}>
        {trip.title}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6, borderRadius: radius.r20, overflow: 'hidden' }}>
        <Photo
          uri={img(`${trip.id}-p0`, 500, 600)}
          tint={trip.tint}
          radius={0}
          height={266}
          width={0}
          style={{ flex: 1.3 }}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <Photo
            uri={img(`${trip.id}-p1`, 300, 300)}
            tint={colors.border}
            radius={0}
            height={130}
          />
          <Photo
            uri={img(`${trip.id}-p2`, 300, 300)}
            tint={colors.accentSoft}
            radius={0}
            height={130}
          />
        </View>
      </View>
      <TileGrid>
        {stats.map((stat) => (
          <StatTile
            key={stat.label}
            onDark
            size="lg"
            value={stat.value}
            label={stat.label}
            style={{ minWidth: '45%', borderWidth: 1, borderColor: alpha.darkBorder }}
          />
        ))}
      </TileGrid>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 16,
          borderRadius: radius.r16,
          backgroundColor: alpha.darkCard,
          borderWidth: 1,
          borderColor: alpha.darkBorder,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="star" weight="fill" size={20} color={colors.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="overline" tone="inverseMuted">
            {t('trips.retro.best')}
          </Text>
          <Text variant="bodyL" weight={700} tone="inverse">
            {details?.best ?? trip.title}
          </Text>
        </View>
      </View>
      <Button
        testID="retro-share"
        icon="export"
        fullWidth
        label={t('common.actions.share')}
        onPress={() => router.push(routes.share('retro', { tripId: trip.id }))}
      />
    </Screen>
  );
}
