import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  AvatarStack,
  alpha,
  Button,
  Chip,
  colors,
  EmptyState,
  FormError,
  Icon,
  IconButton,
  type IconName,
  MoneyInput,
  makeStyles,
  Photo,
  parseMoney,
  Screen,
  ScreenHeader,
  Sheet,
  StarRating,
  StatTile,
  shadow,
  Text,
  TextArea,
  useToast,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCatalog } from '@/data/catalog';
import { assignLivePhotos, takePhoto, usePhotoRef } from '@/data/photos';
import {
  addLiveLog,
  endLive,
  type LiveLogEntry,
  setLiveDay,
  startLive,
  toggleStopDone,
  useItineraries,
  useLive,
} from '@/data/planning';
import { repos } from '@/data/repositories';
import { img } from '@/lib/images';
import { avatarFor, firstName, ME } from '@/lib/people';
import type { Itinerary } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import {
  countryIdForFlag,
  EXCHANGE_RATE,
  EXPENSE_CATEGORIES,
  type ExpenseCategoryKey,
  endSummary,
  formatMoneyFlex,
  hereFor,
  LOCAL_CURRENCY,
  localTime,
  NEARBY,
  nowHHMM,
  tripFromLive,
} from './planning';

type SheetKind = 'checkin' | 'photo' | 'expense' | 'note' | 'end';

const ACTIONS: { key: Exclude<SheetKind, 'end'>; icon: IconName; coral: boolean }[] = [
  { key: 'checkin', icon: 'map-pin', coral: true },
  { key: 'photo', icon: 'camera', coral: false },
  { key: 'expense', icon: 'wallet', coral: false },
  { key: 'note', icon: 'note-pencil', coral: false },
];

const LOG_ICONS: Record<LiveLogEntry['type'], IconName> = {
  checkin: 'map-pin',
  photo: 'camera',
  expense: 'wallet',
  note: 'note-pencil',
  done: 'check-circle',
};

const COMPANION = 'Marina Costa';

