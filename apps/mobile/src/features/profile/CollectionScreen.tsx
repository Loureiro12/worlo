import { useTranslation } from '@worlo/i18n';
import {
  Button,
  colors,
  EmptyState,
  IconButton,
  ListRow,
  radius,
  Screen,
  Sheet,
  Text,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { CollectionCover } from '@/components/CollectionCover';
import { useIsEmpty } from '@/components/DemoGate';
import { img } from '@/lib/images';
import { links, useCopyLink } from '@/lib/useCopyLink';
import { useStore } from '@/store';
import { SavedItemRow, StackHeader, useCategoryLabel } from './parts';

/** F3 · Coleção: mosaic, items with remove and "Adicionar dos salvos". */
export function CollectionScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const copyLink = useCopyLink();
  const { id } = useLocalSearchParams<{ id: string }>();
  const empty = useIsEmpty();
  const collection = useStore((s) => (empty ? undefined : s.collections.find((c) => c.id === id)));
  const saved = useStore((s) => s.saved);
  const toggleInCollection = useStore((s) => s.toggleInCollection);
  const categoryLabel = useCategoryLabel();
  const [adding, setAdding] = useState(false);

  const header = (
    <StackHeader
      overline={t('profile.collection.overline')}
      right={
        collection ? (
          <IconButton
            testID="collection-share"
            icon="export"
            label={t('common.actions.share')}
            onPress={() => copyLink(links.collection(id), t('profile.collection.linkCopied'))}
          />
        ) : undefined
      }
    />
  );

  if (!collection) {
    return (
      <Screen testID="collection-screen" withTabBar header={header}>
        <EmptyState icon="folders" title={t('profile.collection.notFound')} />
      </Screen>
    );
  }

  const items = collection.ids
    .map((itemId) => saved.find((x) => x.id === itemId))
    .filter((x) => x !== undefined);
  const available = saved.filter((x) => !collection.ids.includes(x.id));
  const cities = new Set(items.map((x) => x.city)).size;

  return (
    <Screen testID="collection-screen" withTabBar gap={20} header={header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <CollectionCover ids={items.map((x) => x.id)} size={112} radius={radius.r16} />
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text variant="h1Detail" accessibilityRole="header">
            {collection.name}
          </Text>
          <Text variant="label" tone="muted" testID="collection-summary">
            {t('profile.collection.summary', {
              places: t('common.count.places', { count: items.length }),
              cities: t('common.count.cities', { count: cities }),
            })}
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        <EmptyState
          testID="collection-empty"
          dashed
          title={t('profile.collection.emptyTitle')}
          text={t('profile.collection.emptyText')}
        />
      ) : (
        <View style={{ gap: 8 }}>
          {items.map((item) => (
            <SavedItemRow
              key={item.id}
              testID={`collection-item-${item.id}`}
              item={item}
              actions={
                <IconButton
                  testID={`collection-remove-${item.id}`}
                  icon="x"
                  tone="plain"
                  iconColor={colors.textMuted}
                  label={`${t('profile.collection.remove')}: ${item.name}`}
                  onPress={() => {
                    toggleInCollection(collection.id, item.id);
                    toast.show(t('profile.collection.removed'), 'info');
                  }}
                />
              }
            />
          ))}
        </View>
      )}

      <Button
        testID="collection-add"
        variant="outline"
        size="md"
        icon="plus"
        label={t('profile.collection.addFromSaved')}
        onPress={() => setAdding(true)}
      />

      <Sheet
        testID="collection-add-sheet"
        visible={adding}
        onClose={() => setAdding(false)}
        closeLabel={t('common.actions.close')}
        title={t('profile.collection.addFromSaved')}
        subtitle={t('profile.collection.sheetText')}
        footer={
          <Button
            variant="outline"
            size="md"
            label={t('common.actions.done')}
            onPress={() => setAdding(false)}
          />
        }
      >
        {available.length === 0 ? (
          <Text variant="bodyS" tone="muted">
            {t('profile.collection.sheetEmpty')}
          </Text>
        ) : (
          available.map((item) => (
            <ListRow
              key={item.id}
              testID={`collection-pick-${item.id}`}
              title={item.name}
              meta={`${categoryLabel(item.cat)} · ${item.city}`}
              thumbUri={img(item.id, 160, 160)}
              thumbTint={colors.border}
              thumbSize={56}
              onPress={() => {
                toggleInCollection(collection.id, item.id);
                toast.show(t('profile.collection.added', { name: item.name }));
              }}
            />
          ))
        )}
      </Sheet>
    </Screen>
  );
}
