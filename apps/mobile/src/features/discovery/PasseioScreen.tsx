import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  BottomBar,
  Button,
  Card,
  colors,
  DateChip,
  HeroScreen,
  Icon,
  IconButton,
  makeStyles,
  Sheet,
  StatusChip,
  Stepper,
  Text,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { DemoGate } from '@/components/DemoGate';
import {
  type BookingFailure,
  bookTour,
  cancelBooking,
  type SlotView,
  todayISO,
  useBooking,
  useTourSlots,
} from '@/data/bookings';
import { useCatalog } from '@/data/catalog';
import { useSync } from '@/features/sync/SyncProvider';
import { dateParts, formatMoney } from '@/lib/format';
import { img } from '@/lib/images';
import { routes } from '@/navigation/routes';
import { DEFAULT_DATE_INDEX, DEFAULT_PEOPLE, findTour, MAX_PEOPLE, MIN_PEOPLE } from './tours';
import { useTourSave } from './useTourSave';

const FAILURE_COPY = {
  offline: 'common.states.offlineTitle',
  soldOut: 'discovery.toasts.soldOut',
  alreadyBooked: 'discovery.toasts.alreadyBooked',
  closed: 'discovery.toasts.closed',
  error: 'discovery.toasts.bookFailed',
} as const satisfies Record<BookingFailure, string>;

/** Sáb 7 (prototype default) when it can be booked, else the first open date. */
function defaultSlot(slots: SlotView[]): SlotView | undefined {
  const preferred = slots[DEFAULT_DATE_INDEX];
  return preferred && !preferred.soldOut ? preferred : (slots.find((s) => !s.soldOut) ?? slots[0]);
}

