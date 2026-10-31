import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import type { Member } from '@/store/slices/trips';
import { renderWithProviders } from '@/test-utils';
import { TripScreen } from './TripScreen';

const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: () => true,
};
let mockParams: Record<string, string> = { id: 'floripa' };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = { id: 'floripa' };
});

const openTab = (tab: 'overview' | 'days' | 'money') =>
  fireEvent.press(screen.getByTestId(`trip-tab-${tab}`));

describe('TripScreen', () => {
  it('shows the info card, people and overview', async () => {
    await renderWithProviders(<TripScreen />);
    expect(screen.getByText('Inverno em Floripa')).toBeOnTheScreen();
    expect(screen.getByText('🇧🇷 Florianópolis, Brasil')).toBeOnTheScreen();
    expect(screen.getByText('12 – 17 jul 2025 · 6 dias')).toBeOnTheScreen();
    expect(screen.getByText('R$ 4.860')).toBeOnTheScreen();
    expect(screen.getByText('Você, Marina e João')).toBeOnTheScreen();
    expect(screen.getByText('2 colaboradores')).toBeOnTheScreen();
    expect(screen.getByText(/adicionou 12 fotos no Dia 2/)).toBeOnTheScreen();
    expect(screen.getByText('Lagoa da Conceição')).toBeOnTheScreen();
    expect(screen.getByText('+37')).toBeOnTheScreen();
    expect(screen.getByText(/Chegamos tarde/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('trip-open-retro'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.retro('floripa'));
    await fireEvent.press(screen.getByTestId('trip-share'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.share('trip', { tripId: 'floripa' }));
    await fireEvent.press(screen.getByTestId('trip-edit'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      routes.tripForm({ mode: 'edit', kind: 'past', id: 'floripa' }),
    );
  });

  it('shows the day-by-day timeline', async () => {
    await renderWithProviders(<TripScreen />);
    await openTab('days');
    expect(screen.getByText('Dia 1 · sáb, 12 jul')).toBeOnTheScreen();
    expect(screen.getByText('Jantar no Bar do Arante')).toBeOnTheScreen();
    expect(screen.getByText('R$ 210 · ★ 4')).toBeOnTheScreen();
  });

  it('shows the expense breakdown', async () => {
    await renderWithProviders(<TripScreen />);
    await openTab('money');
    expect(screen.getByTestId('trip-money-total')).toHaveTextContent('R$ 4.860');
    expect(screen.getByText('R$ 810 por dia · 6 dias')).toBeOnTheScreen();
    expect(within(screen.getByTestId('trip-money-cat-lodging')).getByText('40%')).toBeOnTheScreen();
    expect(screen.getByText('Pousada Vila do Campeche')).toBeOnTheScreen();
    expect(screen.getAllByText('comprovante')).toHaveLength(2);
  });

  it('validates, splits and saves a new expense, recalculating totals', async () => {
    await renderWithProviders(<TripScreen />);
    await openTab('money');
    await fireEvent.press(screen.getByTestId('trip-add-expense'));
    expect(screen.getByText('Novo gasto')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('expense-save'));
    expect(screen.getByTestId('expense-error')).toHaveTextContent('Quanto foi?');

    await fireEvent.changeText(screen.getByTestId('expense-amount'), 'R$ 2a10');
    expect(screen.getByTestId('expense-amount')).toHaveProp('value', '210');
    await fireEvent.press(screen.getByTestId('expense-save'));
    expect(screen.getByTestId('expense-error')).toHaveTextContent('Dá um nome pro gasto.');

    await fireEvent.changeText(screen.getByTestId('expense-name'), 'Sequência de camarão');
    await fireEvent.press(screen.getByTestId('expense-split-Marina'));
    expect(screen.getByTestId('expense-split-text')).toHaveTextContent(
      'Fica R$ 105 pra cada um (2 pessoas)',
    );
    await fireEvent.press(screen.getByTestId('expense-split-João'));
    expect(screen.getByTestId('expense-split-text')).toHaveTextContent(
      'Fica R$ 70 pra cada um (3 pessoas)',
    );
    await fireEvent.press(screen.getByTestId('expense-receipt'));
    await fireEvent.press(screen.getByTestId('expense-save'));

    expect(useStore.getState().expenses.floripa?.[0]).toMatchObject({
      name: 'Sequência de camarão',
      amount: 210,
      cat: 'Comida',
      receipt: true,
      split: ['Marina Costa', 'João Pereira'],
      meta: 'Comida · hoje · dividido com Marina e João',
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Gasto salvo. Marina e João devem R$ 70 cada.',
    );
    expect(screen.getByTestId('trip-money-total')).toHaveTextContent('R$ 5.070');
    expect(screen.getByText('R$ 845 por dia · 6 dias')).toBeOnTheScreen();
    expect(screen.getByText('Sequência de camarão')).toBeOnTheScreen();
  });

  it('renders a trip without details gracefully and logs its first expense', async () => {
    mockParams = { id: 'patagonia' };
    await renderWithProviders(<TripScreen />);
    expect(
      screen.getByText('Nenhum lugar registrado ainda. Bora adicionar o primeiro?'),
    ).toBeOnTheScreen();
    await openTab('days');
    expect(screen.getByText('Nada por dia ainda.')).toBeOnTheScreen();
    await openTab('money');
    expect(screen.getByText('Nenhum gasto registrado.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('trip-add-expense'));
    await fireEvent.changeText(screen.getByTestId('expense-amount'), '45,50');
    await fireEvent.changeText(screen.getByTestId('expense-name'), 'Gasolina');
    await fireEvent.press(screen.getByTestId('expense-cat-transport'));
    await fireEvent.press(screen.getByTestId('expense-save'));
    expect(screen.getByRole('alert')).toHaveTextContent('Gasto salvo.');
    expect(screen.getByTestId('trip-money-total')).toHaveTextContent('US$ 45,5');
    expect(
      within(screen.getByTestId('trip-money-cat-transport')).getByText('100%'),
    ).toBeOnTheScreen();
  });

  it('renders a not found state for unknown trips', async () => {
    mockParams = { id: 'nope' };
    await renderWithProviders(<TripScreen />);
    expect(screen.getByText('Essa viagem não está mais aqui.')).toBeOnTheScreen();
  });
});

describe('PeopleSheet (trip)', () => {
  it('lets the owner invite and remove collaborators', async () => {
    mockParams = { id: 'patagonia' };
    await renderWithProviders(<TripScreen />);
    expect(screen.getByText('2 colaboradores · 1 convite pendente')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('trip-people-invite'));

    const sheet = within(screen.getByTestId('people-sheet'));
    expect(sheet.getByText('Ana Ribeiro (você)')).toBeOnTheScreen();
    expect(within(screen.getByTestId('member-me')).getByText('Criou a viagem')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('member-Caio Ramos')).getByText('Convite enviado · aguardando'),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('people-search'), 'rafa');
    await fireEvent.press(screen.getByRole('button', { name: 'Convidar Rafael Lima' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Convite enviado pra Rafael.');
    const collab = () => useStore.getState().trips.find((t) => t.id === 'patagonia')?.collab;
    expect(collab()).toContainEqual({ name: 'Rafael Lima', status: 'pending' });

    await fireEvent.press(screen.getByRole('button', { name: 'Remover João Pereira' }));
    expect(collab()?.map((c) => c.name)).not.toContain('João Pereira');
    expect(screen.getByRole('alert')).toHaveTextContent('João saiu da viagem.');

    await fireEvent.press(screen.getByTestId('people-copy-link'));
    expect(screen.getByRole('alert')).toHaveTextContent('Link copiado.');
  });

  it('does not let a collaborator remove anyone', async () => {
    const collab: Member[] = [
      { name: 'Bia Souza', status: 'ok', owner: true },
      { name: 'Caio Ramos', status: 'ok' },
    ];
    await act(() => useStore.getState().setCollaborators('floripa', collab));
    await renderWithProviders(<TripScreen />);
    expect(screen.getByText('Criada por Bia · você é colaboradora')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('trip-people-open'));
    expect(
      within(screen.getByTestId('member-Bia Souza')).getByText('Criou a viagem'),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('member-me')).getByText('Colaboradora · pode editar tudo'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Remover/ })).not.toBeOnTheScreen();
  });
});
