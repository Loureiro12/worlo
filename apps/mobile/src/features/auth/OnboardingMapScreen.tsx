import { useTranslation } from '@worlo/i18n';
import { alpha, Button, colors, Globe, opacity, radius, Text, useToast } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeOnboarding } from '@/data/profile';
import { useCountryName } from '@/lib/countries';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';

const BRAZIL = '076';

/** A6 · Comece pelo seu mapa: tap countries you already know (step 1 of 2). */
export function OnboardingMapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const visited = useStore((s) => s.onboardingVisited);
  const toggle = useStore((s) => s.toggleOnboardingCountry);
  const countryName = useCountryName();

  const count = visited.length;
  const names = visited.map(countryName).join(' · ') || t('auth.onboarding.none');

  const skip = () => {
    completeOnboarding();
    router.replace(routes.explore);
  };

  const next = () => {
    const first = visited[0];
    if (!first) {
      toast.show(t('auth.onboarding.needOne'), 'info');
      return;
    }
    router.push(routes.tripForm({ mode: 'onboarding', kind: 'past', dest: countryName(first) }));
  };

  return (
    <View
      testID="onboarding-map-screen"
      style={{ flex: 1, backgroundColor: colors.backgroundDark, overflow: 'hidden' }}
    >
      <StatusBar style="light" />
      <View style={{ position: 'absolute', left: 0, top: 170 }}>
        <Globe
          testID="onboarding-globe"
          width={width}
          height={500}
          visited={visited}
          autoRotate={0}
          initialRotation={[52, 8]}
          scale={1.02}
          pulse={count === 0 ? BRAZIL : null}
          onPickCountry={toggle}
          accessibilityLabel={t('auth.onboarding.globeLabel')}
        />
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          gap: 10,
        }}
      >
        <View
          pointerEvents="box-none"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text variant="overline" tone="accentOnDark">
            {t('auth.onboarding.step')}
          </Text>
          <Pressable
            testID="onboarding-skip"
            accessibilityRole="button"
            accessibilityLabel={t('common.actions.skip')}
            hitSlop={8}
            onPress={skip}
            style={({ pressed }) => ({ paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
          >
            <Text variant="label" tone="inverseMuted">
              {t('common.actions.skip')}
            </Text>
          </Pressable>
        </View>
        <Text variant="h1" tone="inverse" pointerEvents="none">
          {t('auth.onboarding.title')}
        </Text>
        <Text variant="body" tone="inverseMuted" pointerEvents="none" style={{ maxWidth: 320 }}>
          {t('auth.onboarding.text')}
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: Math.max(40, insets.bottom + 8),
          gap: 14,
        }}
      >
        <View
          testID="onboarding-counter"
          accessible
          accessibilityLabel={`${count} ${t('auth.onboarding.countLabel', { count })}: ${names}`}
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: radius.r16,
            backgroundColor: alpha.darkCard,
            borderWidth: 1,
            borderColor: alpha.darkBorder,
          }}
        >
          <Text variant="stat" color={colors.primary}>
            {count}
          </Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="label" tone="inverse">
              {t('auth.onboarding.countLabel', { count })}
            </Text>
            <Text variant="caption" tone="inverseMuted" weight={400} numberOfLines={1}>
              {names}
            </Text>
          </View>
        </View>
        <View style={{ opacity: count ? 1 : opacity.disabled }}>
          <Button
            testID="onboarding-continue"
            label={t('common.actions.continue')}
            fullWidth
            onPress={next}
          />
        </View>
      </View>
    </View>
  );
}
