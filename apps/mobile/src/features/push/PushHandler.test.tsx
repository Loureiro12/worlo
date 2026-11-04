import { waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { repos } from '@/data/repositories';
import { DEMO_USER, demoId } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { PushHandler } from './PushHandler';

const mockRouter = { push: jest.fn(), back: jest.fn(), navigate: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const lastResponse = Notifications.useLastNotificationResponse as jest.Mock;
const JERI = demoId('trip:jeri');

/** A tapped push, as push_notification() sends it. */
const tap = (data: Record<string, unknown>, action = Notifications.DEFAULT_ACTION_IDENTIFIER) => ({
  actionIdentifier: action,
  notification: { request: { content: { data } } },
});
const row = (patch: Record<string, unknown>) => ({
  id: 'n-new',
  type: 'follow',
  entity_type: null,
  entity_id: null,
  actor_id: null,
  data: {},
  ...patch,
});

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  lastResponse.mockReturnValue(null);
});

describe('PushHandler', () => {
  it('opens the invite of a tapped push and marks it read', async () => {
    const id = demoId('notification:n1');
    lastResponse.mockReturnValue(
      tap(row({ id, type: 'invite', entity_type: 'trip', entity_id: JERI })),
    );
    await renderWithProviders(<PushHandler />);
    expect(mockRouter.push).toHaveBeenCalledWith(
      routes.invite(demoId(`member:${JERI}:${DEMO_USER.id}`)),
    );
    expect(repos.notifications.list().find((n) => n.id === id)?.readAt).toBeTruthy();
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalled();
  });

  it('works before the row synced: a tour reminder opens the tour', async () => {
    lastResponse.mockReturnValue(
      tap(row({ type: 'reminder', entity_type: 'booking', data: { tour_id: 'tejo' } })),
    );
    await renderWithProviders(<PushHandler />);
    expect(mockRouter.push).toHaveBeenCalledWith(routes.passeio('tejo'));
  });

  it('falls back to Notificações when there is nothing to open', async () => {
    lastResponse.mockReturnValue(tap(row({ type: 'business', data: { status: 'approved' } })));
    await renderWithProviders(<PushHandler />);
    expect(mockRouter.push).toHaveBeenCalledWith(routes.notifs);
  });

  it('ignores dismissals and pushes from elsewhere', async () => {
    lastResponse.mockReturnValue(tap(row({}), 'com.apple.UNNotificationDismissActionIdentifier'));
    const { rerender } = await renderWithProviders(<PushHandler />);
    lastResponse.mockReturnValue(tap({ campaign: 'x' }));
    rerender(<PushHandler />);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('keeps the app icon badge at the unread count', async () => {
    await renderWithProviders(<PushHandler />);
    const unread = repos.notifications.unreadCount();
    expect(unread).toBeGreaterThan(0);
    expect(Notifications.setBadgeCountAsync).toHaveBeenLastCalledWith(unread);
    repos.notifications.markAllRead();
    await waitFor(() => expect(Notifications.setBadgeCountAsync).toHaveBeenLastCalledWith(0));
  });
});
