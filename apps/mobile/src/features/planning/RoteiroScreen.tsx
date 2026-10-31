import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  BottomBar,
  Button,
  Chip,
  ChipRow,
  colors,
  EmptyState,
  Icon,
  IconButton,
  makeStyles,
  Rating,
  Screen,
  ScreenHeader,
  Sheet,
  StatTile,
  StatusChip,
  Text,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useCatalog } from '@/data/catalog';
import {
  addDay,
  addStop,
  createItinerary,
  removeStop,
  startLive,
  useItinerary,
  useLive,
} from '@/data/planning';
import { avatarFor } from '@/lib/people';
import type { Itinerary, Recommendation, Stop, Suggestion } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { copyDays, formatMoneyFlex, stopCount, totalCost } from './planning';

type Params = { id?: string; mode?: 'mine' | 'rec' };

export function RoteiroScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<Params>();
  const id = String(params.id ?? '');
  const isRec = params.mode === 'rec';

  const { RECS, SUG } = useCatalog();
  const mine = useItinerary(isRec ? '' : id);
  const live = useLive();

  const [dayIndex, setDayIndex] = useState(0);
  const [sugOpen, setSugOpen] = useState(false);

  const rec = isRec ? RECS.find((r) => r.id === id) : undefined;
  const R: Itinerary | Recommendation | undefined = isRec ? rec : mine;
  const back = () => router.back();

  if (!R) {
    return (
      <Screen
        testID="roteiro-screen"
        header={<ScreenHeader onBack={back} backLabel={t('common.actions.back')} />}
      >
        <EmptyState
          icon="map-trifold"
          title={t('planning.roteiro.notFound')}
          text={t('planning.roteiro.notFoundText')}
        />
      </Screen>
    );
  }

  const di = Math.min(dayIndex, R.days.length - 1);
  const day = R.days[di] ?? { label: '', items: [] };
  const n = di + 1;
  const costText = (cost: number) => (cost ? formatMoneyFlex(cost) : t('planning.roteiro.free'));
  const liveForThis = live.on && live.itineraryId === R.id;

  const onAddDay = () => {
    addDay(R.id, t('planning.roteiro.newDayLabel'));
    setDayIndex(R.days.length);
  };

  const onAddSuggestion = (sg: Suggestion) => {
    const stop: Stop = { ...sg, time: t('planning.roteiro.defaultTime') };
    addStop(R.id, di, stop);
    setSugOpen(false);
    toast.show(t('planning.roteiro.sugAdded', { title: sg.title, n }));
  };

  const onRemove = (index: number) => {
    removeStop(R.id, di, index);
    toast.show(t('planning.roteiro.stopRemoved'), 'info');
  };

  const onStartLive = () => {
    if (!liveForThis) {
      startLive(R.id);
      toast.show(t('planning.roteiro.liveStarted'));
    }
    router.push(routes.live);
  };

  const onUseRec = () => {
    if (!rec) return;
    const copy = createItinerary({
      title: R.title,
      place: R.place,
      flag: R.flag,
      // Mock content stays pt-BR, like the prototype's new itineraries.
      dates: 'Datas a definir',
      status: 'Rascunho',
      sugKey: R.sugKey,
      days: copyDays(R.days),
      sourceRecommendationId: rec.id,
    });
    router.replace(routes.roteiro(copy.id, 'mine'));
    toast.show(t('planning.roteiro.copied'));
  };

  const sugs = SUG[R.sugKey] ?? SUG.generic;

  const bottomBar = (
    <BottomBar>
      {isRec ? (
        <View style={{ flex: 1 }}>
          <Button
            testID="roteiro-use"
            label={t('planning.roteiro.useRec')}
            fullWidth
            onPress={onUseRec}
          />
        </View>
      ) : (
        <View style={{ flex: 1, gap: 10 }}>
          <Button
            testID="roteiro-start"
            variant="outline"
            size="md"
            icon="airplane-takeoff"
            fullWidth
            label={liveForThis ? t('planning.roteiro.openLive') : t('planning.roteiro.startLive')}
            onPress={onStartLive}
          />
          <Button
            testID="roteiro-add-stop"
            icon="plus"
            fullWidth
            label={t('planning.roteiro.addStop')}
            onPress={() => setSugOpen(true)}
          />
        </View>
      )}
    </BottomBar>
  );

  return (
    <Screen
      testID="roteiro-screen"
      gap={20}
      header={
        <ScreenHeader
          onBack={back}
          backLabel={t('common.actions.back')}
          overline={isRec ? t('planning.roteiro.overlineRec') : t('planning.roteiro.overlineMine')}
          right={
            <IconButton
              testID="roteiro-share"
              icon="export"
              label={t('common.actions.share')}
              onPress={() => router.push(routes.share('roteiro', { roteiroId: R.id }))}
            />
          }
        />
      }
      bottomBar={bottomBar}
    >
      <View style={{ gap: 10 }}>
        <Text variant="h1">{R.title}</Text>
        <Text variant="body" weight={500} tone="support">
          {`${R.flag} ${R.place}`}
        </Text>
        {'author' in R ? (
          <AuthorCard rec={R} meta={t('planning.roteiro.authorMeta', { saves: R.saves })} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <StatusChip
              kind="neutral"
              icon="calendar-blank"
              label={R.dates}
              style={{ backgroundColor: colors.surface }}
            />
            <StatusChip kind="planned" label={R.status} />
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatTile
          testID="roteiro-stat-days"
          value={String(R.days.length)}
          label={t('planning.roteiro.stats.days')}
        />
        <StatTile
          testID="roteiro-stat-stops"
          value={String(stopCount(R.days))}
          label={t('planning.roteiro.stats.stops')}
        />
        <StatTile
          testID="roteiro-stat-cost"
          value={formatMoneyFlex(totalCost(R.days))}
          label={t('planning.roteiro.stats.estimated')}
        />
      </View>

      <ChipRow>
        {R.days.map((_d, i) => (
          <Chip
            key={i}
            testID={`roteiro-day-${i + 1}`}
            label={t('planning.roteiro.dayChip', { n: i + 1 })}
            selected={i === di}
            onPress={() => setDayIndex(i)}
          />
        ))}
        {isRec ? null : (
          <AddDayChip
            label={t('planning.roteiro.addDay')}
            a11y={t('planning.roteiro.addDayLabel')}
            onPress={onAddDay}
          />
        )}
      </ChipRow>

      <View>
        <Text variant="h3" style={{ marginBottom: 14 }}>
          {t('planning.roteiro.dayTitle', { n, label: day.label })}
        </Text>
        {day.items.length === 0 ? (
          <EmptyState
            testID="roteiro-empty-day"
            dashed
            title={t('planning.roteiro.emptyTitle')}
            text={t('planning.roteiro.emptyText')}
            action={
              isRec
                ? undefined
                : { label: t('planning.roteiro.addStop'), onPress: () => setSugOpen(true) }
            }
          />
        ) : (
          day.items.map((stop, i) => (
            <TimelineStop
              key={`${di}-${i}-${stop.title}`}
              stop={stop}
              costText={costText(stop.cost)}
              last={i === day.items.length - 1}
              removeLabel={isRec ? undefined : `${t('planning.roteiro.removeStop')}: ${stop.title}`}
              onRemove={() => onRemove(i)}
              testID={`roteiro-stop-${i}`}
            />
          ))
        )}
      </View>

      <Sheet
        testID="roteiro-sug-sheet"
        visible={sugOpen && !isRec}
        onClose={() => setSugOpen(false)}
        closeLabel={t('common.actions.close')}
        title={t('planning.roteiro.sugTitle', { n })}
        subtitle={t('planning.roteiro.sugSubtitle', { place: R.place })}
      >
        {sugs.map((sg, i) => (
          <SuggestionRow
            key={sg.title}
            testID={`roteiro-sug-${i}`}
            suggestion={sg}
            costText={costText(sg.cost)}
            a11y={t('planning.roteiro.sugA11y', {
              title: sg.title,
              note: sg.note,
              cost: costText(sg.cost),
            })}
            onPress={() => onAddSuggestion(sg)}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

function AuthorCard({ rec, meta }: { rec: Recommendation; meta: string }) {
  const s = useStyles();
  return (
    <View style={s.author}>
      <Avatar {...avatarFor(rec.author)} initials={rec.ini} size={36} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyS" weight={700}>
          {rec.author}
        </Text>
        <Text variant="caption" tone="muted" style={{ fontSize: 12, lineHeight: 16 }}>
          {meta}
        </Text>
      </View>
      <Rating value={rec.rating} />
    </View>
  );
}

/** Dashed "+ Dia" chip. Promotion candidate: Chip with an accessibilityLabel override. */
function AddDayChip({
  label,
  a11y,
  onPress,
}: {
  label: string;
  a11y: string;
  onPress: () => void;
}) {
  const s = useStyles();
  return (
    <Pressable
      testID="roteiro-add-day"
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [s.addDay, pressed ? { opacity: 0.8 } : null]}
    >
      <Icon name="plus" size={16} color={colors.textSupport} />
      <Text variant="label" tone="support">
        {label}
      </Text>
    </Pressable>
  );
}

function TimelineStop({
  stop,
  costText,
  last,
  removeLabel,
  onRemove,
  testID,
}: {
  stop: Stop;
  costText: string;
  last: boolean;
  removeLabel?: string;
  onRemove: () => void;
  testID: string;
}) {
  const s = useStyles();
  return (
    <View testID={testID} style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 36, alignItems: 'center' }}>
        <View style={s.stopIcon}>
          <Icon name={stop.icon} size={18} />
        </View>
        {last ? null : <View style={s.stopLine} />}
      </View>
      <View style={s.stopBody}>
        <View
          accessible
          accessibilityLabel={`${stop.time}, ${stop.title}, ${stop.note}, ${costText}`}
          style={{ flex: 1, gap: 2, minWidth: 0 }}
        >
          <Text
            variant="caption"
            weight={700}
            tone="muted"
            style={{ fontSize: 12, lineHeight: 16 }}
          >
            {stop.time}
          </Text>
          <Text variant="body" weight={700}>
            {stop.title}
          </Text>
          <Text variant="bodyS" weight={400} tone="support">
            {stop.note}
          </Text>
          <View style={s.cost}>
            <Text
              variant="caption"
              weight={700}
              tone="link"
              style={{ fontSize: 12, lineHeight: 16 }}
            >
              {costText}
            </Text>
          </View>
        </View>
        {removeLabel ? (
          <IconButton
            testID={`${testID}-remove`}
            icon="x"
            tone="plain"
            iconSize={16}
            iconColor={colors.textMuted}
            label={removeLabel}
            onPress={onRemove}
          />
        ) : null}
      </View>
    </View>
  );
}

function SuggestionRow({
  suggestion,
  costText,
  a11y,
  onPress,
  testID,
}: {
  suggestion: Suggestion;
  costText: string;
  a11y: string;
  onPress: () => void;
  testID: string;
}) {
  const s = useStyles();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [s.sug, pressed ? { backgroundColor: colors.background } : null]}
    >
      <View style={s.sugIcon}>
        <Icon name={suggestion.icon} size={20} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="body" weight={700}>
          {suggestion.title}
        </Text>
        <Text variant="caption" tone="muted" weight={400}>
          {`${suggestion.note} · ${costText}`}
        </Text>
      </View>
      <View style={s.sugPlus}>
        <Icon name="plus" size={16} color={colors.onPrimary} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: t.radius.r16,
    backgroundColor: t.colors.surface,
  },
  addDay: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: t.radius.full,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopLine: { flex: 1, width: 1.5, minHeight: 14, backgroundColor: t.colors.border },
  stopBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 18,
    minWidth: 0,
  },
  cost: {
    marginTop: 6,
    alignSelf: 'flex-start',
    height: 24,
    paddingHorizontal: 10,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.accentSoft,
    justifyContent: 'center',
  },
  sug: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: t.radius.r16,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  sugIcon: {
    width: 40,
    height: 40,
    borderRadius: t.radius.r12,
    backgroundColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sugPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
