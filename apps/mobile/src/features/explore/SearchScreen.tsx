import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  Button,
  ChipRow,
  colors,
  Icon,
  IconButton,
  makeStyles,
  Photo,
  Screen,
  SearchPill,
  Text,
  useToast,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DemoGate } from '@/components/DemoGate';
import { useCatalog } from '@/data/catalog';
import { useSearchPeople } from '@/data/community';
import { usePeople } from '@/data/people';
import { useItineraries } from '@/data/planning';
import { useSavedItems } from '@/data/saved';
import { useTrips } from '@/data/trips';
import { useVisitedMap } from '@/data/world';
import { avatarFor } from '@/lib/people';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { CountChip } from './CountChip';
import {
  buildSearchIndex,
  personItem,
  SEARCH_CATEGORIES,
  type SearchCategory,
  type SearchItem,
  type SubLabel,
  searchItems,
  TRENDING,
} from './searchIndex';

type Filter = 'all' | SearchCategory;
const FILTERS: readonly Filter[] = ['all', ...SEARCH_CATEGORIES];
/** "Tudo" shows the top 4 of each group; a single category shows up to 30. */
const PER_GROUP_ALL = 4;
const PER_GROUP_ONE = 30;

/** I1 · Busca (fullscreen). */
export function SearchScreen() {
  const router = useRouter();
  return (
    <DemoGate network error loading onBack={() => router.back()}>
      <SearchContent />
    </DemoGate>
  );
}

function SearchContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const visitedMap = useVisitedMap();
  const itineraries = useItineraries();
  const trips = useTrips();
  const saved = useSavedItems();
  // People: the ones synced to the device, plus strangers from `search_people`.
  const people = usePeople();
  // Re-index when sync brings new catalog content.
  const catalog = useCatalog();
  const recentSearches = useStore((s) => s.recentSearches);
  const addRecentSearch = useStore((s) => s.addRecentSearch);
  const clearRecentSearches = useStore((s) => s.clearRecentSearches);
  const selectMapCountry = useStore((s) => s.selectMapCountry);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const remotePeople = useSearchPeople(query);

  // `catalog` is read inside buildSearchIndex (getCatalog): re-index when sync updates it.
  const sub: SubLabel = useCallback((key, vars) => t(`explore.search.sub.${key}`, vars), [t]);
  const index = useMemo(
    () => buildSearchIndex({ sub, visitedMap, itineraries, trips, saved, people }),
    [sub, visitedMap, itineraries, trips, saved, people, catalog],
  );
  const all = useMemo(() => {
    const local = searchItems(index, query);
    const known = new Set(people.map((p) => p.id));
    const keys = new Set(local.map((it) => it.key));
    const remote = remotePeople
      .filter((p) => !known.has(p.id))
      .map((p) => personItem(p, sub))
      .filter((it) => !keys.has(it.key));
    return [...local, ...remote];
  }, [index, query, people, remotePeople, sub]);
  const shown = filter === 'all' ? all : all.filter((it) => it.cat === filter);
  const hasQuery = query.trim().length > 0;

  const open = (item: SearchItem) => {
    addRecentSearch(query);
    if ('href' in item.target) {
      if (item.target.mapCountry) selectMapCountry(item.target.mapCountry);
      router.push(item.target.href);
    } else toast.show(t('explore.places.soon', { name: item.target.soon }), 'info');
  };

  const submit = () => {
    addRecentSearch(query);
    const only = all[0];
    if (filter === 'all' && all.length === 1 && only) open(only);
  };

  const groups = SEARCH_CATEGORIES.map((cat) => {
    const items = shown.filter((it) => it.cat === cat);
    return {
      cat,
      count: items.length,
      items: items.slice(0, filter === 'all' ? PER_GROUP_ALL : PER_GROUP_ONE),
    };
  }).filter((g) => g.count > 0);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.bar}>
        <IconButton
          testID="search-back"
          icon="arrow-left"
          label={t('common.actions.back')}
          onPress={() => router.back()}
        />
        <SearchPill
          testID="search-input"
          active
          autoFocus
          height={48}
          label={t('explore.search.label')}
          placeholder={t('explore.search.placeholder')}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          onClear={() => setQuery('')}
          clearLabel={t('common.actions.clear')}
        />
      </View>
      <View accessibilityLabel={t('explore.search.categoriesLabel')}>
        <ChipRow gutter={16}>
          {FILTERS.map((f) => {
            const count = f === 'all' ? all.length : all.filter((it) => it.cat === f).length;
            return (
              <CountChip
                key={f}
                testID={`search-chip-${f}`}
                label={t(`explore.search.cats.${f}`)}
                count={hasQuery && count > 0 ? count : undefined}
                selected={filter === f}
                onPress={() => setFilter(f)}
              />
            );
          })}
        </ChipRow>
      </View>
    </View>
  );

  return (
    <Screen
      testID="search-screen"
      header={header}
      padded={false}
      gap={18}
      contentStyle={styles.content}
    >
      {!hasQuery ? (
        <>
          {recentSearches.length > 0 ? (
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text variant="overline" tone="muted" style={styles.overline}>
                  {t('explore.search.recent')}
                </Text>
                <Pressable
                  testID="search-recent-clear"
                  accessibilityRole="button"
                  accessibilityLabel={`${t('common.actions.clear')}: ${t('explore.search.recent')}`}
                  hitSlop={10}
                  onPress={clearRecentSearches}
                  style={styles.clear}
                >
                  <Text variant="caption" weight={700} tone="link">
                    {t('common.actions.clear')}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.card}>
                {recentSearches.map((r, i) => (
                  <Pressable
                    key={r}
                    testID={`search-recent-${i}`}
                    accessibilityRole="button"
                    accessibilityLabel={t('explore.search.recentA11y', { query: r })}
                    onPress={() => setQuery(r)}
                    style={({ pressed }) => [
                      styles.recentRow,
                      i < recentSearches.length - 1 && styles.rowDivider,
                      pressed && styles.rowPressed,
                    ]}
                  >
                    <Icon name="clock-counter-clockwise" size={18} color={colors.textMuted} />
                    <Text variant="body" weight={600} style={styles.flex} numberOfLines={1}>
                      {r}
                    </Text>
                    <Icon name="arrow-up-left" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.block}>
            <Text variant="overline" tone="muted" style={styles.overline}>
              {t('explore.search.trending')}
            </Text>
            <View style={styles.trending}>
              {TRENDING.map((q, i) => (
                <Pressable
                  key={q}
                  testID={`search-trending-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                  onPress={() => setQuery(q)}
                  style={({ pressed }) => [styles.trendChip, pressed && styles.rowPressed]}
                >
                  <Icon name="trend-up" size={16} color={colors.link} />
                  <Text variant="label">{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      ) : shown.length === 0 ? (
        <View testID="search-empty" style={styles.noResult}>
          <Text variant="bodyL" weight={700}>
            {t('explore.search.noResultTitle', { query: query.trim() })}
          </Text>
          <Text variant="bodyS" tone="muted" weight={400}>
            {t('explore.search.noResultText')}
          </Text>
          <View style={styles.askWrap}>
            <Button
              testID="search-ask"
              variant="pill"
              size="sm"
              icon="chat-circle-text"
              label={t('explore.search.ask')}
              onPress={() => router.push(routes.compose({ type: 'Pergunta' }))}
            />
          </View>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.cat} style={styles.block} testID={`search-group-${g.cat}`}>
            <Text variant="overline" tone="muted" style={styles.overline}>
              {t('explore.search.group', {
                label: t(`explore.search.cats.${g.cat}`),
                count: g.count,
              })}
            </Text>
            <View style={styles.card}>
              {g.items.map((item, i) => (
                <ResultRow
                  key={item.key}
                  item={item}
                  last={i === g.items.length - 1}
                  onPress={() => open(item)}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

function ResultRow({
  item,
  last,
  onPress,
}: {
  item: SearchItem;
  last: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      testID={`search-result-${item.key}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.sub}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultRow,
        !last && styles.rowDivider,
        pressed && styles.rowPressed,
      ]}
    >
      <Lead item={item} />
      <View style={styles.resultText}>
        <Text variant="body" weight={700} numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="caption" tone="muted" weight={400} numberOfLines={1}>
          {item.sub}
        </Text>
      </View>
      <Icon name="caret-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function Lead({ item }: { item: SearchItem }) {
  const styles = useStyles();
  const { lead } = item;
  if (lead.kind === 'flag') {
    return (
      <View style={styles.flagLead}>
        <Text style={styles.flag}>{lead.flag}</Text>
      </View>
    );
  }
  if (lead.kind === 'person') {
    return lead.expert ? (
      <Avatar
        name={lead.name}
        initials={lead.initials}
        size={44}
        colors={{ background: colors.selected, foreground: colors.onSelected }}
      />
    ) : (
      <Avatar {...avatarFor(lead.name)} size={44} />
    );
  }
  return <Photo uri={lead.uri} tint={colors.border} width={44} height={44} radius={12} />;
}

const useStyles = makeStyles((t) => ({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: t.colors.background,
  },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  block: { gap: 8 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overline: { paddingLeft: 4 },
  clear: { paddingVertical: 6 },
  card: { borderRadius: t.radius.r20, backgroundColor: t.colors.surface, overflow: 'hidden' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: t.colors.background },
  rowPressed: { backgroundColor: t.colors.background },
  flex: { flex: 1 },
  trending: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trendChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noResult: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: t.radius.r20,
    backgroundColor: t.colors.surface,
    gap: 6,
    alignItems: 'flex-start',
  },
  askWrap: { marginTop: 8 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  resultText: { flex: 1, minWidth: 0 },
  flagLead: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: { fontSize: 24, lineHeight: 28 },
}));
