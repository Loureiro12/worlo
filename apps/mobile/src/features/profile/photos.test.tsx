import { act, fireEvent, screen } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { IMPORT, PhotosScreen } from './PhotosScreen';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

const tick = (n = 1) => act(() => jest.advanceTimersByTime(IMPORT.stepMs * n));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const tripPhotos = () => useStore.getState().trips.reduce((sum, t) => sum + t.photos, 0);

describe('PhotosScreen', () => {
  it('shows the summary and the idle card', async () => {
    await renderWithProviders(<PhotosScreen />);
    expect(screen.getByTestId('photos-screen')).toBeOnTheScreen();
    const trips = useStore.getState().trips.length;
    expect(screen.getByText(`${tripPhotos()} fotos em ${trips} viagens`)).toBeOnTheScreen();
    expect(screen.getByTestId('photos-import-idle')).toBeOnTheScreen();
  });

  it('runs the import (+6% every 140ms) until done, then shows the loose photos', async () => {
    await renderWithProviders(<PhotosScreen />);
    await fireEvent.press(screen.getByTestId('photos-start'));
    expect(screen.getByText('Importando · 0%')).toBeOnTheScreen();
    await tick();
    expect(screen.getByText('Importando · 6%')).toBeOnTheScreen();
    expect(screen.getByText('Organizando 9 de 146 fotos…')).toBeOnTheScreen();
    await tick(16);
    expect(screen.getByTestId('photos-import-done')).toBeOnTheScreen();
    expect(
      screen.getByText('146 fotos novas: 123 já estão nas viagens, 23 ficaram sem viagem.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('Importação concluída.');
    expect(screen.getByTestId('photos-loose')).toBeOnTheScreen();
    expect(screen.getByTestId('photos-trip-floripa')).toHaveTextContent(/165 fotos/);
  });

  it('fails at 85 of 146 when the connection drops, then resumes from there', async () => {
    useStore.setState({ demo: 'offline' });
    await renderWithProviders(<PhotosScreen />);
    await fireEvent.press(screen.getByTestId('photos-start'));
    await tick(10);
    expect(screen.getByTestId('photos-import-failed')).toBeOnTheScreen();
    expect(
      screen.getByText('85 de 146 fotos foram enviadas. O resto ficou guardado no aparelho.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('O envio parou. A conexão caiu.');

    await fireEvent.press(screen.getByRole('button', { name: 'Continuar envio' }));
    expect(screen.getByText('Importando · 58%')).toBeOnTheScreen();
    await tick(7);
    expect(screen.getByTestId('photos-import-done')).toBeOnTheScreen();
  });

  it('clears the interval on unmount', async () => {
    const setSpy = jest.spyOn(globalThis, 'setInterval');
    const clearSpy = jest.spyOn(globalThis, 'clearInterval');
    const { unmount } = await renderWithProviders(<PhotosScreen />);
    await fireEvent.press(screen.getByTestId('photos-start'));
    const id = setSpy.mock.results.at(-1)?.value;
    await unmount();
    expect(clearSpy).toHaveBeenCalledWith(id);
  });

  it('links the loose photos to a trip from the sheet', async () => {
    await renderWithProviders(<PhotosScreen />);
    await fireEvent.press(screen.getByTestId('photos-start'));
    await tick(17);
    await fireEvent.press(screen.getByTestId('photos-assign'));
    expect(screen.getByText('Associar 23 fotos')).toBeOnTheScreen();
    expect(screen.getByText('Mesma data')).toBeOnTheScreen();
    const before = useStore.getState().trips.find((t) => t.id === 'patagonia')?.photos ?? 0;
    await fireEvent.press(screen.getByTestId('photos-assign-patagonia'));
    expect(useStore.getState().trips.find((t) => t.id === 'patagonia')?.photos).toBe(before + 23);
    expect(screen.getByRole('alert')).toHaveTextContent(/^23 fotos foram pra /);
    expect(screen.queryByTestId('photos-loose')).toBeNull();
  });

  it('toggles "Organizar por localização" and opens a trip', async () => {
    await renderWithProviders(<PhotosScreen />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Organizar por localização' }));
    expect(useStore.getState().autoOrganizePhotos).toBe(false);
    await fireEvent.press(screen.getByTestId('photos-trip-floripa'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip('floripa'));
  });
});
