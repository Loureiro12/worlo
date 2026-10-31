import { useTranslation } from '@worlo/i18n';
import { Button, colors, FormError, IconCircle, Text, TextField, useToast } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { type AuthErrorCode, auth } from '@/lib/auth';
import { routes } from '@/navigation/routes';
import { AuthScreen, AuthTitle } from './AuthParts';
import { failureCode } from './entry';
import { forgotError } from './validation';

/** A5 · Esqueci a senha: e-mail form → "Confere seu e-mail". */
export function ForgotScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<AuthErrorCode | null>(null);

  /** The e-mail links back to `reset-password` (see ResetPasswordScreen). */
  const send = async () => {
    setBusy(true);
    const result = await auth.sendPasswordReset(email);
    setBusy(false);
    return failureCode(result);
  };

  const submit = async () => {
    if (busy) return;
    if (forgotError({ email })) {
      setInvalid(true);
      return;
    }
    const code = await send();
    if (code) setServerError(code);
    else setSent(true);
  };

  const resend = async () => {
    if (busy) return;
    const code = await send();
    if (code) toast.show(t(`auth.errors.server.${code}`), 'error');
    else toast.show(t('auth.forgot.resent'));
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
              loading={busy}
              onPress={() => void resend()}
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
              setServerError(null);
            }}
            invalid={invalid}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => void submit()}
          />
          {invalid || serverError ? (
            <FormError
              testID="forgot-error"
              message={
                invalid
                  ? t('auth.errors.email')
                  : t(`auth.errors.server.${serverError ?? 'unknown'}`)
              }
            />
          ) : null}
          <Button
            testID="forgot-submit"
            label={t('auth.forgot.submit')}
            fullWidth
            loading={busy}
            onPress={() => void submit()}
          />
        </>
      )}
    </AuthScreen>
  );
}
