import { fireEvent, screen } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { selectUnreadCount } from '@/store/slices/notifications';
import { renderWithProviders } from '@/test-utils';
import { NotificationsScreen } from './NotificationsScreen';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  canGoBack: () => true,
};
const mockParams = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe('NotificationsScreen', () => {
  it('lists notifications grouped by Hoje / Esta semana', async () => {
    await renderWithProviders(<NotificationsScreen />);
    expect(screen.getByText('O que rolou')).toBeOnTheScreen();
    expect(screen.getByText('Hoje')).toBeOnTheScreen();
    expect(screen.getByText('Esta semana')).toBeOnTheScreen();
    expect(screen.getByText(/convidou você pra a viagem “Réveillon em Jeri”\./)).toBeOnTheScreen();
    expect(screen.getByText(/convidou você pra planejar “Seul e Tóquio”\./)).toBeOnTheScreen();
    expect(screen.getByText(/começou a seguir você\./)).toBeOnTheScreen();
  });

  it('accepts an invite inline: trip added, country lit, chip and toast', async () => {
    await renderWithProviders(<NotificationsScreen />);
    await fireEvent.press(screen.getByTestId('notif-accept-jeri'));
    const s = useStore.getState();
    expect(s.invites.jeri).toBe('accepted');
    expect(s.trips[0]).toMatchObject({ id: 'jeri', title: 'Réveillon em Jeri', year: '2025' });
    expect(s.visitedMap['076']).toContain('2025');
    expect(screen.getByText('Você entrou na viagem')).toBeOnTheScreen();
    expect(
      screen.getByText('Você entrou em “Réveillon em Jeri”. Ela já aparece no seu perfil.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('notif-accept-jeri')).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('declines an invite inline', async () => {
    await renderWithProviders(<NotificationsScreen />);
    await fireEvent.press(screen.getByTestId('notif-decline-seul'));
    expect(useStore.getState().invites.seul).toBe('declined');
    expect(screen.getByText('Convite recusado')).toBeOnTheScreen();
    expect(
      screen.getByText('Convite recusado. Rafael não vai ser avisado com detalhes.'),
    ).toBeOnTheScreen();
  });

  it('opens the invite, trip and memory targets and marks rows as read', async () => {
    await renderWithProviders(<NotificationsScreen />);
    await fireEvent.press(screen.getByTestId('notif-n1'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.invite('jeri'));
    await fireEvent.press(screen.getByTestId('notif-n2'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.trip('floripa'));
    await fireEvent.press(screen.getByTestId('notif-n4'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.trip('floripa'));
    await fireEvent.press(screen.getByTestId('notif-n9'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.traveler('Rafael Lima'));
    expect(useStore.getState().readIds).toMatchObject({ n2: true, n4: true, n9: true });
  });

  it('marks everything as read', async () => {
    await renderWithProviders(<NotificationsScreen />);
    expect(selectUnreadCount(useStore.getState())).toBe(9);
    await fireEvent.press(screen.getByTestId('notifs-mark-all'));
    expect(selectUnreadCount(useStore.getState())).toBe(0);
    expect(screen.getByText('Tudo marcado como lido.')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/não lida/)).toBeNull();
  });

  it('filters to invites only', async () => {
    await renderWithProviders(<NotificationsScreen />);
    await fireEvent.press(screen.getByTestId('notifs-seg-invites'));
    expect(screen.getByTestId('notif-n1')).toBeOnTheScreen();
    expect(screen.getByTestId('notif-n3')).toBeOnTheScreen();
    expect(screen.queryByTestId('notif-n2')).toBeNull();
    expect(screen.queryByText('Esta semana')).toBeNull();
  });

  it('shows the empty state on first use', async () => {
    useStore.getState().setDemo('empty');
    await renderWithProviders(<NotificationsScreen />);
    expect(screen.getByText(/^Nada por aqui ainda\./)).toBeOnTheScreen();
    expect(screen.queryByText('Hoje')).toBeNull();
  });

  it('goes back', async () => {
    await renderWithProviders(<NotificationsScreen />);
    await fireEvent.press(screen.getByTestId('header-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('acceptInvite (store)', () => {
  it('is idempotent and never toggles a visited country off', () => {
    const before = useStore.getState().visitedMap['076'] ?? [];
    useStore.getState().acceptInvite('jeri');
    useStore.getState().acceptInvite('jeri');
    const s = useStore.getState();
    expect(s.trips.filter((t) => t.id === 'jeri')).toHaveLength(1);
    expect(s.visitedMap['076']).toEqual(expect.arrayContaining([...before, '2025']));
  });

  it('adds a future trip for a future invite', () => {
    useStore.getState().acceptInvite('seul');
    const s = useStore.getState();
    expect(s.invites.seul).toBe('accepted');
    expect(s.futures[0]).toMatchObject({
      id: 'seul',
      name: 'Seul e Tóquio',
      saved: 'Convite de Rafael',
    });
  });
});
