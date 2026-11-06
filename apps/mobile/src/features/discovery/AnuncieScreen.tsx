import { type BusinessType, ValidationError } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import {
  BottomBar,
  Button,
  Card,
  Chip,
  colors,
  FormError,
  Icon,
  IconCircle,
  type IconName,
  Screen,
  ScreenHeader,
  Text,
  TextArea,
  TextField,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { repos } from '@/data/repositories';
import { routes } from '@/navigation/routes';

const TYPES: readonly BusinessType[] = ['guide', 'agency', 'restaurant', 'lodging'];

type Benefit = 'planning' | 'verified' | 'reviews';
const BENEFITS: readonly { key: Benefit; icon: IconName }[] = [
  { key: 'planning', icon: 'map-trifold' },
  { key: 'verified', icon: 'seal-check' },
  { key: 'reviews', icon: 'chart-line-up' },
];

export type AnuncieForm = {
  name: string;
  type: BusinessType;
  city: string;
  desc: string;
  email: string;
  /** Page where travelers book (optional; must be a web link). */
  link: string;
};
export type AnuncieError = 'name' | 'city' | 'email' | 'link';

const EMAIL = /.+@.+\..+/;
const isAnuncieError = (code: string): code is AnuncieError =>
  code === 'name' || code === 'city' || code === 'email' || code === 'link';
const WEB_URL = /^https?:\/\/\S+$/i;

/** 04_INTERACTIONS → Validações: nome → cidade → e-mail (first missing wins). */
export function anuncieError(form: AnuncieForm): AnuncieError | null {
  if (!form.name.trim()) return 'name';
  if (!form.city.trim()) return 'city';
  if (!EMAIL.test(form.email.trim())) return 'email';
  const link = form.link.trim();
  if (link && !WEB_URL.test(link)) return 'link';
  return null;
}

/**
 * E3 · Anuncie: business sign-up form → "Recebemos seu cadastro." The sign-up is
 * a synced row (works offline, goes out with the next sync); the team reviews it
 * on the dashboard and the owner gets a notification.
 */
export function AnuncieScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [form, setForm] = useState<AnuncieForm>({
    name: '',
    type: 'guide',
    city: '',
    desc: '',
    email: '',
    link: '',
  });
  const [error, setError] = useState<AnuncieError | null>(null);
  const [sent, setSent] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.navigate(routes.passeios));

  const change = (patch: Partial<AnuncieForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  };

  const submit = () => {
    if (sent) {
      back();
      return;
    }
    const invalid = anuncieError(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    try {
      repos.businesses.submit({ ...form, description: form.desc, bookingUrl: form.link });
    } catch (e) {
      if (e instanceof ValidationError && isAnuncieError(e.code)) {
        setError(e.code);
        return;
      }
      throw e;
    }
    setSent(true);
  };

  return (
    <Screen
      testID="anuncie-screen"
      gap={20}
      header={
        <ScreenHeader
          overline={t('discovery.anuncie.overline')}
          onBack={back}
          backLabel={t('common.actions.back')}
        />
      }
      bottomBar={
        <BottomBar>
          <Button
            testID="anuncie-submit"
            fullWidth
            flex={1}
            label={sent ? t('discovery.anuncie.backToTours') : t('discovery.anuncie.submit')}
            onPress={submit}
          />
        </BottomBar>
      }
    >
      {sent ? (
        <View testID="anuncie-success" style={{ gap: 14, paddingTop: 48 }}>
          <IconCircle
            icon="check"
            size={64}
            iconSize={32}
            background={colors.primary}
            color={colors.onPrimary}
          />
          <Text variant="h1" accessibilityLiveRegion="polite">
            {t('discovery.anuncie.successTitle')}
          </Text>
          <Text variant="bodyL" tone="support">
            {t('discovery.anuncie.successText', {
              name: form.name.trim(),
              email: form.email.trim(),
            })}
          </Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Text variant="h1">{t('discovery.anuncie.title')}</Text>
            <Text variant="body" tone="muted">
              {t('discovery.anuncie.text')}
            </Text>
          </View>
          <Card padding={16} gap={12}>
            {BENEFITS.map((b) => (
              <View key={b.key} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <Icon name={b.icon} size={22} color={colors.link} />
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight={700}>
                    {t(`discovery.anuncie.benefits.${b.key}Title`)}
                  </Text>
                  <Text variant="caption" weight={400} tone="muted">
                    {t(`discovery.anuncie.benefits.${b.key}Text`)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
          <TextField
            testID="anuncie-name"
            label={t('discovery.anuncie.fields.name')}
            placeholder={t('discovery.anuncie.fields.namePlaceholder')}
            value={form.name}
            onChangeText={(name) => change({ name })}
            invalid={error === 'name'}
            autoComplete="organization"
            returnKeyType="next"
          />
          <View style={{ gap: 8 }}>
            <Text variant="label">{t('discovery.anuncie.fields.type')}</Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('discovery.anuncie.fields.type')}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              {TYPES.map((type) => (
                <Chip
                  key={type}
                  testID={`anuncie-type-${type}`}
                  label={t(`discovery.anuncie.types.${type}`)}
                  selected={form.type === type}
                  onPress={() => change({ type })}
                />
              ))}
            </View>
          </View>
          <TextField
            testID="anuncie-city"
            label={t('discovery.anuncie.fields.city')}
            placeholder={t('discovery.anuncie.fields.cityPlaceholder')}
            value={form.city}
            onChangeText={(city) => change({ city })}
            invalid={error === 'city'}
            returnKeyType="next"
          />
          <TextArea
            testID="anuncie-desc"
            label={t('discovery.anuncie.fields.description')}
            placeholder={t('discovery.anuncie.fields.descriptionPlaceholder')}
            value={form.desc}
            onChangeText={(desc) => change({ desc })}
            maxLength={500}
            minHeight={110}
          />
          <TextField
            testID="anuncie-email"
            label={t('discovery.anuncie.fields.email')}
            placeholder={t('discovery.anuncie.fields.emailPlaceholder')}
            value={form.email}
            onChangeText={(email) => change({ email })}
            invalid={error === 'email'}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextField
            testID="anuncie-link"
            label={t('discovery.anuncie.fields.link')}
            placeholder={t('discovery.anuncie.fields.linkPlaceholder')}
            value={form.link}
            onChangeText={(link) => change({ link })}
            invalid={error === 'link'}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="URL"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {error ? (
            <FormError testID="anuncie-error" message={t(`discovery.anuncie.errors.${error}`)} />
          ) : null}
        </>
      )}
    </Screen>
  );
}
