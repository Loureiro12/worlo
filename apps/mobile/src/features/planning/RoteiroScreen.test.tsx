import { fireEvent, screen, within } from '@testing-library/react-native';
import { getItineraries, getItinerary, getLive, startLive } from '@/data/planning';
import { repos } from '@/data/repositories';
import { demoId } from '@/mocks/demo';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { RoteiroScreen } from './RoteiroScreen';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const PERU = demoId('itinerary:peru');
const JAPAO = demoId('itinerary:japao');
/** Read straight from SQLite: what the screen wrote is what persists. */
const peru = () => getItinerary(PERU);

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = { id: PERU, mode: 'mine' };
});

describe('RoteiroScreen (mine)', () => {
  it('shows header, chips and stats (days, stops, estimated sum)', async () => {
    await renderWithProviders(<RoteiroScreen />);
    expect(screen.getByTestId('roteiro-screen')).toBeOnTheScreen();
    expect(screen.getByText('Meu roteiro')).toBeOnTheScreen();
    expect(screen.getByText('Cusco e Machu Picchu')).toBeOnTheScreen();
    expect(screen.getByText('12 – 20 mai 2027')).toBeOnTheScreen();
    expect(screen.getByText('Em planejamento')).toBeOnTheScreen();
    // 4 days · 6 stops · 420+160+280+540+310 = 1.710
    expect(screen.getByTestId('roteiro-stat-days')).toHaveTextContent(/^4/);
    expect(screen.getByTestId('roteiro-stat-stops')).toHaveTextContent(/^6/);
    expect(screen.getByTestId('roteiro-stat-cost')).toHaveTextContent(/R\$ 1\.710/);
    expect(screen.getByText('Dia 1 · Lima → Cusco')).toBeOnTheScreen();
    expect(screen.getByText('R$ 420')).toBeOnTheScreen();
    expect(screen.getByText('Grátis')).toBeOnTheScreen();
  });

  it('switches days and shows the empty free day', async () => {
    await renderWithProviders(<RoteiroScreen />);
    await fireEvent.press(screen.getByTestId('roteiro-day-4'));
    expect(screen.getByText('Dia 4 · Dia livre')).toBeOnTheScreen();
    expect(screen.getByText('Dia livre, por enquanto.')).toBeOnTheScreen();
  });

  it('adds a "Dia livre" day and selects it', async () => {
    await renderWithProviders(<RoteiroScreen />);
    await fireEvent.press(screen.getByLabelText('Adicionar dia'));
    expect(peru()?.days).toHaveLength(5);
    expect(peru()?.days[4]).toEqual({ label: 'Dia livre', items: [] });
    expect(screen.getByText('Dia 5 · Dia livre')).toBeOnTheScreen();
    expect(screen.getByTestId('roteiro-stat-days')).toHaveTextContent(/^5/);
  });

  it('adds a suggested stop to the selected day with a default time', async () => {
    await renderWithProviders(<RoteiroScreen />);
    await fireEvent.press(screen.getByTestId('roteiro-day-2'));
    await fireEvent.press(screen.getByTestId('roteiro-add-stop'));
    expect(screen.getByText('Adicionar ao Dia 2')).toBeOnTheScreen();
    expect(screen.getByText('Sugestões perto de Cusco, Peru')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('roteiro-sug-0'));
    const items = peru()?.days[1]?.items ?? [];
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ title: 'Mercado San Pedro', time: 'A definir', cost: 40 });
    expect(screen.getByText('Mercado San Pedro entrou no Dia 2.')).toBeOnTheScreen();
    expect(screen.getByTestId('roteiro-stat-cost')).toHaveTextContent(/R\$ 1\.750/);
  });

  it('adds a stop from the empty day CTA', async () => {
    await renderWithProviders(<RoteiroScreen />);
    await fireEvent.press(screen.getByTestId('roteiro-day-4'));
    await fireEvent.press(
      within(screen.getByTestId('roteiro-empty-day')).getByText('Adicionar parada'),
    );
    await fireEvent.press(screen.getByTestId('roteiro-sug-2'));
    expect(peru()?.days[3]?.items[0]?.title).toBe('Qorikancha');
  });

  it('removes a stop', async () => {
    await renderWithProviders(<RoteiroScreen />);
    await fireEvent.press(screen.getByLabelText('Remover parada: Jantar no Chicha'));
    expect(peru()?.days[0]?.items.map((i) => i.title)).toEqual([
      'Voo Lima → Cusco',
      'Check-in em San Blas',
    ]);
    expect(screen.queryByText('Jantar no Chicha')).toBeNull();
    expect(screen.getByText('Parada removida.')).toBeOnTheScreen();
  });

  it('starts travel mode and opens it', async () => {
    await renderWithProviders(<RoteiroScreen />);
    await fireEvent.press(screen.getByTestId('roteiro-start'));
    expect(getLive()).toMatchObject({ on: true, itineraryId: PERU });
    expect(repos.planning.currentSession()).toMatchObject({ active: true, itineraryId: PERU });
    expect(mockRouter.push).toHaveBeenCalledWith('/live');
    expect(screen.getByText('Modo viagem ligado. Boa viagem!')).toBeOnTheScreen();
  });

  it('labels the button "Abrir modo viagem" when live is already on for it', async () => {
    startLive(PERU);
    await renderWithProviders(<RoteiroScreen />);
    expect(screen.getByText('Abrir modo viagem')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('roteiro-start'));
    expect(mockRouter.push).toHaveBeenCalledWith('/live');
  });

  it('starting another itinerary resets the live state', async () => {
    mockParams = { id: JAPAO, mode: 'mine' };
    await renderWithProviders(<RoteiroScreen />);
    expect(screen.getByText('Começar viagem agora')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('roteiro-start'));
    expect(getLive()).toEqual({
      on: true,
      itineraryId: JAPAO,
      day: 1,
      done: {},
      log: [],
      spent: 0,
    });
  });

  it('shares the itinerary', async () => {
    await renderWithProviders(<RoteiroScreen />);
    await fireEvent.press(screen.getByTestId('roteiro-share'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/share',
      params: { subject: 'roteiro', roteiroId: PERU },
    });
  });

  it('shows a not-found state for unknown ids', async () => {
    mockParams = { id: 'nope', mode: 'mine' };
    await renderWithProviders(<RoteiroScreen />);
    expect(screen.getByText('Esse roteiro não existe mais.')).toBeOnTheScreen();
  });
});

