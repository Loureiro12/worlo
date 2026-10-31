import { useTranslation } from '@worlo/i18n';
import { Button, colors, FormError, type IconName, Text, TextField, useToast } from '@worlo/ui';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { View } from 'react-native';
import { type ConnectedDevice, revokeDevice, useDevices } from '@/data/devices';
import { useMe } from '@/data/profile';
import { useRefreshTwoFactor, useTwoFactor } from '@/data/twoFactor';
import { failureCode } from '@/features/auth/entry';
import { useSync } from '@/features/sync/SyncProvider';
import { type AuthErrorCode, auth, mfa, type TotpEnrollment } from '@/lib/auth';
import { type DeviceKind, parsePlatform } from '@/lib/device';
import { GroupCard, MenuRow, Overline, SwitchRow } from '../parts';
import { CfgLayout } from './CfgLayout';
import { passwordError } from './validation';

type PasswordField = 'current' | 'newPassword' | 'confirm';
type PasswordError = PasswordField | 'wrongCurrent';
const EMPTY = { current: '', newPassword: '', confirm: '' };

const KIND_ICONS: Record<DeviceKind, IconName> = {
  phone: 'device-mobile',
  tablet: 'device-tablet',
  computer: 'laptop',
};
/** Product names, not translated. */
const OS_NAMES: Record<string, string> = { ios: 'iOS', android: 'Android', web: 'Web' };

const MINUTE = 60_000;

