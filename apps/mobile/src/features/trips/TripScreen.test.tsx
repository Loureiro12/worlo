import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { createLocalStore } from '@worlo/db';
import { Share } from 'react-native';
import { collab } from '@/data/collab';
import { getCurrentUserId, repos } from '@/data/repositories';
import { db } from '@/lib/database';
import { demoId } from '@/mocks/demo';
import { userId } from '@/mocks/demoWorld';
import { routes } from '@/navigation/routes';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { TripScreen } from './TripScreen';

const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: () => true,
};
const FLORIPA = demoId('trip:floripa');
const PATAGONIA = demoId('trip:patagonia');
const JERI = demoId('trip:jeri');
const mockCreateInviteLink = jest.fn(async (_type: string, _id: string) => 'tok123');
jest.mock('@/data/collab', () => ({
  ...jest.requireActual('@/data/collab'),
  createInviteLink: (type: string, id: string) => mockCreateInviteLink(type, id),
}));
let mockParams: Record<string, string> = { id: FLORIPA };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = { id: FLORIPA };
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
    expect(mockRouter.push).toHaveBeenCalledWith(routes.retro(FLORIPA));
    await fireEvent.press(screen.getByTestId('trip-share'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.share('trip', { tripId: FLORIPA }));
    await fireEvent.press(screen.getByTestId('trip-edit'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      routes.tripForm({ mode: 'edit', kind: 'past', id: FLORIPA }),
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
    // Everyone on the trip takes part by default; João sat this one out.
    expect(screen.getByTestId('expense-split-text')).toHaveTextContent(
      'Fica R$ 70 pra cada um (3 pessoas)',
    );
    await fireEvent.press(screen.getByTestId('expense-split-João'));
    expect(screen.getByTestId('expense-split-text')).toHaveTextContent(
      'Fica R$ 105 pra cada um (2 pessoas)',
    );
    // Marina paid.
    await fireEvent.press(screen.getByTestId('expense-payer-Marina'));
    expect(screen.queryByTestId('expense-receipt')).toBeNull();
    await fireEvent.press(screen.getByTestId('expense-save'));

    const saved = repos.trips.expenses(FLORIPA)[0];
    expect(saved).toMatchObject({
      name: 'Sequência de camarão',
      amount: 210,
      amountLabel: 'R$ 210',
      category: 'Comida',
      meta: 'Comida · pago por Marina · 2 pessoas',
    });
    // Marina has an account: she is her user id; I am mine.
    const marina = repos.people.list().find((p) => p.name === 'Marina Costa')?.id;
    expect(saved?.paidBy).toBe(marina);
    expect(saved?.split).toEqual(expect.arrayContaining([marina, getCurrentUserId()]));
    expect(saved?.split).toHaveLength(2);
    const pending = await createLocalStore(db).pendingMutations(100);
    expect(pending.map((m) => m.table)).toEqual(['trip_expenses']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Gasto salvo. Fica R$ 105 pra cada: Você e Marina.',
    );
    // Divisão: I owe Marina my half.
    expect(screen.getByTestId('trip-split')).toBeOnTheScreen();
    expect(screen.getByTestId('split-transfer-Você-Marina')).toHaveTextContent(/R\$ 105/);
    expect(screen.getByTestId('trip-money-total')).toHaveTextContent('R$ 5.070');
    expect(screen.getByText('R$ 845 por dia · 6 dias')).toBeOnTheScreen();
    expect(screen.getByText('Sequência de camarão')).toBeOnTheScreen();
  });

  it('renders a trip without details gracefully and logs its first expense', async () => {
    mockParams = { id: PATAGONIA };
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
    expect(screen.getByRole('alert')).toHaveTextContent(/^Gasto salvo\./);
    expect(screen.getByTestId('trip-money-total')).toHaveTextContent('US$ 45,5');
    expect(
      within(screen.getByTestId('trip-money-cat-transport')).getByText('100%'),
    ).toBeOnTheScreen();
  });

  it('keeps an added expense after the screen is opened again (SQLite)', async () => {
    const first = await renderWithProviders(<TripScreen />);
    await openTab('money');
    await fireEvent.press(screen.getByTestId('trip-add-expense'));
    await fireEvent.changeText(screen.getByTestId('expense-amount'), '90');
    await fireEvent.changeText(screen.getByTestId('expense-name'), 'Açaí na praia');
    await fireEvent.press(screen.getByTestId('expense-save'));
    await first.unmount();

    await renderWithProviders(<TripScreen />);
    await openTab('money');
    expect(screen.getByText('Açaí na praia')).toBeOnTheScreen();
    expect(screen.getByTestId('trip-money-total')).toHaveTextContent('R$ 4.950');
  });

  it('renders a not found state for unknown trips', async () => {
    mockParams = { id: 'nope' };
    await renderWithProviders(<TripScreen />);
    expect(screen.getByText('Essa viagem não está mais aqui.')).toBeOnTheScreen();
  });
});

