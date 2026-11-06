import { useTranslation } from '@worlo/i18n';
import {
  alpha,
  Button,
  colors,
  Icon,
  IconButton,
  layout,
  radius,
  Screen,
  StatTile,
  Text,
  TileGrid,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripExpenses, useTrips } from '@/data/trips';
import { TripCollage, useTripPhotoCount } from '@/features/photos/TripPhotos';
import { routes } from '@/navigation/routes';
import { DayByDay } from './DayByDay';
import { formatAmount, summarizeMoney, tripCurrency } from './money';
import { SplitSummary } from './SplitSummary';

/** C2 · Retrospectiva: carvão story with collage, stats and the best moment. */
export function RetroScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trips = useTrips();
  const trip = trips.find((x) => x.id === id) ?? trips[0];
  const added = useTripExpenses(trip?.id);
  const photoCount = useTripPhotoCount(trip);
  const close = () => (router.canGoBack() ? router.back() : router.navigate(routes.trips));

  if (!trip) return null;
  const details = trip.details ?? undefined;
  const money = summarizeMoney(trip, details, added);
  const total = money ? formatAmount(money.total, money.currency) : trip.total;
  const stats = [
    { value: String(trip.days), label: t('trips.retro.days', { count: trip.days }) },
    { value: String(photoCount), label: t('trips.retro.photos', { count: photoCount }) },
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
      <TripCollage trip={trip} />
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
      {details?.best ? (
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
              {details.best}
            </Text>
          </View>
        </View>
      ) : null}
      <SplitSummary
        tripId={trip.id}
        collab={trip.collab}
        currency={money?.currency ?? tripCurrency(trip, details)}
        onDark
      />
      {details?.days?.length ? (
        <View style={{ gap: 14 }}>
          <Text variant="h3" tone="inverse" accessibilityRole="header">
            {t('trips.retro.dayByDay')}
          </Text>
          <DayByDay details={details} onDark />
        </View>
      ) : null}
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
