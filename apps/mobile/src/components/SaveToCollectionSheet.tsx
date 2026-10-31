import { useTranslation } from '@worlo/i18n';
import { Button, colors, Icon, Sheet, Text, TextField, useToast } from '@worlo/ui';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore } from '@/store';
import { CollectionCover } from './CollectionCover';

export type SaveToCollectionSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Saved item id to toggle in collections. Without it the sheet only creates a collection. */
  itemId?: string;
  itemName?: string;
};

/** Sheet "Salvar em coleção" / "Nova coleção" (02_SCREENS → F · Sheet). */
export function SaveToCollectionSheet({
  visible,
  onClose,
  itemId,
  itemName,
}: SaveToCollectionSheetProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const collections = useStore((s) => s.collections);
  const toggleInCollection = useStore((s) => s.toggleInCollection);
  const createCollection = useStore((s) => s.createCollection);
  const [name, setName] = useState('');
  const [invalid, setInvalid] = useState(false);

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setInvalid(true);
      return;
    }
    createCollection(trimmed, itemId);
    toast.show(t('common.sheets.collectionCreated', { name: trimmed }));
    setName('');
    if (!itemId) onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      testID="collection-sheet"
      closeLabel={t('common.actions.close')}
      title={itemId ? t('common.sheets.collectionsTitle') : t('common.sheets.newCollectionTitle')}
      subtitle={itemName}
    >
      {itemId
        ? collections.map((c) => {
            const inside = c.ids.includes(itemId);
            return (
              <Pressable
                key={c.id}
                testID={`collection-option-${c.id}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: inside }}
                accessibilityLabel={c.name}
                onPress={() => toggleInCollection(c.id, itemId)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  paddingLeft: 10,
                  paddingRight: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: inside ? colors.primary : colors.border,
                }}
              >
                <CollectionCover ids={c.ids} size={48} />
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight={700}>
                    {c.name}
                  </Text>
                  <Text variant="caption" tone="muted" weight={400}>
                    {t('common.count.places', { count: c.ids.length })}
                  </Text>
                </View>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 1.5,
                    borderColor: inside ? colors.primary : colors.border,
                    backgroundColor: inside ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {inside ? <Icon name="check" size={14} color={colors.onPrimary} /> : null}
                </View>
              </Pressable>
            );
          })
        : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'flex-end' }}>
        <TextField
          testID="new-collection-input"
          label={t('common.sheets.newCollectionPlaceholder')}
          hideLabel
          compact
          placeholder={t('common.sheets.newCollectionPlaceholder')}
          value={name}
          invalid={invalid}
          onChangeText={(text) => {
            setName(text);
            setInvalid(false);
          }}
          onSubmitEditing={create}
          containerStyle={{ flex: 1 }}
        />
        <Button
          testID="create-collection"
          label={t('common.sheets.create')}
          size="md"
          onPress={create}
        />
      </View>
      {itemId ? (
        <Button variant="outline" size="md" label={t('common.actions.done')} onPress={onClose} />
      ) : null}
    </Sheet>
  );
}
