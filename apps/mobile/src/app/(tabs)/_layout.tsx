import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { AppTabBar } from '@/components/AppTabBar';
import { PushHandler } from '@/features/push/PushHandler';
import { routes } from '@/navigation/routes';
import { useAuth } from '@/providers/AuthProvider';

export default function TabsLayout() {
  const { status } = useAuth();
  // Signed out (sign-out, account deleted, session expired): back to the start.
  if (status === 'signedOut') return <Redirect href={routes.welcome} />;

  return (
    <>
      <PushHandler />
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // Changing tabs resets the stack of the tab you leave (03_FLOWS → Regras gerais).
          popToTopOnBlur: true,
        }}
      >
        <Tabs.Screen name="(explore)" />
        <Tabs.Screen name="(map)" />
        <Tabs.Screen name="(trips)" />
        <Tabs.Screen name="(community)" />
        <Tabs.Screen name="(profile)" />
      </Tabs>
    </>
  );
}
