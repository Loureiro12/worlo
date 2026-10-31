import { fireEvent, screen, within } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { SearchScreen } from './SearchScreen';
import { buildSearchIndex, searchItems } from './searchIndex';

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

const type = async (text: string) => {
  await fireEvent.changeText(screen.getByTestId('search-input'), text);
};

describe('searchItems', () => {
  const s = useStore.getState();
  const index = buildSearchIndex({
    sub: (key, vars) => `${key} ${Object.values(vars ?? {}).join(' ')}`,
    visitedMap: s.visitedMap,
    itineraries: s.itineraries,
    trips: s.trips,
  });

  it('matches without accents and requires every word', () => {
    expect(searchItems(index, 'japao').map((i) => i.title)).toContain('Japão');
    expect(searchItems(index, 'veleiro tejo').map((i) => i.title)).toEqual([
      'Pôr do sol de veleiro no Tejo',
    ]);
    expect(searchItems(index, 'veleiro paris')).toEqual([]);
    expect(searchItems(index, '   ')).toEqual([]);
  });

  it('ranks title prefixes first', () => {
    expect(searchItems(index, 'lisboa')[0]?.title.startsWith('Lisboa')).toBe(true);
  });
});

describe('SearchScreen', () => {
  it('shows recent searches and trending terms without a query', async () => {
    await renderWithProviders(<SearchScreen />);
    expect(screen.getByTestId('search-screen')).toBeOnTheScreen();
    expect(screen.getByText('Buscas recentes')).toBeOnTheScreen();
    for (const q of ['Lisboa', 'Kyoto', 'veleiro']) expect(screen.getByText(q)).toBeOnTheScreen();
    expect(screen.getByText('Em alta no Worlo')).toBeOnTheScreen();
    expect(screen.getByText('pastel de nata')).toBeOnTheScreen();
  });

  it('clears recent searches', async () => {
    await renderWithProviders(<SearchScreen />);
    await fireEvent.press(screen.getByTestId('search-recent-clear'));
    expect(useStore.getState().recentSearches).toEqual([]);
    expect(screen.queryByText('Buscas recentes')).toBeNull();
  });

  it('fills the query from a recent or trending search', async () => {
    await renderWithProviders(<SearchScreen />);
    await fireEvent.press(screen.getByTestId('search-trending-0'));
    expect(screen.getByTestId('search-input').props.value).toBe('Japão');
    expect(screen.getByTestId('search-group-dest')).toBeOnTheScreen();
  });

  it('groups results with counts and opens a result, saving the search', async () => {
    await renderWithProviders(<SearchScreen />);
    await type('japao');
    expect(screen.getByText(/^Destinos · \d+$/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Tudo, \d+$/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('search-result-country-392'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.country('392'));
    expect(useStore.getState().recentSearches[0]).toBe('japao');
  });

  it('shows at most 4 per group in "Tudo" and all of them in a category', async () => {
    await renderWithProviders(<SearchScreen />);
    await type('lisboa');
    const group = screen.getByTestId('search-group-place');
    expect(within(group).getAllByRole('button')).toHaveLength(4);
    await fireEvent.press(screen.getByTestId('search-chip-place'));
    expect(screen.queryByTestId('search-group-dest')).toBeNull();
    expect(
      within(screen.getByTestId('search-group-place')).getAllByRole('button').length,
    ).toBeGreaterThan(4);
  });

  it('filters people and opens a traveler profile', async () => {
    await renderWithProviders(<SearchScreen />);
    await type('marina');
    await fireEvent.press(screen.getByTestId('search-chip-people'));
    expect(screen.queryByTestId('search-group-rot')).toBeNull();
    await fireEvent.press(screen.getByTestId('search-result-person-Marina Costa'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.traveler('Marina Costa'));
  });

  it('finds tours and itineraries', async () => {
    await renderWithProviders(<SearchScreen />);
    await type('veleiro');
    await fireEvent.press(screen.getByTestId('search-result-tour-tejo'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.passeio('tejo'));
    await type('machu picchu');
    await fireEvent.press(screen.getByTestId('search-result-rot-peru'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.roteiro('peru', 'mine'));
  });

  it('Enter saves the search and opens the only result', async () => {
    await renderWithProviders(<SearchScreen />);
    await type('veleiro tejo');
    await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
    expect(useStore.getState().recentSearches[0]).toBe('veleiro tejo');
    expect(mockRouter.push).toHaveBeenCalledWith(routes.passeio('tejo'));
  });

  it('shows the no-result card and asks the community', async () => {
    await renderWithProviders(<SearchScreen />);
    await type('xyzabc');
    expect(screen.getByText('Nada encontrado pra “xyzabc”.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('search-ask'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.compose({ type: 'Pergunta' }));
  });

  it('clears the query and goes back', async () => {
    await renderWithProviders(<SearchScreen />);
    await type('lisboa');
    await fireEvent.press(screen.getByLabelText('Limpar'));
    expect(screen.getByText('Em alta no Worlo')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('search-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('is blocked offline', async () => {
    useStore.getState().setDemo('offline');
    await renderWithProviders(<SearchScreen />);
    expect(screen.getByText('Você está sem internet')).toBeOnTheScreen();
    expect(screen.queryByTestId('search-screen')).toBeNull();
  });
});
