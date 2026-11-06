import { useTranslation } from '@worlo/i18n';
import { Button, colors, Globe, Logo, palette, Text } from '@worlo/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenActive } from '@/lib/useScreenActive';
import { routes } from '@/navigation/routes';

const VISITED = ['076', '620', '250', '380', '032', '152'];
const WISHLIST = ['392', '352'];

/** A2 · Boas-vindas: spinning globe, brand copy, "Começar" / "Já tenho conta". */
export function WelcomeScreen() {
  const active = useScreenActive();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <View testID="welcome-screen" style={{ flex: 1, backgroundColor: colors.backgroundDark }}>
      <StatusBar style="light" />
      {/* 510×560 at (-60, 30) on a 390pt screen: overflows both sides by 60. */}
      <View style={{ position: 'absolute', left: -60, top: 30 }}>
        <Globe
          paused={!active}
          width={width + 120}
          height={560}
          visited={VISITED}
          wishlist={WISHLIST}
          autoRotate={0.12}
          initialRotation={[30, -18]}
          scale={1.12}
          markers={false}
          accessibilityLabel={t('auth.welcome.globeLabel')}
        />
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={[`${palette.carvao}00`, palette.carvao]}
        locations={[0, 0.45]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 420 }}
      />
      <View
        style={{
          marginTop: 'auto',
          paddingHorizontal: 24,
          paddingBottom: Math.max(44, insets.bottom + 12),
          gap: 16,
        }}
      >
        <Logo size={24} onDark />
        <Text variant="overline" tone="accentOnDark">
          {t('common.tagline')}
        </Text>
        <Text variant="display" tone="inverse" accessibilityRole="header">
          {t('auth.welcome.title')}
        </Text>
        <Text variant="bodyL" tone="inverseMuted">
          {t('auth.welcome.text')}
        </Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Button
            testID="welcome-start"
            label={t('auth.welcome.start')}
            fullWidth
            onPress={() => router.push(routes.signup)}
          />
          <Button
            testID="welcome-login"
            variant="outlineInverse"
            label={t('auth.welcome.login')}
            fullWidth
            onPress={() => router.push(routes.login)}
          />
        </View>
      </View>
    </View>
  );
}
