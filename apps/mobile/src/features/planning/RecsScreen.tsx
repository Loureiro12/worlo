import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  makeStyles,
  Photo,
  Rating,
  Screen,
  ScreenHeader,
  Text,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DemoGate } from '@/components/DemoGate';
import { img } from '@/lib/images';
import { avatarFor } from '@/lib/people';
import { RECS } from '@/mocks/data.generated';
import type { Recommendation } from '@/mocks/types';
import { routes } from '@/navigation/routes';

type Filter = 'all' | 'europe' | 'asia' | 'southAmerica';

const REGION: Record<Exclude<Filter, 'all'>, Recommendation['region']> = {
  europe: 'Europa',
  asia: 'Ásia',
  southAmerica: 'América do Sul',
};

const FILTERS: Filter[] = ['all', 'europe', 'asia', 'southAmerica'];

export function RecsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const s = useStyles();
  const [filter, setFilter] = useState<Filter>('all');

  const list = RECS.filter((r) => filter === 'all' || r.region === REGION[filter]);
  const back = () => router.back();

  return (
    <DemoGate network loading onBack={back}>
      <Screen
        testID="recs-screen"
        withTabBar
        gap={20}
        header={
          <ScreenHeader
            onBack={back}
            backLabel={t('common.actions.back')}
            overline={t('planning.recs.overline')}
          />
        }
      >
        <View style={{ gap: 8 }}>
          <Text variant="h1">{t('planning.recs.title')}</Text>
          <Text variant="body" tone="muted">
            {t('planning.recs.text')}
          </Text>
        </View>

        <View accessibilityLabel={t('planning.recs.filtersLabel')}>
          <ChipRow>
            {FILTERS.map((f) => (
              <Chip
                key={f}
                testID={`recs-filter-${f}`}
                label={t(`planning.recs.filters.${f}`)}
                selected={filter === f}
                onPress={() => setFilter(f)}
              />
            ))}
          </ChipRow>
        </View>

        {list.length === 0 ? <EmptyState dashed title={t('planning.recs.empty')} /> : null}

        {list.map((r) => {
          const days = t('common.count.days', { count: r.days.length });
          return (
            <Card
              key={r.id}
              testID={`recs-card-${r.id}`}
              radius={24}
              padding={10}
              gap={12}
              style={{ paddingBottom: 16 }}
              accessibilityLabel={t('planning.recs.cardA11y', {
                title: r.title,
                place: r.place,
                days,
                author: r.author,
                rating: r.rating,
                saves: r.saves,
              })}
              onPress={() => router.push(routes.roteiro(r.id, 'rec'))}
            >
              <Photo uri={img(`rec-${r.id}`, 700, 400)} height={160}>
                <View style={s.daysChip}>
                  <Text variant="caption" weight={700} style={{ fontSize: 12, lineHeight: 16 }}>
                    {days}
                  </Text>
                </View>
              </Photo>
              <View style={{ paddingHorizontal: 6, gap: 6 }}>
                <Text variant="h3">{r.title}</Text>
                <Text variant="bodyS" tone="support">
                  {`${r.flag} ${r.place}`}
                </Text>
                <View style={s.authorRow}>
                  <Avatar {...avatarFor(r.author)} initials={r.ini} size={28} />
                  <Text variant="caption" weight={600} tone="support" style={{ flex: 1 }}>
                    {r.author}
                  </Text>
                  <Rating value={r.rating} />
                  <Text variant="caption" weight={600} tone="muted">
                    {`· ${r.saves}`}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </Screen>
    </DemoGate>
  );
}

const useStyles = makeStyles((t) => ({
  daysChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
}));
