import { act, fireEvent, screen } from '@testing-library/react-native';
import { schema } from '@worlo/db';
import { openDirectThread, openSupportThread } from '@/data/chat';
import { dataEvents } from '@/data/events';
import { repos, setCurrentUserId } from '@/data/repositories';
import { db } from '@/lib/database';
import { DEMO_USER, demoId } from '@/mocks/demo';
import { userId } from '@/mocks/demoWorld';
import { renderWithProviders } from '@/test-utils';
import { ChatScreen } from './ChatScreen';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canGoBack: () => true,
};
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

// Online openers (RPCs) are mocked; the rest of the chat data layer is real SQLite.
jest.mock('@/data/chat', () => ({
  ...jest.requireActual('@/data/chat'),
  openDirectThread: jest.fn(),
  openSupportThread: jest.fn(),
}));
const mockOpenDirect = openDirectThread as jest.Mock;
const mockOpenSupport = openSupportThread as jest.Mock;

let mockOnline = false;
const mockRetry = jest.fn();
jest.mock('@/features/sync/SyncProvider', () => {
  const actual = jest.requireActual('@/features/sync/SyncProvider');
  return {
    ...actual,
    useSync: () => ({ ...actual.useSync(), online: mockOnline, retry: mockRetry }),
  };
});

const MARINA = userId('Marina Costa');
const JOAO = userId('João Pereira');
const MARINA_THREAD = demoId('thread:marina');

/** Rows arriving from the server (like a sync pull: no outbox). */
function pull(fn: () => void) {
  return act(async () => {
    fn();
    dataEvents.emit();
  });
}

const outboxMessages = () =>
  db
    .select()
    .from(schema.outbox)
    .all()
    .filter((r) => r.tableName === 'messages');

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockOnline = false;
  mockOpenDirect.mockResolvedValue({ ok: true, threadId: 'new-thread' });
  mockOpenSupport.mockResolvedValue({ ok: true, threadId: 'support-thread' });
});

describe('ChatScreen · direct', () => {
  it('opens the demo thread with Marina by person id and marks it read', async () => {
    mockParams = { id: MARINA };
    setCurrentUserId(DEMO_USER.id);
    expect(repos.chat.unreadCount(MARINA_THREAD)).toBe(2);
    await renderWithProviders(<ChatScreen />);
    expect(screen.getByTestId('chat-name')).toHaveTextContent('Marina Costa');
    expect(screen.getByText('Anotado! Vou em outubro, quer ir junto?')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(/^Você, \d\d:\d\d: Anotado! Vou em outubro, quer ir junto\?$/),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(/^Marina Costa, \d\d:\d\d: Claro! Me chama no roteiro/),
    ).toBeOnTheScreen();
    expect(repos.chat.unreadCount(MARINA_THREAD)).toBe(0);
    expect(mockOpenDirect).not.toHaveBeenCalled();
  });

  it('sends offline: the message is in the thread and waits in the outbox', async () => {
    mockParams = { id: MARINA };
    await renderWithProviders(<ChatScreen />);
    expect(screen.getByTestId('chat-send')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Bora!');
    await fireEvent(screen.getByTestId('chat-input'), 'submitEditing');
    expect(screen.getByText('Bora!')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-input').props.value).toBe('');
    expect(screen.queryByTestId('chat-typing')).toBeNull();
    expect(repos.chat.messages(MARINA_THREAD).at(-1)?.text).toBe('Bora!');
    expect(outboxMessages().map((r) => r.payload.text)).toEqual(['Bora!']);
  });

  it('shows replies as they sync and marks them read while open', async () => {
    mockParams = { id: MARINA_THREAD };
    await renderWithProviders(<ChatScreen />);
    expect(screen.getByTestId('chat-name')).toHaveTextContent('Marina Costa');
    const now = new Date().toISOString();
    await pull(() =>
      db
        .insert(schema.messages)
        .values({
          id: 'reply-1',
          threadId: MARINA_THREAD,
          userId: MARINA,
          text: 'Fechado!',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .run(),
    );
    expect(screen.getByText('Fechado!')).toBeOnTheScreen();
    expect(repos.chat.unreadCount(MARINA_THREAD)).toBe(0);
  });

  it('a person without a thread yet: opens it online, then pulls it down', async () => {
    mockOnline = true;
    mockParams = { id: JOAO };
    await renderWithProviders(<ChatScreen />);
    expect(mockOpenDirect).toHaveBeenCalledWith(JOAO);
    expect(mockRetry).toHaveBeenCalled();
    expect(screen.getByTestId('chat-name')).toHaveTextContent('João Pereira');
  });

  it('a person without a thread, offline: the offline state', async () => {
    mockParams = { id: JOAO };
    await renderWithProviders(<ChatScreen />);
    expect(screen.getByText('Você está sem internet')).toBeOnTheScreen();
    expect(mockOpenDirect).not.toHaveBeenCalled();
  });

  it('opening fails: the error state with retry', async () => {
    mockOnline = true;
    mockOpenDirect.mockResolvedValueOnce({ ok: false, reason: 'error' });
    mockParams = { id: JOAO };
    await renderWithProviders(<ChatScreen />);
    expect(screen.getByText('Algo deu errado do nosso lado')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Tentar de novo'));
    expect(mockOpenDirect).toHaveBeenCalledTimes(2);
  });
});

describe('ChatScreen · support', () => {
  const SUPPORT_THREAD = 'support-thread';
  const landSupportThread = () => {
    const me = DEMO_USER.id;
    const now = new Date().toISOString();
    const row = { createdAt: now, updatedAt: now, deletedAt: null };
    return pull(() => {
      db.insert(schema.chatThreads)
        .values({ ...row, id: SUPPORT_THREAD, kind: 'support', lastMessageAt: null })
        .run();
      db.insert(schema.chatMembers)
        .values({
          ...row,
          id: 'support-me',
          threadId: SUPPORT_THREAD,
          userId: me,
          lastReadAt: null,
        })
        .run();
    });
  };

  it('opens the support thread online; greeting, quick chips, team replies', async () => {
    mockOnline = true;
    mockParams = { id: 'support' };
    await renderWithProviders(<ChatScreen />);
    expect(mockOpenSupport).toHaveBeenCalled();
    await landSupportThread();

    expect(screen.getByTestId('chat-name')).toHaveTextContent('Suporte Worlo');
    expect(screen.getByText('Responde em poucos minutos')).toBeOnTheScreen();
    expect(
      screen.getByText('Oi, Ana! Aqui é a Júlia, do suporte do Worlo. Como posso ajudar?'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('chat-quick-booking'));
    expect(screen.getByText('Minha reserva')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-quick-photos')).toBeNull();
    expect(outboxMessages().map((r) => r.payload.text)).toEqual(['Minha reserva']);

    // No automatic replies: the team answers from the dashboard.
    expect(repos.chat.messages(SUPPORT_THREAD)).toHaveLength(1);
    const now = new Date().toISOString();
    await pull(() =>
      db
        .insert(schema.messages)
        .values({
          id: 'team-1',
          threadId: SUPPORT_THREAD,
          userId: 'team-member',
          text: 'Oi! Já vejo sua reserva.',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .run(),
    );
    expect(screen.getByText('Oi! Já vejo sua reserva.')).toBeOnTheScreen();
  });

  it('offline without a support thread: the offline state', async () => {
    mockParams = { id: 'support' };
    await renderWithProviders(<ChatScreen />);
    expect(screen.getByText('Você está sem internet')).toBeOnTheScreen();
    expect(mockOpenSupport).not.toHaveBeenCalled();
  });
});
