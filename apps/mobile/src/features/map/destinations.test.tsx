import { fireEvent, screen } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { CityScreen } from './CityScreen';
import { CountryScreen } from './CountryScreen';
import { PlaceScreen } from './PlaceScreen';
import { RegionScreen } from './RegionScreen';

const mockRouter = { push: jest.fn(), back: jest.fn(), navigate: jest.fn(), replace: jest.fn() };
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

describe('CountryScreen', () => {
  it('renders Portugal with facts, tooltip, regions and cities', async () => {
    mockParams = { id: '620' };
    await renderWithProviders(<CountryScreen />);
    expect(screen.getByText('Europa')).toBeOnTheScreen();
    expect(screen.getAllByText('Portugal').length).toBeGreaterThan(0);
    expect(screen.getByText('Você já esteve aqui')).toBeOnTheScreen();
    expect(screen.getByText('Católica (~80%)')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sobre a estimativa' }));
    expect(
      screen.getByText('Estimativa a partir de censos recentes. Pode variar por região.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('country-region-Lisboa e Vale do Tejo'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.region('Lisboa e Vale do Tejo'));

    await fireEvent.press(screen.getByTestId('country-city-Lisboa'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.city('Lisboa'));

    await fireEvent.press(screen.getByTestId('country-city-Porto'));
    expect(screen.getByRole('alert')).toHaveTextContent('A página de Porto chega em breve.');
    expect(screen.getByText(/Turismo de Portugal/)).toBeOnTheScreen();
  });

  it('renders Japão with the wishlist status', async () => {
    mockParams = { id: '392' };
    await renderWithProviders(<CountryScreen />);
    expect(screen.getByText('Ásia')).toBeOnTheScreen();
    expect(screen.getByText('Na sua lista Quero ir')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('country-region-Kanto'));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('renders a minimal page for countries without a page', async () => {
    mockParams = { id: '250' };
    await renderWithProviders(<CountryScreen />);
    expect(screen.getAllByText('França').length).toBeGreaterThan(0);
    expect(screen.getByText('Paris')).toBeOnTheScreen();
    expect(screen.queryByText('Regiões mais visitadas')).toBeNull();
  });
});

describe('RegionScreen', () => {
  it('renders the region with cities and highlights', async () => {
    mockParams = { id: 'Lisboa e Vale do Tejo' };
    await renderWithProviders(<RegionScreen />);
    expect(screen.getByText('Cidades da região')).toBeOnTheScreen();
    expect(screen.getByText('Palácio da Pena')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('region-city-Lisboa'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.city('Lisboa'));
    await fireEvent.press(screen.getByTestId('region-crumb-country'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.country('620'));
  });

  it('renders a minimal page for unknown regions', async () => {
    mockParams = { id: 'Algarve' };
    await renderWithProviders(<RegionScreen />);
    expect(screen.getByText('Ainda estamos montando o guia de Algarve.')).toBeOnTheScreen();
    expect(screen.queryByText('Cidades da região')).toBeNull();
  });
});

describe('CityScreen', () => {
  beforeEach(() => {
    mockParams = { id: 'Lisboa' };
  });

  it('switches categories and opens a place', async () => {
    await renderWithProviders(<CityScreen />);
    expect(screen.getByText('Miradouro da Senhora do Monte')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('city-tab-food'));
    expect(screen.getByText('Pastéis de Belém')).toBeOnTheScreen();
    expect(screen.queryByText('Miradouro da Senhora do Monte')).toBeNull();
    await fireEvent.press(screen.getByTestId('city-item-Pastéis de Belém'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.place('Pastéis de Belém'));
  });

  it('saves and removes a place with toasts', async () => {
    await renderWithProviders(<CityScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar Torre de Belém' }));
    expect(useStore.getState().saved[0]).toMatchObject({
      id: 'ci-Torre de Belém',
      cat: 'Atrações',
      city: 'Lisboa',
      meta: 'Monumento',
      rating: '4,6',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Salvo nos seus lugares.');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Remover Torre de Belém dos salvos' }),
    );
    expect(useStore.getState().saved.some((s) => s.id === 'ci-Torre de Belém')).toBe(false);
    expect(screen.getByRole('alert')).toHaveTextContent('Removido dos salvos.');
  });

  it('long-press saves and opens the collection sheet', async () => {
    await renderWithProviders(<CityScreen />);
    await fireEvent(screen.getByTestId('city-item-Torre de Belém'), 'longPress');
    expect(useStore.getState().saved.some((s) => s.id === 'ci-Torre de Belém')).toBe(true);
    expect(screen.getByTestId('collection-sheet')).toBeOnTheScreen();
  });

  it('shows the community tip, breadcrumb links and the itinerary CTA', async () => {
    await renderWithProviders(<CityScreen />);
    expect(screen.getByText('Dica da comunidade')).toBeOnTheScreen();
    expect(screen.getByText(/96% confirmam/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('city-crumb-region'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.region('Lisboa e Vale do Tejo'));
    await fireEvent.press(screen.getByTestId('city-add-itinerary'));
    expect(screen.getByRole('alert')).toHaveTextContent('Lisboa entrou no seu roteiro.');
  });
});

describe('PlaceScreen', () => {
  it('renders the Miradouro with info, tips and tours', async () => {
    mockParams = { id: 'Miradouro da Senhora do Monte' };
    await renderWithProviders(<PlaceScreen />);
    expect(screen.getByLabelText('Horário: Aberto 24h')).toBeOnTheScreen();
    expect(screen.getByText('Dicas de quem foi')).toBeOnTheScreen();
    expect(screen.getByText('96% confirmam')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('place-tours'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.passeio('tejo'));
  });

  it('toggles saved from the bottom bar and the hero button', async () => {
    mockParams = { id: 'Miradouro da Senhora do Monte' };
    await renderWithProviders(<PlaceScreen />);
    // Already in the SAVED mock.
    expect(screen.getByTestId('place-save')).toHaveTextContent('Salvo');
    await fireEvent.press(screen.getByTestId('place-save'));
    expect(useStore.getState().isSaved('ci-Miradouro da Senhora do Monte')).toBe(false);
    expect(screen.getByRole('alert')).toHaveTextContent('Removido dos salvos.');
    expect(screen.getByTestId('place-save')).toHaveTextContent('Salvar');
    await fireEvent.press(screen.getByTestId('place-save-top'));
    expect(useStore.getState().isSaved('ci-Miradouro da Senhora do Monte')).toBe(true);
    expect(screen.getByRole('alert')).toHaveTextContent('Salvo nos seus lugares.');
  });

  it('adds the place to the first itinerary', async () => {
    mockParams = { id: 'Miradouro da Senhora do Monte' };
    await renderWithProviders(<PlaceScreen />);
    await fireEvent.press(screen.getByTestId('place-add-itinerary'));
    const it = useStore.getState().itineraries[0];
    expect(it?.days.at(-1)?.items.at(-1)?.title).toBe('Miradouro da Senhora do Monte');
    expect(screen.getByRole('alert')).toHaveTextContent(
      `Miradouro da Senhora do Monte entrou em “${it?.title}”.`,
    );
  });

  it('builds a generic page from the city row', async () => {
    mockParams = { id: 'Torre de Belém' };
    await renderWithProviders(<PlaceScreen />);
    expect(screen.getByLabelText('Preço: € 8')).toBeOnTheScreen();
    expect(screen.getByLabelText('Horário: 10h–18h')).toBeOnTheScreen();
    expect(screen.getByText(/é um dos lugares mais lembrados/)).toBeOnTheScreen();
  });
});
