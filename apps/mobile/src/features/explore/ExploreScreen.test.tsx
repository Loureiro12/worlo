import { fireEvent, screen } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { ExploreScreen } from './ExploreScreen';

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

describe('ExploreScreen', () => {
  it('renders the header with greeting, unread badge and the sections', async () => {
    await renderWithProviders(<ExploreScreen />);
    expect(screen.getByTestId('explore-screen')).toBeOnTheScreen();
    expect(screen.getByText('Oi, Ana')).toBeOnTheScreen();
    expect(screen.getByText('Para onde vamos?')).toBeOnTheScreen();
    // 9 notifications, all unread (the 2 invites are pending).
    expect(screen.getByLabelText('Notificações, 9')).toBeOnTheScreen();
    expect(screen.getByText('Lugares para conhecer')).toBeOnTheScreen();
    expect(screen.getByText('Destinos populares')).toBeOnTheScreen();
    expect(screen.getByText('Passeios em destaque')).toBeOnTheScreen();
    expect(screen.getByText('Você estava em Florianópolis')).toBeOnTheScreen();
    expect(screen.getByText('42 fotos · 6 lugares')).toBeOnTheScreen();
  });

  it('drops read notifications and answered invites from the badge', async () => {
    useStore.getState().markRead('n2');
    useStore.getState().setInvite('jeri', 'declined');
    await renderWithProviders(<ExploreScreen />);
    expect(screen.getByLabelText('Notificações, 7')).toBeOnTheScreen();
  });

  it('filters "Lugares para conhecer" by category', async () => {
    await renderWithProviders(<ExploreScreen />);
    await fireEvent.press(screen.getByTestId('explore-cat-beaches'));
    expect(screen.getByText('Fernando de Noronha')).toBeOnTheScreen();
    expect(screen.getByText('Jericoacoara')).toBeOnTheScreen();
    expect(screen.queryByText('Lisboa, Portugal')).toBeNull();
    await fireEvent.press(screen.getByTestId('explore-cat-trails'));
    expect(screen.getByText('Chapada Diamantina')).toBeOnTheScreen();
    expect(screen.queryByText('Fernando de Noronha')).toBeNull();
    await fireEvent.press(screen.getByTestId('explore-cat-all'));
    expect(screen.getByText('Lisboa, Portugal')).toBeOnTheScreen();
  });

  it('toggles "Quero ir" on a place with a toast', async () => {
    await renderWithProviders(<ExploreScreen />);
    await fireEvent.press(screen.getByTestId('explore-wish-Noronha'));
    expect(useStore.getState().wishPlaces['Fernando de Noronha']).toBe(true);
    expect(screen.getByText('Noronha salvo em Quero ir.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Na lista: Noronha')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('explore-wish-Noronha'));
    expect(useStore.getState().wishPlaces['Fernando de Noronha']).toBe(false);
  });

  it('opens the city, country or a "coming soon" toast from a place card', async () => {
    await renderWithProviders(<ExploreScreen />);
    await fireEvent.press(screen.getByTestId('explore-place-Lisboa'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.city('Lisboa'));
    await fireEvent.press(screen.getByTestId('explore-place-Kyoto'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.country('392'));
    mockRouter.push.mockClear();
    await fireEvent.press(screen.getByTestId('explore-place-Noronha'));
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(screen.getByText('A página de Noronha chega em breve.')).toBeOnTheScreen();
  });

  it('turns on travel mode from the live card', async () => {
    await renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('Sua viagem começa hoje')).toBeOnTheScreen();
    expect(screen.getByText('Cusco e Machu Picchu')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('explore-live'));
    expect(useStore.getState().live).toMatchObject({ on: true, itineraryId: 'peru' });
    expect(mockRouter.push).toHaveBeenCalledWith(routes.live);
    expect(screen.getByText('Viajando agora')).toBeOnTheScreen();
    const { day } = useStore.getState().live;
    const label = useStore.getState().itineraries.find((it) => it.id === 'peru')?.days[
      day - 1
    ]?.label;
    expect(screen.getByText(`Dia ${day} de 4 · ${label}`)).toBeOnTheScreen();
  });

  it('opens live mode directly when it is already on', async () => {
    useStore.getState().startLive('peru');
    useStore.getState().setLiveDay(2);
    await renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('Dia 2 de 4 · Vale Sagrado')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('explore-live'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.live);
  });

  it('navigates from header, search, memory, popular and tours', async () => {
    await renderWithProviders(<ExploreScreen />);
    await fireEvent.press(screen.getByTestId('explore-notifs'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.notifs);
    await fireEvent.press(screen.getByTestId('explore-saved'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.saved);
    await fireEvent.press(screen.getByTestId('explore-avatar'));
    expect(mockRouter.navigate).toHaveBeenLastCalledWith(routes.profile);
    await fireEvent.press(screen.getByTestId('explore-search'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.search);
    await fireEvent.press(screen.getByTestId('explore-memory'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.trip('floripa'));
    await fireEvent.press(screen.getByTestId('explore-popular-620'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.country('620'));
    await fireEvent.press(screen.getByTestId('explore-tour-nata'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.passeio('nata'));
    await fireEvent.press(screen.getByTestId('explore-tours-all'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.passeios);
  });

  it('opens the add-trip sheet from the FAB', async () => {
    await renderWithProviders(<ExploreScreen />);
    await fireEvent.press(screen.getByTestId('explore-add'));
    expect(screen.getByTestId('add-trip-sheet')).toBeOnTheScreen();
  });

  it('hides the live and memory cards on first use', async () => {
    useStore.getState().setDemo('empty');
    await renderWithProviders(<ExploreScreen />);
    expect(screen.getByTestId('explore-screen')).toBeOnTheScreen();
    expect(screen.queryByTestId('explore-live')).toBeNull();
    expect(screen.queryByTestId('explore-memory')).toBeNull();
    expect(screen.getByLabelText('Notificações')).toBeOnTheScreen();
  });

  it('shows the error and loading demo states', async () => {
    useStore.getState().setDemo('error');
    await renderWithProviders(<ExploreScreen />);
    expect(screen.getByText('Algo deu errado do nosso lado')).toBeOnTheScreen();
    expect(screen.queryByTestId('explore-screen')).toBeNull();
    await fireEvent.press(screen.getByText('Tentar de novo'));
    expect(screen.getByTestId('explore-screen')).toBeOnTheScreen();
  });

  it('shows the loading skeleton', async () => {
    useStore.getState().setDemo('loading');
    await renderWithProviders(<ExploreScreen />);
    expect(screen.queryByTestId('explore-screen')).toBeNull();
  });
});
