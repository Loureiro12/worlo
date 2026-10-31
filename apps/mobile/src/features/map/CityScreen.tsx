import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  Button,
  Chip,
  ChipRow,
  colors,
  HeroScreen,
  Icon,
  layout,
  Photo,
  palette,
  Rating,
  radius,
  shadow,
  Text,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SaveToCollectionSheet } from '@/components/SaveToCollectionSheet';
import { img } from '@/lib/images';
import { CITY_TABS, PLACE_TIPS } from '@/mocks/data.generated';
import type { CityItem, CityTabKey } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import {
  Breadcrumb,
  CITY_TAB_KEYS,
  decodeParam,
  LISBOA,
  SaveToggle,
  savedItemFor,
  useIsSaved,
  useToggleSaved,
} from './shared';

const THUMB_TINTS = [palette.coral100, palette.linha, palette.coral300, palette.coral100];

/**
 * C6 · Cidade. Lisboa is the only city with content (CITY_TABS); other ids get
 * a minimal page. "Adicionar ao roteiro" only confirms with a toast, like the
 * prototype (the place page is where a stop is really added).
 */
export function CityScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeParam(rawId) || LISBOA.name;
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<CityTabKey>('attr');
  const [collectionFor, setCollectionFor] = useState<CityItem | null>(null);
  const toggleSaved = useToggleSaved();
  const known = id === LISBOA.name;
  const tip = PLACE_TIPS[0];

  const openCollections = (item: CityItem) => {
    const saved = savedItemFor(item, tab);
    // Collections hold saved items, so long-press saves first when needed.
    if (!useStore.getState().saved.some((x) => x.id === saved.id)) toggleSaved(saved);
    setCollectionFor(item);
  };

  return (
    <HeroScreen
      testID="city-screen"
      heroUri={img(known ? 'lisboa-hero' : `city-${id}`, 800, 500)}
      heroHeight={240}
      onBack={() => router.back()}
      backLabel={t('common.actions.back')}
      withTabBar
    >
      <View style={{ paddingTop: 20, gap: 20 }}>
        <View style={{ paddingHorizontal: layout.gutter, gap: 6 }}>
          {known ? (
            <Breadcrumb
              items={[
                {
                  label: LISBOA.country,
                  onPress: () => router.push(routes.country(LISBOA.countryId)),
                  testID: 'city-crumb-country',
                },
                {
                  label: LISBOA.region,
                  onPress: () => router.push(routes.region(LISBOA.region)),
                  testID: 'city-crumb-region',
                },
                { label: id },
              ]}
            />
          ) : null}
          <Text variant="h1Large" accessibilityRole="header">
            {id}
          </Text>
          {known ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="sun" size={16} color={colors.link} />
              <Text variant="label" tone="support">
                {LISBOA.weather}
              </Text>
            </View>
          ) : (
            <Text variant="bodyL" tone="support">
              {t('map.city.minimal', { name: id })}
            </Text>
          )}
        </View>

        {known ? (
          <>
            <View
              accessibilityRole="tablist"
              accessibilityLabel={t('map.city.categories')}
              style={{ paddingHorizontal: layout.gutter }}
            >
              <ChipRow>
                {CITY_TAB_KEYS.map((k) => (
                  <Chip
                    key={k}
                    testID={`city-tab-${k}`}
                    icon={CITY_TABS[k].i}
                    label={CITY_TABS[k].l}
                    selected={tab === k}
                    onPress={() => setTab(k)}
                  />
                ))}
              </ChipRow>
            </View>

            <View style={{ paddingHorizontal: layout.gutter, gap: 8 }}>
              {CITY_TABS[tab].items.map((item, i) => (
                <CityRow
                  key={item.name}
                  item={item}
                  tint={THUMB_TINTS[i % THUMB_TINTS.length] ?? palette.coral100}
                  onOpen={() => router.push(routes.place(item.name))}
                  onSave={() => toggleSaved(savedItemFor(item, tab))}
                  onCollections={() => openCollections(item)}
                />
              ))}
            </View>

            {tip ? (
              <View style={{ paddingHorizontal: layout.gutter, gap: 12 }}>
                <Text variant="h3" accessibilityRole="header">
                  {t('map.city.tipTitle')}
                </Text>
                <View
                  testID="city-tip"
                  style={{
                    padding: 16,
                    gap: 12,
                    borderRadius: radius.r16,
                    backgroundColor: colors.surface,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar name={tip.who} initials={tip.ini} size={36} />
                    <View>
                      <Text variant="label" weight={700}>
                        {tip.who}
                      </Text>
                      <Text variant="caption" tone="muted" style={{ fontSize: 12 }}>
                        {tip.when}
                      </Text>
                    </View>
                  </View>
                  <Text variant="body">{tip.text}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="seal-check" size={16} color={colors.success} />
                    <Text variant="caption" weight={700} tone="success">
                      {`${t('map.city.reliabilityHigh')} · ${t('map.city.confirm', { pct: tip.pct })}`}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={{ paddingHorizontal: layout.gutter }}>
              <Button
                testID="city-add-itinerary"
                label={t('map.city.addToItinerary')}
                fullWidth
                onPress={() => toast.show(t('map.city.addedToItinerary', { name: id }))}
              />
            </View>
          </>
        ) : null}
      </View>

      <SaveToCollectionSheet
        visible={collectionFor !== null}
        onClose={() => setCollectionFor(null)}
        itemId={collectionFor ? savedItemFor(collectionFor, tab).id : undefined}
        itemName={collectionFor?.name}
      />
    </HeroScreen>
  );
}

function CityRow({
  item,
  tint,
  onOpen,
  onSave,
  onCollections,
}: {
  item: CityItem;
  tint: string;
  onOpen: () => void;
  onSave: () => void;
  onCollections: () => void;
}) {
  const { t } = useTranslation();
  const saved = useIsSaved(savedItemFor(item, null).id);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        testID={`city-item-${item.name}`}
        accessibilityRole="button"
        accessibilityLabel={[item.name, item.meta, item.rating].filter(Boolean).join(', ')}
        accessibilityHint={t('map.city.saveHint')}
        onPress={onOpen}
        onLongPress={onCollections}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 10,
          paddingRight: 48 + (item.rating ? 44 : 0),
          borderRadius: radius.r16,
          backgroundColor: colors.surface,
          boxShadow: pressed ? shadow.hover : undefined,
        })}
      >
        <Photo
          uri={img(`ci-${item.name}`, 140, 140)}
          tint={tint}
          width={56}
          height={56}
          radius={12}
        />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text variant="body" weight={700} numberOfLines={2}>
            {item.name}
          </Text>
          <Text variant="caption" tone="muted" weight={400} numberOfLines={2}>
            {item.meta}
          </Text>
        </View>
      </Pressable>
      {/* Siblings of the row, not children, so each control stays its own a11y element. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {item.rating ? <Rating value={item.rating} /> : null}
        <SaveToggle
          testID={`city-save-${item.name}`}
          saved={saved}
          label={
            saved
              ? t('map.city.unsave', { name: item.name })
              : t('map.city.save', { name: item.name })
          }
          onPress={onSave}
          onLongPress={onCollections}
        />
      </View>
    </View>
  );
}