export function LiveScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const s = useStyles();

  const live = useLive();
  const itineraries = useItineraries();
  const found = itineraries.find((i) => i.id === live.itineraryId) ?? itineraries[0];

  // Opening the screen with travel mode off turns it on for the current itinerary.
  // Only on mount: ending the trip turns it off and must not restart it.
  useEffect(() => {
    if (!live.on && found) startLive(found.id);
  }, []);

  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [error, setError] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [stars, setStars] = useState(0);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategoryKey>('food');
  const [text, setText] = useState('');

  if (!found) {
    return (
      <Screen
        testID="live-screen"
        header={<ScreenHeader onBack={() => router.back()} backLabel={t('common.actions.back')} />}
      >
        <EmptyState
          icon="map-trifold"
          title={t('planning.live.noItinerary')}
          text={t('planning.live.noItineraryText')}
        />
      </Screen>
    );
  }
  const it: Itinerary = found;

  const di = Math.max(0, Math.min(live.day - 1, it.days.length - 1));
  const day = it.days[di] ?? { label: '', items: [] };
  const here = hereFor(it, di);
  const herePlace = here.split(',')[0] ?? here;

  const seed: LiveLogEntry[] = [
    {
      id: 'seed-hotel',
      type: 'checkin',
      text: t('planning.live.log.seedHotel'),
      time: '08:12',
      author: ME,
    },
    {
      id: 'seed-photos',
      type: 'photo',
      text: t('planning.live.log.seedPhotos'),
      time: '09:40',
      author: COMPANION,
    },
  ];
  // The prototype's sample entries always sit below the user's own (not persisted).
  const log = [...live.log, ...seed];

  const doneKey = (i: number) => `${di}-${i}`;
  const doneN = day.items.filter((_, i) => live.done[doneKey(i)]).length;
  const firstOpen = day.items.findIndex((_, i) => !live.done[doneKey(i)]);
  const summary = endSummary(it, log, doneN);

  const amountValue = parseMoney(amount);
  const converted = formatMoneyFlex(amountValue * EXCHANGE_RATE);

  const openSheet = (kind: SheetKind) => {
    setError(false);
    setPick(null);
    setStars(0);
    setAmount('');
    setText('');
    setCategory('food');
    setSheet(kind);
  };

  const log_ = (entry: Omit<LiveLogEntry, 'id' | 'time' | 'author'>, spent = 0) => {
    addLiveLog({ time: nowHHMM(), author: ME, ...entry }, spent);
  };

  const submit = () => {
    if (sheet === 'checkin') {
      const place = pick == null ? undefined : NEARBY[pick];
      if (!place) return setError(true);
      log_({
        type: 'checkin',
        text: `${t('planning.live.log.checkin', { place: place.name })}${stars ? ` ${'★'.repeat(stars)}` : ''}`,
      });
      toast.show(t('planning.live.toasts.checkin', { place: place.name }));
    } else if (sheet === 'photo') {
      void addPhoto();
      return;
    } else if (sheet === 'expense') {
      if (amountValue <= 0) return setError(true);
      log_(
        {
          type: 'expense',
          text: t('planning.live.log.expense', {
            amount: formatMoneyFlex(amountValue, LOCAL_CURRENCY),
            category: t(`planning.live.categories.${category}`).toLowerCase(),
            converted,
          }),
        },
        amountValue * EXCHANGE_RATE,
      );
      toast.show(t('planning.live.toasts.expense'));
    } else if (sheet === 'note') {
      if (!text.trim()) return setError(true);
      log_({ type: 'note', text: t('planning.live.log.note'), detail: text.trim() });
      toast.show(t('planning.live.toasts.note'));
    } else if (sheet === 'end') {
      const input = tripFromLive(it, summary, live.spent);
      // Ending the same trip again (same month) opens the trip created the first time.
      const trip =
        repos.trips
          .list()
          .find(
            (x) => x.title === input.title && x.period === input.period && x.flag === input.flag,
          ) ?? repos.trips.create(input);
      const cid = countryIdForFlag(it.flag);
      if (input.countryIso) repos.world.markVisited(input.countryIso, input.year);
      assignLivePhotos(live.log, trip.id);
      endLive();
      setSheet(null);
      toast.show(
        t('planning.live.toasts.end', {
          country: (cid && getCatalog().COUNTRIES[cid]?.name) || trip.country || trip.place,
        }),
      );
      router.replace(routes.trip(trip.id));
      return;
    }
    setSheet(null);
  };

  /** Camera → photo of this trip (when it already exists, else "Sem viagem") → log entry. */
  const addPhoto = async () => {
    const input = tripFromLive(it, summary, live.spent);
    const tripId =
      repos.trips
        .list()
        .find((x) => x.title === input.title && x.period === input.period && x.flag === input.flag)
        ?.id ?? null;
    const caption = text.trim() || undefined;
    try {
      const result = await takePhoto({ tripId });
      if (result.status === 'denied') {
        toast.show(t('profile.photos.cameraDenied'), 'error');
        return;
      }
      if (result.status === 'canceled') return;
      log_({
        type: 'photo',
        text: t('planning.live.log.photo', { place: herePlace }),
        detail: caption,
        photo: result.photos[0]?.id,
      });
      toast.show(t('planning.live.toasts.photo'));
      setSheet(null);
    } catch {
      toast.show(t('profile.photos.pickError'), 'error');
    }
  };

  const togglePlan = (i: number) => {
    const wasDone = Boolean(live.done[doneKey(i)]);
    toggleStopDone(doneKey(i));
    const stop = day.items[i];
    if (!wasDone && stop)
      log_({ type: 'done', text: t('planning.live.log.done', { title: stop.title }) });
  };

  const errorText =
    sheet === 'checkin'
      ? t('planning.live.errors.checkin')
      : sheet === 'expense'
        ? t('planning.live.errors.expense')
        : t('planning.live.errors.note');

  return (
    <View testID="live-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Carvão top block */}
        <View style={[s.top, { paddingTop: insets.top + 8 }]}>
          <View style={s.topBar}>
            <IconButton
              testID="header-back"
              icon="arrow-left"
              tone="dark"
              label={t('common.actions.back')}
              onPress={() => router.back()}
            />
            <View style={s.liveChip}>
              <View style={s.liveDot} />
              <Text variant="overline" tone="accentOnDark" style={{ letterSpacing: 1 }}>
                {t('planning.live.travelingNow')}
              </Text>
            </View>
            <Button
              testID="live-end"
              variant="outlineInverse"
              size="sm"
              label={t('planning.live.end')}
              onPress={() => openSheet('end')}
            />
          </View>
          <View style={{ gap: 4 }}>
            <Text variant="bodyS" weight={600} tone="inverseMuted">
              {`${it.flag} ${it.title}`}
            </Text>
            <Text variant="h1Large" tone="inverse" style={s.dayTitle}>
              {t('planning.live.dayTitle', { n: di + 1, label: day.label })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="navigation-arrow" weight="fill" size={14} color={colors.primary} />
              <Text variant="caption" weight={600} tone="inverseMuted">
                {t('planning.live.youAreIn', { place: here })}
              </Text>
            </View>
          </View>
          <View accessibilityLabel={t('planning.live.daysLabel')} style={s.dayBars}>
            {it.days.map((d, i) => (
              <Pressable
                key={i}
                testID={`live-day-${i + 1}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: i === di }}
                accessibilityLabel={t('planning.live.dayBar', { n: i + 1, label: d.label })}
                hitSlop={{ top: 16, bottom: 16 }}
                onPress={() => setLiveDay(i + 1)}
                style={[
                  s.dayBar,
                  {
                    backgroundColor:
                      i === di ? colors.primary : i < di ? colors.surface : alpha.darkBorderStrong,
                  },
                ]}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <FactBox icon="cloud-sun" label={t('planning.live.facts.now')} value="17°C" />
            <FactBox icon="clock" label={t('planning.live.facts.localTime')} value={localTime()} />
            <FactBox
              icon="coins"
              label={t('planning.live.facts.exchange')}
              value={formatMoneyFlex(EXCHANGE_RATE)}
              a11y={t('planning.live.facts.exchangeA11y', {
                value: formatMoneyFlex(EXCHANGE_RATE),
              })}
            />
          </View>
        </View>

        {/* Overlapping action card */}
        <View style={s.actions}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.key}
              testID={`live-${a.key}`}
              accessibilityRole="button"
              accessibilityLabel={t(`planning.live.actions.${a.key}`)}
              onPress={() => openSheet(a.key)}
              style={({ pressed }) => [s.action, pressed ? { opacity: 0.8 } : null]}
            >
              <View
                style={[
                  s.actionCircle,
                  { backgroundColor: a.coral ? colors.primary : colors.accentSoft },
                ]}
              >
                <Icon name={a.icon} size={24} />
              </View>
              <Text variant="caption" weight={700} style={{ fontSize: 12, lineHeight: 16 }}>
                {t(`planning.live.actions.${a.key}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={s.body}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AvatarStack
              people={[avatarFor(ME), avatarFor(COMPANION)]}
              ringColor={colors.background}
              label={t('planning.live.crew', { name: firstName(COMPANION) })}
            />
            <Text variant="bodyS" weight={600} tone="support">
              {t('planning.live.crew', { name: firstName(COMPANION) })}
            </Text>
          </View>

          {/* Plano de hoje */}
          <View style={{ gap: 10 }}>
            <View style={s.sectionHead}>
              <Text variant="overline" tone="muted">
                {t('planning.live.planToday')}
              </Text>
              <Text testID="live-progress" variant="caption" weight={700} tone="muted">
                {t('planning.live.progress', { done: doneN, total: day.items.length })}
              </Text>
            </View>
            {day.items.length === 0 ? (
              <View style={s.planEmpty}>
                <Text variant="bodyS" weight={400} tone="muted">
                  {t('planning.live.planEmpty')}
                </Text>
              </View>
            ) : (
              day.items.map((stop, i) => {
                const done = Boolean(live.done[doneKey(i)]);
                const current = i === firstOpen;
                const timeText = done
                  ? t('planning.live.planDone')
                  : current
                    ? t('planning.live.planNow', { time: stop.time })
                    : stop.time;
                return (
                  <Pressable
                    key={`${di}-${i}`}
                    testID={`live-plan-${i}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                    accessibilityLabel={`${timeText}, ${stop.title}, ${stop.note}`}
                    onPress={() => togglePlan(i)}
                    style={[s.plan, current ? s.planCurrent : null, done ? { opacity: 0.7 } : null]}
                  >
                    <View
                      style={[
                        s.planRing,
                        {
                          borderColor: done
                            ? colors.success
                            : current
                              ? colors.primary
                              : colors.border,
                          backgroundColor: done ? colors.success : 'transparent',
                        },
                      ]}
                    >
                      {done ? <Icon name="check" size={14} color={colors.textInverse} /> : null}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        variant="caption"
                        weight={700}
                        tone={done ? 'success' : current ? 'link' : 'muted'}
                        style={{ fontSize: 12, lineHeight: 16 }}
                      >
                        {timeText}
                      </Text>
                      <Text
                        variant="body"
                        weight={700}
                        style={done ? { textDecorationLine: 'line-through' } : null}
                      >
                        {stop.title}
                      </Text>
                      <Text variant="caption" weight={400} tone="muted">
                        {stop.note}
                      </Text>
                    </View>
                    <Icon name={stop.icon} size={20} color={colors.textMuted} />
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Registro do dia */}
          <View style={{ gap: 10 }}>
            <View style={s.sectionHead}>
              <Text variant="overline" tone="muted">
                {t('planning.live.logTitle')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="cloud-check" size={14} color={colors.success} />
                <Text variant="caption" weight={600} tone="success" style={{ fontSize: 12 }}>
                  {t('planning.live.savedOnDevice')}
                </Text>
              </View>
            </View>
            <View testID="live-log" style={s.logCard}>
              {log.map((entry, i) => (
                <LogRow
                  key={entry.id}
                  entry={entry}
                  who={entry.author === ME ? t('planning.live.you') : firstName(entry.author)}
                  last={i === log.length - 1}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <Sheet
        testID="live-sheet"
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        closeLabel={t('common.actions.close')}
        title={sheet ? t(`planning.live.sheets.${sheet}`) : undefined}
        footer={
          <Button
            testID="live-sheet-submit"
            fullWidth
            label={sheet ? t(`planning.live.ctas.${sheet}`) : ''}
            onPress={submit}
          />
        }
      >
        {sheet === 'checkin' ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="navigation-arrow" size={14} color={colors.textMuted} />
              <Text variant="caption" weight={600} tone="muted">
                {t('planning.live.nearYou')}
              </Text>
            </View>
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {NEARBY.map((n, i) => {
                const selected = pick === i;
                return (
                  <Pressable
                    key={n.name}
                    testID={`live-near-${i}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${n.name}, ${n.cat}, ${n.dist}`}
                    onPress={() => {
                      setPick(i);
                      setError(false);
                    }}
                    style={[s.near, { borderColor: selected ? colors.text : colors.border }]}
                  >
                    <Photo uri={img(`near-${i}`, 120, 120)} width={48} height={48} radius={12} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="body" weight={700}>
                        {n.name}
                      </Text>
                      <Text variant="caption" weight={400} tone="muted">
                        {`${n.cat} · ${n.dist}`}
                      </Text>
                    </View>
                    <View
                      style={[s.radio, { borderColor: selected ? colors.primary : colors.border }]}
                    >
                      {selected ? <View style={s.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="label" style={{ marginTop: 6 }}>
              {t('planning.live.howWasIt')}
            </Text>
            <StarRating
              testID="live-stars"
              value={stars}
              onChange={setStars}
              starLabel={(count) => t('common.a11y.stars', { count })}
            />
          </View>
        ) : null}

        {sheet === 'expense' ? (
          <View style={{ gap: 12 }}>
            <MoneyInput
              testID="live-amount"
              label={t('planning.live.amountLabel')}
              currency={LOCAL_CURRENCY}
              value={amount}
              invalid={error}
              placeholder="0"
              onChangeText={(v) => {
                setAmount(v);
                setError(false);
              }}
            />
            <Text testID="live-converted" variant="caption" weight={700} tone="muted">
              {t('planning.live.converted', { value: converted })}
            </Text>
            <View
              accessibilityLabel={t('planning.live.categoriesLabel')}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <Chip
                  key={c.key}
                  testID={`live-cat-${c.key}`}
                  icon={c.icon}
                  label={t(`planning.live.categories.${c.key}`)}
                  selected={category === c.key}
                  onPress={() => setCategory(c.key)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {sheet === 'photo' || sheet === 'note' ? (
          <TextArea
            testID="live-text"
            hideLabel
            label={
              sheet === 'photo' ? t('planning.live.captionLabel') : t('planning.live.noteLabel')
            }
            placeholder={
              sheet === 'photo'
                ? t('planning.live.captionPlaceholder')
                : t('planning.live.notePlaceholder')
            }
            maxLength={500}
            minHeight={88}
            invalid={error}
            value={text}
            onChangeText={(v) => {
              setText(v);
              setError(false);
            }}
          />
        ) : null}

        {sheet === 'end' ? (
          <View style={{ gap: 12 }}>
            <Text variant="body" tone="support">
              {t('planning.live.endText')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatTile
                testID="live-end-days"
                value={String(summary.days)}
                label={t('planning.live.endStats.days')}
                style={{ backgroundColor: colors.background }}
              />
              <StatTile
                testID="live-end-photos"
                value={String(summary.photos)}
                label={t('planning.live.endStats.photos')}
                style={{ backgroundColor: colors.background }}
              />
              <StatTile
                testID="live-end-places"
                value={String(summary.places)}
                label={t('planning.live.endStats.places')}
                style={{ backgroundColor: colors.background }}
              />
            </View>
          </View>
        ) : null}

        {error && sheet !== 'end' && sheet !== 'photo' ? (
          <FormError testID="live-error" message={errorText} />
        ) : null}
      </Sheet>
    </View>
  );
}

function FactBox({
  icon,
  label,
  value,
  a11y,
}: {
  icon: IconName;
  label: string;
  value: string;
  a11y?: string;
}) {
  const s = useStyles();
  return (
    <View accessible accessibilityLabel={a11y ?? `${label}: ${value}`} style={s.fact}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={12} color={colors.textInverseMuted} />
        <Text variant="micro" weight={700} tone="inverseMuted" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text variant="body" weight={700} tone="inverse" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LogRow({ entry, who, last }: { entry: LiveLogEntry; who: string; last: boolean }) {
  const s = useStyles();
  const isMe = entry.author === ME;
  const isDone = entry.type === 'done';
  return (
    <View style={[s.logRow, last ? null : s.logRowBorder]}>
      {isMe ? (
        <View style={[s.logIcon, { backgroundColor: isDone ? colors.success : colors.accentSoft }]}>
          <Icon
            name={LOG_ICONS[entry.type]}
            size={17}
            color={isDone ? colors.textInverse : colors.link}
          />
        </View>
      ) : (
        <Avatar {...avatarFor(entry.author)} size={36} />
      )}
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text variant="bodyS" weight={400} tone="support" style={{ lineHeight: 19 }}>
          <Text variant="bodyS" weight={700}>
            {who}
          </Text>
          {` ${entry.text}`}
        </Text>
        {entry.detail ? (
          <View style={s.quote}>
            <Text variant="bodyS" weight={400}>{`“${entry.detail}”`}</Text>
          </View>
        ) : null}
        {entry.photo ? <LogPhoto photoRef={entry.photo} /> : null}
      </View>
      <Text variant="caption" weight={600} tone="muted" style={{ fontSize: 12 }}>
        {entry.time}
      </Text>
    </View>
  );
}

/** A log entry's photo: a picked photo (by id) or a URL from older entries. */
function LogPhoto({ photoRef }: { photoRef: string }) {
  const uri = usePhotoRef(photoRef);
  return (
    <Photo
      testID="live-log-photo"
      uri={uri}
      tint={colors.border}
      height={120}
      radius={12}
      style={{ marginTop: 6 }}
    />
  );
}

const useStyles = makeStyles((t) => ({
  top: {
    backgroundColor: t.colors.backgroundDark,
    paddingHorizontal: t.layout.gutter,
    paddingBottom: 56,
    gap: 14,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: t.radius.full,
    backgroundColor: t.alpha.coralGlow,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.primary },
  dayTitle: {
    fontFamily: t.text.displayL.fontFamily,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.68,
  },
  dayBars: { flexDirection: 'row', gap: 6 },
  dayBar: { flex: 1, height: 6, borderRadius: 3 },
  fact: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: t.radius.r12,
    backgroundColor: t.alpha.darkCard,
    borderWidth: 1,
    borderColor: t.alpha.darkBorder,
  },
  actions: {
    marginTop: -36,
    marginHorizontal: 12,
    padding: 14,
    borderRadius: t.radius.r24,
    backgroundColor: t.colors.surface,
    boxShadow: shadow.float,
    flexDirection: 'row',
    gap: 6,
  },
  action: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 6 },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: t.layout.gutter, paddingTop: 20, gap: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planEmpty: {
    padding: 16,
    borderRadius: t.radius.r16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: t.radius.r16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: t.colors.surface,
  },
  planCurrent: {
    borderWidth: 2,
    borderColor: t.colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  planRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logCard: { borderRadius: t.radius.r20, backgroundColor: t.colors.surface, overflow: 'hidden' },
  logRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  logRowBorder: { borderBottomWidth: 1, borderBottomColor: t.colors.background },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quote: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: t.radius.r10,
    backgroundColor: t.colors.background,
  },
  near: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: t.radius.r16,
    borderWidth: 1,
    backgroundColor: t.colors.surface,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: t.colors.primary },
}));
