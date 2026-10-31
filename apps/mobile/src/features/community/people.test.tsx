import { act, fireEvent, screen } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { elapse, renderWithProviders, useFakeClock } from '@/test-utils';
import { ChatScreen } from './ChatScreen';
import { ComposeScreen } from './ComposeScreen';
import { REPLY_DELAY_MS } from './data';
import { TravelerScreen } from './TravelerScreen';

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

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = {};
});

describe('ComposeScreen', () => {
  const error = () => screen.getByTestId('compose-error');

  it('validates place → rating (review) → text, one message at a time', async () => {
    await renderWithProviders(<ComposeScreen />);
    await fireEvent.press(screen.getByTestId('compose-type-review'));
    await fireEvent.press(screen.getByTestId('compose-submit'));
    expect(error()).toHaveTextContent('Diz onde foi.');

    await fireEvent.press(screen.getByTestId('compose-place-option-Lisboa'));
    expect(screen.queryByTestId('compose-error')).toBeNull();
    expect(screen.getByTestId('compose-place-selected')).toHaveTextContent(/Lisboa/);
    await fireEvent.press(screen.getByTestId('compose-submit'));
    expect(error()).toHaveTextContent('Dá uma nota de 1 a 5.');

    await fireEvent.press(screen.getByTestId('compose-rating-4'));
    await fireEvent.changeText(screen.getByTestId('compose-text'), 'Curto');
    await fireEvent.press(screen.getByTestId('compose-submit'));
    expect(error()).toHaveTextContent('Escreve um pouco mais (mínimo 10 caracteres).');
    expect(useStore.getState().myPosts).toHaveLength(0);
  });

  it('publishes, toasts and opens the new post', async () => {
    await renderWithProviders(<ComposeScreen />);
    await fireEvent.changeText(screen.getByTestId('compose-place'), 'kyo');
    await fireEvent.press(screen.getByTestId('compose-place-option-Kyoto'));
    await fireEvent.changeText(
      screen.getByTestId('compose-text'),
      'Arashiyama cedo, antes das 8h, é outro passeio.',
    );
    await fireEvent.press(screen.getByTestId('compose-photo-add'));
    await fireEvent.press(screen.getByTestId('compose-trip-lisboa'));
    await fireEvent.press(screen.getByTestId('compose-visibility-friends'));
    await fireEvent.press(screen.getByTestId('compose-submit'));

    const [post] = useStore.getState().myPosts;
    expect(post).toMatchObject({
      mine: true,
      author: 'Ana Ribeiro',
      where: 'Kyoto',
      type: 'Dica',
      yes: 0,
      no: 0,
      tripId: 'lisboa',
      visibility: 'friends',
    });
    expect(post?.photos).toHaveLength(1);
    expect(screen.getByText('Publicado. Agora é com a comunidade.')).toBeOnTheScreen();
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.post(post?.id ?? ''));
  });

  it('limits photos to 4 and lets you remove them', async () => {
    await renderWithProviders(<ComposeScreen />);
    for (let i = 0; i < 4; i++) await fireEvent.press(screen.getByTestId('compose-photo-add'));
    expect(screen.queryByTestId('compose-photo-add')).toBeNull();
    await fireEvent.press(screen.getByTestId('compose-photo-remove-0'));
    expect(screen.getByTestId('compose-photo-add')).toHaveTextContent('3/4');
  });

  it('opens as a question with a place from params', async () => {
    mockParams = { type: 'Pergunta', place: 'Lisboa' };
    await renderWithProviders(<ComposeScreen />);
    expect(screen.getByTestId('compose-submit')).toHaveTextContent('Perguntar');
    expect(screen.getByText('Sua pergunta')).toBeOnTheScreen();
    expect(screen.getByTestId('compose-place-selected')).toHaveTextContent(/Lisboa/);
  });
});

