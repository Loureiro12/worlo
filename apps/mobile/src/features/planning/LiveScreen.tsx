import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
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
  StatTile,
  shadow,
  Text,
  TextArea,
  TextField,
  useToast,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCatalog } from '@/data/catalog';
import { assignLivePhotos, pickPhotos, setPhotoCaption, usePhotoRef } from '@/data/photos';
import {
  addLiveLog,
  addStop,
  endLive,
  type LiveLogEntry,
  setLiveDay,
  startLive,
  toggleStopDone,
  useItineraries,
  useLive,
} from '@/data/planning';
import { repos } from '@/data/repositories';
import { avatarFor, firstName, ME } from '@/lib/people';
import { findCity, timeIn } from '@/lib/places';
import { useWeather } from '@/lib/weather';
import type { Itinerary, Stop } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { ActivitySheet, stopSubtitle } from './ActivitySheet';
import {
  countryIdForFlag,
  EXPENSE_CATEGORIES,
  type ExpenseCategoryKey,
  endSummary,
  formatMoneyFlex,
  nowHHMM,
  tripDaysFromLive,
  tripFromLive,
} from './planning';

type SheetKind = 'photo' | 'expense' | 'note' | 'end';
type ActionKey = 'add' | 'photo' | 'expense' | 'note';

const ACTIONS: { key: ActionKey; icon: IconName; coral: boolean }[] = [
  { key: 'add', icon: 'plus', coral: true },
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
  activity: 'plus',
};

