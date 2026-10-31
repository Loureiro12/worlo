import { act, fireEvent, screen } from '@testing-library/react-native';
import { getItineraries } from '@/data/planning';
import { demoId } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { TripsScreen } from './TripsScreen';

const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe('TripsScreen', () => {
  it('lists past trips grouped by year and opens one', async () => {
    await renderWithProviders(<TripsScreen />);
    expect(screen.getByTestId('trips-screen')).toBeOnTheScreen();
    expect(screen.getByText('Suas viagens')).toBeOnTheScreen();
    for (const year of ['2025', '2024', '2023']) expect(screen.getByText(year)).toBeOnTheScreen();
    expect(screen.getByText('🇧🇷 Florianópolis, Brasil · 6 dias')).toBeOnTheScreen();
    expect(screen.getByText('12 – 17 jul 2025 · com Marina e João')).toBeOnTheScreen();
    expect(screen.getByText('18 – 25 mai 2023 · Viagem solo')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('trip-card-floripa'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip(demoId('trip:floripa')));
  });

  it('opens the add trip sheet from "+"', async () => {
    await renderWithProviders(<TripsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar viagem' }));
    expect(screen.getByText('Adicionar uma viagem')).toBeOnTheScreen();
  });

  it('shows the wishlist with best time and opens destinations', async () => {
    await renderWithProviders(<TripsScreen />);
    await fireEvent.press(screen.getByTestId('trips-seg-wish'));
    expect(screen.getByText('Japão')).toBeOnTheScreen();
    expect(screen.getAllByText('Melhor época: mar – mai')).toHaveLength(2); // Japão, Marrocos
    await fireEvent.press(screen.getByTestId('future-row-392'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.future(demoId('wish:392')));
    await fireEvent.press(screen.getByTestId('trips-add-destination'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.tripForm({ mode: 'new', kind: 'future' }));
  });

  it('shows itineraries with progress and creates a blank one', async () => {
    await renderWithProviders(<TripsScreen />);
    await fireEvent.press(screen.getByTestId('trips-seg-rot'));
    expect(screen.getByText('Cusco e Machu Picchu')).toBeOnTheScreen();
    const it = getItineraries()[0];
    const done = it?.days.filter((d) => d.items.length).length;
    expect(screen.getAllByText(`${done} de ${it?.days.length} dias`).length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByTestId('trips-recs'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.recs);

    const before = getItineraries().length;
    await fireEvent.press(screen.getByTestId('trips-create-rot'));
    const created = getItineraries()[0];
    expect(getItineraries()).toHaveLength(before + 1);
    expect(created).toMatchObject({ title: 'Novo roteiro', status: 'Rascunho' });
    expect(mockRouter.push).toHaveBeenCalledWith(routes.roteiro(created?.id ?? ''));
  });

  it('shows the empty state of each segment on first use', async () => {
    useStore.getState().setDemo('empty');
    await renderWithProviders(<TripsScreen />);
    expect(screen.getByText('Nenhuma viagem por aqui ainda')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Importar fotos da galeria' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.photos);
    await fireEvent.press(screen.getByTestId('trips-seg-wish'));
    expect(screen.getByText('Sua lista de desejos está vazia')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir o mapa' }));
    expect(mockRouter.navigate).toHaveBeenCalledWith(routes.map);
    await fireEvent.press(screen.getByTestId('trips-seg-rot'));
    expect(screen.getByText('Nenhum roteiro ainda')).toBeOnTheScreen();
    expect(screen.queryByText('Cusco e Machu Picchu')).not.toBeOnTheScreen();
  });

  it('applies the loading and error demo states', async () => {
    useStore.getState().setDemo('loading');
    await renderWithProviders(<TripsScreen />);
    expect(screen.queryByTestId('trips-screen')).not.toBeOnTheScreen();
    expect(screen.getByText('Carregando…')).toBeOnTheScreen();
    await act(() => useStore.getState().setDemo('error'));
    expect(screen.getByText('Algo deu errado do nosso lado')).toBeOnTheScreen();
  });
});
