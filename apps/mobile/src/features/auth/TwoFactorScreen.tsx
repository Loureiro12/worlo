import { useTranslation } from '@worlo/i18n';
import { Button, FormError, TextField } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { registerThisDevice, useRegisterOptions } from '@/data/devices';
import { type AuthErrorCode, mfa } from '@/lib/auth';
import { AuthFooter, AuthScreen, AuthTitle } from './AuthParts';
import { enterApp, failureCode, peekEntry } from './entry';
import { useSafeSignOut } from './useSafeSignOut';

/**
 * Verificação em duas etapas, after signing in on an account with 2FA on: the
 * 6-digit code from the authenticator app upgrades the session to AAL2 (the
 * database answers nothing before that). Then the usual entry gate.
 */
export function TwoFactorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<AuthErrorCode | 'code' | null>(null);
  const [busy, setBusy] = useState(false);
  const registerOptions = useRegisterOptions();

  const submit = async () => {
    if (busy) return;
    if (!/^\d{6}$/.test(code)) {
      setError('code');
      return;
    }
    setBusy(true);
    const result = await mfa.challenge(code);
    setBusy(false);
    const failed = failureCode(result);
    if (failed) {
      setError(failed);
      return;
    }
    void registerThisDevice({ ...registerOptions, ask: true }).catch(() => {});
    void enterApp(router, peekEntry() ?? { greet: true });
  };

  const { signOut, confirm: signOutConfirm } = useSafeSignOut();

  const message =
    error === 'code'
      ? t('auth.twoFactor.errors.code')
      : error
        ? t(`auth.errors.server.${error}`)
        : null;

  return (
    <AuthScreen
      testID="two-factor-screen"
      footer={
        <AuthFooter
          testID="two-factor-sign-out"
          question={t('auth.twoFactor.notYou')}
          action={t('auth.twoFactor.signOut')}
          onPress={() => void signOut()}
        />
      }
    >
      <AuthTitle title={t('auth.twoFactor.title')} text={t('auth.twoFactor.text')} />
      <TextField
        testID="two-factor-code"
        label={t('auth.twoFactor.code')}
        placeholder="000000"
        icon="shield-check"
        value={code}
        onChangeText={(text) => {
          setCode(text.replace(/\D/g, '').slice(0, 6));
          setError(null);
        }}
        invalid={error !== null}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />
      {message ? <FormError testID="two-factor-error" message={message} /> : null}
      <Button
        testID="two-factor-submit"
        label={t('auth.twoFactor.submit')}
        fullWidth
        loading={busy}
        onPress={() => void submit()}
      />
      {signOutConfirm}
    </AuthScreen>
  );
}
