import { useTranslation } from '@worlo/i18n';
import { Button, colors, FormError, IconCircle, Text, TextField, useToast } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { routes } from '@/navigation/routes';
import { AuthScreen, AuthTitle } from './AuthParts';
import { forgotError } from './validation';

/** A5 · Esqueci a senha: e-mail form → "Confere seu e-mail". */
export function ForgotScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (forgotError({ email })) {
      setInvalid(true);
      return;
    }
    setSent(true);
  };

  const backToLogin = () => (router.canGoBack() ? router.back() : router.replace(routes.login));

  return (
    <AuthScreen testID="forgot-screen">
      {sent ? (
        <View testID="forgot-sent" style={{ gap: 14, paddingTop: 48 }}>
          <IconCircle icon="envelope-open" size={64} iconSize={30} />
          <Text variant="h1">{t('auth.forgot.sentTitle')}</Text>
          <Text variant="bodyL" tone="support">
            {t('auth.forgot.sentText', { email: email.trim() })}
          </Text>
          <View style={{ marginTop: 12 }}>
            <Button
              testID="forgot-back-login"
              label={t('auth.forgot.backToLogin')}
              fullWidth
              onPress={backToLogin}
            />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Button
              testID="forgot-resend"
              variant="ghost"
              color={colors.text}
              label={t('auth.forgot.resend')}
              onPress={() => toast.show(t('auth.forgot.resent'))}
            />
          </View>
        </View>
      ) : (
        <>
          <AuthTitle title={t('auth.forgot.title')} text={t('auth.forgot.text')} />
          <TextField
            testID="forgot-email"
            label={t('auth.fields.email')}
            placeholder={t('auth.fields.emailPlaceholder')}
            icon="envelope-simple"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setInvalid(false);
            }}
            invalid={invalid}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          {invalid ? <FormError testID="forgot-error" message={t('auth.errors.email')} /> : null}
          <Button
            testID="forgot-submit"
            label={t('auth.forgot.submit')}
            fullWidth
            onPress={submit}
          />
        </>
      )}
    </AuthScreen>
  );
}
