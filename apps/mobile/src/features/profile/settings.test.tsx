import { fireEvent, screen } from '@testing-library/react-native';
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

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = {};
  preferences.setLanguage('pt-BR');
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
    expect(screen.getByText('ana@gmail.com')).toBeOnTheScreen();
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

  it('binds the notification toggles to the store', async () => {
    await renderWithProviders(<SettingsScreen />);
    const promos = screen.getByRole('switch', { name: 'Ofertas de passeios' });
    expect(promos).not.toBeChecked();
    await fireEvent.press(promos);
    expect(useStore.getState().notifications.promos).toBe(true);
    await fireEvent.press(screen.getByRole('switch', { name: 'Memórias' }));
    expect(useStore.getState().notifications).toMatchObject({ memories: false, promos: true });
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

  it('signs out and goes to the welcome screen', async () => {
    useStore.setState({ signedIn: true });
    await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(useStore.getState().signedIn).toBe(false);
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
    expect(useStore.getState().me).toMatchObject({
      name: 'Ana R.',
      user: 'anaviaja',
      city: 'Recife',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Perfil atualizado.');
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('changes and removes the photo from the sheet', async () => {
    await openCfg('account');
    await fireEvent.press(screen.getByTestId('account-change-photo'));
    await fireEvent.press(screen.getByTestId('photo-choice-0'));
    expect(useStore.getState().me.avatar).toMatch(/^https:\/\//);
    expect(screen.getByRole('alert')).toHaveTextContent('Foto do perfil atualizada.');

    await fireEvent.press(screen.getByTestId('account-change-photo'));
    await fireEvent.press(screen.getByTestId('photo-remove'));
    expect(useStore.getState().me.avatar).toBeNull();
  });
});

describe('CfgScreen · email', () => {
  it('validates the new email and the password, then saves', async () => {
    await openCfg('email');
    expect(screen.getByTestId('email-current')).toHaveTextContent('ana@gmail.com');
    await submit();
    expect(errorText()).toHaveTextContent('Confere o novo e-mail.');
    await fireEvent.changeText(screen.getByTestId('email-new'), 'ana@gmail.com');
    await submit();
    expect(errorText()).toHaveTextContent('Esse já é o seu e-mail.');
    await fireEvent.changeText(screen.getByTestId('email-new'), 'ana@worlo.app');
    await submit();
    expect(errorText()).toHaveTextContent('Digite sua senha atual.');
    await fireEvent.changeText(screen.getByTestId('email-password'), 'segredo');
    await submit();
    expect(useStore.getState().me.email).toBe('ana@worlo.app');
    expect(mockRouter.back).toHaveBeenCalled();
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
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Senha alterada. Os outros aparelhos vão pedir login de novo.',
    );
    expect(screen.getByTestId('security-current')).toHaveProp('value', '');
  });

  it('toggles 2FA and signs out another device', async () => {
    await openCfg('security');
    await fireEvent.press(screen.getByRole('switch', { name: 'Verificação em duas etapas' }));
    expect(useStore.getState().twoFactor).toBe(true);
    expect(screen.getByText('Este aparelho')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Desconectar iPad' }));
    expect(useStore.getState().devices.map((d) => d.id)).toEqual(['s1', 's2']);
    expect(screen.queryByTestId('device-s3')).toBeNull();
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

  it('sets currency and units in the store', async () => {
    const { unmount } = await openCfg('currency');
    await fireEvent.press(screen.getByTestId('currency-EUR'));
    expect(useStore.getState().currency).toBe('EUR');
    expect(screen.getByRole('alert')).toHaveTextContent('Moeda: Euro.');
    await unmount();

    await openCfg('units');
    await fireEvent.press(screen.getByTestId('units-imperial'));
    expect(useStore.getState().units).toBe('imperial');
  });
});

describe('CfgScreen · privacy', () => {
  it('changes level and detail toggles; expenses stay locked', async () => {
    await openCfg('privacy');
    await fireEvent.press(screen.getByTestId('privacy-level-public'));
    expect(useStore.getState().privacy).toBe('public');
    await fireEvent.press(screen.getByRole('switch', { name: 'Fotos' }));
    expect(useStore.getState().privacyDetail.photos).toBe(true);
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
      /Seu arquivo chega em ana@gmail.com em até 24h./,
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
    useStore.setState({ signedIn: true });
    await openCfg('delete');
    expect(screen.getByTestId('cfg-cta')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('delete-confirm'), 'exclui');
    expect(screen.getByTestId('cfg-cta')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('delete-confirm'), 'excluir');
    expect(screen.getByTestId('cfg-cta')).toBeEnabled();
    await submit();
    expect(useStore.getState().signedIn).toBe(false);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
  });

  it('offers exporting first', async () => {
    await openCfg('delete');
    await fireEvent.press(screen.getByTestId('delete-export-first'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.cfg('export'));
  });
});