/** E2 · Detalhe do passeio: date + people → Reservar (03_FLOWS → F7). */
export function PasseioScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const { online } = useSync();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { PASSEIOS } = useCatalog();
  const tour = findTour(PASSEIOS, id);
  const slots = useTourSlots(tour.id);
  const booking = useBooking(tour.id);
  const { saved, toggle } = useTourSave(tour);
  const [picked, setPicked] = useState<string | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.navigate(routes.passeios));

  const slot =
    slots.find((s) => s.id === (picked ?? booking?.slotId)) ??
    (booking ? undefined : defaultSlot(slots));
  const count = people ?? booking?.people ?? DEFAULT_PEOPLE;

  const dateLabel = (date: string) => t('discovery.tour.date', dateParts(date, i18n.language));
  const bookedDate = booking?.date ?? slot?.date;
  const price = formatMoney(tour.price, tour.cur);
  const total = formatMoney(booking ? booking.total : tour.price * count, tour.cur);
  const when = bookedDate
    ? t('discovery.tour.when', {
        date: dateLabel(bookedDate),
        people: t('common.count.people', { count }),
      })
    : t('discovery.tour.noDates');

  const pickDate = (s: SlotView) => {
    if (booking) return;
    if (s.soldOut) {
      toast.show(t('discovery.toasts.soldOut'), 'info');
      return;
    }
    setPicked(s.id);
  };

  const reserve = async () => {
    if (busy) return;
    if (booking) {
      setSheet(true);
      return;
    }
    if (!slot || slot.soldOut) return;
    if (count > slot.left) {
      toast.show(t('discovery.toasts.fewSeats', { count: slot.left }), 'info');
      return;
    }
    setBusy(true);
    const result = await bookTour(slot.id, count, online);
    setBusy(false);
    if (!result.ok) {
      toast.show(t(FAILURE_COPY[result.reason]), result.reason === 'offline' ? 'error' : 'info');
      return;
    }
    setPicked(null);
    setPeople(null);
    toast.show(t('discovery.toasts.booked', { date: dateLabel(result.booking.date) }));
  };

  const cancel = async () => {
    if (!booking || busy) return;
    setBusy(true);
    const result = await cancelBooking(booking.id, online);
    setBusy(false);
    if (!result.ok) {
      toast.show(
        t(result.reason === 'offline' ? FAILURE_COPY.offline : 'discovery.toasts.cancelFailed'),
        'error',
      );
      return;
    }
    setSheet(false);
    toast.show(t('discovery.toasts.cancelled'), 'info');
  };
  const isToday = booking ? booking.date <= todayISO() : false;

  return (
    <DemoGate network onBack={back}>
      <HeroScreen
        testID="passeio-screen"
        heroUri={img(`pas-${tour.id}`, 800, 600)}
        heroTint={colors.border}
        heroHeight={300}
        onBack={back}
        backLabel={t('common.actions.back')}
        actions={
          <IconButton
            testID="passeio-save"
            icon="heart"
            tone="photo"
            label={saved ? t('discovery.unsave') : t('discovery.save')}
            accessibilityState={{ selected: saved }}
            iconWeight={saved ? 'fill' : 'regular'}
            iconColor={saved ? colors.primary : colors.text}
            onPress={toggle}
          />
        }
        bottomBar={
          <BottomBar tone="white">
            <View
              accessible
              accessibilityLabel={`${t('discovery.tour.total', { total })}, ${when}`}
              style={{ flexShrink: 0 }}
            >
              <Text testID="passeio-total" variant="statS" style={styles.total}>
                {total}
              </Text>
              <Text testID="passeio-when" variant="micro" tone="muted" style={{ fontSize: 12 }}>
                {when}
              </Text>
            </View>
            <Button
              testID="passeio-book"
              flex={1}
              variant={booking ? 'outline' : 'primary'}
              icon={booking ? 'check' : 'ticket'}
              label={booking ? t('discovery.tour.booked') : t('discovery.tour.book')}
              loading={busy && !sheet}
              disabled={!booking && (!slot || slot.soldOut)}
              onPress={() => void reserve()}
            />
          </BottomBar>
        }
      >
        <Card overlap gap={10}>
          <Text variant="overline" tone="link">{`${tour.cat} · ${tour.place}`}</Text>
          <Text variant="h2" style={styles.name}>
            {tour.name}
          </Text>
          <View
            accessible
            accessibilityLabel={`${t('common.a11y.rating', { value: tour.rating })}, ${t('discovery.tour.reviews', { count: tour.reviews })}`}
            style={styles.row6}
          >
            <Icon name="star" weight="fill" size={16} color={colors.primary} />
            <Text variant="label">{tour.rating}</Text>
            <Text variant="bodyS" tone="muted">
              {`· ${t('discovery.tour.reviews', { count: tour.reviews })}`}
            </Text>
          </View>
          <View style={styles.chips}>
            <StatusChip kind="neutral" icon="clock" label={tour.dur} />
            <StatusChip kind="neutral" icon="translate" label={tour.lang} />
            <StatusChip kind="neutral" icon="users" label={tour.group} />
          </View>
        </Card>

        <View style={styles.content}>
          <Card style={styles.hostRow}>
            <Avatar name={tour.host} initials={tour.hostIni} size={44} colorIndex={0} />
            <View style={{ flex: 1 }}>
              <Text variant="body" weight={700}>
                {tour.host}
              </Text>
              <View style={styles.row4}>
                <Icon name="seal-check" size={16} color={colors.success} />
                <Text variant="caption" weight={600} tone="success">
                  {t('discovery.tour.verified')}
                </Text>
              </View>
            </View>
          </Card>

          <View style={{ gap: 8 }}>
            <Text variant="h3">{t('discovery.tour.about')}</Text>
            <Text variant="body" tone="support" style={{ lineHeight: 23 }}>
              {tour.desc}
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            <Text variant="h3">{t('discovery.tour.includes')}</Text>
            {tour.inc.map((item) => (
              <View key={item} style={styles.row10}>
                <Icon name="check-circle" size={20} color={colors.link} />
                <Text variant="body" style={{ flex: 1 }}>
                  {item}
                </Text>
              </View>
            ))}
            <View
              accessible
              accessibilityLabel={t('discovery.tour.meetingPoint', { place: tour.meet })}
              style={[styles.row10, { marginTop: 4 }]}
            >
              <Icon name="map-pin" size={20} color={colors.textMuted} />
              <Text variant="body" tone="support" style={{ flex: 1 }}>
                {tour.meet}
              </Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text variant="h3">{t('discovery.tour.chooseDate')}</Text>
            {slots.length === 0 ? (
              <Text testID="passeio-no-dates" variant="body" tone="muted">
                {t('discovery.tour.noDates')}
              </Text>
            ) : null}
            <ScrollView
              horizontal
              accessibilityRole="radiogroup"
              accessibilityLabel={t('discovery.tour.chooseDate')}
              showsHorizontalScrollIndicator={false}
              style={styles.datesScroll}
              contentContainerStyle={styles.dates}
            >
              {slots.map((s, i) => {
                const parts = dateParts(s.date, i18n.language);
                return (
                  <DateChip
                    key={s.id}
                    testID={`passeio-date-${i}`}
                    weekday={parts.weekday}
                    day={parts.day}
                    month={parts.month}
                    soldOut={s.soldOut}
                    soldOutLabel={t('discovery.tour.soldOut')}
                    selected={s.id === slot?.id}
                    accessibilityLabel={
                      s.soldOut
                        ? t('discovery.tour.soldOutA11y', { date: dateLabel(s.date) })
                        : dateLabel(s.date)
                    }
                    onPress={() => pickDate(s)}
                  />
                );
              })}
            </ScrollView>
          </View>

          <Card style={styles.peopleRow}>
            <View style={{ flex: 1 }}>
              <Text variant="body" weight={700}>
                {t('discovery.tour.people')}
              </Text>
              <Text variant="caption" tone="muted">
                {t('discovery.tour.perPerson', { price })}
              </Text>
            </View>
            <Stepper
              testID="passeio-people"
              value={count}
              // Booked: the stepper shows the seats held (cancel to change them).
              min={booking ? count : MIN_PEOPLE}
              max={booking ? count : MAX_PEOPLE}
              onChange={setPeople}
              label={t('discovery.tour.people')}
              decrementLabel={t('discovery.tour.fewer')}
              incrementLabel={t('discovery.tour.more')}
            />
          </Card>

          <Card padding={16} gap={8}>
            <View
              accessible
              accessibilityLabel={t('discovery.tour.reviewA11y', { who: tour.review.who })}
              style={styles.row8}
            >
              <Text variant="bodyS" weight={700}>
                {tour.review.who}
              </Text>
              <View style={styles.stars}>
                {[0, 1, 2, 3, 4].map((n) => (
                  <Icon key={n} name="star" weight="fill" size={12} color={colors.primary} />
                ))}
              </View>
            </View>
            <Text variant="body">{`“${tour.review.text}”`}</Text>
          </Card>
        </View>
      </HeroScreen>
      <Sheet
        testID="booking-sheet"
        visible={sheet && Boolean(booking)}
        onClose={() => setSheet(false)}
        closeLabel={t('common.actions.close')}
        title={t('discovery.booking.title')}
        subtitle={
          booking
            ? t('discovery.booking.summary', {
                date: dateLabel(booking.date),
                people: t('common.count.people', { count: booking.people }),
                total: formatMoney(booking.total, booking.currency),
              })
            : undefined
        }
        footer={
          <View style={styles.sheetActions}>
            <Button
              testID="booking-keep"
              variant="ghost"
              label={t('discovery.booking.keep')}
              onPress={() => setSheet(false)}
            />
            <View style={{ flex: 1 }}>
              <Button
                testID="booking-cancel"
                variant="outline"
                color={colors.error}
                fullWidth
                loading={busy}
                disabled={isToday}
                label={t('discovery.booking.cancel')}
                onPress={() => void cancel()}
              />
            </View>
          </View>
        }
      >
        <View style={styles.row10}>
          <Icon name="coins" size={20} color={colors.link} />
          <Text variant="body" tone="support" style={{ flex: 1 }}>
            {t('discovery.booking.payNote', { host: tour.host })}
          </Text>
        </View>
        {isToday ? (
          <Text variant="caption" tone="muted">
            {t('discovery.booking.today')}
          </Text>
        ) : null}
      </Sheet>
    </DemoGate>
  );
}

const useStyles = makeStyles((t) => ({
  total: { fontSize: 22, lineHeight: 26 },
  name: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  content: {
    paddingHorizontal: t.layout.gutter,
    paddingTop: 20,
    gap: 22,
  },
  hostRow: { flexDirection: 'row', alignItems: 'center' },
  datesScroll: { marginHorizontal: -t.layout.gutter, flexGrow: 0 },
  dates: { paddingHorizontal: t.layout.gutter, gap: 8 },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  stars: { flexDirection: 'row', gap: 2 },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
}));