/** K3 · Senha e segurança: change password, 2FA, connected devices. */
export function SecuritySection() {
  const { t } = useTranslation();
  const toast = useToast();
  const sync = useSync();
  const { email } = useMe();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<PasswordError | null>(null);
  const [serverError, setServerError] = useState<AuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const eyeLabels: [string, string] = [
    t('common.actions.showPassword'),
    t('common.actions.hidePassword'),
  ];

  const change = (field: PasswordField) => (text: string) => {
    setForm((f) => ({ ...f, [field]: text }));
    setError(null);
    setServerError(null);
  };

  /** Re-checks the current password (without touching the session), then sets the new one. */
  const save = async () => {
    if (busy) return;
    const invalid = passwordError(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    const check = await auth.verifyPassword(email, form.current);
    const checkCode = failureCode(check);
    if (checkCode) {
      setBusy(false);
      if (checkCode === 'invalidCredentials') setError('wrongCurrent');
      else setServerError(checkCode);
      return;
    }
    const result = await auth.updatePassword(form.newPassword);
    setBusy(false);
    const code = failureCode(result);
    if (code) {
      setServerError(code);
      return;
    }
    setForm(EMPTY);
    toast.show(t('profile.cfg.security.saved'));
  };

  const message = error
    ? t(`profile.cfg.security.errors.${error}`)
    : serverError
      ? t(`auth.errors.server.${serverError}`)
      : null;

  const field = (key: PasswordField, label: string, placeholder?: string) => (
    <TextField
      testID={`security-${key}`}
      label={label}
      placeholder={placeholder}
      password
      passwordToggleLabels={eyeLabels}
      value={form[key]}
      onChangeText={change(key)}
      invalid={error === key || (key === 'current' && error === 'wrongCurrent')}
      textContentType={key === 'current' ? 'password' : 'newPassword'}
    />
  );

  return (
    <CfgLayout
      section="security"
      cta={{ label: t('profile.cfg.security.cta'), onPress: () => void save(), loading: busy }}
      error={message}
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

      <TwoFactorCard />
      <DevicesCard online={sync.online} onRevoked={sync.retry} />
    </CfgLayout>
  );
}

/** Proteção extra › Verificação em duas etapas (TOTP in an authenticator app). */
function TwoFactorCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const { factorId, known } = useTwoFactor();
  const setTwoFactor = useRefreshTwoFactor();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<AuthErrorCode | 'codeLength' | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (code: AuthErrorCode) => toast.show(t(`auth.errors.server.${code}`), 'error');

  const turnOn = async () => {
    setBusy(true);
    const result = await mfa.enroll();
    setBusy(false);
    if (!result.ok) return fail(result.code);
    setCode('');
    setError(null);
    setEnrollment(result.data);
  };

  const turnOff = async () => {
    if (!factorId) return;
    setBusy(true);
    const result = await mfa.unenroll(factorId);
    setBusy(false);
    const code = failureCode(result);
    if (code) return fail(code);
    setTwoFactor({ factorId: null });
    toast.show(t('profile.cfg.security.twoFactorOff'), 'info');
  };

  const cancel = () => {
    if (enrollment) void mfa.unenroll(enrollment.factorId);
    setEnrollment(null);
  };

  const activate = async () => {
    if (!enrollment || busy) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setError('codeLength');
      return;
    }
    setBusy(true);
    const result = await mfa.verify(enrollment.factorId, code);
    setBusy(false);
    const failed = failureCode(result);
    if (failed) {
      setError(failed);
      return;
    }
    setTwoFactor({ factorId: enrollment.factorId });
    setEnrollment(null);
    toast.show(t('profile.cfg.security.twoFactorOn'));
  };

  const message =
    error === 'codeLength'
      ? t('auth.twoFactor.errors.code')
      : error
        ? t(`auth.errors.server.${error}`)
        : null;

  return (
    <GroupCard title={t('profile.cfg.security.extra')}>
      <SwitchRow
        testID="security-2fa"
        icon="shield-check"
        label={t('profile.cfg.security.twoFactor')}
        sub={t('profile.cfg.security.twoFactorText')}
        value={Boolean(factorId) || enrollment !== null}
        onChange={(value) => {
          if (busy || (!known && value)) {
            if (!known) fail('network');
            return;
          }
          if (enrollment && !value) cancel();
          else void (value ? turnOn() : turnOff());
        }}
      />
      {enrollment ? (
        <View key="enroll" testID="security-2fa-setup" style={{ padding: 16, gap: 12 }}>
          <Text variant="body" tone="muted">
            {t('profile.cfg.security.setup.text')}
          </Text>
          <View style={{ gap: 4 }}>
            <Text variant="caption" weight={700} tone="muted">
              {t('profile.cfg.security.setup.secret')}
            </Text>
            <Text variant="bodyL" weight={700} selectable testID="security-2fa-secret">
              {enrollment.secret}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              testID="security-2fa-copy"
              variant="outline"
              size="sm"
              icon="link"
              label={t('profile.cfg.security.setup.copy')}
              onPress={() =>
                void Clipboard.setStringAsync(enrollment.secret).then(() =>
                  toast.show(t('profile.cfg.security.setup.copied')),
                )
              }
            />
            <Button
              testID="security-2fa-open"
              variant="outline"
              size="sm"
              icon="export"
              label={t('profile.cfg.security.setup.open')}
              onPress={() =>
                void Linking.openURL(enrollment.uri).catch(() =>
                  toast.show(t('profile.cfg.security.setup.noApp'), 'error'),
                )
              }
            />
          </View>
          <TextField
            testID="security-2fa-code"
            label={t('auth.twoFactor.code')}
            placeholder="000000"
            value={code}
            onChangeText={(value) => {
              setCode(value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            invalid={error !== null}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={() => void activate()}
          />
          {message ? <FormError testID="security-2fa-error" message={message} /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              testID="security-2fa-cancel"
              variant="ghost"
              label={t('common.actions.cancel')}
              onPress={cancel}
            />
            <View style={{ flex: 1 }}>
              <Button
                testID="security-2fa-activate"
                label={t('profile.cfg.security.setup.activate')}
                fullWidth
                loading={busy}
                onPress={() => void activate()}
              />
            </View>
          </View>
        </View>
      ) : null}
    </GroupCard>
  );
}

/** Aparelhos conectados: synced rows; "Sair" revokes that device's session (online). */
function DevicesCard({ online, onRevoked }: { online: boolean; onRevoked: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const devices = useDevices();
  // Hidden right away; the row comes back revoked with the next sync.
  const [gone, setGone] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const seen = (iso: string) => {
    const ago = Math.max(0, Date.now() - new Date(iso).getTime());
    if (ago < 2 * MINUTE) return t('profile.cfg.security.seen.now');
    if (ago < 60 * MINUTE) {
      return t('profile.cfg.security.seen.minutes', { count: Math.floor(ago / MINUTE) });
    }
    if (ago < 24 * 60 * MINUTE) {
      return t('profile.cfg.security.seen.hours', { count: Math.floor(ago / (60 * MINUTE)) });
    }
    return t('profile.cfg.security.seen.days', { count: Math.floor(ago / (24 * 60 * MINUTE)) });
  };

  const revoke = async (device: ConnectedDevice) => {
    if (busy) return;
    setBusy(device.id);
    const result = await revokeDevice(device.id, online);
    setBusy(null);
    if (!result.ok) {
      toast.show(
        t(result.reason === 'offline' ? 'common.states.offlineTitle' : 'common.states.errorTitle'),
        'error',
      );
      return;
    }
    setGone((ids) => [...ids, device.id]);
    toast.show(t('profile.cfg.security.deviceOut', { name: device.name }), 'info');
    onRevoked();
  };

  const visible = devices.filter((d) => !gone.includes(d.id));

  return (
    <GroupCard title={t('profile.cfg.security.devices')} testID="security-devices">
      {visible.length === 0 ? (
        <View key="none" style={{ padding: 16 }}>
          <Text variant="body" tone="muted">
            {t('profile.cfg.security.noDevices')}
          </Text>
        </View>
      ) : null}
      {visible.map((device) => {
        const { os, kind } = parsePlatform(device.platform);
        const name = device.name || OS_NAMES[os] || os;
        return (
          <MenuRow
            key={device.id}
            testID={`device-${device.id}`}
            icon={KIND_ICONS[kind]}
            label={name}
            sub={[OS_NAMES[os] ?? os, seen(device.lastSeenAt)].filter(Boolean).join(' · ')}
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
                  loading={busy === device.id}
                  label={t('profile.cfg.security.signOutDevice')}
                  accessibilityLabel={t('profile.cfg.security.signOutDeviceA11y', { name })}
                  onPress={() => void revoke({ ...device, name })}
                />
              )
            }
          />
        );
      })}
    </GroupCard>
  );
}
