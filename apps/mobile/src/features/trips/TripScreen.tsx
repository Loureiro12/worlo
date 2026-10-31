import { useTranslation } from '@worlo/i18n';
import {
  alpha,
  Button,
  Card,
  colors,
  EmptyState,
  fontFamily,
  HeroScreen,
  Icon,
  IconButton,
  type IconName,
  layout,
  Photo,
  Rating,
  radius,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { img } from '@/lib/images';
import { TRIP_ACTIVITY, TRIP_DETAILS } from '@/mocks/data.generated';
import type { Trip, TripDetails } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import type { Member, TripExpense } from '@/store/slices/trips';
import { ExpenseSheet } from './ExpenseSheet';
import { formatAmount, type MoneySummary, summarizeMoney, tripCurrency } from './money';
import { PeopleSheet } from './PeopleSheet';
import { PeopleCard } from './parts';
import { placeLabel, useWithText } from './TripsScreen';

type TripTab = 'overview' | 'days' | 'money';

const NO_EXPENSES: TripExpense[] = [];

/** C1 · Página da viagem: hero, info card, "Quem foi" and the three tabs. */
export function TripScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useStore((s) => s.trips.find((x) => x.id === id));
  const added = useStore((s) => (id ? s.expenses[id] : undefined)) ?? NO_EXPENSES;
  const withText = useWithText();
  const [tab, setTab] = useState<TripTab>('overview');
  const [people, setPeople] = useState(false);
  const [expense, setExpense] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.navigate(routes.trips));

  if (!trip) {
    return (
      <Screen
        testID="trip-screen"
        header={<ScreenHeader onBack={back} backLabel={t('common.actions.back')} />}
      >
        <EmptyState icon="suitcase-rolling" title={t('trips.notFound')} />
      </Screen>
    );
  }

  const details: TripDetails | undefined = TRIP_DETAILS[trip.id];
  const money = summarizeMoney(trip, details, added);
  const total = money ? formatAmount(money.total, money.currency) : trip.total;
  const rows: { icon: IconName; text: string }[] = [
    { icon: 'map-pin', text: `${trip.flag} ${placeLabel(trip)}` },
    {
      icon: 'calendar-blank',
      text: t('trips.detail.period', {
        period: trip.period,
        days: t('common.count.days', { count: trip.days }),
      }),
    },
    { icon: 'wallet', text: total },
    { icon: 'users', text: withText(trip) },
  ];

  return (
    <HeroScreen
      testID="trip-screen"
      heroUri={img(`${trip.id}-a`, 700, 500)}
      heroTint={trip.tint}
      heroHeight={320}
      onBack={back}
      backLabel={t('common.actions.back')}
      withTabBar
      actions={
        <>
          <IconButton
            testID="trip-share"
            icon="export"
            tone="photo"
            label={t('common.actions.share')}
            onPress={() => router.push(routes.share('trip', { tripId: trip.id }))}
          />
          <Button
            testID="trip-edit"
            variant="pill"
            size="sm"
            label={t('common.actions.edit')}
            onPress={() =>
              router.push(routes.tripForm({ mode: 'edit', kind: 'past', id: trip.id }))
            }
          />
        </>
      }
    >
      <Card overlap style={{ marginTop: -48 }}>
        <Text variant="h1Detail">{trip.title}</Text>
        {rows.map((row) => (
          <View key={row.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name={row.icon} size={18} color={colors.textMuted} />
            <Text variant="body" weight={500} tone="support" style={{ flex: 1 }}>
              {row.text}
            </Text>
          </View>
        ))}
      </Card>
      <View style={{ paddingHorizontal: layout.gutter, gap: 20, marginTop: -4 }}>
        <PeopleCard
          testID="trip-people"
          collab={trip.collab as Member[]}
          activity={TRIP_ACTIVITY[trip.id]}
          onOpen={() => setPeople(true)}
        />
        <Segmented<TripTab>
          testID="trip-tab"
          label={t('trips.detail.tabsLabel')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: t('trips.detail.tabs.overview') },
            { value: 'days', label: t('trips.detail.tabs.days') },
            { value: 'money', label: t('trips.detail.tabs.money') },
          ]}
        />
        {tab === 'overview' ? <Overview trip={trip} details={details} /> : null}
        {tab === 'days' ? <DayByDay details={details} /> : null}
        {tab === 'money' ? <Money money={money} onAdd={() => setExpense(true)} /> : null}
      </View>
      <PeopleSheet
        target={people ? { kind: 'trip', id: trip.id } : null}
        onClose={() => setPeople(false)}
      />
      <ExpenseSheet
        trip={trip}
        currency={money?.currency ?? tripCurrency(trip, details)}
        visible={expense}
        onClose={() => setExpense(false)}
        onSaved={() => setTab('money')}
      />
    </HeroScreen>
  );
}

const photoTints = [colors.border, colors.accentSoft, colors.primaryPressed, colors.border];

