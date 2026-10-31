import { useTranslation } from '@worlo/i18n';
import {
  colors,
  FactTile,
  HeroScreen,
  Icon,
  layout,
  Photo,
  radius,
  StatusChip,
  type StatusChipKind,
  Text,
  TileGrid,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useCatalog } from '@/data/catalog';
import { countryFlag, useCountryName } from '@/lib/countries';
import { img } from '@/lib/images';
import { routes } from '@/navigation/routes';
import { Breadcrumb, decodeParam, useCountryStatus } from './shared';

/**
 * C4 · País. Full page for the countries in COUNTRY_PAGES (Portugal 620, Japão
 * 392); any other id gets a minimal page with the COUNTRIES facts.
 */
export function CountryScreen() {
  const { COUNTRIES, COUNTRY_PAGES, REGION } = useCatalog();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeParam(rawId);
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const countryName = useCountryName();
  const status = useCountryStatus(id);

  const page = COUNTRY_PAGES[id];
  const info = COUNTRIES[id];
  const name = countryName(id);
  const flag = countryFlag(id);

  const chip: { kind: StatusChipKind; icon?: 'check-circle' | 'map-pin'; label: string } =
    status === 'visited'
      ? { kind: 'visited', icon: 'check-circle', label: t('map.country.status.visited') }
      : status === 'wishlist'
        ? { kind: 'wishlist', label: t('map.country.status.wishlist') }
        : status === 'planned'
          ? { kind: 'planned', label: t('map.sheet.status.planned') }
          : { kind: 'neutral', icon: 'map-pin', label: t('map.country.status.none') };

  const soon = (what: string) => toast.show(t('map.toasts.comingSoon', { name: what }), 'info');

  return (
    <HeroScreen
      testID="country-screen"
      heroUri={img(`country-${id}`, 800, 500)}
      heroHeight={260}
      onBack={() => router.back()}
      backLabel={t('common.actions.back')}
      withTabBar
    >
      <View style={{ paddingHorizontal: layout.gutter, paddingTop: 20, gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Breadcrumb items={[...(page ? [{ label: page.region }] : []), { label: name }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 32, lineHeight: 40 }} accessibilityElementsHidden>
              {flag}
            </Text>
            <Text variant="h1Large" accessibilityRole="header" style={{ flex: 1 }}>
              {name}
            </Text>
          </View>
          {page ? (
            <Text variant="bodyL" tone="support">
              {page.tagline}
            </Text>
          ) : (
            <Text variant="bodyL" tone="support">
              {t('map.country.minimal', { name })}
            </Text>
          )}
          <StatusChip
            testID="country-status"
            kind={chip.kind}
            icon={chip.icon}
            label={chip.label}
          />
        </View>

        {page ? (
          <TileGrid>
            {page.facts.map((f) => (
              <FactTile
                key={f.label}
                icon={f.icon}
                label={f.label}
                value={f.value}
                sub={f.sub}
                tip={f.tip}
                tipLabel={t('map.country.tipLabel')}
              />
            ))}
          </TileGrid>
        ) : info ? (
          <TileGrid>
            <FactTile icon="bank" label={t('map.sheet.capital')} value={info.capital} />
            <FactTile icon="translate" label={t('map.sheet.language')} value={info.lang} />
            <FactTile icon="coins" label={t('map.sheet.currency')} value={info.cur} />
            {info.best ? (
              <FactTile icon="calendar-check" label={t('map.country.best')} value={info.best} />
            ) : null}
          </TileGrid>
        ) : null}

        {page ? (
          <View style={{ gap: 12 }}>
            <Text variant="h3" accessibilityRole="header">
              {t('map.country.regions')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {page.regions.map((r) => (
                <Pressable
                  key={r}
                  testID={`country-region-${r}`}
                  accessibilityRole="button"
                  accessibilityLabel={r}
                  onPress={() => (r === REGION.name ? router.push(routes.region(r)) : soon(r))}
                  style={({ pressed }) => ({
                    height: 36,
                    paddingHorizontal: 14,
                    borderRadius: radius.full,
                    borderWidth: 1,
                    borderColor: pressed ? colors.text : colors.border,
                    backgroundColor: colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  })}
                >
                  <Text variant="label">{r}</Text>
                  <Icon name="caret-right" size={12} color={colors.text} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {page ? (
          <View style={{ gap: 12 }}>
            <Text variant="h3" accessibilityRole="header">
              {t('map.country.cities')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {page.cities.map((c) => (
                <Pressable
                  key={c.name}
                  testID={`country-city-${c.name}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}, ${c.note}`}
                  onPress={() => (c.go ? router.push(routes.city(c.name)) : soon(c.name))}
                  style={({ pressed }) => ({
                    width: '48%',
                    flexGrow: 1,
                    gap: 8,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Photo uri={img(`city-${c.name}`, 400, 260)} tint={c.tint} height={120} />
                  <View style={{ gap: 2 }}>
                    <Text variant="cardTitleS">{c.name}</Text>
                    <Text variant="caption" tone="muted" weight={400}>
                      {c.note}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {page ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Icon name="seal-check" size={16} color={colors.textMuted} />
            <Text variant="caption" tone="muted" weight={400} style={{ flex: 1, fontSize: 12 }}>
              {page.source}
            </Text>
          </View>
        ) : null}
      </View>
    </HeroScreen>
  );
}
