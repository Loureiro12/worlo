import { useTranslation } from '@worlo/i18n';
import { Button, colors, Text, TextField, useToast } from '@worlo/ui';
import { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '@/store';
import { GroupCard, MenuRow, Overline, SwitchRow } from '../parts';
import { CfgLayout } from './CfgLayout';
import { passwordError } from './validation';

type PasswordField = 'current' | 'newPassword' | 'confirm';
const EMPTY = { current: '', newPassword: '', confirm: '' };

/** K3 · Senha e segurança: change password, 2FA, connected devices. */
export function SecuritySection() {
  const { t } = useTranslation();
  const toast = useToast();
  const twoFactor = useStore((s) => s.twoFactor);
  const devices = useStore((s) => s.devices);
  const setSettings = useStore((s) => s.setSettings);
  const signOutDevice = useStore((s) => s.signOutDevice);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<PasswordField | null>(null);
  const eyeLabels: [string, string] = [
    t('common.actions.showPassword'),
    t('common.actions.hidePassword'),
  ];

  const change = (field: PasswordField) => (text: string) => {
    setForm((f) => ({ ...f, [field]: text }));
    setError(null);
  };

  const save = () => {
    const invalid = passwordError(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setForm(EMPTY);
    toast.show(t('profile.cfg.security.saved'));
  };

  const field = (key: PasswordField, label: string, placeholder?: string) => (
    <TextField
      testID={`security-${key}`}
      label={label}
      placeholder={placeholder}
      password
      passwordToggleLabels={eyeLabels}
      value={form[key]}
      onChangeText={change(key)}
      invalid={error === key}
      textContentType={key === 'current' ? 'password' : 'newPassword'}
    />
  );

  return (
    <CfgLayout
      section="security"
      cta={{ label: t('profile.cfg.security.cta'), onPress: save }}
      error={error ? t(`profile.cfg.security.errors.${error}`) : null}
    >
      <View style={{ gap: 14 }}>
        <Overline>{t('profile.cfg.security.changePassword')}</Overline>
        {field('current', t('profile.cfg.security.current'), '••••••••')}
        {field(
          'newPassword',
          t('profile.cfg.security.newPassword'),
          t('profile.cfg.security.newPlaceholder'),
        )}
        {field(
          'confirm',
          t('profile.cfg.security.confirm'),
          t('profile.cfg.security.confirmPlaceholder'),
        )}
      </View>

      <GroupCard title={t('profile.cfg.security.extra')}>
        <SwitchRow
          testID="security-2fa"
          icon="shield-check"
          label={t('profile.cfg.security.twoFactor')}
          sub={t('profile.cfg.security.twoFactorText')}
          value={twoFactor}
          onChange={(value) => {
            setSettings({ twoFactor: value });
            if (value) toast.show(t('profile.cfg.security.twoFactorOn'));
          }}
        />
      </GroupCard>

      <GroupCard title={t('profile.cfg.security.devices')} testID="security-devices">
        {devices.map((device) => (
          <MenuRow
            key={device.id}
            testID={`device-${device.id}`}
            icon={device.icon}
            label={device.name}
            sub={device.meta}
            trailing={
              device.current ? (
                <Text variant="caption" weight={700} tone="success" style={{ fontSize: 12 }}>
                  {t('profile.cfg.security.thisDevice')}
                </Text>
              ) : (
                <Button
                  testID={`device-out-${device.id}`}
                  variant="pill"
                  size="sm"
                  color={colors.error}
                  label={t('profile.cfg.security.signOutDevice')}
                  accessibilityLabel={t('profile.cfg.security.signOutDeviceA11y', {
                    name: device.name,
                  })}
                  onPress={() => {
                    signOutDevice(device.id);
                    toast.show(t('profile.cfg.security.deviceOut', { name: device.name }), 'info');
                  }}
                />
              )
            }
          />
        ))}
      </GroupCard>
    </CfgLayout>
  );
}
