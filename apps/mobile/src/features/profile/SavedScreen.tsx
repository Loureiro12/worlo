import { useTranslation } from '@worlo/i18n';
import {
  Chip,
  ChipRow,
  colors,
  IconButton,
  layout,
  radius,
  Screen,
  SectionHeader,
  Text,
  useToast,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { CollectionCover } from '@/components/CollectionCover';
import { useIsEmpty } from '@/components/DemoGate';
import { SaveToCollectionSheet } from '@/components/SaveToCollectionSheet';
import { collectionKey, toggleSaved, useCollections, useSavedItems } from '@/data/saved';
import type { SavedCategory, SavedItem } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { PageTitle, SAVED_CATEGORIES, SavedItemRow, StackHeader, useCategoryLabel } from './parts';

type Filter = 'all' | SavedCategory;

/** F1 · Lugares salvos. Works offline (saved places live on the device). */
export function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const empty = useIsEmpty();
  const allSaved = useSavedItems();
  const allCollections = useCollections();
  const categoryLabel = useCategoryLabel();
  const [filter, setFilter] = useState<Filter>('all');
  const [sheetItem, setSheetItem] = useState<SavedItem | null>(null);

  const saved = empty ? [] : allSaved;
  const collections = empty ? [] : allCollections;
  const list = saved.filter((x) => filter === 'all' || x.cat === filter);
  const cities = [...new Set(list.map((x) => x.city))];
  const cityCount = new Set(saved.map((x) => x.city)).size;

  const remove = (item: SavedItem) => {
    toggleSaved(item);
    toast.show(t('profile.saved.removed'), 'info');
  };

  return (
    <Screen
      testID="saved-screen"
      withTabBar
      gap={20}
      header={<StackHeader overline={t('profile.saved.overline')} />}
    >
      <PageTitle
        title={t('profile.saved.title')}
        sub={t('profile.saved.summary', {
          places: t('common.count.places', { count: saved.length }),
          cities: t('common.count.cities', { count: cityCount }),
        })}
      />

      {collections.length ? (
        <View style={{ gap: 10 }}>
          <SectionHeader
            testID="saved-see-collections"
            title={t('profile.saved.collections')}
            action={t('profile.saved.seeAll')}
            onAction={() => router.push(routes.collections)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -layout.gutter }}
            contentContainerStyle={{ paddingHorizontal: layout.gutter, gap: 10 }}
          >
            {collections.map((c) => {
              const count = t('common.count.places', { count: c.ids.length });
              return (
                <Pressable
                  key={c.id}
                  testID={`saved-collection-${collectionKey(c.id)}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}, ${count}`}
                  onPress={() => router.push(routes.collection(c.id))}
                  style={{ width: 120, gap: 6 }}
                >
                  <CollectionCover ids={c.ids} size={120} radius={radius.r16} />
                  <Text variant="label" weight={700} numberOfLines={2} style={{ lineHeight: 18 }}>
                    {c.name}
                  </Text>
                  <Text variant="caption" tone="muted" style={{ fontSize: 12, marginTop: -4 }}>
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View accessibilityLabel={t('profile.saved.filterA11y')}>
        <ChipRow>
          {(['all', ...SAVED_CATEGORIES] as Filter[]).map((f) => (
            <Chip
              key={f}
              testID={`saved-filter-${f}`}
              label={f === 'all' ? t('profile.categories.all') : categoryLabel(f)}
              selected={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ChipRow>
      </View>

      {list.length === 0 ? (
        <View
          testID="saved-empty"
          style={{ padding: 20, gap: 6, borderRadius: radius.r16, backgroundColor: colors.surface }}
        >
          <Text variant="bodyL" weight={700}>
            {saved.length ? t('profile.saved.emptyCategory') : t('profile.saved.emptyTitle')}
          </Text>
          <Text variant="bodyS" tone="muted" weight={400}>
            {t('profile.saved.emptyText')}
          </Text>
        </View>
      ) : null}

      {cities.map((city) => {
        const items = list.filter((x) => x.city === city);
        return (
          <View key={city} style={{ gap: 8 }} testID={`saved-group-${city}`}>
            <Text variant="overline" tone="muted" accessibilityRole="header">
              {`${items[0]?.flag ?? ''} ${city} · ${items.length}`}
            </Text>
            {items.map((item) => (
              <SavedItemRow
                key={item.id}
                testID={`saved-item-${item.id}`}
                item={item}
                actions={
                  <>
                    <IconButton
                      testID={`saved-remove-${item.id}`}
                      icon="bookmark-simple"
                      iconWeight="fill"
                      iconColor={colors.primary}
                      tone="plain"
                      size={40}
                      label={`${t('profile.saved.remove')}: ${item.name}`}
                      onPress={() => remove(item)}
                    />
                    <IconButton
                      testID={`saved-collect-${item.id}`}
                      icon="folder-simple-plus"
                      tone="plain"
                      size={40}
                      label={`${t('profile.saved.addToCollection')}: ${item.name}`}
                      onPress={() => setSheetItem(item)}
                    />
                  </>
                }
              />
            ))}
          </View>
        );
      })}

      <SaveToCollectionSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        itemId={sheetItem?.id}
        itemName={sheetItem?.name}
      />
    </Screen>
  );
}
