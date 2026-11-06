import { fireEvent, screen } from '@testing-library/react-native';
import { createLocalStore } from '@worlo/db';
import { repos } from '@/data/repositories';
import { savedLabel } from '@/data/world';
import { db } from '@/lib/database';
import { demoId } from '@/mocks/demo';
import { userId } from '@/mocks/demoWorld';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { seedDatabase } from '@/test/seed';
import { renderWithProviders } from '@/test-utils';
import { TripFormScreen } from './TripFormScreen';

const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: () => true,
};
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = { mode: 'new', kind: 'past' };
});

const fill = async (dest: string, name: string) => {
  await fireEvent.changeText(screen.getByTestId('trip-form-dest'), dest);
  await fireEvent.changeText(screen.getByTestId('trip-form-name'), name);
};

describe('TripFormScreen', () => {
  it('validates destination first, then name', async () => {
    const before = repos.trips.list().length;
    await renderWithProviders(<TripFormScreen />);
    expect(screen.getByText('Nova viagem')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('trip-form-save'));
    expect(screen.getByTestId('trip-form-error')).toHaveTextContent('Falta dizer pra onde foi.');
    expect(screen.getByTestId('trip-form-dest')).toHaveProp('aria-invalid', true);

    await fireEvent.changeText(screen.getByTestId('trip-form-dest'), 'Hanói');
    expect(screen.queryByTestId('trip-form-error')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('trip-form-save'));
    expect(screen.getByTestId('trip-form-error')).toHaveTextContent('Dá um nome pra essa viagem.');
    expect(screen.getByTestId('trip-form-name')).toHaveProp('aria-invalid', true);
    expect(repos.trips.list()).toHaveLength(before);
    expect(await createLocalStore(db).pendingMutations(100)).toEqual([]);
  });

  it('searches the destination and keeps its country and flag', async () => {
    await renderWithProviders(<TripFormScreen />);
    await fireEvent.changeText(screen.getByTestId('trip-form-dest'), 'munique');
    await fireEvent.press(await screen.findByTestId('trip-form-dest-option-0'));
    expect(screen.getByTestId('trip-form-dest')).toHaveDisplayValue('Munique, Alemanha');
    await fireEvent.changeText(screen.getByTestId('trip-form-name'), 'Oktoberfest');
    await fireEvent.press(screen.getByTestId('trip-form-save'));
    expect(repos.trips.list()[0]).toMatchObject({
      place: 'Munique',
      country: 'Alemanha',
      countryIso: '276',
      flag: '🇩🇪',
    });
  });

  it('takes a destination no list has, as typed', async () => {
    await renderWithProviders(<TripFormScreen />);
    await fireEvent.changeText(screen.getByTestId('trip-form-dest'), 'Sítio do vovô');
    await fireEvent.press(await screen.findByTestId('trip-form-dest-custom'));
    await fireEvent.changeText(screen.getByTestId('trip-form-name'), 'Férias');
    await fireEvent.press(screen.getByTestId('trip-form-save'));
    expect(repos.trips.list()[0]).toMatchObject({ place: 'Sítio do vovô', countryIso: null });
  });

  it('saves a past trip, lights the country and returns to Realizadas', async () => {
    await renderWithProviders(<TripFormScreen />);
    await fill('Kyoto, Japão', 'Cerejeiras');
    await fireEvent.changeText(screen.getByTestId('trip-form-when'), 'Abril de 2024');
    await fireEvent.press(screen.getByRole('button', { name: 'Praia' }));
    await fireEvent.press(screen.getByTestId('trip-form-save'));

    expect(repos.trips.list()[0]).toMatchObject({
      title: 'Cerejeiras',
      place: 'Kyoto',
      country: 'Japão',
      countryIso: '392',
      flag: '🇯🇵',
      period: 'Abril de 2024',
      year: '2024',
      companions: [],
      details: null,
    });
    expect(repos.world.visitedMap()['392']).toEqual(['2024']);
    const pending = await createLocalStore(db).pendingMutations(100);
    expect(pending.map((m) => m.table)).toEqual(['trips', 'visited_countries']);
    expect(useStore.getState().tripsSegment).toBe('past');
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.trips);
    expect(screen.getByRole('alert')).toHaveTextContent('Viagem salva no seu mapa.');
  });

  it('creates the trip, then invites friends as pending members (outbox)', async () => {
    await renderWithProviders(<TripFormScreen />);
    await fill('Ubatuba', 'Feriado');
    await fireEvent.press(screen.getByRole('button', { name: 'Convidar Marina Costa' }));
    expect(screen.getByTestId('trip-form-collab-Marina')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Convidar Marina Costa' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Convidar João Pereira' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remover João Pereira' }));
    await fireEvent.press(screen.getByTestId('trip-form-save'));

    const trip = repos.trips.list()[0];
    expect(trip).toMatchObject({ flag: '📍', countryIso: null, companions: [] });
    expect(repos.collab.members('trip', trip?.id ?? '')).toEqual([
      expect.objectContaining({ userId: userId('Marina Costa'), status: 'pending' }),
    ]);
    const pending = await createLocalStore(db).pendingMutations(100);
    expect(pending.map((m) => m.table)).toEqual(['trips', 'memberships']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Viagem salva. Convite enviado pra Marina.',
    );
  });

  it('saves a wishlist destination', async () => {
    mockParams = { mode: 'new', kind: 'future' };
    await renderWithProviders(<TripFormScreen />);
    expect(screen.getByText('Novo destino')).toBeOnTheScreen();
    expect(screen.queryByTestId('trip-form-when')).not.toBeOnTheScreen();
    await fill('Hanói, Vietnã', 'Comer pho');
    await fireEvent.press(screen.getByTestId('trip-form-save'));

    const wish = repos.world.wishes().at(-1);
    expect(wish).toMatchObject({
      name: 'Comer pho',
      countryIso: null,
      note: 'Destino: Hanói, Vietnã',
      companions: [],
    });
    expect(wish && savedLabel(wish, 'pt-BR')).toEqual({ key: 'savedNow' });
    const pending = await createLocalStore(db).pendingMutations(100);
    expect(pending.map((m) => m.table)).toEqual(['wish_destinations']);
    expect(useStore.getState().tripsSegment).toBe('wish');
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.trips);
    expect(screen.getByRole('alert')).toHaveTextContent('Destino salvo. Bora?');
  });

  it('switches kind with the segmented control', async () => {
    await renderWithProviders(<TripFormScreen />);
    await fireEvent.press(screen.getByTestId('trip-form-kind-future'));
    expect(screen.getByText('Pra onde você quer ir?')).toBeOnTheScreen();
    expect(screen.getByText('Salvar destino')).toBeOnTheScreen();
  });

  it('edits an existing trip and goes back', async () => {
    mockParams = { mode: 'edit', kind: 'past', id: demoId('trip:floripa') };
    await renderWithProviders(<TripFormScreen />);
    expect(screen.getByText('Editar viagem')).toBeOnTheScreen();
    expect(screen.queryByTestId('trip-form-kind')).not.toBeOnTheScreen();
    expect(screen.getByTestId('trip-form-dest')).toHaveProp('value', 'Florianópolis, Brasil');
    expect(screen.getByTestId('trip-form-name')).toHaveProp('value', 'Inverno em Floripa');

    await fireEvent.changeText(screen.getByTestId('trip-form-name'), 'Inverno na Ilha');
    await fireEvent.press(screen.getByRole('button', { name: 'Convidar Bia Souza' }));
    await fireEvent.press(screen.getByTestId('trip-form-save'));

    const trip = repos.trips.get(demoId('trip:floripa'));
    expect(trip).toMatchObject({
      title: 'Inverno na Ilha',
      period: '12 – 17 jul 2025',
      year: '2025',
    });
    expect(trip?.details).not.toBeNull(); // places, diary… are kept
    expect(trip?.companions).toEqual([]);
    const members = repos.collab.members('trip', demoId('trip:floripa'));
    expect(members.map((m) => [m.userId, m.status])).toEqual(
      expect.arrayContaining([
        [userId('Marina Costa'), 'accepted'],
        [userId('João Pereira'), 'accepted'],
        [userId('Bia Souza'), 'pending'],
      ]),
    );
    expect(mockRouter.back).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Viagem atualizada. Convite enviado pra Bia.',
    );
  });

  it('finishes onboarding on the first map', async () => {
    seedDatabase({ demo: false }); // a brand-new account
    mockParams = { mode: 'onboarding', kind: 'past', dest: 'Japão' };
    useStore.getState().toggleOnboardingCountry('392');
    useStore.getState().toggleOnboardingCountry('484');
    await renderWithProviders(<TripFormScreen />);
    expect(screen.getByText('Passo 2 de 2')).toBeOnTheScreen();
    expect(screen.getByTestId('trip-form-dest')).toHaveProp('value', 'Japão');
    await fireEvent.changeText(screen.getByTestId('trip-form-name'), 'Primeira viagem');
    await fireEvent.press(screen.getByTestId('trip-form-save'));

    const year = String(new Date().getFullYear());
    expect(repos.trips.list()).toHaveLength(1);
    expect(repos.trips.list()[0]).toMatchObject({ title: 'Primeira viagem', year });
    expect(repos.world.visitedMap()).toEqual({ '392': [year], '484': [year] });
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.firstMap);
  });
});
