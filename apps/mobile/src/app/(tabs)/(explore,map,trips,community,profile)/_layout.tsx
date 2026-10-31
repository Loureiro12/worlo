import { colors } from '@worlo/ui';
import { Stack } from 'expo-router';

/**
 * One stack per tab. Detail screens (trip, country, post…) are declared once in
 * this folder and open inside whichever tab you came from, keeping the tab bar.
 */
export const unstable_settings = {
  anchor: 'explore',
  explore: { anchor: 'explore' },
  map: { anchor: 'map' },
  trips: { anchor: 'trips' },
  community: { anchor: 'community' },
  profile: { anchor: 'profile' },
};

export default function TabStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
