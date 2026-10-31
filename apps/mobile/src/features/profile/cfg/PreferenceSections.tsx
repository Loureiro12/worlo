import { supportedLanguages, useTranslation } from '@worlo/i18n';
import { RadioRow, useToast } from '@worlo/ui';
import { View } from 'react-native';
import { updatePrefs, useProfilePrefs } from '@/data/profile';
import { usePreferences } from '@/providers/PreferencesProvider';
import { CURRENCIES, UNITS } from '../options';
import { GroupCard } from '../parts';
import { CfgLayout } from './CfgLayout';

const rowStyle = { paddingHorizontal: 16 } as const;

/** K3 · Idioma: applies immediately (the toast already speaks the new language). */
export function LanguageSection() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { language, setLanguage } = usePreferences();
  return (
    <CfgLayout section="language">
      <View accessibilityRole="radiogroup">
        <GroupCard>
          {supportedLanguages.map((lang) => (
            <RadioRow
              key={lang}
              testID={`language-${lang}`}
              style={rowStyle}
              label={t(`languages.${lang}`)}
              checked={language === lang}
              onPress={() => {
                setLanguage(lang);
                const next = i18n.getFixedT(lang);
                toast.show(
                  next('profile.cfg.language.toast', { value: next(`languages.${lang}`) }),
                );
              }}
            />
          ))}
        </GroupCard>
      </View>
    </CfgLayout>
  );
}

/** K3 · Moeda. */
export function CurrencySection() {
  const { t } = useTranslation();
  const toast = useToast();
  const { currency } = useProfilePrefs();
  return (
    <CfgLayout section="currency">
      <View accessibilityRole="radiogroup">
        <GroupCard>
          {CURRENCIES.map(({ code, symbol }) => (
            <RadioRow
              key={code}
              testID={`currency-${code}`}
              style={rowStyle}
              label={t(`profile.currencies.${code}`)}
              description={`${symbol} · ${code}`}
              checked={currency === code}
              onPress={() => {
                updatePrefs({ currency: code });
                toast.show(
                  t('profile.cfg.currency.toast', { value: t(`profile.currencies.${code}`) }),
                );
              }}
            />
          ))}
        </GroupCard>
      </View>
    </CfgLayout>
  );
}

/** K3 · Unidades. */
export function UnitsSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const { units } = useProfilePrefs();
  return (
    <CfgLayout section="units">
      <View accessibilityRole="radiogroup">
        <GroupCard>
          {UNITS.map((unit) => (
            <RadioRow
              key={unit}
              testID={`units-${unit}`}
              style={rowStyle}
              label={t(`profile.units.${unit}`)}
              description={t(`profile.units.${unit}Text`)}
              checked={units === unit}
              onPress={() => {
                updatePrefs({ units: unit });
                toast.show(t('profile.cfg.units.toast', { value: t(`profile.units.${unit}`) }));
              }}
            />
          ))}
        </GroupCard>
      </View>
    </CfgLayout>
  );
}
