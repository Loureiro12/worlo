import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import { repos } from '@/data/repositories';
import { type AuthResult, auth } from '@/lib/auth';
import { preferences } from '@/lib/preferences';
import { routes } from '@/navigation/routes';
import { PreferencesProvider } from '@/providers/PreferencesProvider';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { CfgScreen } from './CfgScreen';
import { accountError, deleteConfirmed, emailError, passwordError } from './cfg/validation';
import { SettingsScreen } from './SettingsScreen';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

// A real phone (simulators have no push): the permission row can show.
jest.mock('@/data/communityApi', () => require('@/features/community/testServer').mockModule());
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-device', () => ({ ...jest.requireActual('expo-device'), isDevice: true }));

jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  auth: {
    signIn: jest.fn(),
    verifyPassword: jest.fn(),
    updatePassword: jest.fn(),
    updateEmail: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
  },
}));

const mockAuth = auth as unknown as Record<
  'signIn' | 'verifyPassword' | 'updatePassword' | 'updateEmail' | 'signOut' | 'deleteAccount',
  jest.Mock
>;
const OK: AuthResult = { ok: true };
const WRONG: AuthResult = { ok: false, code: 'invalidCredentials' };
const profile = () => repos.profile.get();

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = {};
  preferences.setLanguage('pt-BR');
  mockAuth.signIn.mockResolvedValue(OK);
  mockAuth.verifyPassword.mockResolvedValue(OK);
  mockAuth.updatePassword.mockResolvedValue(OK);
  mockAuth.updateEmail.mockResolvedValue(OK);
  mockAuth.signOut.mockResolvedValue(undefined);
  mockAuth.deleteAccount.mockResolvedValue(OK);
});

const openCfg = async (section: string) => {
  mockParams = { section };
  return renderWithProviders(
    <PreferencesProvider>
      <CfgScreen />
    </PreferencesProvider>,
  );
};
const submit = () => fireEvent.press(screen.getByTestId('cfg-cta'));
const errorText = () => screen.getByTestId('cfg-error');

describe('validation rules', () => {
  it('follows the 04_INTERACTIONS order', () => {
    expect(accountError({ name: ' ', user: 'x' })).toBe('name');
    expect(accountError({ name: 'Ana', user: 'ab' })).toBe('user');
    expect(accountError({ name: 'Ana', user: 'ana.v_1' })).toBeNull();
    expect(emailError({ newEmail: 'ana@', password: '' }, 'a@b.co')).toBe('email');
    expect(emailError({ newEmail: 'A@B.co', password: '' }, 'a@b.co')).toBe('same');
    expect(emailError({ newEmail: 'n@b.co', password: '' }, 'a@b.co')).toBe('password');
    expect(passwordError({ current: '', newPassword: '', confirm: '' })).toBe('current');
    expect(passwordError({ current: 'x', newPassword: '1234567', confirm: '' })).toBe(
      'newPassword',
    );
    expect(passwordError({ current: 'x', newPassword: '12345678', confirm: '1' })).toBe('confirm');
    expect(deleteConfirmed(' excluir ', 'EXCLUIR')).toBe(true);
    expect(deleteConfirmed('EXCLUI', 'EXCLUIR')).toBe(false);
  });
});

