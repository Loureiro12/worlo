import { fireEvent, screen } from '@testing-library/react-native';
import { getCatalog } from '@/data/catalog';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { RecsScreen } from './RecsScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

const RECS = () => getCatalog().RECS;

describe('RecsScreen', () => {
  it('lists every recommendation with days, author, rating and saves', async () => {
    await renderWithProviders(<RecsScreen />);
    expect(screen.getByText('Roteiros recomendados')).toBeOnTheScreen();
    for (const r of RECS()) expect(screen.getByTestId(`recs-card-${r.id}`)).toBeOnTheScreen();
    expect(screen.getByText('Lisboa em 4 dias, sem correr')).toBeOnTheScreen();
    expect(screen.getAllByText('4 dias').length).toBeGreaterThan(0);
    expect(screen.getByText('· 2,3 mil')).toBeOnTheScreen();
  });

  it('filters by region', async () => {
    await renderWithProviders(<RecsScreen />);
    await fireEvent.press(screen.getByTestId('recs-filter-asia'));
    expect(screen.getByTestId('recs-card-rec-kyoto')).toBeOnTheScreen();
    expect(screen.queryByTestId('recs-card-rec-lisboa')).toBeNull();
    await fireEvent.press(screen.getByTestId('recs-filter-europe'));
    expect(screen.getByTestId('recs-card-rec-lisboa')).toBeOnTheScreen();
    expect(screen.queryByTestId('recs-card-rec-kyoto')).toBeNull();
    const southAmerica = RECS().filter((r) => r.region === 'América do Sul');
    await fireEvent.press(screen.getByTestId('recs-filter-southAmerica'));
    for (const r of southAmerica) expect(screen.getByTestId(`recs-card-${r.id}`)).toBeOnTheScreen();
  });

  it('opens a recommendation in preview mode', async () => {
    await renderWithProviders(<RecsScreen />);
    await fireEvent.press(screen.getByTestId('recs-card-rec-lisboa'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/roteiro/[id]',
      params: { id: 'rec-lisboa', mode: 'rec' },
    });
  });
});
