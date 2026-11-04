import { useTranslation } from '@worlo/i18n';
import {
  colors,
  FactTile,
  HeroScreen,
  Icon,
  ListRow,
  layout,
  Photo,
  Text,
  TileGrid,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useCatalog } from '@/data/catalog';
import { useCountryName } from '@/lib/countries';
import { img } from '@/lib/images';
import { routes } from '@/navigation/routes';
import { Breadcrumb, decodeParam, LISBOA } from './shared';

/**
 * C5 · Região. Only "Lisboa e Vale do Tejo" (REGION) has a guide so far; other
 * ids render a minimal page (hero + breadcrumb to their country + "montando o guia").
 */
export function RegionScreen() {
  const { REGION } = useCatalog();
  const { id: rawId, country } = useLocalSearchParams<{ id: string; country?: string }>();
  const id = decodeParam(rawId);
  const { t } = useTranslation();
  const router = useRouter();
  const countryName = useCountryName();
  const known = id === REGION.name;
  const name = known ? REGION.name : id;

  const countryId = known ? LISBOA.countryId : country;
  const crumbs = [
    ...(countryId
      ? [
          {
            label: known ? LISBOA.country : countryName(countryId),
            onPress: () => router.push(routes.country(countryId)),
            testID: 'region-crumb-country',
          },
        ]
      : []),
    { label: name },
  ];

  return (
    <HeroScreen
      testID="region-screen"
      heroUri={img(known ? 'region-lisboa' : `region-${name}`, 800, 500)}
      heroTint={colors.border}
      heroHeight={240}
      onBack={() => router.back()}
      backLabel={t('common.actions.back')}
      withTabBar
    >
      <View style={{ paddingHorizontal: layout.gutter, paddingTop: 20, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Breadcrumb items={crumbs} />
          <Text
            variant="h1Large"
            accessibilityRole="header"
            style={{ fontSize: 32, lineHeight: 38 }}
          >
            {name}
          </Text>
          <Text variant="bodyL" tone="support">
            {known ? REGION.tagline : t('map.region.minimal', { name })}
          </Text>
        </View>

        {known ? (
          <>
            <TileGrid>
              {REGION.facts.map((f) => (
                <FactTile key={f.label} icon={f.icon} label={f.label} value={f.value} />
              ))}
            </TileGrid>

            <View style={{ gap: 12 }}>
              <Text variant="h3" accessibilityRole="header">
                {t('map.region.cities')}
              </Text>
              {REGION.cities.map((c) => (
                <ListRow
                  key={c.name}
                  testID={`region-city-${c.name}`}
                  title={c.name}
                  meta={c.note}
                  thumbUri={img(`city-${c.name}`, 200, 200)}
                  thumbTint={colors.border}
                  thumbSize={72}
                  trailing={
                    <View style={{ paddingRight: 6 }}>
                      <Icon name="caret-right" size={16} color={colors.textMuted} />
                    </View>
                  }
                  onPress={() => router.push(routes.city(c.name))}
                />
              ))}
            </View>

            <View style={{ gap: 12 }}>
              <Text variant="h3" accessibilityRole="header">
                {t('map.region.highlights')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -layout.gutter }}
                contentContainerStyle={{ paddingHorizontal: layout.gutter, gap: 10 }}
              >
                {REGION.highlights.map((h) => (
                  <View
                    key={h.name}
                    accessible
                    accessibilityLabel={`${h.name}, ${h.meta}`}
                    style={{ width: 200, gap: 8 }}
                  >
                    <Photo uri={img(`hl-${h.name}`, 400, 260)} tint={colors.border} height={130} />
                    <Text variant="body" weight={700} style={{ lineHeight: 20 }}>
                      {h.name}
                    </Text>
                    <Text variant="caption" tone="muted" weight={400} style={{ marginTop: -4 }}>
                      {h.meta}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}
      </View>
    </HeroScreen>
  );
}
