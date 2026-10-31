import { act, fireEvent, screen } from '@testing-library/react-native';
import { schema } from '@worlo/db';
import * as Linking from 'expo-linking';
import { revokeDevice } from '@/data/devices';
import { dataEvents } from '@/data/events';
import { auth, mfa } from '@/lib/auth';
import { db } from '@/lib/database';
import { deviceId } from '@/lib/device';
import { preferences } from '@/lib/preferences';
import { DEMO_USER } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { PreferencesProvider } from '@/providers/PreferencesProvider';
import { renderWithProviders } from '@/test-utils';
import { CfgScreen } from './CfgScreen';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => ({ section: 'security' }),
}));

jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  openURL: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  auth: {
    signIn: jest.fn(),
    verifyPassword: jest.fn(),
    updatePassword: jest.fn(),
    signOut: jest.fn(),
  },
  mfa: {
    status: jest.fn(),
    enroll: jest.fn(),
    verify: jest.fn(),
    unenroll: jest.fn(),
    needsChallenge: jest.fn(),
    challenge: jest.fn(),
  },
}));

// The RPC (online) is mocked; the device list itself is real SQLite.
jest.mock('@/data/devices', () => ({
  ...jest.requireActual('@/data/devices'),
  revokeDevice: jest.fn(),
}));

const mockMfa = mfa as unknown as Record<keyof typeof mfa, jest.Mock>;
const mockSignOut = auth.signOut as jest.Mock;
const mockRevoke = revokeDevice as jest.Mock;
const ENROLLMENT = { factorId: 'f1', secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Worlo:ana' };

const open = async () => {
  const view = await renderWithProviders(
    <PreferencesProvider>
      <CfgScreen />
    </PreferencesProvider>,
  );
  // Let the 2FA status (React Query notifies on a 0ms timer) land.
  await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
  return view;
};
const twoFactorSwitch = () => screen.getByRole('switch', { name: 'Verificação em duas etapas' });

/** Device rows as a sync pull brings them (no outbox). */
function putDevice(row: {
  id: string;
  name: string;
  platform: string;
  lastSeenAt: string;
  revokedAt?: string | null;
}) {
  db.insert(schema.devices)
    .values({
      revokedAt: null,
      userId: DEMO_USER.id,
      sessionId: null,
      createdAt: row.lastSeenAt,
      updatedAt: row.lastSeenAt,
      deletedAt: null,
      ...row,
    })
    .onConflictDoUpdate({ target: schema.devices.id, set: { revokedAt: row.revokedAt ?? null } })
    .run();
  dataEvents.emit();
}

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const DAY = 86_400_000;

beforeEach(() => {
  jest.clearAllMocks();
  preferences.setLanguage('pt-BR');
  mockMfa.status.mockResolvedValue({ ok: true, data: { factorId: null } });
  mockMfa.enroll.mockResolvedValue({ ok: true, data: ENROLLMENT });
  mockMfa.verify.mockResolvedValue({ ok: true });
  mockMfa.unenroll.mockResolvedValue({ ok: true });
  mockMfa.needsChallenge.mockResolvedValue(false);
  mockSignOut.mockResolvedValue(undefined);
  mockRevoke.mockResolvedValue({ ok: true });
});

describe('Senha e segurança · 2FA', () => {
  it('enrolls: secret + authenticator link, wrong code, then turns on', async () => {
    await open();
    expect(twoFactorSwitch()).not.toBeChecked();
    await fireEvent.press(twoFactorSwitch());
    expect(mockMfa.enroll).toHaveBeenCalled();
    expect(screen.getByTestId('security-2fa-secret')).toHaveTextContent(ENROLLMENT.secret);

    await fireEvent.press(screen.getByTestId('security-2fa-open'));
    expect(Linking.openURL).toHaveBeenCalledWith(ENROLLMENT.uri);

    await fireEvent.changeText(screen.getByTestId('security-2fa-code'), '12a3');
    expect(screen.getByTestId('security-2fa-code')).toHaveProp('value', '123');
    await fireEvent.press(screen.getByTestId('security-2fa-activate'));
    expect(screen.getByTestId('security-2fa-error')).toHaveTextContent('O código tem 6 números.');
    expect(mockMfa.verify).not.toHaveBeenCalled();

    mockMfa.verify.mockResolvedValueOnce({ ok: false, code: 'invalidCode' });
    await fireEvent.changeText(screen.getByTestId('security-2fa-code'), '000000');
    await fireEvent.press(screen.getByTestId('security-2fa-activate'));
    expect(screen.getByTestId('security-2fa-error')).toHaveTextContent(/Código incorreto/);

    await fireEvent.changeText(screen.getByTestId('security-2fa-code'), '123456');
    await fireEvent.press(screen.getByTestId('security-2fa-activate'));
    expect(mockMfa.verify).toHaveBeenLastCalledWith('f1', '123456');
    expect(screen.getByRole('alert')).toHaveTextContent('Verificação em duas etapas ativada.');
    expect(screen.queryByTestId('security-2fa-setup')).toBeNull();
    expect(twoFactorSwitch()).toBeChecked();
  });

  it('cancelling the setup drops the unverified factor', async () => {
    await open();
    await fireEvent.press(twoFactorSwitch());
    await fireEvent.press(screen.getByTestId('security-2fa-cancel'));
    expect(mockMfa.unenroll).toHaveBeenCalledWith('f1');
    expect(screen.queryByTestId('security-2fa-setup')).toBeNull();
    expect(twoFactorSwitch()).not.toBeChecked();
  });

  it('turns off an active factor', async () => {
    mockMfa.status.mockResolvedValue({ ok: true, data: { factorId: 'f9' } });
    await open();
    expect(twoFactorSwitch()).toBeChecked();
    await fireEvent.press(twoFactorSwitch());
    expect(mockMfa.unenroll).toHaveBeenCalledWith('f9');
    expect(twoFactorSwitch()).not.toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent('Verificação em duas etapas desativada.');
  });

  it('without connection the state is unknown: turning on says so', async () => {
    mockMfa.status.mockResolvedValue({ ok: false, code: 'network' });
    await open();
    await fireEvent.press(twoFactorSwitch());
    expect(mockMfa.enroll).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Confere sua internet/);
  });
});

