import { fireEvent, screen } from '@testing-library/react-native';
import type { SavedItemRow } from '@worlo/db';
import { getItineraries } from '@/data/planning';
import { repos } from '@/data/repositories';
import { isSaved, toSavedItem } from '@/data/saved';
import { resetCommunityServer } from '@/features/community/testServer';
import { demoId } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { resetStore } from '@/store';
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

// Place / city tips come from the community feed (online): the demo-world fake.
jest.mock('@/data/communityApi', () => require('@/features/community/testServer').mockModule());

beforeEach(() => {
  resetStore();
  resetCommunityServer();
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
    expect(mockRouter.push).toHaveBeenCalledWith(routes.region('Lisboa e Vale do Tejo', '620'));

    await fireEvent.press(screen.getByTestId('country-city-Lisboa'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.city('Lisboa'));

    await fireEvent.press(screen.getByTestId('country-city-Porto'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.city('Porto'));
    expect(screen.getByText(/Turismo de Portugal/)).toBeOnTheScreen();
  });

  it('renders Japão and opens a region without a guide on its own page', async () => {
    mockParams = { id: '392' };
    await renderWithProviders(<CountryScreen />);
    expect(screen.getByText('Ásia')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('country-region-Kanto'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.region('Kanto', '392'));
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
    expect(toSavedItem(repos.saved.items()[0] as SavedItemRow)).toMatchObject({
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
    expect(isSaved('ci-Torre de Belém')).toBe(false);
    expect(screen.getByRole('alert')).toHaveTextContent('Removido dos salvos.');
  });

  it('long-press saves and opens the collection sheet', async () => {
    await renderWithProviders(<CityScreen />);
    await fireEvent(screen.getByTestId('city-item-Torre de Belém'), 'longPress');
    expect(isSaved('ci-Torre de Belém')).toBe(true);
    expect(screen.getByTestId('collection-sheet')).toBeOnTheScreen();
  });

  it('shows the community tip, breadcrumb links and adds experiences (not the city)', async () => {
    await renderWithProviders(<CityScreen />);
    expect(await screen.findByText('Dica da comunidade')).toBeOnTheScreen();
    // Marina's Lisboa tip (seeds: 7 confirm, 1 disputes).
    expect(screen.getByTestId('city-tip')).toHaveTextContent(/Em verificação · 88% confirmam/);
    await fireEvent.press(screen.getByTestId('city-tip'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.post(demoId('post:p1')));
    await fireEvent.press(screen.getByTestId('city-crumb-region'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.region('Lisboa e Vale do Tejo'));
    expect(screen.queryByTestId('city-add-itinerary')).toBeNull();

    const button = screen.getAllByTestId(/^city-add-/)[0];
    const name = String(button?.props.testID).replace('city-add-', '');
    await fireEvent.press(screen.getByTestId(`city-add-${name}`));
    const itinerary = getItineraries()[0];
    expect(screen.getByRole('alert')).toHaveTextContent(`${name} entrou em “${itinerary?.title}”.`);
    // The experience is the stop; Lisboa is where it happens.
    expect(getItineraries()[0]?.days.at(-1)?.items.at(-1)).toMatchObject({
      title: name,
      note: 'Lisboa',
    });

    // Not twice.
    const stops = getItineraries()[0]?.days.flatMap((d) => d.items).length;
    await fireEvent.press(screen.getByTestId(`city-add-${name}`));
    expect(screen.getByRole('alert')).toHaveTextContent(
      `${name} já está em “${itinerary?.title}”.`,
    );
    expect(getItineraries()[0]?.days.flatMap((d) => d.items).length).toBe(stops);
  });
});

describe('PlaceScreen', () => {
  it('renders the Miradouro with info, tips and tours', async () => {
    mockParams = { id: 'Miradouro da Senhora do Monte' };
    await renderWithProviders(<PlaceScreen />);
    expect(screen.getByLabelText('Horário: Aberto 24h')).toBeOnTheScreen();
    expect(await screen.findByText('Dicas de quem foi')).toBeOnTheScreen();
    // The Miradouro tips (Marina, Caio) have no votes yet in the seeds.
    expect(screen.getAllByText('Aguardando confirmações')).toHaveLength(2);
    await fireEvent.press(screen.getByTestId(`place-tip-${demoId('tip:0')}`));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.post(demoId('tip:0')));
    await fireEvent.press(screen.getByTestId('place-tours'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.passeio('tejo'));
  });

  it('toggles saved from the bottom bar and the hero button', async () => {
    mockParams = { id: 'Miradouro da Senhora do Monte' };
    await renderWithProviders(<PlaceScreen />);
    // Already in the SAVED mock.
    expect(screen.getByTestId('place-save')).toHaveTextContent('Salvo');
    await fireEvent.press(screen.getByTestId('place-save'));
    expect(isSaved('ci-Miradouro da Senhora do Monte')).toBe(false);
    expect(screen.getByRole('alert')).toHaveTextContent('Removido dos salvos.');
    expect(screen.getByTestId('place-save')).toHaveTextContent('Salvar');
    await fireEvent.press(screen.getByTestId('place-save-top'));
    expect(isSaved('ci-Miradouro da Senhora do Monte')).toBe(true);
    expect(screen.getByRole('alert')).toHaveTextContent('Salvo nos seus lugares.');
  });

  it('adds the place to the first itinerary', async () => {
    mockParams = { id: 'Miradouro da Senhora do Monte' };
    await renderWithProviders(<PlaceScreen />);
    await fireEvent.press(screen.getByTestId('place-add-itinerary'));
    const it = getItineraries()[0];
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
