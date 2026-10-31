import { act, fireEvent, screen } from '@testing-library/react-native';
import { routes } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import { elapse, renderWithProviders, useFakeClock } from '@/test-utils';
import { FirstMapScreen } from './FirstMapScreen';
import { ForgotScreen } from './ForgotScreen';
import { LoginScreen } from './LoginScreen';
import { OnboardingMapScreen } from './OnboardingMapScreen';
import { SignupScreen } from './SignupScreen';
import { SPLASH_MS, SplashScreen } from './SplashScreen';
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

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
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

describe('SplashScreen', () => {
  useFakeClock();

  it('goes to Welcome after 3s when signed out', async () => {
    await renderWithProviders(<SplashScreen />);
    expect(screen.getByText('Toque pra pular')).toBeOnTheScreen();
    await elapse(SPLASH_MS - 1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await elapse(1);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
  });

  it('goes to Explorar when signed in', async () => {
    useStore.setState({ signedIn: true });
    await renderWithProviders(<SplashScreen />);
    await elapse(SPLASH_MS);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.explore);
  });

  it('skips on tap and navigates only once', async () => {
    await renderWithProviders(<SplashScreen />);
    await fireEvent.press(screen.getByTestId('splash-screen'));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.welcome);
    await fireEvent.press(screen.getByTestId('splash-screen'));
    await elapse(SPLASH_MS);
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });
});

describe('WelcomeScreen', () => {
  it('shows the copy and routes to signup / login', async () => {
    await renderWithProviders(<WelcomeScreen />);
    expect(screen.getByText('Seu mundo, do seu jeito.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Começar pelo meu mapa' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.signup);
    await fireEvent.press(screen.getByTestId('welcome-login'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.login);
  });
});

describe('SignupScreen', () => {
  it('validates fields in order, marking only the first invalid one', async () => {
    await renderWithProviders(<SignupScreen />);
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
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows password strength', async () => {
    await renderWithProviders(<SignupScreen />);
    expect(screen.getByText('Use 8 caracteres ou mais')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('signup-password'), 'abc');
    expect(screen.getByText('Fraca: precisa de 8 caracteres')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('signup-password'), 'abcdefgh');
    expect(screen.getByText('Boa')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('signup-password'), 'abcdefgh12');
    expect(screen.getByText('Forte')).toBeOnTheScreen();
  });

  it('creates the account and goes to the onboarding map', async () => {
    await renderWithProviders(<SignupScreen />);
    await fireEvent.changeText(screen.getByTestId('signup-name'), ' Bia Souza ');
    await fireEvent.changeText(screen.getByTestId('signup-email'), 'bia@email.com');
    await fireEvent.changeText(screen.getByTestId('signup-password'), 'senha1234');
    await fireEvent.press(screen.getByTestId('signup-submit'));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.onboardingMap);
    expect(useStore.getState().me).toMatchObject({ name: 'Bia Souza', email: 'bia@email.com' });
    expect(useStore.getState().signedIn).toBe(true);
  });

  it('links to login and goes back', async () => {
    await renderWithProviders(<SignupScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.login);
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('LoginScreen', () => {
  it('requires a valid email, then a password', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-error')).toHaveTextContent(
      'Confere o e-mail, parece incompleto.',
    );
    expect(screen.getByTestId('login-email')).toHaveProp('aria-invalid', true);

    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@gmail.com');
    expect(screen.queryByTestId('login-error')).toBeNull();
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('login-error')).toHaveTextContent('Digite sua senha.');
    expect(screen.getByTestId('login-password')).toHaveProp('aria-invalid', true);
    expect(useStore.getState().signedIn).toBe(false);
  });

  it('signs in, goes to Explorar and greets by first name', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.changeText(screen.getByTestId('login-email'), 'ana@gmail.com');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'senha1234');
    await fireEvent.press(screen.getByTestId('login-submit'));
    expect(useStore.getState()).toMatchObject({ signedIn: true, onboarded: true });
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.explore);
    expect(screen.getByText('Bem-vinda de volta, Ana.')).toBeOnTheScreen();
  });

  it('opens forgot password and signup', async () => {
    await renderWithProviders(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.forgot);
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.signup);
  });
});

describe('ForgotScreen', () => {
  it('validates the email, then shows the sent state', async () => {
    await renderWithProviders(<ForgotScreen />);
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(screen.getByTestId('forgot-error')).toHaveTextContent(
      'Confere o e-mail, parece incompleto.',
    );
    await fireEvent.changeText(screen.getByTestId('forgot-email'), 'ana@gmail.com');
    expect(screen.queryByTestId('forgot-error')).toBeNull();
    await fireEvent.press(screen.getByTestId('forgot-submit'));

    expect(screen.getByText('Confere seu e-mail')).toBeOnTheScreen();
    expect(
      screen.getByText('Enviamos o link pra ana@gmail.com. Ele vale por 30 minutos.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Não chegou? Enviar de novo' }));
    expect(screen.getByText('Link reenviado.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar pra entrar' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('OnboardingMapScreen', () => {
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
  });

  it('skips onboarding straight to Explorar', async () => {
    await renderWithProviders(<OnboardingMapScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pular' }));
    expect(useStore.getState().onboarded).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.explore);
  });
});

describe('FirstMapScreen', () => {
  it('shows the stats and finishes onboarding on the map', async () => {
    useStore.setState({ onboardingVisited: ['076', '620'] });
    await renderWithProviders(<FirstMapScreen />);
    expect(screen.getByText('Seu mapa começou.')).toBeOnTheScreen();
    expect(screen.getByLabelText('2 países')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 viagem')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 cidade')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver meu mapa' }));
    expect(useStore.getState().onboarded).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.map);
  });

  it('can go explore instead', async () => {
    await renderWithProviders(<FirstMapScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Explorar destinos' }));
    expect(mockRouter.replace).toHaveBeenCalledWith(routes.explore);
  });
});
