import { useTranslation } from '@worlo/i18n';
import { colors, IconCircle, Sheet, SheetOption, StatusMarker } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { routes } from '@/navigation/routes';

/** "Adicionar uma viagem" (Explorar FAB, Viagens +): past trip or future trip. */
export function AddTripSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const open = (kind: 'past' | 'future') => {
    onClose();
    router.push(routes.tripForm({ mode: 'new', kind }));
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('common.sheets.addTripTitle')}
      testID="add-trip-sheet"
      closeLabel={t('common.actions.close')}
    >
      <SheetOption
        testID="add-trip-past"
        title={t('common.sheets.addPastTitle')}
        description={t('common.sheets.addPastText')}
        leading={
          <IconCircle
            icon="check"
            background={colors.primary}
            color={colors.onPrimary}
            iconSize={22}
          />
        }
        onPress={() => open('past')}
      />
      <SheetOption
        testID="add-trip-future"
        title={t('common.sheets.addFutureTitle')}
        description={t('common.sheets.addFutureText')}
        leading={
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StatusMarker status="wishlist" size={16} onDark={false} />
          </View>
        }
        onPress={() => open('future')}
      />
    </Sheet>
  );
}
