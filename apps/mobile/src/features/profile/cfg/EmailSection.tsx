import { useTranslation } from '@worlo/i18n';
import { Card, colors, Icon, StatusChip, Text, TextField, useToast } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '@/store';
import { CfgLayout } from './CfgLayout';
import { emailError } from './validation';

type EmailError = NonNullable<ReturnType<typeof emailError>>;

/** K3 · Trocar e-mail. */
export function EmailSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const email = useStore((s) => s.me.email);
  const updateMe = useStore((s) => s.updateMe);
  const [form, setForm] = useState({ newEmail: '', password: '' });
  const [error, setError] = useState<EmailError | null>(null);

  const change = (field: keyof typeof form) => (text: string) => {
    setForm((f) => ({ ...f, [field]: text }));
    setError(null);
  };

  const save = () => {
    const invalid = emailError(form, email);
    if (invalid) {
      setError(invalid);
      return;
    }
    const next = form.newEmail.trim();
    updateMe({ email: next });
    toast.show(t('profile.cfg.email.sent', { email: next }));
    router.back();
  };

  return (
    <CfgLayout
      section="email"
      cta={{ label: t('profile.cfg.email.cta'), onPress: save }}
      error={error ? t(`profile.cfg.email.errors.${error}`) : null}
    >
      <View style={{ gap: 18 }}>
        <Card padding={16} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="envelope-simple" size={22} color={colors.textMuted} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="overline" tone="muted">
              {t('profile.cfg.email.current')}
            </Text>
            <Text variant="body" weight={700} numberOfLines={1} testID="email-current">
              {email}
            </Text>
          </View>
          <StatusChip kind="verified" size="sm" label={t('common.status.verified')} />
        </Card>
        <TextField
          testID="email-new"
          label={t('profile.cfg.email.newEmail')}
          placeholder={t('profile.cfg.email.newEmailPlaceholder')}
          value={form.newEmail}
          onChangeText={change('newEmail')}
          invalid={error === 'email' || error === 'same'}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          testID="email-password"
          label={t('profile.cfg.email.password')}
          placeholder={t('profile.cfg.email.passwordPlaceholder')}
          password
          passwordToggleLabels={[
            t('common.actions.showPassword'),
            t('common.actions.hidePassword'),
          ]}
          value={form.password}
          onChangeText={change('password')}
          invalid={error === 'password'}
          textContentType="password"
        />
      </View>
    </CfgLayout>
  );
}
