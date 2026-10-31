import { useTranslation } from '@worlo/i18n';
import { colors, Icon, type IconName, Segmented, Text, useToast } from '@worlo/ui';
import { View } from 'react-native';
import { useStore } from '@/store';
import type { Privacy, SettingsSlice } from '@/store/slices/settings';
import { GroupCard, MenuRow, Overline, SwitchRow } from '../parts';
import { CfgLayout } from './CfgLayout';

type DetailKey = keyof SettingsSlice['privacyDetail'];

const DETAILS: readonly { key: DetailKey; icon: IconName }[] = [
  { key: 'map', icon: 'globe-hemisphere-west' },
  { key: 'trips', icon: 'suitcase-rolling' },
  { key: 'photos', icon: 'images' },
  { key: 'search', icon: 'magnifying-glass' },
];

/** K3 · Privacidade do perfil. Expenses are always private (fixed row). */
export function PrivacySection() {
  const { t } = useTranslation();
  const toast = useToast();
  const privacy = useStore((s) => s.privacy);
  const detail = useStore((s) => s.privacyDetail);
  const setSettings = useStore((s) => s.setSettings);
  const options: { value: Privacy; label: string }[] = [
    { value: 'private', label: t('profile.privacy.private') },
    { value: 'friends', label: t('profile.privacy.friends') },
    { value: 'public', label: t('profile.privacy.public') },
  ];

  return (
    <CfgLayout section="privacy">
      <View style={{ gap: 8 }}>
        <Overline>{t('profile.privacy.title')}</Overline>
        <Segmented
          testID="privacy-level"
          label={t('profile.privacy.title')}
          options={options}
          value={privacy}
          onChange={(value) => setSettings({ privacy: value })}
        />
        <Text variant="caption" tone="muted" weight={400} style={{ paddingHorizontal: 4 }}>
          {t(`profile.privacy.text.${privacy}`)}
        </Text>
      </View>

      <GroupCard title={t('profile.cfg.privacy.what')}>
        {DETAILS.map(({ key, icon }) => (
          <SwitchRow
            key={key}
            testID={`privacy-${key}`}
            icon={icon}
            label={t(`profile.cfg.privacy.${key}`)}
            sub={t(`profile.cfg.privacy.${key}Text`)}
            value={detail[key]}
            onChange={(value) => setSettings({ privacyDetail: { ...detail, [key]: value } })}
          />
        ))}
        <View
          accessible
          accessibilityLabel={`${t('profile.cfg.privacy.expenses')}, ${t('profile.cfg.privacy.expensesText')}`}
        >
          <MenuRow
            testID="privacy-expenses"
            icon="wallet"
            label={t('profile.cfg.privacy.expenses')}
            sub={t('profile.cfg.privacy.expensesText')}
            trailing={<Icon name="lock-simple" weight="fill" size={20} color={colors.textMuted} />}
          />
        </View>
      </GroupCard>

      <GroupCard>
        <MenuRow
          testID="privacy-blocked"
          icon="prohibit"
          label={t('profile.cfg.privacy.blocked')}
          value={t('profile.cfg.privacy.blockedValue')}
          onPress={() => toast.show(t('profile.cfg.privacy.blockedToast'), 'info')}
        />
      </GroupCard>
    </CfgLayout>
  );
}