describe('PeopleSheet (trip)', () => {
  it('lets the owner invite (pending membership) and remove collaborators', async () => {
    mockParams = { id: PATAGONIA };
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
    const status = (name: string) =>
      repos.collab.members('trip', PATAGONIA).find((m) => m.userId === userId(name))?.status;
    expect(status('Rafael Lima')).toBe('pending');
    expect(
      within(screen.getByTestId('member-Rafael Lima')).getByText('Convite enviado · aguardando'),
    ).toBeOnTheScreen();
    const pending = await createLocalStore(db).pendingMutations(100);
    expect(pending.map((m) => m.table)).toEqual(['memberships']);

    await fireEvent.press(screen.getByRole('button', { name: 'Remover João Pereira' }));
    expect(status('João Pereira')).toBe('removed');
    expect(screen.queryByTestId('member-João Pereira')).not.toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('João saiu da viagem.');

    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await fireEvent.press(screen.getByTestId('people-copy-link'));
    expect(mockCreateInviteLink).toHaveBeenCalledWith('trip', PATAGONIA);
    // The system sheet gets the link (opens the app) and the code (Viagens › Tenho um convite).
    const message =
      share.mock.calls[0]?.[0] && 'message' in share.mock.calls[0][0]
        ? share.mock.calls[0][0].message
        : '';
    expect(message).toContain('worlo://join/tok123');
    expect(message).toContain('código: tok123');
    share.mockRestore();
  });

  it('accepting the Jeri invite makes it editable; a collaborator cannot remove anyone', async () => {
    mockParams = { id: JERI };
    expect(repos.collab.canEdit('trip', JERI)).toBe(false);
    await act(() => {
      collab.accept('trip', JERI);
    });
    expect(repos.collab.canEdit('trip', JERI)).toBe(true);
    expect(repos.world.visitedMap()['076']).toContain('2025');

    await renderWithProviders(<TripScreen />);
    expect(screen.getByTestId('trip-edit')).toBeOnTheScreen();
    expect(screen.getByText('Criada por Bia · você é colaboradora')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('trip-people-open'));
    expect(
      within(screen.getByTestId('member-Bia Souza')).getByText('Criou a viagem'),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('member-me')).getByText('Colaboradora · pode editar tudo'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Remover/ })).not.toBeOnTheScreen();

    // "Sair da viagem": the trip leaves this device.
    await fireEvent.press(screen.getByTestId('people-leave'));
    expect(repos.collab.mine('trip', JERI)?.status).toBe('removed');
    expect(repos.trips.get(JERI)).toBeUndefined();
    expect(mockRouter.navigate).toHaveBeenCalledWith(routes.trips);
  });

  it('a pending invite preview is read only', async () => {
    mockParams = { id: JERI };
    await renderWithProviders(<TripScreen />);
    expect(screen.getByText('Réveillon em Jeri')).toBeOnTheScreen();
    expect(screen.queryByTestId('trip-edit')).not.toBeOnTheScreen();
  });
});

describe('Trip activity', () => {
  it("lists collaborators' activity with templates and relative time", async () => {
    await renderWithProviders(<TripScreen />);
    expect(screen.getByText('Atividade recente')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('trip-activity-photos')).getByText(/adicionou 12 fotos no Dia 2/),
    ).toBeOnTheScreen();
    expect(within(screen.getByTestId('trip-activity-photos')).getByText('ontem')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('trip-activity-expense')).getByText(
        /lançou R\$ 210 no Bar do Arante/,
      ),
    ).toBeOnTheScreen();
  });
});
