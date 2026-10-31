import { useTranslation } from '@worlo/i18n';
import { Screen, ScreenHeader, Text } from '@worlo/ui';
import { useRouter } from 'expo-router';

/** Temporary screen while a feature is being built. */
export function Placeholder({ name, back = true }: { name: string; back?: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Screen
      testID={`placeholder-${name}`}
      header={
        <ScreenHeader
          overline={name}
          onBack={back && router.canGoBack() ? () => router.back() : undefined}
          backLabel={t('common.actions.back')}
        />
      }
    >
      <Text variant="h1">{name}</Text>
    </Screen>
  );
}
