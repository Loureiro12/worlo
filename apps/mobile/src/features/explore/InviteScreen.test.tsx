import { fireEvent, screen } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { InviteScreen } from './InviteScreen';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  canGoBack: () => true,
};
let mockParams: { id?: string } = { id: 'jeri' };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = { id: 'jeri' };
});

describe('InviteScreen', () => {
  it('shows a past-trip invite', async () => {
    await renderWithProviders(<InviteScreen />);
    expect(screen.getByTestId('invite-screen')).toBeOnTheScreen();
    expect(screen.getByText('Convite pra viagem realizada')).toBeOnTheScreen();
    expect(screen.getByText('Réveillon em Jeri')).toBeOnTheScreen();
    expect(screen.getByText('Bia Souza convidou você')).toBeOnTheScreen();
    expect(screen.getByText('Quem foi')).toBeOnTheScreen();
    expect(screen.getByText('Bia, Caio e você')).toBeOnTheScreen();
    expect(screen.getByText('Como colaborador, você pode')).toBeOnTheScreen();
    expect(screen.getByText('Lançar e dividir gastos')).toBeOnTheScreen();
    expect(
      screen.getByText('Os gastos da viagem ficam visíveis só pra quem participa dela.'),
    ).toBeOnTheScreen();
  });

  it('accepting a past trip adds it, lights the country and opens it', async () => {
    await renderWithProviders(<InviteScreen />);
    await fireEvent.press(screen.getByTestId('invite-accept'));
    const s = useStore.getState();
    expect(s.invites.jeri).toBe('accepted');
    expect(s.trips.some((t) => t.id === 'jeri')).toBe(true);
    expect(s.visitedMap['076']).toContain('2025');
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip('jeri'));
    expect(
      screen.getByText('Você entrou em “Réveillon em Jeri”. Ela já aparece no seu perfil.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('invite-open')).toBeOnTheScreen();
  });

  it('accepting a future trip adds it to Quero ir and opens it', async () => {
    mockParams = { id: 'seul' };
    await renderWithProviders(<InviteScreen />);
    expect(screen.getByText('Convite pra planejar juntos')).toBeOnTheScreen();
    expect(screen.getByText('Quem vai')).toBeOnTheScreen();
    expect(screen.getByText('Editar o roteiro dia a dia')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('invite-accept'));
    expect(useStore.getState().futures.some((f) => f.id === 'seul')).toBe(true);
    expect(mockRouter.push).toHaveBeenCalledWith(routes.future('seul'));
  });

  it('declining shows the text and "Aceitar mesmo assim"', async () => {
    await renderWithProviders(<InviteScreen />);
    await fireEvent.press(screen.getByTestId('invite-decline'));
    expect(useStore.getState().invites.jeri).toBe('declined');
    expect(screen.getByText('Você recusou esse convite.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('invite-accept-anyway'));
    expect(useStore.getState().invites.jeri).toBe('accepted');
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip('jeri'));
  });

  it('already accepted: opens the trip', async () => {
    useStore.getState().acceptInvite('jeri');
    await renderWithProviders(<InviteScreen />);
    expect(screen.getByText('Você já está nessa viagem · Abrir')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('invite-open'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip('jeri'));
  });

  it('handles an unknown invite', async () => {
    mockParams = { id: 'nope' };
    await renderWithProviders(<InviteScreen />);
    expect(screen.getByText('Esse convite não está mais disponível.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('header-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('renders in English', async () => {
    await renderWithProviders(<InviteScreen />, { language: 'en' });
    expect(screen.getByText('Invite to a past trip')).toBeOnTheScreen();
    expect(screen.getByText('Bia, Caio and you')).toBeOnTheScreen();
  });
});
