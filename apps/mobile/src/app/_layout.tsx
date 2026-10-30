import { useTranslation } from '@worlo/i18n';
import { Button, useTheme } from '@worlo/ui';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Navigator />
    </AppProviders>
  );
}

function Navigator() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { color: theme.colors.text },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: t('tasks.title'),
            headerRight: () => (
              <Link href="/settings" asChild>
                <Button
                  testID="open-settings"
                  variant="ghost"
                  size="sm"
                  label={t('settings.title')}
                />
              </Link>
            ),
          }}
        />
        <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
        <Stack.Screen name="design-system" options={{ title: t('settings.designSystem') }} />
      </Stack>
    </>
  );
}
