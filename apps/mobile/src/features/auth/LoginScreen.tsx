import { useTranslation } from '@worlo/i18n';
import { Button, FormError, TextField, useToast } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { firstName } from '@/lib/people';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { AuthFooter, AuthScreen, AuthTitle, SocialLogin } from './AuthParts';
import { type AuthField, loginError } from './validation';

/** A4 · Entrar. Success → Explorar + "Bem-vinda de volta, {nome}." */
export function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const signIn = useStore((s) => s.signIn);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState<AuthField | null>(null);

  const change = (field: 'email' | 'password') => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    setError(null);
  };

  const enter = () => {
    signIn();
    completeOnboarding();
    router.replace(routes.explore);
    toast.show(t('auth.login.welcomeBack', { name: firstName(useStore.getState().me.name) }));
  };

  const submit = () => {
    const invalid = loginError(values);
    if (invalid) {
      setError(invalid);
      return;
    }
    enter();
  };

  const message = error === 'email' ? t('auth.errors.email') : t('auth.errors.passwordEmpty');

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
      <SocialLogin onPress={enter} />
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
          onSubmitEditing={submit}
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
      {error ? <FormError testID="login-error" message={message} /> : null}
      <Button testID="login-submit" label={t('auth.login.submit')} fullWidth onPress={submit} />
    </AuthScreen>
  );
}
