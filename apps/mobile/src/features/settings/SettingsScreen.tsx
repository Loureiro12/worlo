import { type Language, supportedLanguages, useTranslation } from '@worlo/i18n';
import { Button, Card, RadioGroup, Screen, Text, type ThemePreference, VStack } from '@worlo/ui';
import { Link } from 'expo-router';
import { usePreferences } from '@/providers/PreferencesProvider';

const themes: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function SettingsScreen() {
  const { t } = useTranslation();
  const { language, setLanguage, theme, setTheme } = usePreferences();

  return (
    <Screen scroll testID="settings-screen">
      <Card>
        <VStack gap="sm">
          <Text variant="heading">{t('settings.language')}</Text>
          <RadioGroup<Language>
            testID="language"
            label={t('settings.language')}
            value={language}
            onChange={setLanguage}
            // Language names are always shown in their own language.
            options={supportedLanguages.map((lang) => ({
              value: lang,
              label: t(`languages.${lang}`),
            }))}
          />
        </VStack>
      </Card>
      <Card>
        <VStack gap="sm">
          <Text variant="heading">{t('settings.theme')}</Text>
          <RadioGroup<ThemePreference>
            testID="theme"
            label={t('settings.theme')}
            value={theme}
            onChange={setTheme}
            options={themes.map((value) => ({ value, label: t(`settings.themes.${value}`) }))}
          />
        </VStack>
      </Card>
      <Link href="/design-system" asChild>
        <Button
          testID="open-design-system"
          variant="secondary"
          label={t('settings.designSystem')}
        />
      </Link>
    </Screen>
  );
}
