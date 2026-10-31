import { useTranslation } from '@worlo/i18n';
import { colors, Icon, layout, radius, Screen, Text } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { CollectionCover } from '@/components/CollectionCover';
import { useIsEmpty } from '@/components/DemoGate';
import { SaveToCollectionSheet } from '@/components/SaveToCollectionSheet';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { PageTitle, StackHeader } from './parts';

const COLUMN_GAP = 12;

/** F2 · Minhas coleções: 2-column grid with a dashed "Nova coleção" tile. */
export function CollectionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const empty = useIsEmpty();
  const all = useStore((s) => s.collections);
  const collections = empty ? [] : all;
  const [creating, setCreating] = useState(false);
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - layout.gutter * 2 - COLUMN_GAP) / 2);

  return (
    <Screen
      testID="collections-screen"
      withTabBar
      gap={20}
      header={<StackHeader overline={t('profile.saved.overline')} />}
    >
      <PageTitle title={t('profile.collections.title')} sub={t('profile.collections.text')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: COLUMN_GAP, rowGap: 16 }}>
        <Pressable
          testID="collections-new"
          accessibilityRole="button"
          accessibilityLabel={t('profile.collections.new')}
          onPress={() => setCreating(true)}
          style={{
            width: tile,
            height: tile,
            borderRadius: radius.r16,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Icon name="plus" size={24} color={colors.textSupport} />
          <Text variant="label" tone="support">
            {t('profile.collections.new')}
          </Text>
        </Pressable>
        {collections.map((c) => {
          const count = t('common.count.places', { count: c.ids.length });
          return (
            <Pressable
              key={c.id}
              testID={`collections-item-${c.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${count}`}
              onPress={() => router.push(routes.collection(c.id))}
              style={{ width: tile, gap: 8 }}
            >
              <CollectionCover ids={c.ids} size={tile} radius={radius.r16} />
              <View style={{ gap: 2 }}>
                <Text variant="cardTitleS" numberOfLines={2}>
                  {c.name}
                </Text>
                <Text variant="caption" tone="muted" weight={400}>
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <SaveToCollectionSheet visible={creating} onClose={() => setCreating(false)} />
    </Screen>
  );
}
