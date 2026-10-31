import { useTranslation } from '@worlo/i18n';
import { Button, colors, IconButton, Logo, PasswordStrength, Screen, Text } from '@worlo/ui';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { routes } from '@/navigation/routes';

/**
 * Light auth screen (signup, login, forgot): back · centered logo, then the
 * content with 20pt gaps. The footer (if any) sticks to the bottom.
 */
export function AuthScreen({
  testID,
  children,
  footer,
}: {
  testID: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace(routes.welcome));
  return (
    <Screen testID={testID} safeTop gap={20}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton
          testID="auth-back"
          icon="arrow-left"
          label={t('common.actions.back')}
          onPress={back}
        />
        <Logo size={22} />
        <View style={{ width: 40 }} />
      </View>
      {children}
      {footer ? (
        <View
          style={{
            marginTop: 'auto',
            paddingTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {footer}
        </View>
      ) : null}
    </Screen>
  );
}

/** H1 + subtitle block at the top of an auth form. */
export function AuthTitle({ title, text }: { title: string; text: string }) {
  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <Text variant="h1">{title}</Text>
      <Text variant="body" tone="muted">
        {text}
      </Text>
    </View>
  );
}

/** "Já tem conta? Entrar" style footer. */
export function AuthFooter({
  question,
  action,
  onPress,
  testID,
}: {
  question: string;
  action: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <>
      <Text variant="bodyS" tone="support" weight={400}>
        {question}
      </Text>
      <Button testID={testID} variant="ghost" label={action} onPress={onPress} />
    </>
  );
}

/** Apple + Google buttons and the "ou com e-mail" divider. */
export function SocialLogin({ onPress }: { onPress: (provider: 'apple' | 'google') => void }) {
  const { t } = useTranslation();
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SocialButton
          testID="auth-apple"
          label={t('auth.social.apple')}
          provider="apple"
          onPress={() => onPress('apple')}
        />
        <SocialButton
          testID="auth-google"
          label={t('auth.social.google')}
          provider="google"
          onPress={() => onPress('google')}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text variant="caption" tone="muted" weight={600}>
          {t('auth.social.divider')}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
    </>
  );
}

function SocialButton({
  label,
  provider,
  onPress,
  testID,
}: {
  label: string;
  provider: 'apple' | 'google';
  onPress: () => void;
  testID: string;
}) {
  // Outline `linha` on white: a variant the shared Button doesn't have yet.
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Button
        testID={testID}
        variant="ghost"
        label={label}
        icon={provider === 'apple' ? 'apple-logo' : 'google-logo'}
        color={colors.text}
        fullWidth
        onPress={onPress}
      />
    </View>
  );
}

/** Strength meter with the "Use 8 caracteres ou mais" hint while empty. */
export function PasswordHint({ password }: { password: string }) {
  const { t } = useTranslation();
  if (password) {
    return (
      <PasswordStrength
        password={password}
        labels={[t('auth.strength.weak'), t('auth.strength.good'), t('auth.strength.strong')]}
      />
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border }}
          />
        ))}
      </View>
      <Text variant="caption" weight={600} tone="muted">
        {t('auth.strength.empty')}
      </Text>
    </View>
  );
}