function Overview({ trip, details }: { trip: Trip; details?: TripDetails }) {
  const { t } = useTranslation();
  const router = useRouter();
  const places = details?.places ?? [];
  return (
    <View style={{ gap: 24 }}>
      {trip.photos > 0 ? (
        <View style={{ gap: 10 }}>
          <Text variant="h3">
            {t('trips.detail.photos')}{' '}
            <Text variant="h3" color={colors.textMuted} style={{ fontFamily: fontFamily.title500 }}>
              {`(${trip.photos})`}
            </Text>
          </Text>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('trips.detail.photosLabel', { count: trip.photos })}
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 4,
              borderRadius: radius.r16,
              overflow: 'hidden',
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Photo
                key={i}
                uri={img(`${trip.id}-p${i}`, 300, 300)}
                tint={i === 0 ? trip.tint : photoTints[i % photoTints.length]}
                radius={0}
                aspectRatio={1}
                width="32.3%"
                style={{ flexGrow: 1 }}
              >
                {i === 5 && trip.photos > 5 ? (
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: alpha.overlay,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="h3" tone="inverse">{`+${trip.photos - 5}`}</Text>
                  </View>
                ) : null}
              </Photo>
            ))}
          </View>
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        <Text variant="h3">{t('trips.detail.placesTitle')}</Text>
        {places.length === 0 ? (
          <Card>
            <Text variant="body" tone="muted">
              {t('trips.detail.noPlaces')}
            </Text>
          </Card>
        ) : (
          places.map((place) => (
            <Card
              key={place.name}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size={14} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" weight={700}>
                  {place.name}
                </Text>
                <Text variant="caption" tone="muted" weight={400}>
                  {place.cat}
                </Text>
              </View>
              <Rating value={place.stars} />
            </Card>
          ))
        )}
      </View>
      {details?.diary ? (
        <View style={{ gap: 10 }}>
          <Text variant="h3">{t('trips.detail.diary')}</Text>
          <Card padding={18} gap={10}>
            <Text variant="bodyL">{`“${details.diary.text}”`}</Text>
            <Text variant="caption" weight={600} tone="muted">
              {details.diary.meta}
            </Text>
          </Card>
        </View>
      ) : null}
      <Card surface="dark" radius={24} padding={20}>
        <Text variant="overline" tone="accentOnDark">
          {t('trips.detail.retroOverline')}
        </Text>
        <Text variant="h3" tone="inverse" style={{ fontSize: 22, lineHeight: 28 }}>
          {t('trips.detail.retroTitle', { title: trip.title })}
        </Text>
        <View style={{ alignSelf: 'flex-start' }}>
          <Button
            testID="trip-open-retro"
            size="sm"
            label={t('trips.detail.retroCta')}
            onPress={() => router.push(routes.retro(trip.id))}
          />
        </View>
      </Card>
    </View>
  );
}

function DayByDay({ details }: { details?: TripDetails }) {
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
          <Text variant="cardTitle" style={{ marginBottom: 12 }}>
            {day.label}
          </Text>
          {day.items.map((item) => (
            <View key={`${item.time}-${item.title}`} style={{ flexDirection: 'row', gap: 12 }}>
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
                <Text variant="body" weight={700}>
                  {item.title}
                </Text>
                <Text variant="bodyS" weight={400} tone="support">
                  {item.note}
                </Text>
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

function Money({ money, onAdd }: { money: MoneySummary | null; onAdd: () => void }) {
  const { t } = useTranslation();
  const addButton = (
    <Button
      testID="trip-add-expense"
      variant="outline"
      size="md"
      icon="plus"
      fullWidth
      label={t('trips.money.add')}
      onPress={onAdd}
    />
  );
  if (!money) {
    return (
      <View style={{ gap: 20 }}>
        <Card testID="trip-money-empty" padding={20} gap={6}>
          <Text variant="bodyL" weight={700}>
            {t('trips.money.emptyTitle')}
          </Text>
          <Text variant="bodyS" weight={400} tone="muted">
            {t('trips.money.emptyText')}
          </Text>
        </Card>
        {addButton}
      </View>
    );
  }
  const fmt = (value: number) => formatAmount(value, money.currency);
  return (
    <View style={{ gap: 20 }}>
      <Card radius={24} padding={20} gap={14}>
        <View>
          <Text variant="caption" weight={600} tone="muted">
            {t('trips.money.totalLabel')}
          </Text>
          <Text testID="trip-money-total" variant="displayL" style={{ lineHeight: 46 }}>
            {fmt(money.total)}
          </Text>
          <Text variant="label" tone="support">
            {t('trips.money.perDay', {
              value: fmt(money.perDay),
              days: t('common.count.days', { count: money.days }),
            })}
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel={t('trips.money.breakdownLabel')}
          style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 }}
        >
          {money.cats.map((c) => (
            <View key={c.name} style={{ flex: c.share, backgroundColor: c.color }} />
          ))}
        </View>
        <View style={{ gap: 8 }}>
          {money.cats.map((c) => (
            <View
              key={c.name}
              testID={`trip-money-cat-${c.key ?? c.name}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.color }} />
              <Text variant="label" style={{ flex: 1 }}>
                {c.key ? t(`trips.money.categories.${c.key}`) : c.name}
              </Text>
              <Text variant="label" tone="muted">{`${c.pct}%`}</Text>
              <Text variant="label" weight={700} align="right" style={{ width: 84 }}>
                {fmt(c.value)}
              </Text>
            </View>
          ))}
        </View>
      </Card>
      <View style={{ gap: 10 }}>
        <Text variant="h3">{t('trips.money.entries')}</Text>
        {money.items.map((item, index) => (
          <Card
            key={`${item.name}-${index}`}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.r12,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={item.icon} size={20} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="body" weight={700}>
                {item.name}
              </Text>
              <Text variant="caption" tone="muted" weight={400}>
                {item.meta}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text variant="body" weight={700}>
                {item.val}
              </Text>
              {item.receipt ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="receipt" size={12} color={colors.success} />
                  <Text variant="micro" weight={700} tone="success">
                    {t('trips.money.receipt')}
                  </Text>
                </View>
              ) : null}
            </View>
          </Card>
        ))}
      </View>
      {addButton}
    </View>
  );
}
