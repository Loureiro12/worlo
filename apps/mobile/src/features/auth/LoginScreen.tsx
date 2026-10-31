import { useTranslation } from '@worlo/i18n';
import { Button, FormError, TextField } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { type AuthErrorCode, auth } from '@/lib/auth';
import { routes } from '@/navigation/routes';
import { AuthFooter, AuthScreen, AuthTitle, SocialLogin, useSocialSignIn } from './AuthParts';
import { enterApp, failureCode } from './entry';
import { type AuthField, loginError } from './validation';

/**
 * A4 · Entrar. Success → the splash gate (first sync), then Explorar +
 * "Bem-vinda de volta, {nome}." (or onboarding if the account never finished it).
 */
export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState<AuthField | null>(null);
  const [serverError, setServerError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const social = useSocialSignIn(busy);

  const change = (field: 'email' | 'password') => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    setError(null);
    setServerError(null);
  };

  const submit = async () => {
    if (busy || social.provider) return;
    const invalid = loginError(values);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    const result = await auth.signIn(values.email, values.password);
    setBusy(false);
    if (result.ok) {
      void enterApp(router, { greet: true });
      return;
    }
    setServerError(failureCode(result));
  };

  const message = error
    ? error === 'email'
      ? t('auth.errors.email')
      : t('auth.errors.passwordEmpty')
    : serverError
      ? t(`auth.errors.server.${serverError}`)
      : null;

  return (
    <AuthScreen
      testID="login-screen"
      footer={
        <AuthFooter
          testID="login-to-signup"
          question={t('auth.login.noAccount')}
          action={t('auth.login.signup')}
          onPress={() => router.replace(routes.signup)}
        />
      }
    >
      <AuthTitle title={t('auth.login.title')} text={t('auth.login.text')} />
      <SocialLogin onPress={social.signIn} busy={social.provider} disabled={busy} />
      <TextField
        testID="login-email"
        label={t('auth.fields.email')}
        placeholder={t('auth.fields.emailPlaceholder')}
        icon="envelope-simple"
        value={values.email}
        onChangeText={change('email')}
        invalid={error === 'email'}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <View style={{ gap: 10 }}>
        <TextField
          testID="login-password"
          label={t('auth.fields.password')}
          placeholder={t('auth.fields.passwordPlaceholder')}
          icon="lock-simple"
          password
          passwordToggleLabels={[
            t('common.actions.showPassword'),
            t('common.actions.hidePassword'),
          ]}
          value={values.password}
          onChangeText={change('password')}
          invalid={error === 'password'}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <View style={{ alignItems: 'flex-end' }}>
          <Button
            testID="login-forgot"
            variant="ghost"
            label={t('auth.login.forgot')}
            onPress={() => router.push(routes.forgot)}
          />
        </View>
      </View>
      {message ? <FormError testID="login-error" message={message} /> : null}
      <Button
        testID="login-submit"
        label={t('auth.login.submit')}
        fullWidth
        loading={busy}
        disabled={social.provider !== null}
        onPress={() => void submit()}
      />
    </AuthScreen>
  );
}