export function LiveScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const s = useStyles();

  const live = useLive();
  const itineraries = useItineraries();
  const found = itineraries.find((i) => i.id === live.itineraryId) ?? itineraries[0];

  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [picked, setPicked] = useState<{ id: string }[]>([]);
  const [captions, setCaptions] = useState<Record<string, string>>({});
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

  // Travel mode starts only when the person says so (Roteiro › Iniciar viagem).
  if (!live.on || live.itineraryId !== it.id) {
    return (
      <Screen
        testID="live-screen"
        header={<ScreenHeader onBack={() => router.back()} backLabel={t('common.actions.back')} />}
      >
        <EmptyState
          testID="live-not-started"
          icon="airplane-takeoff"
          title={t('planning.live.notStarted')}
          text={t('planning.live.notStartedText')}
          action={{
            label: t('planning.live.startNow'),
            onPress: () => {
              startLive(it.id);
              toast.show(t('planning.roteiro.liveStarted'));
            },
          }}
        />
      </Screen>
    );
  }

  const di = Math.max(0, Math.min(live.day - 1, it.days.length - 1));
  const day = it.days[di] ?? { label: '', items: [] };
  const here = it.place;
  const herePlace = here.split(',')[0] ?? here;

  const log = live.log;
  // Older entries have no day: they belong to the day the session was on.
  const dayLog = log.filter((entry) => (entry.day ?? live.day) === di + 1);

  const doneKey = (i: number) => `${di}-${i}`;
  const doneN = day.items.filter((_, i) => live.done[doneKey(i)]).length;
  const firstOpen = day.items.findIndex((_, i) => !live.done[doneKey(i)]);
  const doneAll = Object.values(live.done).filter(Boolean).length;
  const summary = endSummary(it, log, doneAll);

  const amountValue = parseMoney(amount);

  const openSheet = (kind: SheetKind) => {
    setError(false);
    setPicked([]);
    setCaptions({});
    setAmount('');
    setText('');
    setCategory('food');
    setSheet(kind);
  };

  const log_ = (entry: Omit<LiveLogEntry, 'id' | 'time' | 'author'>, spent = 0) => {
    addLiveLog({ time: nowHHMM(), author: ME, day: di + 1, ...entry }, spent);
  };

  const submit = () => {
    if (sheet === 'photo') {
      if (picked.length === 0) return setError(true);
      savePhotos();
      return;
    } else if (sheet === 'expense') {
      if (amountValue <= 0) return setError(true);
      log_(
        {
          type: 'expense',
          text: t('planning.live.log.expense', {
            amount: formatMoneyFlex(amountValue),
            category: t(`planning.live.categories.${category}`).toLowerCase(),
          }),
        },
        amountValue,
      );
      toast.show(t('planning.live.toasts.expense'));
    } else if (sheet === 'note') {
      if (!text.trim()) return setError(true);
      log_({ type: 'note', text: t('planning.live.log.note'), detail: text.trim() });
      toast.show(t('planning.live.toasts.note'));
    } else if (sheet === 'end') {
      const input = tripFromLive(it, summary, live.spent);
      const details = {
        days: tripDaysFromLive(
          it,
          live.log,
          live.done,
          (n, label) => t('planning.live.dayTitle', { n, label }),
          live.day,
        ),
      };
      // Ending the same trip again (same month) updates the trip created the first time.
      const existing = repos.trips
        .list()
        .find((x) => x.title === input.title && x.period === input.period && x.flag === input.flag);
      const trip = existing
        ? repos.trips.update(existing.id, {
            ...input,
            details: { ...(existing.details ?? {}), ...details },
          })
        : repos.trips.create({ ...input, details });
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

  /** Camera or gallery (several at once): the photos go into the trip when it ends. */
  const addPhotos = async (source: 'camera' | 'library') => {
    const input = tripFromLive(it, summary, live.spent);
    const tripId =
      repos.trips
        .list()
        .find((x) => x.title === input.title && x.period === input.period && x.flag === input.flag)
        ?.id ?? null;
    try {
      const result = await pickPhotos({ tripId, source, multiple: source === 'library' });
      if (result.status === 'denied') {
        toast.show(t('profile.photos.cameraDenied'), 'error');
        return;
      }
      if (result.status === 'canceled') return;
      setPicked((current) => [...current, ...result.photos.map((photo) => ({ id: photo.id }))]);
      setError(false);
    } catch {
      toast.show(t('profile.photos.pickError'), 'error');
    }
  };

  /** One log entry per photo, with its caption, on the day being viewed. */
  const savePhotos = () => {
    for (const photo of picked) {
      const caption = captions[photo.id]?.trim() ?? '';
      if (caption) setPhotoCaption(photo.id, caption);
      log_({
        type: 'photo',
        text: t('planning.live.log.photo', { place: herePlace }),
        detail: caption || undefined,
        photo: photo.id,
      });
    }
    toast.show(t('planning.live.photosSaved', { count: picked.length, n: di + 1 }));
    setSheet(null);
  };

  /** "+": an experience joins the day's plan and the day's record. */
  const onSaveActivity = (stop: Stop) => {
    addStop(it.id, di, stop);
    log_({
      type: 'activity',
      text: t('planning.live.log.activity', { title: stop.title }),
      detail: stopSubtitle(stop, t) || undefined,
    });
    setAddOpen(false);
    toast.show(t('planning.live.toasts.added', { title: stop.title, n: di + 1 }));
  };

  const togglePlan = (i: number) => {
    const wasDone = Boolean(live.done[doneKey(i)]);
    toggleStopDone(doneKey(i));
    const stop = day.items[i];
    if (!wasDone && stop)
      log_({ type: 'done', text: t('planning.live.log.done', { title: stop.title }) });
  };

  const errorText =
    sheet === 'photo'
      ? t('planning.live.photoError')
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
                style={({ pressed }) => [
                  s.dayBar,
                  {
                    backgroundColor:
                      i === di ? colors.primary : i < di ? colors.surface : alpha.darkBorderStrong,
                    opacity: pressed ? 0.6 : 1,
                    transform: [{ scaleY: i === di ? 1 : 0.75 }],
                  },
                ]}
              />
            ))}
          </View>
          <Text
            testID="live-day-hint"
            variant="caption"
            tone="inverseMuted"
            style={{ marginTop: -8 }}
          >
            {t('planning.live.dayHint')}
          </Text>
          <LiveFacts place={it.place} spent={live.spent} />
        </View>

        {/* Overlapping action card */}
        <View style={s.actions}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.key}
              testID={`live-${a.key}`}
              accessibilityRole="button"
              accessibilityLabel={t(`planning.live.actions.${a.key}`)}
              onPress={() => (a.key === 'add' ? setAddOpen(true) : openSheet(a.key))}
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
              {dayLog.length === 0 ? (
                <Text variant="bodyS" weight={400} tone="muted" style={{ padding: 16 }}>
                  {t('planning.live.logEmpty')}
                </Text>
              ) : null}
              {dayLog.map((entry, i) => (
                <LogRow
                  key={entry.id}
                  entry={entry}
                  who={entry.author === ME ? t('planning.live.you') : firstName(entry.author)}
                  last={i === dayLog.length - 1}
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
        {sheet === 'expense' ? (
          <View style={{ gap: 12 }}>
            <MoneyInput
              testID="live-amount"
              label={t('planning.live.amountLabel')}
              currency="R$"
              value={amount}
              invalid={error}
              placeholder="0"
              onChangeText={(v) => {
                setAmount(v);
                setError(false);
              }}
            />
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

        {sheet === 'photo' ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                testID="live-photo-camera"
                variant="outline"
                size="md"
                flex={1}
                icon="camera"
                label={t('planning.live.photoCamera')}
                onPress={() => void addPhotos('camera')}
              />
              <Button
                testID="live-photo-gallery"
                variant="outline"
                size="md"
                flex={1}
                icon="images"
                label={t('planning.live.photoGallery')}
                onPress={() => void addPhotos('library')}
              />
            </View>
            {picked.map((photo, i) => (
              <View key={photo.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <PickedPhoto id={photo.id} />
                <View style={{ flex: 1 }}>
                  <TextField
                    testID={`live-caption-${i}`}
                    compact
                    label={t('planning.live.captionFor', { n: i + 1 })}
                    placeholder={t('planning.live.captionPlaceholder')}
                    maxLength={500}
                    value={captions[photo.id] ?? ''}
                    onChangeText={(v) => setCaptions((c) => ({ ...c, [photo.id]: v }))}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {sheet === 'note' ? (
          <TextArea
            testID="live-text"
            hideLabel
            label={t('planning.live.noteLabel')}
            placeholder={t('planning.live.notePlaceholder')}
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

        {error && sheet !== 'end' ? <FormError testID="live-error" message={errorText} /> : null}
      </Sheet>

      <ActivitySheet
        testID="live-add-sheet"
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={onSaveActivity}
        title={t('planning.live.addTitle', { n: di + 1 })}
        draft={`live-${it.id}-${di}`}
      />
    </View>
  );
}

function PickedPhoto({ id }: { id: string }) {
  const uri = usePhotoRef(id);
  return (
    <Photo
      testID="live-picked-photo"
      uri={uri}
      tint={colors.border}
      width={56}
      height={56}
      radius={10}
    />
  );
}

/** Local time at the destination (its time zone), weather now, and what was spent. */
function LiveFacts({ place, spent }: { place: string; spent: number }) {
  const { t, i18n } = useTranslation();
  const city = useMemo(() => findCity(place, i18n.language), [place, i18n.language]);
  const weather = useWeather(city);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const local = city?.timeZone ? timeIn(city.timeZone, now, i18n.language) : '';
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {local ? (
          <FactBox
            testID="live-local-time"
            icon="clock"
            label={t('planning.live.facts.localTime')}
            value={local}
          />
        ) : null}
        {weather ? (
          <FactBox
            testID="live-weather"
            icon={weather.icon}
            label={t('planning.live.facts.now')}
            value={`${weather.temperature}°C`}
          />
        ) : null}
        <FactBox
          icon="wallet"
          label={t('planning.live.facts.spent')}
          value={formatMoneyFlex(spent)}
        />
      </View>
      {weather ? (
        <Text variant="micro" tone="inverseMuted">
          {t('planning.live.weatherCredit')}
        </Text>
      ) : null}
    </View>
  );
}

function FactBox({
  icon,
  label,
  value,
  a11y,
  testID,
}: {
  icon: IconName;
  label: string;
  value: string;
  a11y?: string;
  testID?: string;
}) {
  const s = useStyles();
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={a11y ?? `${label}: ${value}`}
      style={s.fact}
    >
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
  dayBar: { flex: 1, height: 12, borderRadius: 6 },
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
