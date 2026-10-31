import { useTranslation } from '@worlo/i18n';
import { Button, FormError, Text, TextField } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { AuthFooter, AuthScreen, AuthTitle, PasswordHint, SocialLogin } from './AuthParts';
import { type AuthField, signupError } from './validation';

/** A3 · Criar conta. Success → onboarding map. */
export function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const signIn = useStore((s) => s.signIn);
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<AuthField | null>(null);

  const change = (field: AuthField) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    setError(null);
  };

  const enter = (patch?: { name: string; email: string }) => {
    signIn(patch);
    router.replace(routes.onboardingMap);
  };

  const submit = () => {
    const invalid = signupError(values);
    if (invalid) {
      setError(invalid);
      return;
    }
    enter({ name: values.name.trim(), email: values.email.trim() });
  };

  const messages: Record<AuthField, string> = {
    name: t('auth.errors.name'),
    email: t('auth.errors.email'),
    password: t('auth.errors.passwordShort'),
  };

  return (
    <AuthScreen
      testID="signup-screen"
      footer={
        <AuthFooter
          testID="signup-to-login"
          question={t('auth.signup.hasAccount')}
          action={t('auth.signup.login')}
          onPress={() => router.replace(routes.login)}
        />
      }
    >
      <AuthTitle title={t('auth.signup.title')} text={t('auth.signup.text')} />
      <SocialLogin onPress={() => enter()} />
      <TextField
        testID="signup-name"
        label={t('auth.fields.name')}
        placeholder={t('auth.fields.namePlaceholder')}
        icon="user"
        value={values.name}
        onChangeText={change('name')}
        invalid={error === 'name'}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
      />
      <TextField
        testID="signup-email"
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
      <View style={{ gap: 12 }}>
        <TextField
          testID="signup-password"
          label={t('auth.fields.password')}
          placeholder={t('auth.fields.newPasswordPlaceholder')}
          icon="lock-simple"
          password
          passwordToggleLabels={[
            t('common.actions.showPassword'),
            t('common.actions.hidePassword'),
          ]}
          value={values.password}
          onChangeText={change('password')}
          invalid={error === 'password'}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <PasswordHint password={values.password} />
      </View>
      {error ? <FormError testID="signup-error" message={messages[error]} /> : null}
      <Button testID="signup-submit" label={t('auth.signup.submit')} fullWidth onPress={submit} />
      <Text variant="caption" tone="muted" align="center" style={{ fontSize: 12 }}>
        {t('auth.signup.termsBefore')}
        <Text variant="caption" tone="link" weight={600} style={{ fontSize: 12 }}>
          {t('auth.signup.terms')}
        </Text>
        {t('auth.signup.termsBetween')}
        <Text variant="caption" tone="link" weight={600} style={{ fontSize: 12 }}>
          {t('auth.signup.privacy')}
        </Text>
        {t('auth.signup.termsAfter')}
      </Text>
    </AuthScreen>
  );
}
