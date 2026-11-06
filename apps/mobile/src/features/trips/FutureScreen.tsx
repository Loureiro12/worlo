import { useTranslation } from '@worlo/i18n';
import {
  Button,
  Card,
  colors,
  EmptyState,
  FactTile,
  HeroScreen,
  Icon,
  IconButton,
  layout,
  Screen,
  ScreenHeader,
  StatusChip,
  Text,
  TileGrid,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { changeWishCover } from '@/data/avatar';
import { useCatalog } from '@/data/catalog';
import { createItinerary } from '@/data/planning';
import { useFuture, world } from '@/data/world';
import { routes } from '@/navigation/routes';
import { PeopleSheet } from './PeopleSheet';
import { PeopleCard } from './parts';

/** C3 · Destino desejado: wishlist destination with facts, people and a CTA to plan. */
export function FutureScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const future = useFuture(id);
  const { COUNTRIES } = useCatalog();
  const [people, setPeople] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.navigate(routes.trips));

  if (!future) {
    return (
      <Screen
        testID="future-screen"
        header={<ScreenHeader onBack={back} backLabel={t('common.actions.back')} />}
      >
        <EmptyState icon="diamond" title={t('trips.notFound')} />
      </Screen>
    );
  }

  const country = future.cid ? COUNTRIES[future.cid] : undefined;
  const facts = (
    [
      ['capital', country?.capital],
      ['language', country?.lang],
      ['currency', country?.cur],
      ['best', country?.best],
    ] as const
  ).filter((f): f is readonly [(typeof f)[0], string] => Boolean(f[1]));

  const openCountry = () => router.push(future.cid ? routes.country(future.cid) : routes.community);

  const startItinerary = () => {
    const itinerary = createItinerary({
      title: t('trips.future.itineraryTitle', { name: future.name }),
      place: future.name,
      flag: future.flag,
      dates: t('trips.rot.newDates'),
      status: t('trips.rot.newStatus'),
      sugKey: future.cid === '392' ? 'japao' : 'generic',
      days: [{ label: t('trips.future.itineraryDay'), items: [] }],
    });
    router.push(routes.roteiro(itinerary.id));
    toast.show(t('trips.future.started'));
  };

  // Capa: from the gallery (uploaded); tapping again with a cover removes it.
  const onCover = async () => {
    if (future.cover) {
      world.setFutureCover(future.id, null);
      return;
    }
    try {
      const result = await changeWishCover(future.id);
      if (result === 'updated') toast.show(t('trips.future.coverUpdated'));
      else if (result === 'offline') toast.show(t('common.states.offlineTitle'), 'info');
    } catch {
      toast.show(t('profile.photos.pickError'), 'error');
    }
  };

  return (
    <HeroScreen
      testID="future-screen"
      heroUri={future.cover ?? null}
      heroTint={future.tint}
      heroHeight={280}
      onBack={back}
      backLabel={t('common.actions.back')}
      withTabBar
      actions={
        future.canEdit ? (
          <IconButton
            testID="future-cover"
            icon="image"
            tone="photo"
            label={future.cover ? t('trips.future.removeCover') : t('trips.future.cover')}
            onPress={() => void onCover()}
          />
        ) : undefined
      }
    >
      <View style={{ paddingHorizontal: layout.gutter, paddingTop: 20, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 32, lineHeight: 38 }}>{future.flag}</Text>
            <Text variant="h1" style={{ fontSize: 32, lineHeight: 38, flex: 1 }}>
              {future.name}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <StatusChip kind="wishlist" size="sm" label={t('common.status.wishlist')} />
            {future.saved ? (
              <Text variant="caption" weight={600} tone="muted">
                {future.saved}
              </Text>
            ) : null}
          </View>
        </View>
        <PeopleCard
          testID="future-people"
          future
          collab={future.collab ?? []}
          onOpen={() => setPeople(true)}
        />
        {facts.length ? (
          <TileGrid>
            {facts.map(([key, value]) => (
              <FactTile key={key} label={t(`trips.future.facts.${key}`)} value={value} />
            ))}
          </TileGrid>
        ) : null}
        {future.note ? (
          <Card gap={6} padding={16}>
            <Text variant="overline" tone="link">
              {t('trips.future.why')}
            </Text>
            <Text variant="bodyL">{future.note}</Text>
          </Card>
        ) : null}
        <Card
          testID="future-country"
          surface="soft"
          radius={24}
          padding={20}
          onPress={openCountry}
          accessibilityLabel={`${t('trips.future.countryTitle')}. ${t('trips.future.countryLink')}`}
        >
          <Text variant="h3" style={{ fontSize: 21, lineHeight: 27 }}>
            {t('trips.future.countryTitle')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="body" weight={700} tone="link">
              {t('trips.future.countryLink')}
            </Text>
            <Icon name="arrow-right" size={16} color={colors.link} />
          </View>
        </Card>
        <Button
          testID="future-start"
          fullWidth
          label={t('trips.future.start')}
          onPress={startItinerary}
        />
      </View>
      <PeopleSheet
        target={people ? { kind: 'future', id: future.id } : null}
        onClose={() => setPeople(false)}
      />
    </HeroScreen>
  );
}
