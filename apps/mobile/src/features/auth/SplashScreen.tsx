import { useTranslation } from '@worlo/i18n';
import { alpha, colors, FullScreenState, fontFamily, palette, Text, useToast } from '@worlo/ui';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useProfile } from '@/data/profile';
import { useSync } from '@/features/sync/SyncProvider';
import { auth, mfa } from '@/lib/auth';
import { firstName } from '@/lib/people';
import { routes } from '@/navigation/routes';
import { useAuth } from '@/providers/AuthProvider';
import { clearEntry, peekEntry } from './entry';

/** Total time on screen before moving on (04_INTERACTIONS → Splash). */
export const SPLASH_MS = 3000;

// Animations are skipped under Jest (infinite loops + fake timers don't mix).
const ANIMATE = process.env.NODE_ENV !== 'test';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const bounce = Easing.bezier(0.3, 1.3, 0.5, 1);

type Anim = Animated.Value;

/** One-shot 0→1 timing (`animation-fill-mode: both`). */
const once = (v: Anim, duration: number, delay: number, easing = ease, native = true) =>
  Animated.timing(v, { toValue: 1, duration, delay, easing, useNativeDriver: native });

/** Infinite 0→1 loop that starts after `delay`. */
const loop = (v: Anim, duration: number, delay: number, easing = Easing.linear, native = true) =>
  Animated.sequence([
    Animated.delay(delay),
    Animated.loop(Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: native })),
  ]);

function useValues<K extends string>(keys: readonly K[]): Record<K, Anim> {
  const ref = useRef<Record<K, Anim> | null>(null);
  if (!ref.current) {
    ref.current = Object.fromEntries(
      keys.map((k) => [k, new Animated.Value(ANIMATE ? 0 : 1)]),
    ) as Record<K, Anim>;
  }
  return ref.current;
}

const KEYS = [
  'glow',
  'orbits',
  'spinOuter',
  'spinInner',
  'ring1',
  'ring2',
  'pin',
  'dot',
  'word',
  'tagline',
  'barIn',
  'bar',
  'skip',
] as const;

/**
 * A1 · Splash and the app's entry gate: pin drops, orbits spin, rings pulse.
 * Leaves after 3s (or a tap) once the destination is known: Welcome when signed
 * out; otherwise it waits for the first sync (profile + catalog on the device),
 * then goes to onboarding (new account) or Explorar.
 */
