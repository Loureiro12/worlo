import { useTranslation } from '@worlo/i18n';
import {
  Card,
  Chip,
  ChipRow,
  colors,
  Icon,
  IconButton,
  IconCircle,
  makeStyles,
  Photo,
  Screen,
  ScreenHeader,
  SearchPill,
  Text,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { DemoGate } from '@/components/DemoGate';
import { useCatalog } from '@/data/catalog';
import { formatMoney, matchesQuery } from '@/lib/format';
import { img } from '@/lib/images';
import type { Tour } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { TOUR_FILTERS, type TourFilter } from './tours';
import { useTourSave } from './useTourSave';

/** E1 · Passeios e experiências: search + category chips + tour cards. */
export function PasseiosScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TourFilter>('all');
  const { PASSEIOS } = useCatalog();
  const back = () => (router.canGoBack() ? router.back() : router.navigate(routes.explore));

  const tours = useMemo(
    () =>
      PASSEIOS.filter(
        (p) =>
          (filter === 'all' || p.cat === filter) && matchesQuery(`${p.name} ${p.place}`, query),
      ),
    [PASSEIOS, filter, query],
  );

  return (
    <DemoGate network loading onBack={back}>
      <Screen
        testID="passeios-screen"
        withTabBar
        gap={20}
        header={
          <ScreenHeader
            overline={t('common.tabs.explore')}
            onBack={back}
            backLabel={t('common.actions.back')}
          />
        }
      >
        <View style={{ gap: 8 }}>
          <Text variant="h1">{t('discovery.title')}</Text>
          <Text variant="body" tone="muted">
            {t('discovery.list.subtitle')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <SearchPill
            testID="passeios-search"
            label={t('discovery.list.searchLabel')}
            placeholder={t('discovery.list.searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            clearLabel={t('common.actions.clear')}
            autoCorrect={false}
          />
        </View>
        <ChipRow>
          {TOUR_FILTERS.map((f) => (
            <Chip
              key={f.value}
              testID={`passeios-filter-${f.key}`}
              label={t(`discovery.categories.${f.key}`)}
              selected={filter === f.value}
              onPress={() => setFilter(f.value)}
            />
          ))}
        </ChipRow>
        {tours.length === 0 ? (
          <Card padding={20} testID="passeios-empty">
            <Text variant="body" tone="muted">
              {t('discovery.list.empty')}
            </Text>
          </Card>
        ) : (
          tours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onOpen={() => router.push(routes.passeio(tour.id))}
            />
          ))
        )}
        <Pressable
          testID="passeios-anuncie"
          accessibilityRole="button"
          accessibilityLabel={`${t('discovery.list.promoTitle')} ${t('discovery.list.promoText')}`}
          onPress={() => router.push(routes.anuncie)}
          style={({ pressed }) => [styles.promo, pressed ? { opacity: 0.85 } : null]}
        >
          <IconCircle icon="storefront" size={44} background={colors.surface} iconSize={22} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" weight={700} style={{ fontSize: 16 }}>
              {t('discovery.list.promoTitle')}
            </Text>
            <Text variant="bodyS" weight={400} tone="support">
              {t('discovery.list.promoText')}
            </Text>
          </View>
          <Icon name="arrow-right" size={20} color={colors.link} />
        </Pressable>
      </Screen>
    </DemoGate>
  );
}

function TourCard({ tour, onOpen }: { tour: Tour; onOpen: () => void }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { saved, toggle } = useTourSave(tour);
  const price = formatMoney(tour.price, tour.cur);
  const fromPrice = t('discovery.list.fromPrice', { price });

  return (
    <View style={styles.card}>
      <Pressable
        testID={`passeio-card-${tour.id}`}
        accessibilityRole="button"
        accessibilityLabel={t('discovery.list.cardA11y', {
          name: tour.name,
          place: tour.place,
          duration: tour.dur,
          rating: tour.rating,
          price,
        })}
        onPress={onOpen}
        style={({ pressed }) => [styles.cardInner, pressed ? styles.pressed : null]}
      >
        <Photo uri={img(`pas-${tour.id}`, 700, 420)} tint={colors.border} height={180}>
          <View style={styles.price}>
            <Text variant="caption" weight={700}>
              {fromPrice}
            </Text>
          </View>
        </Photo>
        <View style={styles.body}>
          <Text variant="cardTitle" style={{ fontSize: 19 }}>
            {tour.name}
          </Text>
          <View style={styles.meta}>
            <Text variant="bodyS" tone="support" style={{ flexShrink: 1 }} numberOfLines={1}>
              {`${tour.place} · ${tour.dur}`}
            </Text>
            <View style={styles.rating}>
              <Icon name="star" weight="fill" size={14} color={colors.primary} />
              <Text variant="bodyS" weight={700}>
                {tour.rating}
              </Text>
            </View>
            <Text variant="bodyS" tone="muted">{`(${tour.reviews})`}</Text>
          </View>
          <Text variant="caption" weight={600} tone="muted">
            {t('discovery.list.by', { host: tour.host })}
          </Text>
        </View>
      </Pressable>
      <View style={styles.heart}>
        <IconButton
          testID={`passeio-card-save-${tour.id}`}
          icon="heart"
          tone="photo"
          label={saved ? t('discovery.unsave') : t('discovery.save')}
          accessibilityState={{ selected: saved }}
          iconWeight={saved ? 'fill' : 'regular'}
          iconColor={saved ? colors.primary : colors.text}
          onPress={toggle}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { borderRadius: t.radius.r24, backgroundColor: t.colors.surface },
  cardInner: {
    padding: 10,
    paddingBottom: 16,
    gap: 12,
    borderRadius: t.radius.r24,
  },
  pressed: { boxShadow: t.shadow.hover },
  price: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
  },
  heart: { position: 'absolute', top: 20, right: 20 },
  body: { paddingHorizontal: 6, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: t.radius.r24,
    backgroundColor: t.colors.accentSoft,
  },
}));
