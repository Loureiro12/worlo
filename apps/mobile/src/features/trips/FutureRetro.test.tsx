import { fireEvent, screen, within } from '@testing-library/react-native';
import { getItineraries } from '@/data/planning';
import { repos } from '@/data/repositories';
import { world } from '@/data/world';
import { demoId } from '@/mocks/demo';
import { userId } from '@/mocks/demoWorld';
import { routes } from '@/navigation/routes';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { FutureScreen } from './FutureScreen';
import { RetroScreen } from './RetroScreen';

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
});

describe('FutureScreen', () => {
  beforeEach(() => {
    mockParams = { id: demoId('wish:392') };
  });

  it('shows the destination facts, note and people', async () => {
    await renderWithProviders(<FutureScreen />);
    expect(screen.getByText('Japão')).toBeOnTheScreen();
    expect(screen.getByText('Salvo em ago 2025')).toBeOnTheScreen();
    expect(screen.getByText('Tóquio')).toBeOnTheScreen();
    expect(screen.getByText('Iene (¥)')).toBeOnTheScreen();
    expect(screen.getByText('mar – mai')).toBeOnTheScreen();
    expect(screen.getByText('Ver as cerejeiras em Kyoto. Ir com a Marina.')).toBeOnTheScreen();
    expect(screen.getByText('Quem vai')).toBeOnTheScreen();
    expect(screen.getByText('Você e Marina')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('future-country'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.country('392'));
  });

  it('starts an itinerary for the destination', async () => {
    await renderWithProviders(<FutureScreen />);
    await fireEvent.press(screen.getByTestId('future-start'));
    const created = getItineraries()[0];
    expect(created).toMatchObject({ title: 'Viagem para Japão', place: 'Japão', sugKey: 'japao' });
    expect(mockRouter.push).toHaveBeenCalledWith(routes.roteiro(created?.id ?? ''));
  });

  it('invites people to a wishlist destination', async () => {
    mockParams = { id: demoId('wish:352') };
    await renderWithProviders(<FutureScreen />);
    expect(screen.getByText('Só você, por enquanto')).toBeOnTheScreen();
    expect(screen.getByText('Convide quem vai com você')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('future-people-invite'));
    const sheet = within(screen.getByTestId('people-sheet'));
    await fireEvent.press(sheet.getByRole('button', { name: 'Convidar Marina Costa' }));
    const wish = repos.world.wishes().find((w) => w.countryIso === '352');
    expect(wish?.companions).toEqual([]);
    expect(repos.collab.members('wish', wish?.id ?? '')).toEqual([
      expect.objectContaining({ userId: userId('Marina Costa'), status: 'pending' }),
    ]);
    expect(screen.getByText('1 convite pendente')).toBeOnTheScreen();
  });

  it('hides facts for destinations without a known country', async () => {
    const wish = world.addFuture({ name: 'Comer pho', flag: '📍' });
    mockParams = { id: wish.id };
    await renderWithProviders(<FutureScreen />);
    expect(screen.getByText('Salvo agora')).toBeOnTheScreen();
    expect(screen.queryByText('Capital')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('future-country'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.community);
  });
});

describe('RetroScreen', () => {
  it('shows the story with stats and shares it', async () => {
    mockParams = { id: demoId('trip:floripa') };
    await renderWithProviders(<RetroScreen />);
    expect(screen.getByText('Retrospectiva · 2025')).toBeOnTheScreen();
    expect(screen.getByText('Inverno em Floripa')).toBeOnTheScreen();
    expect(screen.getByLabelText('42 fotos')).toBeOnTheScreen();
    expect(screen.getByLabelText('R$ 4.860 gastos')).toBeOnTheScreen();
    expect(screen.getByText('Pôr do sol na Lagoa da Conceição')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('retro-share'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      routes.share('retro', { tripId: demoId('trip:floripa') }),
    );
    await fireEvent.press(screen.getByTestId('retro-close'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('has no "best moment" card when there is none (no made-up one)', async () => {
    mockParams = { id: demoId('trip:paris') };
    await renderWithProviders(<RetroScreen />);
    expect(screen.getAllByText('Primeira vez em Paris')).toHaveLength(1);
    expect(screen.queryByText('Melhor momento')).toBeNull();
  });
});
