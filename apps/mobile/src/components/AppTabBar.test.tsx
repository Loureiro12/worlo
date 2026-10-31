import { fireEvent, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { endLive, setLiveDay, startLive } from '@/data/planning';
import { demoId } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { AppTabBar } from './AppTabBar';

const mockRouter = { push: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/explore',
}));

const props = {
  state: {
    index: 0,
    routes: ['(explore)', '(map)', '(trips)', '(community)', '(profile)'].map((name) => ({
      key: name,
      name,
    })),
  },
  navigateToTab: jest.fn(),
} as unknown as BottomTabBarProps;

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe('AppTabBar travel-mode pill', () => {
  it('is hidden while travel mode is off (demo session paused)', async () => {
    await renderWithProviders(<AppTabBar {...props} />);
    expect(screen.queryByText(/Viajando/)).toBeNull();
  });

  it('shows the current day of the live itinerary and opens travel mode', async () => {
    startLive(demoId('itinerary:peru'));
    setLiveDay(2);
    await renderWithProviders(<AppTabBar {...props} />);
    const pill = screen.getByText(/Viajando · Dia 2/);
    expect(pill).toHaveTextContent(/Vale Sagrado/);
    await fireEvent.press(pill);
    expect(mockRouter.push).toHaveBeenCalledWith(routes.live);
  });

  it('disappears when travel mode ends', async () => {
    startLive(demoId('itinerary:peru'));
    endLive();
    await renderWithProviders(<AppTabBar {...props} />);
    expect(screen.queryByText(/Viajando/)).toBeNull();
  });
});
