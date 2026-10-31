import { useTranslation } from '@worlo/i18n';
import { Button, FormError, IconCircle, Text, TextField, useToast } from '@worlo/ui';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { type AuthErrorCode, auth } from '@/lib/auth';
import { routes } from '@/navigation/routes';
import { AuthScreen, AuthTitle, PasswordHint } from './AuthParts';
import { enterApp, failureCode } from './entry';
import { MIN_PASSWORD } from './validation';

type LinkState = 'checking' | 'ready' | 'invalid';

/**
 * Nova senha, opened by the recovery e-mail (`worlo://reset-password#access_token=…`).
 * The link signs the user in; then the new password is saved and the gate takes over.
 */
export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const url = Linking.useLinkingURL();
  const [link, setLink] = useState<LinkState>('checking');
  const handled = useRef<string | null>(null);
  const [password, setPassword] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [serverError, setServerError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!url) {
      setLink('invalid');
      return;
    }
    if (handled.current === url) return;
    handled.current = url;
    setLink('checking');
    let active = true;
    void auth.sessionFromUrl(url).then((result) => {
      if (active) setLink(result.ok ? 'ready' : 'invalid');
    });
    return () => {
      active = false;
    };
  }, [url]);

  const submit = async () => {
    if (busy) return;
    if (password.length < MIN_PASSWORD) {
      setInvalid(true);
      return;
    }
    setBusy(true);
    const result = await auth.updatePassword(password);
    setBusy(false);
    if (result.ok) {
      toast.show(t('auth.reset.saved'));
      void enterApp(router);
      return;
    }
    setServerError(failureCode(result));
  };

  if (link === 'checking') {
    return (
      <AuthScreen testID="reset-screen">
        <Text testID="reset-checking" variant="body" tone="muted" style={{ paddingTop: 48 }}>
          {t('auth.reset.checking')}
        </Text>
      </AuthScreen>
    );
  }

  if (link === 'invalid') {
    return (
      <AuthScreen testID="reset-screen">
        <View testID="reset-invalid" style={{ gap: 14, paddingTop: 48 }}>
          <IconCircle icon="warning-circle" size={64} iconSize={30} />
          <Text variant="h1">{t('auth.reset.invalidTitle')}</Text>
          <Text variant="bodyL" tone="support">
            {t('auth.reset.invalidText')}
          </Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            <Button
              testID="reset-new-link"
              label={t('auth.reset.newLink')}
              fullWidth
              onPress={() => router.replace(routes.forgot)}
            />
            <Button
              testID="reset-back-login"
              variant="ghost"
              label={t('auth.reset.backToLogin')}
              fullWidth
              onPress={() => router.replace(routes.login)}
            />
          </View>
        </View>
      </AuthScreen>
    );
  }

  const message = invalid
    ? t('auth.errors.passwordShort')
    : serverError
      ? t(`auth.errors.server.${serverError}`)
      : null;

  return (
    <AuthScreen testID="reset-screen">
      <AuthTitle title={t('auth.reset.title')} text={t('auth.reset.text')} />
      <View style={{ gap: 12 }}>
        <TextField
          testID="reset-password"
          label={t('auth.fields.password')}
          placeholder={t('auth.fields.newPasswordPlaceholder')}
          icon="lock-simple"
          password
          passwordToggleLabels={[
            t('common.actions.showPassword'),
            t('common.actions.hidePassword'),
          ]}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setInvalid(false);
            setServerError(null);
          }}
          invalid={invalid}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <PasswordHint password={password} />
      </View>
      {message ? <FormError testID="reset-error" message={message} /> : null}
      <Button
        testID="reset-submit"
        label={t('auth.reset.submit')}
        fullWidth
        loading={busy}
        onPress={() => void submit()}
      />
    </AuthScreen>
  );
}
