import { act, fireEvent, screen } from '@testing-library/react-native';
import { repos } from '@/data/repositories';
import { type AuthResult, auth, mfa } from '@/lib/auth';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { seedDatabase } from '@/test/seed';
import { elapse, renderWithProviders, SIGNED_OUT, useFakeClock } from '@/test-utils';
import { clearEntry, enterApp } from './entry';
import { FirstMapScreen } from './FirstMapScreen';
import { ForgotScreen } from './ForgotScreen';
import { LoginScreen } from './LoginScreen';
import { OnboardingMapScreen } from './OnboardingMapScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { SignupScreen } from './SignupScreen';
import { SPLASH_MS, SplashScreen } from './SplashScreen';
import { TwoFactorScreen } from './TwoFactorScreen';
import { forgotError, loginError, signupError } from './validation';
import { WelcomeScreen } from './WelcomeScreen';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canGoBack: () => true,
};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

let mockLinkingUrl: string | null = null;
jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  useLinkingURL: () => mockLinkingUrl,
}));

// Supabase Auth is driven per test; the rest of the module (session hooks) stays real.
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  auth: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signInWithApple: jest.fn(),
    signInWithGoogle: jest.fn(),
    sendPasswordReset: jest.fn(),
    sessionFromUrl: jest.fn(),
    updatePassword: jest.fn(),
    updateEmail: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    appleAvailable: true,
    googleAvailable: true,
  },
  mfa: { needsChallenge: jest.fn(), challenge: jest.fn() },
}));

const mockAuth = auth as unknown as {
  [K in keyof typeof auth]: (typeof auth)[K] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : boolean;
};

const mockMfa = mfa as unknown as Record<'needsChallenge' | 'challenge', jest.Mock>;

const OK: AuthResult = { ok: true };
const fail = (code: 'invalidCredentials' | 'emailTaken' | 'network'): AuthResult => ({
  ok: false,
  code,
});

/** A promise the test resolves by hand (to observe the busy state). */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  clearEntry();
  mockLinkingUrl = null;
  mockAuth.appleAvailable = true;
  mockAuth.googleAvailable = true;
  for (const fn of [
    mockAuth.signUp,
    mockAuth.signIn,
    mockAuth.signInWithApple,
    mockAuth.signInWithGoogle,
    mockAuth.sendPasswordReset,
    mockAuth.sessionFromUrl,
    mockAuth.updatePassword,
  ]) {
    fn.mockResolvedValue(OK);
  }
  // No 2FA unless a test turns it on.
  mockMfa.needsChallenge.mockResolvedValue(false);
  mockMfa.challenge.mockResolvedValue(OK);
});

describe('validation rules', () => {
  it('reports only the first invalid field, in order', () => {
    expect(signupError({ name: ' ', email: 'x', password: '' })).toBe('name');
    expect(signupError({ name: 'Ana', email: 'ana@gmail', password: '' })).toBe('email');
    expect(signupError({ name: 'Ana', email: 'ana@gmail.com', password: '1234567' })).toBe(
      'password',
    );
    expect(signupError({ name: 'Ana', email: 'ana@gmail.com', password: '12345678' })).toBeNull();
    expect(loginError({ email: 'a@b.c', password: '' })).toBe('password');
    expect(loginError({ email: 'nope', password: 'x' })).toBe('email');
    expect(forgotError({ email: 'a@b.co' })).toBeNull();
  });
});

