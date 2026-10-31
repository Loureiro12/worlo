import { act, fireEvent, screen } from '@testing-library/react-native';
import { collab } from '@/data/collab';
import { repos } from '@/data/repositories';
import { DEMO_USER, demoId } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { InviteScreen } from './InviteScreen';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  canGoBack: () => true,
};
const JERI = demoId('trip:jeri');
const SEUL = demoId('wish:seul');
/** Invite routes take my membership id. */
const inviteId = (entityId: string) => demoId(`member:${entityId}:${DEMO_USER.id}`);
let mockParams: { id?: string } = { id: inviteId(JERI) };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = { id: inviteId(JERI) };
});

describe('InviteScreen', () => {
  it('shows a past-trip invite from the synced trip, inviter and members', async () => {
    await renderWithProviders(<InviteScreen />);
    expect(screen.getByTestId('invite-screen')).toBeOnTheScreen();
    expect(screen.getByText('Convite pra viagem realizada')).toBeOnTheScreen();
    expect(screen.getByText('Réveillon em Jeri')).toBeOnTheScreen();
    expect(screen.getByText('🇧🇷 Jericoacoara')).toBeOnTheScreen();
    expect(screen.getByText('Bia Souza convidou você')).toBeOnTheScreen();
    expect(screen.getByText(/Sobe aquelas fotos do pôr do sol/)).toBeOnTheScreen();
    expect(screen.getByText('Quem foi')).toBeOnTheScreen();
    expect(screen.getByText('Bia, Caio e você')).toBeOnTheScreen();
    expect(screen.getByText('Como colaborador, você pode')).toBeOnTheScreen();
    expect(screen.getByText('Lançar e dividir gastos')).toBeOnTheScreen();
    expect(
      screen.getByText('Os gastos da viagem ficam visíveis só pra quem participa dela.'),
    ).toBeOnTheScreen();
  });

  it('accepting a past trip makes it editable, lights the country and opens it', async () => {
    await renderWithProviders(<InviteScreen />);
    await fireEvent.press(screen.getByTestId('invite-accept'));
    expect(repos.collab.mine('trip', JERI)?.status).toBe('accepted');
    expect(repos.collab.canEdit('trip', JERI)).toBe(true);
    expect(repos.world.visitedMap()['076']).toContain('2025');
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip(JERI));
    expect(
      screen.getByText('Você entrou em “Réveillon em Jeri”. Ela já aparece no seu perfil.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('invite-open')).toBeOnTheScreen();
  });

  it('accepting a future trip adds it to Quero ir and opens it', async () => {
    mockParams = { id: inviteId(SEUL) };
    await renderWithProviders(<InviteScreen />);
    expect(screen.getByText('Convite pra planejar juntos')).toBeOnTheScreen();
    expect(screen.getByText('Quem vai')).toBeOnTheScreen();
    expect(screen.getByText('Rafael, Lúcia e você')).toBeOnTheScreen();
    expect(screen.getByText('Editar o roteiro dia a dia')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('invite-accept'));
    expect(repos.collab.mine('wish', SEUL)?.status).toBe('accepted');
    expect(mockRouter.push).toHaveBeenCalledWith(routes.future(SEUL));
  });

  it('declining is final: shows the text, then the trip leaves after prune', async () => {
    await renderWithProviders(<InviteScreen />);
    await fireEvent.press(screen.getByTestId('invite-decline'));
    expect(repos.collab.mine('trip', JERI)?.status).toBe('declined');
    expect(screen.getByTestId('invite-declined')).toHaveTextContent('Você recusou esse convite.');
    await act(() => {
      repos.collab.prune();
    });
    expect(repos.trips.get(JERI)).toBeUndefined();
    expect(screen.getByText('Esse convite não está mais disponível.')).toBeOnTheScreen();
  });

  it('already accepted: opens the trip', async () => {
    collab.accept('trip', JERI);
    await renderWithProviders(<InviteScreen />);
    expect(screen.getByText('Você já está nessa viagem · Abrir')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('invite-open'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip(JERI));
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
