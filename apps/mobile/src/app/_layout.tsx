import { colors, fontAssets } from '@worlo/ui';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { installGlobalErrorHandler } from '@/lib/errorLog';
import { AppProviders } from '@/providers/AppProviders';

void SplashScreen.preventAutoHideAsync();
installGlobalErrorHandler();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  // Keep the native splash until the brand fonts are ready (no font flash).
  if (!loaded && !error) return null;

  return (
    <AppProviders>
      <AppErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="onboarding/first-map" options={{ animation: 'fade' }} />
          <Stack.Screen name="retro/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="share" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="compose" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="search" options={{ animation: 'fade' }} />
        </Stack>
      </AppErrorBoundary>
    </AppProviders>
  );
}