describe('TravelerScreen', () => {
  it('shows another traveler with follow, message and shared trips', async () => {
    mockParams = { id: 'Marina Costa' };
    await renderWithProviders(<TravelerScreen />);
    expect(screen.getByText('Viajante')).toBeOnTheScreen();
    expect(screen.getByText('@marinaporai · Lisboa')).toBeOnTheScreen();
    expect(screen.getByText('Mapa de Marina')).toBeOnTheScreen();
    expect(screen.queryByTestId('traveler-me-strip')).toBeNull();
    // Floripa was shared with Marina, Ana (me) and João.
    expect(screen.getByText('com Ana e João')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('traveler-follow'));
    expect(screen.getByTestId('traveler-follow')).toHaveTextContent('Seguindo');
    expect(screen.getByText('Agora você segue Marina.')).toBeOnTheScreen();
    expect(useStore.getState().following['Marina Costa']).toBe(true);

    await fireEvent.press(screen.getByTestId('traveler-message'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.chat('Marina Costa'));
    await fireEvent.press(screen.getByTestId('traveler-trip-floripa'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip('floripa'));
  });

  it('lists the traveler tips', async () => {
    mockParams = { id: 'Marina Costa' };
    await renderWithProviders(<TravelerScreen />);
    await fireEvent.press(screen.getByTestId('traveler-tabs-tips'));
    await fireEvent.press(screen.getByTestId('traveler-tip-p1'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.post('p1'));
  });

  it("'me' shows how others see the profile, with Editar perfil", async () => {
    mockParams = { id: 'me' };
    await renderWithProviders(<TravelerScreen />);
    expect(screen.getByText('Seu perfil público')).toBeOnTheScreen();
    expect(screen.getByTestId('traveler-name')).toHaveTextContent('Ana Ribeiro');
    expect(screen.getByTestId('traveler-me-strip')).toHaveTextContent(
      'É assim que outros viajantes veem seu perfil (só amigos). Gastos nunca aparecem.',
    );
    expect(screen.queryByTestId('traveler-follow')).toBeNull();
    expect(screen.queryByTestId('traveler-message')).toBeNull();
    await fireEvent.press(screen.getByTestId('traveler-edit'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.cfg('account'));
  });
});

describe('ChatScreen', () => {
  useFakeClock();

  it('shows the Marina conversation and replies after typing', async () => {
    mockParams = { id: 'Marina Costa' };
    await renderWithProviders(<ChatScreen />);
    expect(screen.getByText('Online agora')).toBeOnTheScreen();
    expect(screen.getByText('Anotado! Vou em outubro, quer ir junto?')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-send')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Bora!');
    await fireEvent(screen.getByTestId('chat-input'), 'submitEditing');
    expect(screen.getByText('Bora!')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-typing')).toHaveTextContent('digitando…');
    expect(screen.getByTestId('chat-input').props.value).toBe('');

    await elapse(REPLY_DELAY_MS - 400);
    expect(screen.queryByText('Haha, total!')).toBeNull();
    await elapse(600);
    expect(screen.queryByTestId('chat-typing')).toBeNull();
    expect(screen.getByText('Haha, total!')).toBeOnTheScreen();
    expect(useStore.getState().chats['Marina Costa']).toHaveLength(2);
  });

  it('support: headset header, quick chips and support replies', async () => {
    mockParams = { id: 'support' };
    await renderWithProviders(<ChatScreen />);
    expect(screen.getByText('Suporte Worlo')).toBeOnTheScreen();
    expect(screen.getByText('Responde em poucos minutos')).toBeOnTheScreen();
    expect(
      screen.getByText('Oi, Ana! Aqui é a Júlia, do suporte do Worlo. Como posso ajudar?'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('chat-quick-booking'));
    expect(screen.getByText('Minha reserva')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-quick-photos')).toBeNull();
    await elapse(REPLY_DELAY_MS + 200);
    expect(screen.getByText('Entendi. Vou verificar aqui e já te respondo.')).toBeOnTheScreen();
  });

  it('cancels the pending reply on unmount', async () => {
    mockParams = { id: 'Rafael Lima' };
    await renderWithProviders(<ChatScreen />);
    expect(screen.getByText('Oi! Tudo bem?')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Oi!');
    await fireEvent.press(screen.getByTestId('chat-send'));
    await act(() => screen.unmount());
    await elapse(REPLY_DELAY_MS + 200);
    expect(useStore.getState().chats['Rafael Lima']).toHaveLength(1);
  });
});
