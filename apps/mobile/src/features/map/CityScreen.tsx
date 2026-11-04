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
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SaveToCollectionSheet } from '@/components/SaveToCollectionSheet';
import { useCatalog } from '@/data/catalog';
import { usePlacePosts } from '@/data/community';
import { isSaved } from '@/data/saved';
import { postStats } from '@/features/community/model';
import { img } from '@/lib/images';
import type { CityItem, CityTabKey } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import {
  Breadcrumb,
  CITY_TAB_KEYS,
  decodeParam,
  LISBOA,
  SaveToggle,
  savedItemFor,
  useAddToItinerary,
  useIsSaved,
  useToggleSaved,
} from './shared';

const THUMB_TINTS = [palette.coral100, palette.linha, palette.coral300, palette.coral100];

/**
 * C6 · Cidade. Lisboa is the only city with a guide (CITY_TABS); other ids get a
 * minimal page with what the community said about them and a way to add a tip.
 */
export function CityScreen() {
  const { CITY_TABS } = useCatalog();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeParam(rawId) || LISBOA.name;
  const { t } = useTranslation();
  const router = useRouter();
  const addToItinerary = useAddToItinerary();
  const [tab, setTab] = useState<CityTabKey>('attr');
  const [collectionFor, setCollectionFor] = useState<CityItem | null>(null);
  const toggleSaved = useToggleSaved();
  const known = id === LISBOA.name;
  // "Dica da comunidade": the most confirmed post by someone else about the city (online).
  const tip = (usePlacePosts(id).data ?? [])
    .map((post) => ({ post, stats: postStats(post, post.myVote) }))
    .sort((a, b) => Number(a.post.mine) - Number(b.post.mine) || b.stats.yes - a.stats.yes)[0];

  const openCollections = (item: CityItem) => {
    const saved = savedItemFor(item, tab);
    // Collections hold saved items, so long-press saves first when needed.
    if (!isSaved(saved.id)) toggleSaved(saved);
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
          {known ? null : (
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

            <View style={{ paddingHorizontal: layout.gutter }}>
              <Button
                testID="city-add-itinerary"
                label={t('map.city.addToItinerary')}
                fullWidth
                onPress={() => addToItinerary(id, id)}
              />
            </View>
          </>
        ) : null}

        {tip ? (
          <View style={{ paddingHorizontal: layout.gutter, gap: 12 }}>
            <Text variant="h3" accessibilityRole="header">
              {t('map.city.tipTitle')}
            </Text>
            <Pressable
              testID="city-tip"
              accessibilityRole="button"
              accessibilityLabel={t('community.post.open', { name: tip.post.author })}
              accessibilityHint={tip.post.text}
              onPress={() => router.push(routes.post(tip.post.id))}
              style={{
                padding: 16,
                gap: 12,
                borderRadius: radius.r16,
                backgroundColor: colors.surface,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar
                  name={tip.post.author}
                  initials={tip.post.ini}
                  photoUrl={tip.post.avatarUrl}
                  size={36}
                />
                <View>
                  <Text variant="label" weight={700}>
                    {tip.post.author}
                  </Text>
                  <Text variant="caption" tone="muted" style={{ fontSize: 12 }}>
                    {tip.post.when}
                  </Text>
                </View>
              </View>
              <Text variant="body">{tip.post.text}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon
                  name="seal-check"
                  size={16}
                  color={tip.stats.level === 'high' ? colors.success : colors.textMuted}
                />
                <Text
                  variant="caption"
                  weight={700}
                  tone={tip.stats.level === 'high' ? 'success' : 'muted'}
                >
                  {tip.stats.level === 'high'
                    ? `${t('map.city.reliabilityHigh')} · ${t('map.city.confirm', { pct: `${tip.stats.pct}%` })}`
                    : tip.stats.total
                      ? `${t(`community.reliability.${tip.stats.level}`)} · ${t('map.city.confirm', { pct: `${tip.stats.pct}%` })}`
                      : t('community.reliability.waiting')}
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {known ? null : (
          <View style={{ paddingHorizontal: layout.gutter }}>
            <Button
              testID="city-share-tip"
              variant="outline"
              label={t('map.city.shareTip')}
              fullWidth
              onPress={() => router.push(routes.compose({ place: id }))}
            />
          </View>
        )}
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