describe('SplashScreen (entry gate)', () => {
  useFakeClock();

  it('goes to Welcome after 3s when signed out', async () => {
    await renderWithProviders(<SplashScreen />, { session: SIGNED_OUT });
    expect(screen.getByText('Toque pra pular')).toBeOnTheScreen();
    await elapse(SPLASH_MS - 1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await elapse(1);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
  });

  it('goes to Explorar when signed in with an onboarded, synced account', async () => {
    await renderWithProviders(<SplashScreen />);
    await elapse(SPLASH_MS);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.explore);
  });

  it('sends an account that never finished onboarding to the onboarding map', async () => {
    repos.profile.update({ onboardedAt: null });
    await renderWithProviders(<SplashScreen />);
    await elapse(SPLASH_MS);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.onboardingMap);
  });

  it('stays while the session is loading', async () => {
    await renderWithProviders(<SplashScreen />, { session: { status: 'loading', user: null } });
    await elapse(SPLASH_MS * 2);
    await fireEvent.press(screen.getByTestId('splash-screen'));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('waits for the first sync; offline shows the blocking state, then moves on once data lands', async () => {
    seedDatabase({ demo: false });
    await renderWithProviders(<SplashScreen />);
    await elapse(SPLASH_MS);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('state-offline')).toBeOnTheScreen();
    expect(screen.getByText('Você está sem internet')).toBeOnTheScreen();

    await act(() => seedDatabase());
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.explore);
  });

  it('offers signing out from the blocking state', async () => {
    seedDatabase({ demo: false });
    await renderWithProviders(<SplashScreen />);
    await elapse(SPLASH_MS);
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('skips on tap and navigates only once', async () => {
    await renderWithProviders(<SplashScreen />, { session: SIGNED_OUT });
    await fireEvent.press(screen.getByTestId('splash-screen'));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
    await fireEvent.press(screen.getByTestId('splash-screen'));
    await elapse(SPLASH_MS);
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });

  it('a session still at AAL1 with 2FA on goes to the code screen', async () => {
    mockMfa.needsChallenge.mockResolvedValue(true);
    seedDatabase({ demo: false });
    await renderWithProviders(<SplashScreen />);
    await elapse(SPLASH_MS);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.twoFactor);
    expect(screen.queryByTestId('state-offline')).toBeNull();
  });

  it('right after login: no intro, straight to Explorar with the greeting', async () => {
    await enterApp(mockRouter as never, { greet: true });
    mockRouter.replace.mockClear();
    await renderWithProviders(<SplashScreen />);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.explore);
    expect(screen.getByText('Bem-vinda de volta, Ana.')).toBeOnTheScreen();
  });
});

