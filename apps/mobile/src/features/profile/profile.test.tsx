import { fireEvent, screen } from '@testing-library/react-native';
import { repos } from '@/data/repositories';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { ProfileScreen } from './ProfileScreen';
import { countCities, formatNumber, worldPercent } from './stats';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

// The animated globe (RAF loop) is covered in @worlo/ui; here it only needs to mount.
jest.mock('@worlo/ui', () => ({ ...jest.requireActual('@worlo/ui'), Globe: () => null }));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe('worldPercent', () => {
  it('formats visited / 195 with one decimal in the app language', () => {
    expect(worldPercent(6, 'pt-BR')).toBe('3,1%');
    expect(worldPercent(6, 'en')).toBe('3.1%');
    expect(worldPercent(0, 'pt-BR')).toBe('0,0%');
    expect(worldPercent(195, 'pt-BR')).toBe('100,0%');
    expect(formatNumber(1284, 'pt-BR')).toBe('1.284');
  });
});

describe('ProfileScreen', () => {
  it('shows the header, world percent and the 2×2 stats from the database', async () => {
    await renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('profile-screen')).toBeOnTheScreen();
    expect(screen.getByText('Ana Ribeiro')).toBeOnTheScreen();
    expect(screen.getByText('@anaviaja · São Paulo')).toBeOnTheScreen();
    const visited = Object.keys(repos.world.visitedMap()).length;
    expect(screen.getByTestId('profile-world-percent')).toHaveTextContent(
      worldPercent(visited, 'pt-BR'),
    );
    expect(screen.getByText(`${visited} de 195 países`)).toBeOnTheScreen();
    expect(screen.getByTestId('profile-stat-countries')).toHaveTextContent(`${visited}países`);
    const trips = repos.trips.list();
    expect(screen.getByTestId('profile-stat-trips')).toHaveTextContent(`${trips.length}viagens`);
    const places = trips.reduce((sum, trip) => sum + trip.places, 0);
    expect(screen.getByTestId('profile-stat-places')).toHaveTextContent(`${places}lugares`);
    const cities = countCities(trips);
    expect(screen.getByTestId('profile-stat-cities')).toHaveTextContent(`${cities}cidades`);
  });

  it('shows the edited profile', async () => {
    repos.profile.update({ name: 'Bia Souza', username: 'bia', city: '' });
    await renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Bia Souza');
    expect(screen.getByText('@bia')).toBeOnTheScreen();
  });

  it('updates the percent from the visited countries', async () => {
    for (const iso of Object.keys(repos.world.visitedMap())) repos.world.toggleVisited(iso);
    repos.world.markVisited('076', '2020');
    await renderWithProviders(<ProfileScreen />);
    expect(screen.getByTestId('profile-world-percent')).toHaveTextContent('0,5%');
    expect(screen.getByText('1 de 195 países')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-stat-countries')).toHaveTextContent('1país');
  });

  it('shares an unlocked achievement and shows progress for a locked one', async () => {
    await renderWithProviders(<ProfileScreen />);
    // The demo account has trips: "Primeira viagem" is unlocked.
    await fireEvent.press(screen.getByTestId('achievement-firstTrip'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.share('ach', { ach: 'firstTrip' }));

    await fireEvent.press(screen.getByTestId('achievement-experienceExplorer'));
    expect(screen.getByRole('alert')).toHaveTextContent('Explorador de experiências: faltam 20.');
  });

  it('navigates from the header buttons, cards and rows', async () => {
    await renderWithProviders(<ProfileScreen />);
    const cases = [
      ['profile-view-public', routes.traveler('me')],
      ['profile-share', routes.share('year')],
      ['profile-saved', routes.saved],
      ['profile-collections', routes.collections],
      ['profile-photos', routes.photos],
      ['profile-settings', routes.settings],
      ['profile-welcome', routes.welcome],
    ] as const;
    for (const [id, target] of cases) {
      await fireEvent.press(screen.getByTestId(id));
      expect(mockRouter.push).toHaveBeenLastCalledWith(target);
    }
  });

  it('changes the privacy level and its explanation', async () => {
    await renderWithProviders(<ProfileScreen />);
    expect(
      screen.getByText(
        'Quem você segue de volta vê seu mapa e viagens. Gastos ficam sempre privados.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Privado' }));
    expect(repos.profile.get()?.privacy).toBe('private');
    expect(screen.getByText('Só você vê suas viagens, fotos e mapa.')).toBeOnTheScreen();
  });

  it('shows the first-use state when the demo is empty', async () => {
    useStore.setState({ demo: 'empty' });
    await renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('Seu mundo começa aqui')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-world-percent')).toHaveTextContent('0,0%');
    expect(screen.queryByTestId('profile-stat-countries')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Marcar países' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.onboardingMap);
  });

  it('applies the loading and error demo states', async () => {
    useStore.setState({ demo: 'loading' });
    const { unmount } = await renderWithProviders(<ProfileScreen />);
    expect(screen.queryByTestId('profile-screen')).toBeNull();
    expect(screen.getByText('Carregando…')).toBeOnTheScreen();
    await unmount();

    useStore.setState({ demo: 'error' });
    await renderWithProviders(<ProfileScreen />);
    expect(screen.getByText('Algo deu errado do nosso lado')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(useStore.getState().demo).toBe('normal');
  });
});
