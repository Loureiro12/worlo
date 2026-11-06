import { isLanguage, useTranslation } from '@worlo/i18n';
import { Button, RadioRow, Screen, Text } from '@worlo/ui';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { type NotificationPrefs, updatePrefs, useMe, useProfilePrefs } from '@/data/profile';
import { useTwoFactor } from '@/data/twoFactor';
import { useSafeSignOut } from '@/features/auth/useSafeSignOut';
import { usePushPermission } from '@/features/push/usePushPermission';
import { type CfgSection, routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { currencySymbol, DEMO_STATES } from './options';
import { GroupCard, MenuRow, PageTitle, StackHeader, SwitchRow } from './parts';

type NotificationKey = keyof NotificationPrefs;

const NOTIFICATIONS: readonly {
  key: NotificationKey;
  icon: 'clock-counter-clockwise' | 'users-three' | 'map-trifold' | 'megaphone';
  hasSub: boolean;
}[] = [
  { key: 'memories', icon: 'clock-counter-clockwise', hasSub: true },
  { key: 'community', icon: 'users-three', hasSub: true },
  { key: 'itineraries', icon: 'map-trifold', hasSub: true },
  { key: 'promos', icon: 'megaphone', hasSub: false },
];

/** K2 · Configurações (+ "Demonstração" group to switch the demo states for QA). */
export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const me = useMe();
  const twoFactor = useTwoFactor().factorId !== null;
  const { currency, units, privacy, notifications } = useProfilePrefs();
  const demo = useStore((s) => s.demo);
  const setDemo = useStore((s) => s.setDemo);
  const { signOut, busy: signingOut, confirm: signOutConfirm } = useSafeSignOut();
  const push = usePushPermission();

  const language = isLanguage(i18n.language) ? i18n.language : 'pt-BR';
  const open = (section: CfgSection) => () => router.push(routes.cfg(section));
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen
      testID="settings-screen"
      withTabBar
      gap={20}
      header={<StackHeader overline={t('profile.settings.overline')} />}
    >
      <PageTitle title={t('profile.settings.title')} />

      <GroupCard title={t('profile.settings.groups.account')}>
        <MenuRow
          testID="settings-account"
          icon="user-circle"
          label={t('profile.settings.rows.account')}
          value={me.name}
          onPress={open('account')}
        />
        <MenuRow
          testID="settings-email"
          icon="envelope-simple"
          label={t('profile.settings.rows.email')}
          value={me.email}
          onPress={open('email')}
        />
        <MenuRow
          testID="settings-security"
          icon="lock-key"
          label={t('profile.settings.rows.security')}
          value={twoFactor ? t('profile.settings.rows.twoFactorOn') : undefined}
          onPress={open('security')}
        />
      </GroupCard>

      <GroupCard title={t('profile.settings.groups.preferences')}>
        <MenuRow
          testID="settings-language"
          icon="translate"
          label={t('profile.settings.rows.language')}
          value={t(`languages.${language}`)}
          onPress={open('language')}
        />
        <MenuRow
          testID="settings-currency"
          icon="currency-circle-dollar"
          label={t('profile.settings.rows.currency')}
          value={`${currencySymbol(currency)} ${currency}`}
          onPress={open('currency')}
        />
        <MenuRow
          testID="settings-units"
          icon="ruler"
          label={t('profile.settings.rows.units')}
          value={t(`profile.units.${units}`)}
          onPress={open('units')}
        />
      </GroupCard>

      <GroupCard title={t('profile.settings.groups.notifications')}>
        {push.status === 'denied' || push.status === 'undetermined' ? (
          <MenuRow
            testID="settings-notif-device"
            icon="bell-slash"
            label={t('profile.settings.notifications.deviceOff')}
            sub={t('profile.settings.notifications.deviceOffText')}
            value={t('profile.settings.notifications.deviceOffAction')}
            onPress={push.enable}
          />
        ) : null}
        {NOTIFICATIONS.map(({ key, icon, hasSub }) => (
          <SwitchRow
            key={key}
            testID={`settings-notif-${key}`}
            icon={icon}
            label={t(`profile.settings.notifications.${key}`)}
            sub={
              hasSub
                ? t(
                    `profile.settings.notifications.${key as Exclude<NotificationKey, 'promos'>}Text`,
                  )
                : undefined
            }
            value={notifications[key]}
            onChange={(value) => updatePrefs({ notifications: { ...notifications, [key]: value } })}
          />
        ))}
      </GroupCard>

      <GroupCard title={t('profile.settings.groups.data')}>
        <MenuRow
          testID="settings-privacy"
          icon="eye"
          label={t('profile.settings.rows.privacy')}
          value={t(`profile.privacy.${privacy}`)}
          onPress={open('privacy')}
        />
        <MenuRow
          testID="settings-photos"
          icon="images"
          label={t('profile.settings.rows.photos')}
          value={t('profile.settings.rows.photosValue')}
          onPress={() => router.push(routes.photos)}
        />
      </GroupCard>

      <GroupCard title={t('profile.settings.groups.support')}>
        <MenuRow
          testID="settings-help"
          icon="question"
          label={t('profile.settings.rows.help')}
          onPress={open('help')}
        />
        <MenuRow
          testID="settings-delete"
          icon="trash"
          label={t('profile.settings.rows.delete')}
          onPress={open('delete')}
        />
      </GroupCard>

      {__DEV__ ? (
        <GroupCard title={t('profile.settings.groups.demo')} testID="settings-demo">
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <Text variant="caption" tone="muted" weight={400}>
              {t('profile.settings.demo.text')}
            </Text>
          </View>
          <View accessibilityRole="radiogroup" style={{ paddingHorizontal: 16 }}>
            {DEMO_STATES.map((state) => (
              <RadioRow
                key={state}
                testID={`demo-${state}`}
                label={t(`profile.settings.demo.${state}`)}
                checked={demo === state}
                onPress={() => setDemo(state)}
              />
            ))}
          </View>
        </GroupCard>
      ) : null}

      <Button
        testID="settings-sign-out"
        variant="destructive"
        label={t('profile.settings.signOut')}
        loading={signingOut}
        onPress={() => void signOut()}
      />
      {signOutConfirm}

      <Text variant="caption" tone="muted" align="center" style={{ fontSize: 12 }}>
        {t('profile.settings.version', { version })}
      </Text>
      <Text
        testID="settings-credits"
        variant="caption"
        tone="muted"
        align="center"
        style={{ fontSize: 11, marginTop: -8 }}
      >
        {t('profile.settings.credits')}
      </Text>
    </Screen>
  );
}
