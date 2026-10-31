import { useTranslation } from '@worlo/i18n';
import { type IconName, LivePill, OfflineBanner, TabBar } from '@worlo/ui';
import { usePathname, useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { View } from 'react-native';
import { useItinerary, useLive } from '@/data/planning';
import { routes, type TabKey } from '@/navigation/routes';
import { useStore } from '@/store';

const icons: Record<TabKey, IconName> = {
  explore: 'compass',
  map: 'globe-hemisphere-west',
  trips: 'suitcase-rolling',
  community: 'users-three',
  profile: 'user-circle',
};

const keyOf = (routeName: string) => routeName.replace(/[()]/g, '') as TabKey;

/**
 * Tab bar (README → Arquitetura de navegação) plus the two global overlays that
 * sit on top of it: the offline banner and the travel-mode pill.
 */
export function AppTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const offline = useStore((s) => s.demo === 'offline');
  const setDemo = useStore((s) => s.setDemo);
  const live = useLive();
  const liveIt = useItinerary(live.on ? live.itineraryId : '');
  const liveLabel = liveIt?.days[live.day - 1]?.label ?? '';

  // Carvão bar only on the Map tab root (the globe); detail pages stay light.
  const dark = pathname === '/map';

  return (
    <View>
      {live.on ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '100%',
            marginBottom: offline ? 46 : 10,
          }}
        >
          <LivePill
            label={t('common.live.pill', { day: live.day, label: liveLabel })}
            onPress={() => router.push(routes.live)}
          />
        </View>
      ) : null}
      {offline ? (
        <OfflineBanner
          message={t('common.states.offlineBanner')}
          retryLabel={t('common.actions.tryShort')}
          onRetry={() => setDemo('normal')}
        />
      ) : null}
      <TabBar
        dark={dark}
        items={state.routes.map((route, index) => {
          const key = keyOf(route.name);
          const focused = index === state.index;
          return {
            key,
            label: t(`common.tabs.${key}`),
            icon: icons[key],
            active: focused,
            testID: `tab-${key}`,
            onPress: () => {
              // Tapping the active tab returns to its root; other tabs open at
              // their root because stacks reset on blur (popToTopOnBlur).
              if (focused) router.navigate(routes.tab(key));
              else navigateToTab(route.key);
            },
          };
        })}
      />
    </View>
  );
}
