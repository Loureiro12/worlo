import { useTranslation } from '@worlo/i18n';
import { alpha, Button, colors, Globe, StatTile, Text } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeOnboarding } from '@/data/profile';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { countCities } from '@/features/profile/stats';
import { useScreenActive } from '@/lib/useScreenActive';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';

/** A8 · Primeiro mapa pessoal, shown after saving the onboarding trip. */
export function FirstMapScreen() {
  const active = useScreenActive();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const picked = useStore((s) => s.onboardingVisited);
  // Every trip saved during onboarding counts (one or many).
  const trips = useQuery(() => repos.trips.list(), []);
  const marked = useQuery(() => Object.keys(repos.world.visitedMap()), []);
  const visited = [...new Set([...picked, ...marked])];
  const cities = countCities(trips);
  const stats = [
    { n: visited.length, label: t('auth.firstMap.countries', { count: visited.length }) },
    { n: trips.length, label: t('auth.firstMap.trips', { count: trips.length }) },
    { n: cities, label: t('auth.firstMap.cities', { count: cities }) },
  ];

  const go = (target: typeof routes.map) => {
    completeOnboarding();
    router.replace(target);
  };

  return (
    <View
      testID="first-map-screen"
      style={{ flex: 1, backgroundColor: colors.backgroundDark, overflow: 'hidden' }}
    >
      <StatusBar style="light" />
      <View style={{ position: 'absolute', left: -20, top: 200 }}>
        <Globe
          paused={!active}
          width={width + 40}
          height={420}
          visited={visited}
          autoRotate={0.06}
          initialRotation={[52, 8]}
          interactive={false}
          accessibilityLabel={t('auth.firstMap.globeLabel')}
        />
      </View>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top + 24,
          paddingHorizontal: 20,
          gap: 10,
        }}
      >
        <Text variant="overline" tone="accentOnDark">
          {t('auth.firstMap.overline')}
        </Text>
        <Text variant="displayL" tone="inverse" accessibilityRole="header">
          {t('auth.firstMap.title')}
        </Text>
        <Text variant="body" tone="inverseMuted" style={{ maxWidth: 310 }}>
          {t('auth.firstMap.text')}
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: Math.max(40, insets.bottom + 8),
          gap: 16,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {stats.map((s) => (
            <StatTile
              key={s.label}
              value={String(s.n)}
              label={s.label}
              onDark
              size="lg"
              style={{ borderWidth: 1, borderColor: alpha.darkBorder }}
            />
          ))}
        </View>
        <Button
          testID="first-map-add"
          variant="outlineInverse"
          icon="plus"
          label={t('auth.firstMap.addAnother')}
          fullWidth
          onPress={() => router.push(routes.tripForm({ mode: 'onboarding', kind: 'past' }))}
        />
        <Button
          testID="first-map-see"
          label={t('auth.firstMap.seeMap')}
          fullWidth
          onPress={() => go(routes.map)}
        />
        <Button
          testID="first-map-explore"
          variant="ghost"
          color={colors.textInverse}
          label={t('auth.firstMap.explore')}
          fullWidth
          onPress={() => go(routes.explore)}
        />
      </View>
    </View>
  );
}
