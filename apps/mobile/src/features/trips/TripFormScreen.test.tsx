import { fireEvent, screen } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
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
    expect(useStore.getState().trips).toHaveLength(4);
  });

  it('saves a past trip, lights the country and returns to Realizadas', async () => {
    await renderWithProviders(<TripFormScreen />);
    await fill('Kyoto, Japão', 'Cerejeiras');
    await fireEvent.changeText(screen.getByTestId('trip-form-when'), 'Abril de 2024');
    await fireEvent.press(screen.getByRole('button', { name: 'Praia' }));
    await fireEvent.press(screen.getByTestId('trip-form-save'));

    expect(useStore.getState().trips[0]).toMatchObject({
      title: 'Cerejeiras',
      place: 'Kyoto',
      country: 'Japão',
      flag: '🇯🇵',
      period: 'Abril de 2024',
      year: '2024',
      collab: [],
    });
    expect(useStore.getState().visitedMap['392']).toEqual(['2024']);
    expect(useStore.getState().tripsSegment).toBe('past');
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.trips);
    expect(screen.getByRole('alert')).toHaveTextContent('Viagem salva no seu mapa.');
  });

  it('invites friends as pending collaborators', async () => {
    await renderWithProviders(<TripFormScreen />);
    await fill('Ubatuba', 'Feriado');
    await fireEvent.press(screen.getByRole('button', { name: 'Convidar Marina Costa' }));
    expect(screen.getByTestId('trip-form-collab-Marina')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Convidar Marina Costa' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Convidar João Pereira' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Remover João Pereira' }));
    await fireEvent.press(screen.getByTestId('trip-form-save'));

    expect(useStore.getState().trips[0]).toMatchObject({
      flag: '📍',
      collab: [{ name: 'Marina Costa', status: 'pending' }],
    });
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

    expect(useStore.getState().futures.at(-1)).toMatchObject({
      name: 'Comer pho',
      cid: '',
      note: 'Destino: Hanói, Vietnã',
      saved: 'Salvo agora',
    });
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
    mockParams = { mode: 'edit', kind: 'past', id: 'floripa' };
    await renderWithProviders(<TripFormScreen />);
    expect(screen.getByText('Editar viagem')).toBeOnTheScreen();
    expect(screen.queryByTestId('trip-form-kind')).not.toBeOnTheScreen();
    expect(screen.getByTestId('trip-form-dest')).toHaveProp('value', 'Florianópolis, Brasil');
    expect(screen.getByTestId('trip-form-name')).toHaveProp('value', 'Inverno em Floripa');

    await fireEvent.changeText(screen.getByTestId('trip-form-name'), 'Inverno na Ilha');
    await fireEvent.press(screen.getByRole('button', { name: 'Convidar Bia Souza' }));
    await fireEvent.press(screen.getByTestId('trip-form-save'));

    const trip = useStore.getState().trips.find((t) => t.id === 'floripa');
    expect(trip).toMatchObject({
      title: 'Inverno na Ilha',
      period: '12 – 17 jul 2025',
      year: '2025',
    });
    expect(trip?.collab).toEqual([
      { name: 'Marina Costa', status: 'ok' },
      { name: 'João Pereira', status: 'ok' },
      { name: 'Bia Souza', status: 'pending' },
    ]);
    expect(mockRouter.back).toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Viagem atualizada. Convite enviado pra Bia.',
    );
  });

  it('finishes onboarding on the first map', async () => {
    mockParams = { mode: 'onboarding', kind: 'past', dest: 'Japão' };
    useStore.getState().toggleOnboardingCountry('392');
    useStore.getState().toggleOnboardingCountry('484');
    await renderWithProviders(<TripFormScreen />);
    expect(screen.getByText('Passo 2 de 2')).toBeOnTheScreen();
    expect(screen.getByTestId('trip-form-dest')).toHaveProp('value', 'Japão');
    await fireEvent.changeText(screen.getByTestId('trip-form-name'), 'Primeira viagem');
    await fireEvent.press(screen.getByTestId('trip-form-save'));

    const year = String(new Date().getFullYear());
    expect(useStore.getState().trips[0]).toMatchObject({ title: 'Primeira viagem', year });
    expect(useStore.getState().visitedMap['392']).toEqual([year]);
    expect(useStore.getState().visitedMap['484']).toEqual([year]);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.firstMap);
  });
});
