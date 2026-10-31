import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { resetStore } from '@/store';
import { routes } from './routes';

// The globe animates with requestAnimationFrame; navigation tests only need the screens.
jest.mock('@worlo/ui', () => {
  const actual = jest.requireActual('@worlo/ui');
  const { View } = jest.requireActual('react-native');
  return { ...actual, Globe: (props: { testID?: string }) => <View testID={props.testID} /> };
});

// The real app layout (AppProviders) has no backend in tests, so the session
// would be signed out and the tabs guard would redirect to Welcome: sign in as
// the demo account (its data is seeded before each test).
jest.mock('@/providers/AuthProvider', () => {
  const actual = jest.requireActual('@/providers/AuthProvider');
  const { DEMO_SESSION } = jest.requireActual('@/test-utils');
  return {
    ...actual,
    AuthProvider: ({ children }: { children: React.ReactNode }) => (
      <actual.AuthProvider initial={DEMO_SESSION}>{children}</actual.AuthProvider>
    ),
  };
});

// Online community data (feed, traveler pages) from the demo-world fake.
jest.mock('@/data/communityApi', () => require('@/features/community/testServer').mockModule());

beforeEach(() => resetStore());

describe('navigation', () => {
  it('opens each tab root from the tab bar', async () => {
    await renderRouter('./src/app', { initialUrl: '/(tabs)/(explore)/explore' });
    expect(screen.getByTestId('explore-screen')).toBeOnTheScreen();

    for (const tab of ['map', 'trips', 'community', 'profile', 'explore'] as const) {
      await fireEvent.press(screen.getByTestId(`tab-${tab}`));
      expect(screen.getByTestId(`${tab}-screen`)).toBeOnTheScreen();
      expect(screen.getByTestId(`tab-${tab}`)).toBeSelected();
    }
  });

  it('opens shared detail screens inside the current tab (tab bar stays)', async () => {
    // Tab roots must be addressed with their group: "/trips" alone exists in
    // every tab and a cold link would resolve to the first one alphabetically.
    await renderRouter('./src/app', { initialUrl: '/(tabs)/(trips)/trips' });
    expect(screen.getByTestId('tab-trips')).toBeSelected();
    await act(() => router.push(routes.trip('floripa')));
    expect(screen.getByTestId('trip-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-trips')).toBeSelected();
  });

  it('opens fullscreen routes without the tab bar', async () => {
    await renderRouter('./src/app', { initialUrl: '/(tabs)/(explore)/explore' });
    await act(() => router.push(routes.live));
    expect(screen.getByTestId('live-screen')).toBeOnTheScreen();
    expect(screen.queryByTestId('tab-explore')).not.toBeOnTheScreen();
  });
});
