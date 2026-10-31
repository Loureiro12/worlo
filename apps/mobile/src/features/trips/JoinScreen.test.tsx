import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { OfflineError } from '@/data/collab';
import { demoId } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { renderWithProviders, SIGNED_OUT } from '@/test-utils';
import { JoinScreen } from './JoinScreen';

const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: () => true,
};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ token: 'tok123' }),
}));

// Online RPC (`accept_invite_link`): faked here.
const mockAccept = jest.fn();
jest.mock('@/data/collab', () => ({
  ...jest.requireActual('@/data/collab'),
  acceptInviteLink: (token: string) => mockAccept(token),
}));

const JERI = demoId('trip:jeri');
const SEUL = demoId('wish:seul');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('JoinScreen (worlo://join/<token>)', () => {
  it('joins through the RPC and opens the trip once it is on the device', async () => {
    mockAccept.mockResolvedValue({ type: 'trip', id: JERI });
    await renderWithProviders(<JoinScreen />);
    expect(mockAccept).toHaveBeenCalledWith('tok123');
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(routes.trip(JERI)));
  });

  it('opens a wish', async () => {
    mockAccept.mockResolvedValue({ type: 'wish', id: SEUL });
    await renderWithProviders(<JoinScreen />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(routes.future(SEUL)));
  });

  it('waits (loading) while the joined trip is not synced yet', async () => {
    mockAccept.mockResolvedValue({ type: 'trip', id: demoId('trip:not-synced') });
    await renderWithProviders(<JoinScreen />);
    expect(screen.getByLabelText('Entrando na viagem…')).toBeOnTheScreen();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows the error state for an invalid link and retries', async () => {
    mockAccept.mockRejectedValue(new Error('invalid or expired link'));
    await renderWithProviders(<JoinScreen />);
    expect(await screen.findByText('Esse link não funciona mais')).toBeOnTheScreen();
    mockAccept.mockResolvedValue({ type: 'trip', id: JERI });
    await fireEvent.press(screen.getByText('Tentar de novo'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(routes.trip(JERI)));
    expect(mockAccept).toHaveBeenCalledTimes(2);
  });

  it('shows the offline state without a connection', async () => {
    mockAccept.mockRejectedValue(new OfflineError());
    await renderWithProviders(<JoinScreen />);
    expect(await screen.findByText('Você está sem internet')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Ver minhas viagens'));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.trips);
  });

  it('sends signed-out users to the welcome screen', async () => {
    await renderWithProviders(<JoinScreen />, { session: SIGNED_OUT });
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
    expect(mockAccept).not.toHaveBeenCalled();
  });
});
