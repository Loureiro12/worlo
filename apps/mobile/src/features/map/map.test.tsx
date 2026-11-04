import { fireEvent, screen, within } from '@testing-library/react-native';
import { createLocalStore } from '@worlo/db';
import { repos } from '@/data/repositories';
import { db } from '@/lib/database';
import { DEFAULT_VISITED } from '@/mocks/data.generated';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { CountrySummaryPanel } from './CountrySummaryPanel';
import { MapScreen, mapLayers } from './MapScreen';

const mockRouter = { push: jest.fn(), back: jest.fn(), navigate: jest.fn(), replace: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

const wish = ['392', '352'];

describe('mapLayers', () => {
  it('shows every layer by default', () => {
    const l = mapLayers(DEFAULT_VISITED, wish, 'all', 'all', ['604']);
    expect(l.visited).toHaveLength(Object.keys(DEFAULT_VISITED).length);
    expect(l.wishlist).toEqual(wish);
    expect(l.planned).toEqual(['604']);
  });

  it('filters by segment', () => {
    expect(mapLayers(DEFAULT_VISITED, wish, 'visited', 'all')).toMatchObject({
      wishlist: [],
      planned: [],
    });
    expect(mapLayers(DEFAULT_VISITED, wish, 'wishlist', 'all')).toMatchObject({
      visited: [],
      planned: [],
      wishlist: wish,
    });
  });

  it('filters visited countries by year and hides the other layers', () => {
    const l = mapLayers(DEFAULT_VISITED, wish, 'all', '2023');
    expect(l.visited.sort()).toEqual(['250', '380']);
    expect(l.wishlist).toEqual([]);
    expect(l.planned).toEqual([]);
  });
});

describe('MapScreen', () => {
  it('renders the header stats, filters, year chips and legend', async () => {
    await renderWithProviders(<MapScreen />);
    expect(screen.getByTestId('map-screen')).toBeOnTheScreen();
    expect(screen.getByText('Seu mapa')).toBeOnTheScreen();
    const trips = repos.trips.list().length;
    expect(screen.getByTestId('map-stats')).toHaveTextContent(
      new RegExp(`^6 países · \\d+ cidades · ${trips} viagens$`),
    );
    expect(screen.getByRole('tab', { name: 'Visitados' })).toBeOnTheScreen();
    for (const y of ['Todos os anos', '2025', '2024', '2023', '2022', '2019']) {
      expect(screen.getByRole('button', { name: y })).toBeOnTheScreen();
    }
    expect(screen.getByTestId('map-legend')).toBeOnTheScreen();
    expect(
      screen.getByText('Aproxime para ver cidades e fotos. Toque num país para abrir.'),
    ).toBeOnTheScreen();
  });

  it('summarises the visible layers in the globe label and updates it with filters', async () => {
    await renderWithProviders(<MapScreen />);
    const wishCount = repos.world.wishes().filter((w) => w.countryIso).length;
    const planned = new Set(repos.planning.itineraries().map((it) => it.flag)).size;
    expect(
      screen.getByLabelText(
        `Globo do seu mapa. Visitados: 6. Quero ir: ${wishCount}. Em planejamento: ${planned}.`,
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Quero ir' }));
    expect(
      screen.getByLabelText(
        new RegExp(`Visitados: 0\\. Quero ir: ${wishCount}\\. Em planejamento: 0\\.`),
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Quero ir' })).toBeSelected();

    await fireEvent.press(screen.getByRole('tab', { name: 'Tudo' }));
    await fireEvent.press(screen.getByRole('button', { name: '2024' }));
    expect(
      screen.getByLabelText(/Visitados: 3\. Quero ir: 0\. Em planejamento: 0\./),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '2024' })).toBeSelected();
  });

  it('wires the share control to the share screen', async () => {
    await renderWithProviders(<MapScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Compartilhar mapa' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.share('map'));
    // Zoom / recenter don't crash without animation.
    await fireEvent.press(screen.getByRole('button', { name: 'Aproximar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Afastar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Recentralizar' }));
  });

  it('opens the country summary from the accessible country list and the country page', async () => {
    await renderWithProviders(<MapScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Lista de países' }));
    await fireEvent.press(screen.getByTestId('map-country-620'));

    const sheet = screen.getByTestId('map-country-sheet');
    expect(within(sheet).getByText('Portugal')).toBeOnTheScreen();
    expect(within(sheet).getByText('Lisboa')).toBeOnTheScreen();
    expect(screen.queryByTestId('map-legend')).toBeNull();

    await fireEvent.press(screen.getByTestId('map-country-page'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.country('620'));

    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByTestId('map-country-sheet')).toBeNull();
    expect(useStore.getState().mapSelection).toBeNull();
  });

  it('shows the empty card and its actions in the empty demo state', async () => {
    useStore.setState({ demo: 'empty' });
    await renderWithProviders(<MapScreen />);
    expect(screen.getByText('Seu mapa está apagado')).toBeOnTheScreen();
    expect(screen.getByTestId('map-stats')).toHaveTextContent('0 países · 0 cidades · 0 viagens');
    await fireEvent.press(screen.getByRole('button', { name: 'Marcar países' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.onboardingMap);
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar viagem' }));
    expect(screen.getByTestId('add-trip-sheet')).toBeOnTheScreen();
  });

  it('shows the dark error state', async () => {
    useStore.setState({ demo: 'error' });
    await renderWithProviders(<MapScreen />);
    expect(screen.getByText('Algo deu errado do nosso lado')).toBeOnTheScreen();
    expect(screen.queryByTestId('map-screen')).toBeNull();
  });
});

describe('CountrySummaryPanel', () => {
  const render = (id: string) =>
    renderWithProviders(<CountrySummaryPanel id={id} onClose={jest.fn()} onOpenPage={jest.fn()} />);

  it('shows facts, history and status for a visited country', async () => {
    await render('620');
    expect(screen.getByLabelText('Capital: Lisboa')).toBeOnTheScreen();
    expect(screen.getByTestId('map-country-status')).toHaveProp('accessibilityLabel', 'Visitado');
    expect(screen.getByRole('switch', { name: 'Visitado' })).toBeChecked();
    expect(screen.getByTestId('map-country-page')).toBeOnTheScreen();
  });

  it('toggles "Quero ir" with a toast and back', async () => {
    useStore.getState().rememberCountryName('724', 'Spain');
    await render('724');
    expect(screen.getByText('Ainda não está no seu mapa')).toBeOnTheScreen();
    expect(screen.queryByTestId('map-country-page')).toBeNull();

    await fireEvent.press(screen.getByRole('switch', { name: 'Quero ir' }));
    expect(repos.world.wishes().find((w) => w.countryIso === '724')).toMatchObject({
      name: 'Spain',
    });
    const pending = await createLocalStore(db).pendingMutations(100);
    expect(pending.map((m) => m.table)).toEqual(['wish_destinations']);
    expect(screen.getByRole('alert')).toHaveTextContent(/foi pra sua lista\.$/);
    expect(screen.getByRole('switch', { name: 'Na lista' })).toBeChecked();
    expect(screen.getByText('Na sua lista de futuros destinos')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('switch', { name: 'Na lista' }));
    expect(repos.world.wishes().some((w) => w.countryIso === '724')).toBe(false);
  });

  it('toggles "Já fui" with the visited toast', async () => {
    await render('392');
    await fireEvent.press(screen.getByRole('switch', { name: 'Já fui' }));
    expect(repos.world.visitedMap()['392']).toEqual([String(new Date().getFullYear())]);
    expect(screen.getByRole('alert')).toHaveTextContent('Viagem salva no seu mapa.');
    expect(screen.getByRole('switch', { name: 'Visitado' })).toBeChecked();

    await fireEvent.press(screen.getByRole('switch', { name: 'Visitado' }));
    expect(repos.world.visitedMap()['392']).toBeUndefined();
  });

  it('shows the planned status for a country in my itineraries, and only then', async () => {
    await render('604');
    expect(screen.getByTestId('map-country-status')).toHaveProp(
      'accessibilityLabel',
      'Em planejamento',
    );
    for (const it of repos.planning.itineraries()) repos.planning.remove(it.id);
    await render('604');
    expect(screen.getByTestId('map-country-status')).not.toHaveProp(
      'accessibilityLabel',
      'Em planejamento',
    );
  });
});