describe('WelcomeScreen', () => {
  it('shows the copy and routes to signup / login', async () => {
    await renderWithProviders(<WelcomeScreen />, { session: SIGNED_OUT });
    expect(screen.getByText('Seu mundo, do seu jeito.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Começar pelo meu mapa' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.signup);
    await fireEvent.press(screen.getByTestId('welcome-login'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.login);
  });
});

describe('Social login (Apple / Google)', () => {
  it('shows only the available providers, and hides the block without any', async () => {
    mockAuth.appleAvailable = false;
    const { unmount } = await renderWithProviders(<LoginScreen />, { session: SIGNED_OUT });
    expect(screen.queryByTestId('auth-apple')).toBeNull();
    expect(screen.getByTestId('auth-google')).toBeOnTheScreen();
    expect(screen.getByText('ou com e-mail')).toBeOnTheScreen();
    await unmount();

    mockAuth.googleAvailable = false;
    await renderWithProviders(<SignupScreen />, { session: SIGNED_OUT });
    expect(screen.queryByTestId('auth-google')).toBeNull();
    expect(screen.queryByText('ou com e-mail')).toBeNull();
  });

  it('enters through the gate on success', async () => {
    await renderWithProviders(<LoginScreen />, { session: SIGNED_OUT });
    await fireEvent.press(screen.getByTestId('auth-apple'));
    expect(mockAuth.signInWithApple).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.splash);
  });

  it('does nothing on cancel and shows a toast on error', async () => {
    mockAuth.signInWithGoogle.mockResolvedValueOnce({ ok: false, cancelled: true });
    await renderWithProviders(<SignupScreen />, { session: SIGNED_OUT });
    await fireEvent.press(screen.getByTestId('auth-google'));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();

    mockAuth.signInWithGoogle.mockResolvedValueOnce(fail('network'));
    await fireEvent.press(screen.getByTestId('auth-google'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não deu pra falar com o Worlo. Confere sua internet.',
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('SignupScreen', () => {
  it('validates fields in order, marking only the first invalid one', async () => {
    await renderWithProviders(<SignupScreen />, { session: SIGNED_OUT });
    const name = screen.getByTestId('signup-name');
    const email = screen.getByTestId('signup-email');
    const password = screen.getByTestId('signup-password');

    await fireEvent.press(screen.getByTestId('signup-submit'));
    expect(screen.getByTestId('signup-error')).toHaveTextContent(
      'Diz como a gente pode te chamar.',
    );
    expect(name).toHaveProp('aria-invalid', true);
    expect(email).toHaveProp('aria-invalid', false);

    await fireEvent.changeText(name, 'Ana');
    expect(screen.queryByTestId('signup-error')).toBeNull();
    expect(name).toHaveProp('aria-invalid', false);

    await fireEvent.changeText(email, 'ana@gmail');
    await fireEvent.press(screen.getByTestId('signup-submit'));
    expect(screen.getByTestId('signup-error')).toHaveTextContent(
      'Confere o e-mail, parece incompleto.',
    );
    expect(email).toHaveProp('aria-invalid', true);

    await fireEvent.changeText(email, 'ana@gmail.com');
    await fireEvent.changeText(password, '1234');
    await fireEvent.press(screen.getByTestId('signup-submit'));
    expect(screen.getByTestId('signup-error')).toHaveTextContent(
      'A senha precisa ter pelo menos 8 caracteres.',
    );
    expect(password).toHaveProp('aria-invalid', true);
    expect(mockAuth.signUp).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows password strength', async () => {
    await renderWithProviders(<SignupScreen />, { session: SIGNED_OUT });
    expect(screen.getByText('Use 8 caracteres ou mais')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('signup-password'), 'abc');
    expect(screen.getByText('Fraca: precisa de 8 caracteres')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('signup-password'), 'abcdefgh');
    expect(screen.getByText('Boa')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('signup-password'), 'abcdefgh12');
    expect(screen.getByText('Forte')).toBeOnTheScreen();
  });

  const fill = async () => {
    await fireEvent.changeText(screen.getByTestId('signup-name'), ' Bia Souza ');
    await fireEvent.changeText(screen.getByTestId('signup-email'), 'bia@email.com');
    await fireEvent.changeText(screen.getByTestId('signup-password'), 'senha1234');
  };

  it('creates the account (busy, no double submit) and hands over to the gate', async () => {
    const request = deferred<AuthResult>();
    mockAuth.signUp.mockReturnValueOnce(request.promise);
    await renderWithProviders(<SignupScreen />, { session: SIGNED_OUT });
    await fill();
    await fireEvent.press(screen.getByTestId('signup-submit'));
    expect(screen.getByTestId('signup-submit')).toBeBusy();
    await fireEvent.press(screen.getByTestId('signup-submit'));
    expect(mockAuth.signUp).toHaveBeenCalledTimes(1);
    expect(mockAuth.signUp).toHaveBeenCalledWith(' Bia Souza ', 'bia@email.com', 'senha1234');

    await act(async () => request.resolve(OK));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.splash);
  });

  it('shows the server error', async () => {
    mockAuth.signUp.mockResolvedValueOnce(fail('emailTaken'));
    await renderWithProviders(<SignupScreen />, { session: SIGNED_OUT });
    await fill();
    await fireEvent.press(screen.getByTestId('signup-submit'));
    expect(screen.getByTestId('signup-error')).toHaveTextContent(
      'Já existe uma conta com esse e-mail. Que tal entrar?',
    );
    expect(screen.getByTestId('signup-submit')).not.toBeBusy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('links to login and goes back', async () => {
    await renderWithProviders(<SignupScreen />, { session: SIGNED_OUT });
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.login);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('LoginScreen', () => {
  it('requires a valid email, then a password', async () => {
    await renderWithProviders(<LoginScreen />, { session: SIGNED_OUT });
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-error')).toHaveTextContent(
      'Confere o e-mail, parece incompleto.',
    );
    expect(screen.getByTestId('login-email')).toHaveProp('aria-invalid', true);

    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@worlo.app');
    expect(screen.queryByTestId('login-error')).toBeNull();
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-error')).toHaveTextContent('Digite sua senha.');
    expect(screen.getByTestId('login-password')).toHaveProp('aria-invalid', true);
    expect(mockAuth.signIn).not.toHaveBeenCalled();
  });

  it('signs in (busy while it runs) and goes to the gate', async () => {
    const request = deferred<AuthResult>();
    mockAuth.signIn.mockReturnValueOnce(request.promise);
    await renderWithProviders(<LoginScreen />, { session: SIGNED_OUT });
    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@worlo.app');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'worlo1234');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-submit')).toBeBusy();
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(mockAuth.signIn).toHaveBeenCalledTimes(1);
    expect(mockAuth.signIn).toHaveBeenCalledWith('ana@worlo.app', 'worlo1234');

    await act(async () => request.resolve(OK));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.splash);
  });

  it('shows wrong credentials as a form error', async () => {
    mockAuth.signIn.mockResolvedValueOnce(fail('invalidCredentials'));
    await renderWithProviders(<LoginScreen />, { session: SIGNED_OUT });
    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@worlo.app');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'errada');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-error')).toHaveTextContent(
      'E-mail ou senha não batem. Confere e tenta de novo.',
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('login-password'), 'worlo1234');
    expect(screen.queryByTestId('login-error')).toBeNull();
  });

  it('opens forgot password and signup', async () => {
    await renderWithProviders(<LoginScreen />, { session: SIGNED_OUT });
    await fireEvent.press(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.forgot);
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.signup);
  });
});

describe('Two-factor (TOTP) sign-in', () => {
  it('login on an account with 2FA goes to the code screen instead of the gate', async () => {
    mockMfa.needsChallenge.mockResolvedValue(true);
    await renderWithProviders(<LoginScreen />, { session: SIGNED_OUT });
    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@worlo.app');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'worlo1234');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.twoFactor);
    expect(mockRouter.replace).not.toHaveBeenCalledWith(routes.splash);
  });

  it('asks for 6 digits, shows a wrong code, then enters the app', async () => {
    await renderWithProviders(<TwoFactorScreen />);
    expect(screen.getByText('Verificação em duas etapas')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('two-factor-code'), '12 3');
    expect(screen.getByTestId('two-factor-code')).toHaveProp('value', '123');
    await fireEvent.press(screen.getByTestId('two-factor-submit'));
    expect(screen.getByTestId('two-factor-error')).toHaveTextContent('O código tem 6 números.');
    expect(mockMfa.challenge).not.toHaveBeenCalled();

    mockMfa.challenge.mockResolvedValueOnce({ ok: false, code: 'invalidCode' });
    await fireEvent.changeText(screen.getByTestId('two-factor-code'), '000000');
    await fireEvent.press(screen.getByTestId('two-factor-submit'));
    expect(screen.getByTestId('two-factor-error')).toHaveTextContent(/Código incorreto/);
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('two-factor-code'), '123456');
    await fireEvent.press(screen.getByTestId('two-factor-submit'));
    expect(mockMfa.challenge).toHaveBeenLastCalledWith('123456');
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.splash);
  });

  it('can sign out instead', async () => {
    await renderWithProviders(<TwoFactorScreen />);
    await fireEvent.press(screen.getByTestId('two-factor-sign-out'));
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
  });
});

describe('ForgotScreen', () => {
  it('validates the email, sends the link, then shows the sent state', async () => {
    await renderWithProviders(<ForgotScreen />, { session: SIGNED_OUT });
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(screen.getByTestId('forgot-error')).toHaveTextContent(
      'Confere o e-mail, parece incompleto.',
    );
    expect(mockAuth.sendPasswordReset).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('forgot-email'), 'ana@gmail.com');
    expect(screen.queryByTestId('forgot-error')).toBeNull();
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(mockAuth.sendPasswordReset).toHaveBeenCalledWith('ana@gmail.com');

    expect(screen.getByText('Confere seu e-mail')).toBeOnTheScreen();
    expect(
      screen.getByText('Enviamos o link pra ana@gmail.com. Ele vale por 30 minutos.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Não chegou? Enviar de novo' }));
    expect(mockAuth.sendPasswordReset).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Link reenviado.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar pra entrar' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows a server error and stays on the form', async () => {
    mockAuth.sendPasswordReset.mockResolvedValueOnce(fail('network'));
    await renderWithProviders(<ForgotScreen />, { session: SIGNED_OUT });
    await fireEvent.changeText(screen.getByTestId('forgot-email'), 'ana@gmail.com');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(screen.getByTestId('forgot-error')).toHaveTextContent(
      'Não deu pra falar com o Worlo. Confere sua internet.',
    );
    expect(screen.queryByTestId('forgot-sent')).toBeNull();
  });
});

describe('ResetPasswordScreen', () => {
  const LINK = 'worlo://reset-password#access_token=a&refresh_token=r&type=recovery';

  it('opens the session from the link and saves the new password', async () => {
    mockLinkingUrl = LINK;
    await renderWithProviders(<ResetPasswordScreen />, { session: SIGNED_OUT });
    expect(mockAuth.sessionFromUrl).toHaveBeenCalledWith(LINK);
    expect(screen.getByText('Crie uma nova senha')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByTestId('reset-password'), 'curta');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(screen.getByTestId('reset-error')).toHaveTextContent(
      'A senha precisa ter pelo menos 8 caracteres.',
    );
    expect(mockAuth.updatePassword).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('reset-password'), 'novasenha12');
    expect(screen.getByText('Forte')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(mockAuth.updatePassword).toHaveBeenCalledWith('novasenha12');
    expect(screen.getByRole('alert')).toHaveTextContent('Senha nova salva.');
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.splash);
  });

  it('shows the server error when saving fails', async () => {
    mockLinkingUrl = LINK;
    mockAuth.updatePassword.mockResolvedValueOnce(fail('network'));
    await renderWithProviders(<ResetPasswordScreen />, { session: SIGNED_OUT });
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'novasenha12');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(screen.getByTestId('reset-error')).toHaveTextContent(
      'Não deu pra falar com o Worlo. Confere sua internet.',
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('expired or invalid link: error state with a way back', async () => {
    mockLinkingUrl = 'worlo://reset-password#error=access_denied&error_code=otp_expired';
    mockAuth.sessionFromUrl.mockResolvedValueOnce({ ok: false, code: 'unknown' });
    await renderWithProviders(<ResetPasswordScreen />, { session: SIGNED_OUT });
    expect(screen.getByText('Esse link não vale mais')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('reset-back-login'));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.login);
    await fireEvent.press(screen.getByTestId('reset-new-link'));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.forgot);
  });

  it('without a link it is invalid too', async () => {
    await renderWithProviders(<ResetPasswordScreen />, { session: SIGNED_OUT });
    expect(screen.getByTestId('reset-invalid')).toBeOnTheScreen();
    expect(mockAuth.sessionFromUrl).not.toHaveBeenCalled();
  });
});

