import { fireEvent, screen, within } from '@testing-library/react-native';
import { createLocalStore } from '@worlo/db';
import { notificationGroup } from '@/data/notifications';
import { repos } from '@/data/repositories';
import { db } from '@/lib/database';
import { DEMO_USER, demoId } from '@/mocks/demo';
import { userId } from '@/mocks/demoWorld';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
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

const JERI = demoId('trip:jeri');
const SEUL = demoId('wish:seul');
const N = (key: string) => demoId(`notification:${key}`);
const readOf = (key: string) =>
  Boolean(repos.notifications.list().find((n) => n.id === N(key))?.readAt);

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe('NotificationsScreen', () => {
  it('lists synced notifications grouped by date, one template per type', async () => {
    await renderWithProviders(<NotificationsScreen />);
    expect(screen.getByText('O que rolou')).toBeOnTheScreen();
    expect(screen.getByText('Esta semana')).toBeOnTheScreen();
    const row = (key: string) => within(screen.getByTestId(`notif-${key}`));
    expect(
      row('n1').getByText(/convidou você pra a viagem “Réveillon em Jeri”\./),
    ).toBeOnTheScreen();
    expect(row('n1').getByText('Bia Souza')).toBeOnTheScreen();
    expect(row('n2').getByText(/adicionou 12 fotos em Inverno em Floripa\./)).toBeOnTheScreen();
    expect(row('n3').getByText(/convidou você pra planejar “Seul e Tóquio”\./)).toBeOnTheScreen();
    expect(
      row('n4').getByText('Há 1 ano você estava em Florianópolis. Reviva a viagem.'),
    ).toBeOnTheScreen();
    expect(row('n5').getByText(/aceitou seu convite pra Lisboa sem pressa\./)).toBeOnTheScreen();
    expect(
      row('n6').getByText(/ainda não respondeu seu convite pra Patagônia de carro\./),
    ).toBeOnTheScreen();
    expect(row('n7').getByText('128 viajantes')).toBeOnTheScreen();
    expect(row('n7').getByText(/confirmaram sua dica\./)).toBeOnTheScreen();
    expect(row('n8').getByText('Faltam 30 dias pra Cusco e Machu Picchu.')).toBeOnTheScreen();
    expect(row('n9').getByText(/começou a seguir você\./)).toBeOnTheScreen();
    expect(row('n1').getByText('há 20 min')).toBeOnTheScreen();
  });

  it('groups by Hoje / Esta semana / Antes', () => {
    const now = Date.parse('2026-10-31T15:00:00');
    expect(notificationGroup(new Date(now - 60_000).toISOString(), now)).toBe('today');
    expect(notificationGroup('2026-10-30T23:00:00', now)).toBe('week');
    expect(notificationGroup('2026-10-24T09:00:00', now)).toBe('week');
    expect(notificationGroup('2026-10-20T09:00:00', now)).toBe('earlier');
  });

  it('accepts the Jeri invite inline: editable trip, country year, chip and toast', async () => {
    await renderWithProviders(<NotificationsScreen />);
    await fireEvent.press(screen.getByTestId('notif-accept-jeri'));
    expect(repos.collab.mine('trip', JERI)?.status).toBe('accepted');
    expect(repos.collab.canEdit('trip', JERI)).toBe(true);
    expect(repos.world.visitedMap()['076']).toContain('2025');
    expect(readOf('n1')).toBe(true);
    expect(screen.getByTestId('notif-result-jeri')).toHaveTextContent('Você entrou na viagem');
    expect(
      screen.getByText('Você entrou em “Réveillon em Jeri”. Ela já aparece no seu perfil.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('notif-accept-jeri')).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
    const pending = await createLocalStore(db).pendingMutations(100);
    // Brazil already had 2025: only the answer and the read mark are written.
    expect(pending.map((m) => m.table).sort()).toEqual(['memberships', 'notifications']);
  });

  it('declines an invite inline; the wish leaves the device after prune', async () => {
    await renderWithProviders(<NotificationsScreen />);
    await fireEvent.press(screen.getByTestId('notif-decline-seul'));
    expect(repos.collab.mine('wish', SEUL)?.status).toBe('declined');
    expect(screen.getByText('Convite recusado')).toBeOnTheScreen();
    expect(
      screen.getByText('Convite recusado. Rafael não vai ser avisado com detalhes.'),
    ).toBeOnTheScreen();
    repos.collab.prune();
    expect(repos.world.wishes().some((w) => w.id === SEUL)).toBe(false);
  });

  it('opens the invite, trip, memory, post and traveler targets and marks rows read', async () => {
    await renderWithProviders(<NotificationsScreen />);
    await fireEvent.press(screen.getByTestId('notif-n1'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(
      routes.invite(demoId(`member:${JERI}:${DEMO_USER.id}`)),
    );
    await fireEvent.press(screen.getByTestId('notif-n2'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.trip(demoId('trip:floripa')));
    await fireEvent.press(screen.getByTestId('notif-n4'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.trip(demoId('trip:floripa')));
    await fireEvent.press(screen.getByTestId('notif-n7'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.post(demoId('post:ana-28')));
    await fireEvent.press(screen.getByTestId('notif-n8'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.roteiro(demoId('itinerary:peru')));
    await fireEvent.press(screen.getByTestId('notif-n9'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.traveler(userId('Rafael Lima')));
    for (const key of ['n1', 'n2', 'n4', 'n7', 'n8', 'n9']) expect(readOf(key)).toBe(true);
    expect(readOf('n3')).toBe(false);
  });

  it('marks everything as read', async () => {
    await renderWithProviders(<NotificationsScreen />);
    expect(repos.notifications.unreadCount()).toBe(9);
    expect(screen.getAllByLabelText(/não lida/)).toHaveLength(9);
    await fireEvent.press(screen.getByTestId('notifs-mark-all'));
    expect(repos.notifications.unreadCount()).toBe(0);
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
