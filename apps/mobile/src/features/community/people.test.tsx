import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { schema } from '@worlo/db';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { db } from '@/lib/database';
import { DEMO_USER, demoId } from '@/mocks/demo';
import { userId } from '@/mocks/demoWorld';
import { routes } from '@/navigation/routes';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { ComposeScreen } from './ComposeScreen';
import { TravelerScreen } from './TravelerScreen';
import { communityServer, resetCommunityServer } from './testServer';

jest.mock('@/data/communityApi', () => require('./testServer').mockModule());
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
const mockPicker = launchImageLibraryAsync as jest.Mock;

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

const MARINA = userId('Marina Costa');
const picked = (n: number) => ({
  canceled: false,
  assets: Array.from({ length: n }, (_, i) => ({
    uri: `file:///photo-${i}.jpg`,
    mimeType: 'image/jpeg',
  })),
});

beforeEach(() => {
  resetStore();
  resetCommunityServer();
  jest.clearAllMocks();
  mockParams = {};
  mockPicker.mockResolvedValue(picked(1));
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
    expect(communityServer.published).toHaveLength(0);
  });

  it('publishes the post (photos uploaded, trip uuid, visibility), toasts and opens it', async () => {
    await renderWithProviders(<ComposeScreen />);
    await fireEvent.changeText(screen.getByTestId('compose-place'), 'kyo');
    await fireEvent.press(screen.getByTestId('compose-place-option-Kyoto'));
    await fireEvent.changeText(
      screen.getByTestId('compose-text'),
      '  Arashiyama cedo, antes das 8h, é outro passeio.  ',
    );
    await fireEvent.press(screen.getByTestId('compose-photo-add'));
    expect(mockPicker).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], selectionLimit: 4 }),
    );
    expect(screen.getByTestId('compose-photo-add')).toHaveTextContent('1/4');
    await fireEvent.press(screen.getByTestId('compose-trip-lisboa'));
    await fireEvent.press(screen.getByTestId('compose-visibility-friends'));
    await fireEvent.press(screen.getByTestId('compose-submit'));

    expect(await screen.findByText('Publicado. Agora é com a comunidade.')).toBeOnTheScreen();
    const [post] = communityServer.published;
    expect(post).toMatchObject({
      type: 'tip',
      placeLabel: 'Kyoto',
      text: 'Arashiyama cedo, antes das 8h, é outro passeio.',
      rating: null,
      tripId: demoId('trip:lisboa'),
      visibility: 'friends',
      photoPaths: [`${DEMO_USER.id}/photo-1.jpg`],
    });
    expect(communityServer.uploads).toEqual(['file:///photo-0.jpg']);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.post(post?.id ?? ''));
  });

  it('a review sends its rating', async () => {
    mockParams = { type: 'Avaliação', place: 'Lisboa' };
    await renderWithProviders(<ComposeScreen />);
    await fireEvent.press(screen.getByTestId('compose-rating-5'));
    await fireEvent.changeText(screen.getByTestId('compose-text'), 'Valeu cada minuto da fila.');
    await fireEvent.press(screen.getByTestId('compose-submit'));
    await waitFor(() =>
      expect(communityServer.published[0]).toMatchObject({
        type: 'review',
        rating: 5,
        placeLabel: 'Lisboa',
        visibility: 'public',
        tripId: null,
        photoPaths: [],
      }),
    );
  });

  it('offline: keeps the form, shows the offline copy and publishes nothing', async () => {
    communityServer.online = false;
    mockParams = { place: 'Lisboa' };
    await renderWithProviders(<ComposeScreen />);
    await fireEvent.changeText(screen.getByTestId('compose-text'), 'Dica que vai esperar a rede.');
    await fireEvent.press(screen.getByTestId('compose-submit'));
    expect(await screen.findByText('Você está sem internet')).toBeOnTheScreen();
    expect(communityServer.published).toHaveLength(0);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('compose-text').props.value).toBe('Dica que vai esperar a rede.');
  });

  it('limits photos to 4 and lets you remove them', async () => {
    mockPicker.mockResolvedValue(picked(4));
    await renderWithProviders(<ComposeScreen />);
    await fireEvent.press(screen.getByTestId('compose-photo-add'));
    expect(screen.queryByTestId('compose-photo-add')).toBeNull();
    await fireEvent.press(screen.getByTestId('compose-photo-remove-0'));
    expect(screen.getByTestId('compose-photo-add')).toHaveTextContent('3/4');
  });

  it('a cancelled picker adds nothing', async () => {
    mockPicker.mockResolvedValue({ canceled: true, assets: null });
    await renderWithProviders(<ComposeScreen />);
    await fireEvent.press(screen.getByTestId('compose-photo-add'));
    expect(screen.getByTestId('compose-photo-add')).toHaveTextContent('0/4');
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
  const followRows = () =>
    db
      .select()
      .from(schema.follows)
      .all()
      .filter((f) => f.userId === DEMO_USER.id && f.followeeId === MARINA);

  it('shows another traveler (user id) with follow, message and shared trips', async () => {
    mockParams = { id: MARINA };
    await renderWithProviders(<TravelerScreen />);
    expect(await screen.findByText('@marinaporai · Lisboa')).toBeOnTheScreen();
    expect(screen.getByText('Viajante')).toBeOnTheScreen();
    expect(screen.getByTestId('traveler-name')).toHaveTextContent('Marina Costa');
    expect(screen.getByText('Mapa de Marina')).toBeOnTheScreen();
    expect(screen.queryByTestId('traveler-me-strip')).toBeNull();
    // Floripa is Ana's trip with Marina and João (accepted memberships).
    expect(screen.getByText('com Ana e João')).toBeOnTheScreen();

    // Ana already follows Marina (demo world): unfollow, then follow again.
    expect(screen.getByTestId('traveler-follow')).toHaveTextContent('Seguindo');
    await fireEvent.press(screen.getByTestId('traveler-follow'));
    expect(screen.getByTestId('traveler-follow')).toHaveTextContent('Seguir');
    await fireEvent.press(screen.getByTestId('traveler-follow'));
    expect(screen.getByTestId('traveler-follow')).toHaveTextContent('Seguindo');
    expect(screen.getByText('Agora você segue Marina.')).toBeOnTheScreen();
    expect(followRows().some((f) => !f.deletedAt)).toBe(true);
    expect(
      db
        .select()
        .from(schema.outbox)
        .all()
        .filter((o) => o.tableName === 'follows').length,
    ).toBeGreaterThan(0);

    await fireEvent.press(screen.getByTestId('traveler-message'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.chat(MARINA));
    await fireEvent.press(screen.getByTestId('traveler-trip-floripa'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip(demoId('trip:floripa')));
  });

  it('lists the traveler posts from the feed', async () => {
    mockParams = { id: MARINA };
    await renderWithProviders(<TravelerScreen />);
    await fireEvent.press(await screen.findByTestId('traveler-tabs-tips'));
    await fireEvent.press(await screen.findByTestId('traveler-tip-p1'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.post(demoId('post:p1')));
  });

  it('respects privacy: a restricted profile hides the map and trips', async () => {
    const kenji = userId('Kenji Tanaka');
    const profile = communityServer.profiles.find((p) => p.id === kenji);
    if (profile) profile.privacy = 'friends';
    mockParams = { id: kenji };
    await renderWithProviders(<TravelerScreen />);
    expect(await screen.findByTestId('traveler-restricted')).toHaveTextContent(
      /Só quem Kenji segue vê as viagens e o mapa./,
    );
    expect(screen.queryByText('Mapa de Kenji')).toBeNull();
    expect(screen.getByText('Nenhuma viagem pública ainda.')).toBeOnTheScreen();
  });

  it('unknown or hidden profile: not found', async () => {
    mockParams = { id: demoId('user:nobody') };
    await renderWithProviders(<TravelerScreen />);
    expect(await screen.findByTestId('traveler-not-found')).toBeOnTheScreen();
  });

  it('offline: shows the offline state', async () => {
    communityServer.online = false;
    mockParams = { id: MARINA };
    await renderWithProviders(<TravelerScreen />);
    expect(await screen.findByText('Você está sem internet')).toBeOnTheScreen();
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
    await fireEvent.press(screen.getByTestId('traveler-tabs-tips'));
    expect(await screen.findByTestId('traveler-tip-ana-28')).toBeOnTheScreen();
  });
});