describe('Senha e segurança · aparelhos conectados', () => {
  it('lists devices from SQLite (this one marked) and disconnects another', async () => {
    const mine = deviceId(DEMO_USER.id);
    putDevice({ id: mine, name: 'iPhone 15', platform: 'ios', lastSeenAt: ago(0) });
    putDevice({ id: 'ipad', name: 'iPad', platform: 'ios:tablet', lastSeenAt: ago(3 * DAY) });
    await open();
    expect(screen.getByTestId(`device-${mine}`)).toHaveTextContent(/iPhone 15/);
    expect(screen.getByTestId(`device-${mine}`)).toHaveTextContent(/iOS · agora/);
    expect(screen.getByTestId(`device-${mine}`)).toHaveTextContent(/Este aparelho/);
    expect(screen.queryByTestId(`device-out-${mine}`)).toBeNull();
    expect(screen.getByTestId('device-ipad')).toHaveTextContent(/há 3 dias/);

    await fireEvent.press(screen.getByRole('button', { name: 'Desconectar iPad' }));
    expect(mockRevoke).toHaveBeenCalledWith('ipad', false);
    expect(screen.queryByTestId('device-ipad')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('iPad desconectado.');
  });

  it('keeps the device when the RPC fails (offline)', async () => {
    mockRevoke.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    putDevice({ id: 'mac', name: 'MacBook Air', platform: 'web', lastSeenAt: ago(DAY) });
    await open();
    await fireEvent.press(screen.getByRole('button', { name: 'Desconectar MacBook Air' }));
    expect(screen.getByTestId('device-mac')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('Você está sem internet');
  });

  it('this device revoked from another one: signs out and goes to Welcome', async () => {
    const mine = deviceId(DEMO_USER.id);
    putDevice({ id: mine, name: 'iPhone 15', platform: 'ios', lastSeenAt: ago(0) });
    await open();
    expect(mockSignOut).not.toHaveBeenCalled();
    await act(async () => {
      putDevice({
        id: mine,
        name: 'iPhone 15',
        platform: 'ios',
        lastSeenAt: ago(0),
        revokedAt: ago(0),
      });
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
  });
});