describe('RoteiroScreen (rec)', () => {
  beforeEach(() => {
    mockParams = { id: 'rec-lisboa', mode: 'rec' };
  });

  it('is a read-only preview with author, saves and rating', async () => {
    await renderWithProviders(<RoteiroScreen />);
    expect(screen.getByText('Recomendado')).toBeOnTheScreen();
    expect(screen.getByText('Marina Costa')).toBeOnTheScreen();
    expect(screen.getByText('Já fez essa viagem · 2,3 mil salvaram')).toBeOnTheScreen();
    expect(screen.getByText('4,9')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Adicionar dia')).toBeNull();
    expect(screen.queryByTestId('roteiro-add-stop')).toBeNull();
    expect(screen.queryByLabelText(/Remover parada/)).toBeNull();
  });

  it('"Usar esse roteiro" copies it as a draft and opens the copy', async () => {
    await renderWithProviders(<RoteiroScreen />);
    const before = getItineraries().length;
    await fireEvent.press(screen.getByText('Usar esse roteiro'));
    const itineraries = getItineraries();
    expect(itineraries).toHaveLength(before + 1);
    const copy = itineraries[0];
    expect(repos.planning.get(copy?.id ?? '')).toMatchObject({
      sourceRecommendationId: 'rec-lisboa',
      suggestionKey: 'lisboa',
    });
    expect(copy).toMatchObject({
      title: 'Lisboa em 4 dias, sem correr',
      status: 'Rascunho',
      sugKey: 'lisboa',
    });
    expect(copy?.id).not.toBe('rec-lisboa');
    expect(copy?.days).toHaveLength(4);
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/roteiro/[id]',
      params: { id: copy?.id, mode: 'mine' },
    });
    expect(screen.getByText('Copiado pros seus roteiros. Agora é seu.')).toBeOnTheScreen();
  });
});
