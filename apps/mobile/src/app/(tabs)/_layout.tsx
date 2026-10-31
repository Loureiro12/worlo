import { Tabs } from 'expo-router/tabs';
import { AppTabBar } from '@/components/AppTabBar';

export default function TabsLayout() {
  return (
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
  );
}