describe('SettingsScreen', () => {
  it('shows the current values and navigates to each sub-screen', async () => {
    await renderWithProviders(<SettingsScreen />);
    expect(screen.getByTestId('settings-screen')).toBeOnTheScreen();
    expect(screen.getByText('Ana Ribeiro')).toBeOnTheScreen();
    expect(screen.getByText('ana@worlo.app')).toBeOnTheScreen();
    expect(screen.getByText('Português (Brasil)')).toBeOnTheScreen();
    expect(screen.getByText('R$ BRL')).toBeOnTheScreen();
    expect(screen.getByText('Métrico')).toBeOnTheScreen();
    expect(screen.getByText('Amigos')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('settings-language'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.cfg('language'));
    await fireEvent.press(screen.getByTestId('settings-delete'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.cfg('delete'));
    await fireEvent.press(screen.getByTestId('settings-photos'));
    expect(mockRouter.push).toHaveBeenLastCalledWith(routes.photos);
  });

  it('binds the notification toggles to the profile', async () => {
    await renderWithProviders(<SettingsScreen />);
    const promos = screen.getByRole('switch', { name: 'Ofertas de passeios' });
    expect(promos).not.toBeChecked();
    await fireEvent.press(promos);
    expect(profile()?.notificationPrefs.promos).toBe(true);
    await fireEvent.press(screen.getByRole('switch', { name: 'Memórias' }));
    expect(profile()?.notificationPrefs).toMatchObject({ memories: false, promos: true });
  });

  describe('when the phone blocks notifications', () => {
    const permissions = Notifications.getPermissionsAsync as jest.Mock;
    const blocked = (status: string, canAskAgain: boolean) =>
      permissions.mockResolvedValue({ status, canAskAgain });
    afterEach(() => blocked('granted', true));

    it('shows nothing while they are allowed', async () => {
      await renderWithProviders(<SettingsScreen />);
      expect(screen.queryByTestId('settings-notif-device')).toBeNull();
    });

    it('asks the first time', async () => {
      blocked('undetermined', true);
      await renderWithProviders(<SettingsScreen />);
      expect(await screen.findByText('Notificações desligadas')).toBeOnTheScreen();
      await fireEvent.press(screen.getByTestId('settings-notif-device'));
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('opens the system settings after "Não permitir"', async () => {
      blocked('denied', false);
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      await renderWithProviders(<SettingsScreen />);
      await fireEvent.press(await screen.findByTestId('settings-notif-device'));
      expect(openSettings).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      openSettings.mockRestore();
    });
  });

  it('switches the demo state', async () => {
    await renderWithProviders(<SettingsScreen />);
    expect(screen.getByTestId('demo-normal')).toBeChecked();
    await fireEvent.press(screen.getByTestId('demo-offline'));
    expect(useStore.getState().demo).toBe('offline');
    expect(screen.getByTestId('demo-offline')).toBeChecked();
    await fireEvent.press(screen.getByTestId('demo-normal'));
    expect(useStore.getState().demo).toBe('normal');
  });

  it('signs out (busy while it runs) and goes to the welcome screen', async () => {
    let finish: () => void = () => {};
    mockAuth.signOut.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId('settings-sign-out'));
    expect(screen.getByTestId('settings-sign-out')).toBeBusy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
  });
});

describe('CfgScreen · account', () => {
  it('validates name, then username, and saves', async () => {
    await openCfg('account');
    await fireEvent.changeText(screen.getByTestId('account-name'), '  ');
    await submit();
    expect(errorText()).toHaveTextContent('O nome não pode ficar vazio.');
    expect(screen.getByTestId('account-name')).toHaveProp('aria-invalid', true);

    await fireEvent.changeText(screen.getByTestId('account-name'), 'Ana R.');
    expect(screen.queryByTestId('cfg-error')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('account-user'), 'An');
    expect(screen.getByTestId('account-user')).toHaveProp('value', 'an');
    await submit();
    expect(errorText()).toHaveTextContent('Use 3+ letras minúsculas, números, ponto ou _.');

    await fireEvent.changeText(screen.getByTestId('account-user'), 'Ana Viaja');
    expect(screen.getByTestId('account-preview')).toHaveTextContent('worlo.app/anaviaja');
    await fireEvent.changeText(screen.getByTestId('account-city'), 'Recife');
    await submit();
    expect(profile()).toMatchObject({
      name: 'Ana R.',
      username: 'anaviaja',
      city: 'Recife',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Perfil atualizado.');
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('changes and removes the photo from the sheet', async () => {
    await openCfg('account');
    await fireEvent.press(screen.getByTestId('account-change-photo'));
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///me.jpg', mimeType: 'image/jpeg', width: 1, height: 1 }],
    });
    await fireEvent.press(screen.getByTestId('photo-gallery'));
    expect(await screen.findByText('Foto do perfil atualizada.')).toBeOnTheScreen();
    // The photo the person picked, uploaded: not a placeholder.
    expect(profile()?.avatarUrl).toMatch(/photos\/|uploaded/);
    expect(profile()?.avatarUrl).not.toMatch(/picsum/);

    await fireEvent.press(screen.getByTestId('account-change-photo'));
    await fireEvent.press(screen.getByTestId('photo-remove'));
    expect(profile()?.avatarUrl).toBeNull();
  });

  it('keeps the photo when the picker is canceled or the camera denied', async () => {
    await openCfg('account');
    const before = profile()?.avatarUrl;
    await fireEvent.press(screen.getByTestId('account-change-photo'));
    jest
      .mocked(ImagePicker.launchImageLibraryAsync)
      .mockResolvedValueOnce({ canceled: true, assets: null });
    await fireEvent.press(screen.getByTestId('photo-gallery'));
    await waitFor(() => expect(screen.getByTestId('photo-camera')).toBeEnabled());
    jest
      .mocked(ImagePicker.requestCameraPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never);
    await fireEvent.press(screen.getByTestId('photo-camera'));
    await waitFor(() => expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled());
    expect(profile()?.avatarUrl).toBe(before);
  });
});

describe('CfgScreen · email', () => {
  it('validates the new email and the password, then asks Supabase to change it', async () => {
    await openCfg('email');
    expect(screen.getByTestId('email-current')).toHaveTextContent('ana@worlo.app');
    await submit();
    expect(errorText()).toHaveTextContent('Confere o novo e-mail.');
    await fireEvent.changeText(screen.getByTestId('email-new'), 'ANA@worlo.app');
    await submit();
    expect(errorText()).toHaveTextContent('Esse já é o seu e-mail.');
    await fireEvent.changeText(screen.getByTestId('email-new'), 'ana@gmail.com');
    await submit();
    expect(errorText()).toHaveTextContent('Digite sua senha atual.');
    expect(mockAuth.updateEmail).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('email-password'), 'worlo1234');
    await submit();
    expect(mockAuth.updateEmail).toHaveBeenCalledWith(
      'ana@worlo.app',
      'worlo1234',
      'ana@gmail.com',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Link de confirmação enviado pra ana@gmail.com.',
    );
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows a wrong password as a form error', async () => {
    mockAuth.updateEmail.mockResolvedValueOnce(WRONG);
    await openCfg('email');
    await fireEvent.changeText(screen.getByTestId('email-new'), 'ana@gmail.com');
    await fireEvent.changeText(screen.getByTestId('email-password'), 'errada');
    await submit();
    expect(errorText()).toHaveTextContent('Senha atual não confere.');
    expect(screen.getByTestId('email-password')).toHaveProp('aria-invalid', true);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe('CfgScreen · security', () => {
  it('validates current, new ≥ 8 and confirmation, then saves', async () => {
    await openCfg('security');
    await submit();
    expect(errorText()).toHaveTextContent('Digite a senha atual.');
    await fireEvent.changeText(screen.getByTestId('security-current'), 'velha123');
    await fireEvent.changeText(screen.getByTestId('security-newPassword'), 'curta');
    await submit();
    expect(errorText()).toHaveTextContent('A nova senha precisa de 8 caracteres.');
    await fireEvent.changeText(screen.getByTestId('security-newPassword'), 'novasenha1');
    await fireEvent.changeText(screen.getByTestId('security-confirm'), 'novasenha2');
    await submit();
    expect(errorText()).toHaveTextContent('As senhas não batem.');
    await fireEvent.changeText(screen.getByTestId('security-confirm'), 'novasenha1');
    await submit();
    expect(mockAuth.verifyPassword).toHaveBeenCalledWith('ana@worlo.app', 'velha123');
    expect(mockAuth.updatePassword).toHaveBeenCalledWith('novasenha1');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Senha alterada. Os outros aparelhos vão pedir login de novo.',
    );
    expect(screen.getByTestId('security-current')).toHaveProp('value', '');
  });

  it('rejects a wrong current password without changing it', async () => {
    mockAuth.verifyPassword.mockResolvedValueOnce(WRONG);
    await openCfg('security');
    await fireEvent.changeText(screen.getByTestId('security-current'), 'errada');
    await fireEvent.changeText(screen.getByTestId('security-newPassword'), 'novasenha1');
    await fireEvent.changeText(screen.getByTestId('security-confirm'), 'novasenha1');
    await submit();
    expect(errorText()).toHaveTextContent('A senha atual não confere.');
    expect(screen.getByTestId('security-current')).toHaveProp('aria-invalid', true);
    expect(mockAuth.updatePassword).not.toHaveBeenCalled();
  });

  it('shows a server error from the password change', async () => {
    mockAuth.updatePassword.mockResolvedValueOnce({ ok: false, code: 'weakPassword' });
    await openCfg('security');
    await fireEvent.changeText(screen.getByTestId('security-current'), 'worlo1234');
    await fireEvent.changeText(screen.getByTestId('security-newPassword'), '12345678');
    await fireEvent.changeText(screen.getByTestId('security-confirm'), '12345678');
    await submit();
    expect(errorText()).toHaveTextContent('Essa senha é fácil de adivinhar. Tenta uma mais forte.');
  });
});

describe('CfgScreen · preferences', () => {
  it('applies the language immediately', async () => {
    await openCfg('language');
    expect(screen.getByTestId('language-pt-BR')).toBeChecked();
    await fireEvent.press(screen.getByTestId('language-es'));
    expect(screen.getByTestId('language-es')).toBeChecked();
    expect(
      screen.getByText(
        'Cambia los textos de la app. Los nombres de lugares quedan en el idioma local.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('Idioma: Español.');
    expect(preferences.getLanguage()).toBe('es');
  });

  it('sets currency and units on the profile', async () => {
    const { unmount } = await openCfg('currency');
    await fireEvent.press(screen.getByTestId('currency-EUR'));
    expect(profile()?.currency).toBe('EUR');
    expect(screen.getByRole('alert')).toHaveTextContent('Moeda: Euro.');
    await unmount();

    await openCfg('units');
    await fireEvent.press(screen.getByTestId('units-imperial'));
    expect(profile()?.units).toBe('imperial');
  });
});

describe('CfgScreen · privacy', () => {
  it('changes level and detail toggles; expenses stay locked', async () => {
    await openCfg('privacy');
    await fireEvent.press(screen.getByTestId('privacy-level-public'));
    expect(profile()?.privacy).toBe('public');
    await fireEvent.press(screen.getByRole('switch', { name: 'Fotos' }));
    expect(profile()?.privacyDetail.photos).toBe(true);
    expect(screen.getByText('Sempre privados, só você vê')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('privacy-blocked'));
    expect(screen.getByRole('alert')).toHaveTextContent('Você não bloqueou ninguém.');
  });
});

describe('CfgScreen · export', () => {
  it('requires one item and then shows "Pedido recebido"', async () => {
    await openCfg('export');
    for (const key of ['trips', 'photos', 'money']) {
      await fireEvent.press(screen.getByTestId(`export-${key}`));
    }
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha pelo menos um item.');
    expect(screen.queryByTestId('export-received')).toBeNull();

    await fireEvent.press(screen.getByTestId('export-community'));
    await submit();
    expect(screen.getByTestId('export-received')).toHaveTextContent(
      /Seu arquivo chega em ana@worlo.app em até 24h./,
    );
    expect(screen.getByTestId('cfg-cta')).toBeDisabled();
  });
});

describe('CfgScreen · help', () => {
  it('opens one FAQ at a time and contacts support', async () => {
    await openCfg('help');
    expect(screen.getByTestId('faq-answer-1')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('faq-2'));
    expect(screen.queryByTestId('faq-answer-1')).toBeNull();
    expect(screen.getByTestId('faq-answer-2')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('help-support'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.chat('support'));
  });
});

describe('CfgScreen · delete', () => {
  it('enables the red button only after typing EXCLUIR (case-insensitive)', async () => {
    await openCfg('delete');
    expect(screen.getByTestId('cfg-cta')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('delete-confirm'), 'exclui');
    expect(screen.getByTestId('cfg-cta')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('delete-confirm'), 'excluir');
    expect(screen.getByTestId('cfg-cta')).toBeEnabled();
    await submit();
    expect(mockAuth.deleteAccount).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
    expect(screen.getByRole('alert')).toHaveTextContent('Conta excluída. Até a próxima viagem.');
  });

  it('keeps the account and shows a toast when deleting fails', async () => {
    mockAuth.deleteAccount.mockResolvedValueOnce({ ok: false, code: 'network' });
    await openCfg('delete');
    await fireEvent.changeText(screen.getByTestId('delete-confirm'), 'EXCLUIR');
    await submit();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não deu pra falar com o Worlo. Confere sua internet.',
    );
  });

  it('offers exporting first', async () => {
    await openCfg('delete');
    await fireEvent.press(screen.getByTestId('delete-export-first'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.cfg('export'));
  });
});