describe('OnboardingMapScreen', () => {
  beforeEach(() => {
    repos.profile.update({ onboardedAt: null });
  });

  it('needs at least one country to continue', async () => {
    await renderWithProviders(<OnboardingMapScreen />);
    expect(screen.getByText('Nenhum ainda')).toBeOnTheScreen();
    expect(screen.getByText('países marcados')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    expect(screen.getByText('Marca pelo menos um país pra começar.')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('counts marked countries and continues to the trip form', async () => {
    await renderWithProviders(<OnboardingMapScreen />);
    await act(() => useStore.getState().toggleOnboardingCountry('076'));
    expect(screen.getByText('país marcado')).toBeOnTheScreen();
    expect(screen.getByText('Brasil')).toBeOnTheScreen();
    await act(() => useStore.getState().toggleOnboardingCountry('620'));
    expect(screen.getByText('Brasil · Portugal')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    expect(mockRouter.push).toHaveBeenCalledWith(
      routes.tripForm({ mode: 'onboarding', kind: 'past', dest: 'Brasil' }),
    );
    expect(repos.profile.get()?.onboardedAt).toBeNull();
  });

  it('skipping finishes onboarding on the profile and goes to Explorar', async () => {
    await renderWithProviders(<OnboardingMapScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pular' }));
    expect(repos.profile.get()?.onboardedAt).toEqual(expect.any(String));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.explore);
  });
});

describe('FirstMapScreen', () => {
  beforeEach(() => {
    repos.profile.update({ onboardedAt: null });
  });

  it('shows the stats and finishes onboarding on the map', async () => {
    useStore.setState({ onboardingVisited: ['076', '620'] });
    await renderWithProviders(<FirstMapScreen />);
    expect(screen.getByText('Seu mapa começou.')).toBeOnTheScreen();
    expect(screen.getByLabelText('2 países')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 viagem')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 cidade')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver meu mapa' }));
    expect(repos.profile.get()?.onboardedAt).toEqual(expect.any(String));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.map);
  });

  it('can go explore instead', async () => {
    await renderWithProviders(<FirstMapScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Explorar destinos' }));
    expect(repos.profile.get()?.onboardedAt).toEqual(expect.any(String));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.explore);
  });
});