export function SplashScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const session = useAuth();
  const sync = useSync();
  const profile = useProfile();
  const left = useRef(false);
  const a = useValues(KEYS);
  // Coming from login/signup: the brand intro was already seen.
  const [introDone, setIntroDone] = useState(() => peekEntry() !== null);
  // A session stuck at AAL1 with 2FA on: the database answers nothing until the code.
  const userId = session.user?.id ?? null;
  const [mfaGate, setMfaGate] = useState<{ user: string; required: boolean } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void mfa.needsChallenge().then((required) => {
      if (alive) setMfaGate({ user: userId, required });
    });
    return () => {
      alive = false;
    };
  }, [userId]);
  const gate = mfaGate && mfaGate.user === userId ? mfaGate : null;

  let destination: Href | null = null;
  if (session.status === 'signedOut') destination = routes.welcome;
  else if (session.status === 'signedIn' && gate?.required) destination = routes.twoFactor;
  else if (session.status === 'signedIn' && gate && sync.ready && profile) {
    destination = profile.onboardedAt ? routes.explore : routes.onboardingMap;
  }

  const leave = useCallback(() => {
    if (left.current || !destination) return;
    left.current = true;
    if (destination === routes.twoFactor) {
      // The code screen comes back here through `enterApp`.
      router.replace(destination);
      return;
    }
    const entry = peekEntry();
    clearEntry();
    router.replace(destination);
    if (entry?.greet && destination === routes.explore && profile?.name) {
      toast.show(t('auth.login.welcomeBack', { name: firstName(profile.name) }));
    }
  }, [router, destination, profile, toast, t]);

  useEffect(() => {
    if (introDone) return;
    const timer = setTimeout(() => setIntroDone(true), SPLASH_MS);
    return () => clearTimeout(timer);
  }, [introDone]);

  useEffect(() => {
    if (introDone) leave();
  }, [introDone, leave]);

  // Still no account data after the intro and the first pull can't run / failed.
  const stuck =
    introDone &&
    session.status === 'signedIn' &&
    gate?.required === false &&
    !sync.ready &&
    (!sync.online || sync.status.state === 'error');

  useEffect(() => {
    if (!ANIMATE) return;
    const all = Animated.parallel([
      once(a.glow, 1200, 300),
      once(a.orbits, 800, 900),
      loop(a.spinOuter, 3600, 900),
      loop(a.spinInner, 5400, 900),
      loop(a.ring1, 2200, 1100, Easing.out(Easing.ease)),
      loop(a.ring2, 2200, 2200, Easing.out(Easing.ease)),
      once(a.pin, 900, 100, bounce),
      loop(a.dot, 1400, 1000, Easing.inOut(Easing.ease), false),
      once(a.word, 700, 750),
      once(a.tagline, 700, 1000),
      once(a.barIn, 400, 1100),
      once(a.bar, 1800, 1100, Easing.bezier(0.4, 0, 0.2, 1)),
      once(a.skip, 600, 1300),
    ]);
    all.start();
    return () => all.stop();
  }, [a]);

  const spin = (v: Anim, reverse = false) =>
    v.interpolate({
      inputRange: [0, 1],
      outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
    });

  const ring = (v: Anim) => ({
    opacity: ANIMATE ? v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.9, 0] }) : 0,
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.9] }) }],
  });

  const rise = (v: Anim) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  });

  if (stuck) {
    const kind = sync.online ? 'error' : 'offline';
    return (
      <FullScreenState
        kind={kind}
        onDark
        title={t(`auth.gate.${kind}Title`)}
        text={t(`auth.gate.${kind}Text`)}
        retryLabel={t('common.actions.retry')}
        onRetry={sync.retry}
        secondary={{ label: t('auth.gate.signOut'), onPress: () => void auth.signOut() }}
      />
    );
  }

  return (
    <Pressable
      testID="splash-screen"
      accessibilityRole="button"
      accessibilityLabel={t('auth.splash.a11y')}
      onPress={leave}
      style={styles.root}
    >
      <StatusBar style="light" />

      {/* Coral glow centered at 44% height. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: a.glow }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="44%" r="55%" fx="50%" fy="44%">
              <Stop offset="0" stopColor={palette.coral} stopOpacity={0.22} />
              <Stop offset="1" stopColor={palette.carvao} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#glow)" />
        </Svg>
      </Animated.View>

      <View style={styles.stage}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: a.orbits }]}>
          <View style={styles.orbitOuter} />
          <View style={styles.orbitInner} />
          <Animated.View
            style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin(a.spinOuter) }] }]}
          >
            <View style={styles.dotOuter} />
          </Animated.View>
          <Animated.View
            style={[styles.innerSpin, { transform: [{ rotate: spin(a.spinInner, true) }] }]}
          >
            <View style={styles.dotInner} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.ring, ring(a.ring1)]} />
        <Animated.View style={[styles.ring, ring(a.ring2)]} />

        {/* Blurred ground shadow under the pin. */}
        <Animated.View
          style={[
            styles.shadow,
            {
              opacity: a.pin.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.5, 0.35] }),
              transform: [
                {
                  scaleX: a.pin.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0.2, 1.15, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={52} height={18}>
            <Defs>
              <RadialGradient id="shadow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0.5" stopColor={palette.carvao} stopOpacity={1} />
                <Stop offset="1" stopColor={palette.carvao} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={26} cy={9} rx={26} ry={9} fill="url(#shadow)" />
          </Svg>
        </Animated.View>

        <Animated.View
          style={{
            marginTop: -14,
            opacity: a.pin.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
            transform: [
              {
                translateY: a.pin.interpolate({
                  inputRange: [0, 0.6, 0.8, 1],
                  outputRange: [-120, 8, -4, 0],
                }),
              },
              {
                scale: a.pin.interpolate({
                  inputRange: [0, 0.6, 0.8, 1],
                  outputRange: [0.6, 1.04, 0.98, 1],
                }),
              },
            ],
          }}
        >
          <Svg width={64} height={80} viewBox="0 0 24 30">
            <Path
              d="M12 0C5.4 0 0 5.3 0 11.9 0 20.3 12 30 12 30s12-9.7 12-18.1C24 5.3 18.6 0 12 0z"
              fill={palette.branco}
            />
            <AnimatedCircle
              cx={12}
              cy={12}
              r={
                ANIMATE
                  ? a.dot.interpolate({ inputRange: [0, 0.5, 1], outputRange: [5, 6.4, 5] })
                  : 5
              }
              fill={palette.coral}
            />
          </Svg>
        </Animated.View>
      </View>

      <Animated.Text style={[styles.word, rise(a.word)]}>Worlo</Animated.Text>
      <Animated.Text style={[styles.tagline, rise(a.tagline)]}>{t('common.tagline')}</Animated.Text>

      <Animated.View style={[styles.track, { opacity: a.barIn }]}>
        <Animated.View style={[styles.fill, { transform: [{ scaleX: a.bar }] }]} />
      </Animated.View>

      <Animated.View style={[styles.skip, { opacity: a.skip }]}>
        <Text variant="micro" tone="subtle" align="center">
          {t('auth.splash.skip')}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const STAGE = 220;
const INSET = 22;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  orbitOuter: {
    ...StyleSheet.absoluteFill,
    borderRadius: STAGE / 2,
    borderWidth: 1,
    borderColor: alpha.darkButton,
  },
  orbitInner: {
    position: 'absolute',
    top: INSET,
    left: INSET,
    right: INSET,
    bottom: INSET,
    borderRadius: (STAGE - INSET * 2) / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: alpha.darkChip,
  },
  innerSpin: { position: 'absolute', top: INSET, left: INSET, right: INSET, bottom: INSET },
  dotOuter: {
    position: 'absolute',
    top: -5,
    left: STAGE / 2 - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.coral,
    boxShadow: `0px 0px 12px ${palette.coral}`,
  },
  dotInner: {
    position: 'absolute',
    bottom: -3,
    left: (STAGE - INSET * 2) / 2 - 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.coral300,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: palette.coral,
  },
  shadow: {
    position: 'absolute',
    top: STAGE / 2 + 44 - 4,
    width: 52,
    height: 18,
  },
  word: {
    marginTop: 6,
    fontFamily: fontFamily.title800,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: 52 * -0.03,
    color: colors.textInverse,
  },
  tagline: {
    marginTop: 10,
    fontFamily: fontFamily.ui700,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 12 * 0.22,
    textTransform: 'uppercase',
    color: colors.accentOnDark,
  },
  track: {
    position: 'absolute',
    bottom: 72,
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: alpha.darkButton,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: palette.coral,
    transformOrigin: 'left',
  },
  skip: { position: 'absolute', bottom: 44, left: 0, right: 0 },
});
