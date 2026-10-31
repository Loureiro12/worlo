import { useTranslation } from '@worlo/i18n';
import { colors, type IconName, radius, Segmented, Text, useToast } from '@worlo/ui';
import { useState } from 'react';
import { View } from 'react-native';
import { useMe } from '@/data/profile';
import { CheckRow, GroupCard, Overline } from '../parts';
import { CfgLayout } from './CfgLayout';

type ExportKey = 'trips' | 'photos' | 'money' | 'community';
type Format = 'json' | 'csv';

const ITEMS: readonly { key: ExportKey; icon: IconName }[] = [
  { key: 'trips', icon: 'suitcase-rolling' },
  { key: 'photos', icon: 'images' },
  { key: 'money', icon: 'wallet' },
  { key: 'community', icon: 'users-three' },
];

/** K3 · Exportar meus dados → "Pedido recebido". */
export function ExportSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const { email } = useMe();
  const [include, setInclude] = useState<Record<ExportKey, boolean>>({
    trips: true,
    photos: true,
    money: true,
    community: false,
  });
  const [format, setFormat] = useState<Format>('json');
  const [sent, setSent] = useState(false);

  const request = () => {
    if (!Object.values(include).some(Boolean)) {
      toast.show(t('profile.cfg.export.pickOne'), 'info');
      return;
    }
    setSent(true);
  };

  return (
    <CfgLayout
      section="export"
      cta={{
        label: sent ? t('profile.cfg.export.ctaSent') : t('profile.cfg.export.cta'),
        onPress: request,
        disabled: sent,
      }}
    >
      {sent ? (
        <View
          testID="export-received"
          accessibilityLiveRegion="polite"
          style={{
            padding: 18,
            gap: 8,
            borderRadius: radius.r24,
            backgroundColor: colors.backgroundDark,
          }}
        >
          <Text variant="overline" tone="accentOnDark">
            {t('profile.cfg.export.receivedOverline')}
          </Text>
          <Text variant="h3" tone="inverse">
            {t('profile.cfg.export.receivedTitle', { email })}
          </Text>
          <Text variant="caption" tone="inverseMuted">
            {t('profile.cfg.export.receivedText')}
          </Text>
        </View>
      ) : null}

      <GroupCard title={t('profile.cfg.export.include')}>
        {ITEMS.map(({ key, icon }) => (
          <CheckRow
            key={key}
            testID={`export-${key}`}
            icon={icon}
            label={t(`profile.cfg.export.${key}`)}
            sub={t(`profile.cfg.export.${key}Text`)}
            checked={include[key]}
            onPress={() => {
              setInclude((v) => ({ ...v, [key]: !v[key] }));
              setSent(false);
            }}
          />
        ))}
      </GroupCard>

      <View style={{ gap: 8 }}>
        <Overline>{t('profile.cfg.export.format')}</Overline>
        <Segmented
          testID="export-format"
          label={t('profile.cfg.export.format')}
          options={[
            { value: 'json', label: t('profile.cfg.export.json') },
            { value: 'csv', label: t('profile.cfg.export.csv') },
          ]}
          value={format}
          onChange={(value) => {
            setFormat(value);
            setSent(false);
          }}
        />
      </View>
    </CfgLayout>
  );
}
