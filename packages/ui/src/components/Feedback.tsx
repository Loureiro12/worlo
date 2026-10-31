import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { alpha, colors, palette } from '../tokens/colors';
import { layout, motion, radius, shadow } from '../tokens/layout';
import { fontFamily } from '../tokens/typography';
import { Button } from './Button';
import { IconCircle } from './Cards';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/* ───────────────────────── Sheet ───────────────────────── */

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Fixed footer below the scrolling content (e.g. "Salvar"). */
  footer?: ReactNode;
  testID?: string;
  /** Accessible name of the overlay that closes the sheet. */
  closeLabel?: string;
};

/**
 * Bottom sheet: 45% carvão overlay (tap to close), white panel r24 on top,
 * 36×4 handle, H2 title. Slides up in ~280ms.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  testID,
  closeLabel = 'Close',
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: motion.sheetMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, progress]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha.overlay,
            opacity: progress,
          }}
        />
        <Pressable
          testID={testID ? `${testID}-overlay` : undefined}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={{ flex: 1 }}
          onPress={onClose}
        />
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          // In the layout flow (not absolute) so KeyboardAvoidingView can lift it.
          style={{
            maxHeight: '88%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.r24,
            borderTopRightRadius: radius.r24,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) },
            ],
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View
              style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }}
            />
          </View>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingHorizontal: layout.gutter,
              paddingTop: 8,
              paddingBottom: footer ? 16 : Math.max(insets.bottom, 16) + 24,
              gap: 12,
            }}
          >
            {title ? (
              <View style={{ gap: 4, marginTop: 6 }}>
                <Text variant="h2">{title}</Text>
                {subtitle ? (
                  <Text variant="bodyS" tone="muted">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {children}
          </ScrollView>
          {footer ? (
            <View
              style={{
                paddingHorizontal: layout.gutter,
                paddingTop: 12,
                paddingBottom: Math.max(insets.bottom, 12) + 12,
                borderTopWidth: 1,
                borderTopColor: alpha.hairline,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Large tappable option inside a sheet (Adicionar viagem). */
export function SheetOption({
  title,
  description,
  leading,
  onPress,
  testID,
}: {
  title: string;
  description?: string;
  leading: ReactNode;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: radius.r16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.background : colors.surface,
      })}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyL" weight={700}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted" weight={400}>
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/* ───────────────────────── Toast ───────────────────────── */

export type ToastKind = 'success' | 'info' | 'error';

type ToastState = { id: number; message: string; kind: ToastKind } | null;

const toastIcon: Record<ToastKind, { icon: IconName; color: string }> = {
  success: { icon: 'check-circle', color: colors.success },
  info: { icon: 'info', color: colors.info },
  error: { icon: 'warning-circle', color: colors.error },
};

type ToastApi = { show: (message: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastApi>({ show: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

/** Renders toasts at the top of the screen; one at a time, 2.4s each. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    counter.current += 1;
    setToast({ id: counter.current, message, kind });
    timer.current = setTimeout(() => setToast(null), motion.toastVisibleMs);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? <ToastView key={toast.id} message={toast.message} kind={toast.kind} /> : null}
    </ToastContext.Provider>
  );
}

export function ToastView({ message, kind }: { message: string; kind: ToastKind }) {
  const insets = useSafeAreaInsets();
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: motion.toastMs, useNativeDriver: true }).start();
  }, [enter]);
  const { icon, color } = toastIcon[kind];
  return (
    <Animated.View
      testID="toast"
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: layout.gutter,
        right: layout.gutter,
        zIndex: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: radius.r16,
        backgroundColor: colors.surface,
        boxShadow: shadow.toast,
        // Slide only: fading from 0 would hide the alert from screen readers.
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
        ],
      }}
    >
      <Icon name={icon} size={20} weight="fill" color={color} />
      <Text variant="label" style={{ flex: 1 }}>
        {message}
      </Text>
    </Animated.View>
  );
}

/* ─────────────────────── Empty state ─────────────────────── */

export type EmptyStateProps = {
  icon?: IconName;
  title: string;
  text?: string;
  action?: { label: string; onPress: () => void; testID?: string };
  secondary?: { label: string; onPress: () => void; testID?: string };
  /** Dashed outline without icon (Dia livre, Coleção vazia). */
  dashed?: boolean;
  testID?: string;
};

export function EmptyState({
  icon,
  title,
  text,
  action,
  secondary,
  dashed = false,
  testID,
}: EmptyStateProps) {
  return (
    <View
      testID={testID}
      style={{
        paddingVertical: dashed ? 22 : 28,
        paddingHorizontal: 20,
        borderRadius: dashed ? radius.r16 : radius.r24,
        backgroundColor: dashed ? 'transparent' : colors.surface,
        borderWidth: dashed ? 1.5 : 0,
        borderStyle: 'dashed',
        borderColor: colors.border,
        alignItems: 'center',
        gap: 10,
      }}
    >
      {icon && !dashed ? <IconCircle icon={icon} size={72} iconSize={34} /> : null}
      <Text
        variant={dashed ? 'body' : 'h3'}
        weight={700}
        align="center"
        style={dashed ? null : { fontSize: 21, lineHeight: 27 }}
      >
        {title}
      </Text>
      {text ? (
        <Text variant="bodyS" tone="muted" align="center" weight={400} style={{ maxWidth: 280 }}>
          {text}
        </Text>
      ) : null}
      {action ? (
        <View style={{ marginTop: 6 }}>
          <Button label={action.label} size="md" onPress={action.onPress} testID={action.testID} />
        </View>
      ) : null}
      {secondary ? (
        <Button
          variant="ghost"
          label={secondary.label}
          onPress={secondary.onPress}
          testID={secondary.testID}
        />
      ) : null}
    </View>
  );
}

/* ───────────────────────── Skeleton ───────────────────────── */

export function SkeletonBlock({ style, onDark = false }: { style?: ViewStyle; onDark?: boolean }) {
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={[
        {
          backgroundColor: onDark ? alpha.darkSkeleton : palette.skeleton,
          borderRadius: 8,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/** Full-screen loading layout (04_INTERACTIONS → Carregando). */
export function SkeletonScreen({ onDark = false, label }: { onDark?: boolean; label: string }) {
  const insets = useSafeAreaInsets();
  const card = onDark ? alpha.darkCard : colors.surface;
  return (
    <View
      testID="skeleton-screen"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{
        flex: 1,
        backgroundColor: onDark ? colors.backgroundDark : colors.background,
        paddingTop: insets.top + 16,
        paddingHorizontal: layout.gutter,
        gap: 14,
      }}
    >
      <SkeletonBlock onDark={onDark} style={{ width: '55%', height: 30 }} />
      <SkeletonBlock onDark={onDark} style={{ height: 48, borderRadius: radius.full }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[70, 90, 80].map((w) => (
          <SkeletonBlock
            key={w}
            onDark={onDark}
            style={{ width: w, height: 34, borderRadius: radius.full }}
          />
        ))}
      </View>
      {[0, 1].map((row) => (
        <View
          key={row}
          style={{ padding: 10, gap: 10, borderRadius: radius.r24, backgroundColor: card }}
        >
          <SkeletonBlock onDark={onDark} style={{ height: 150, borderRadius: radius.r16 }} />
          <SkeletonBlock onDark={onDark} style={{ width: '70%', height: 18, borderRadius: 6 }} />
          <SkeletonBlock onDark={onDark} style={{ width: '45%', height: 14, borderRadius: 6 }} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon
          name="circle-notch"
          size={16}
          color={onDark ? colors.textInverseMuted : colors.textMuted}
        />
        <Text variant="caption" weight={600} tone={onDark ? 'inverseMuted' : 'muted'}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/* ──────────────────── Offline / error states ──────────────────── */

export type FullScreenStateProps = {
  kind: 'offline' | 'error';
  title: string;
  text: string;
  retryLabel: string;
  onRetry: () => void;
  secondary?: { label: string; onPress: () => void };
  /** "Código WRL-503". */
  code?: string;
  onDark?: boolean;
  onBack?: () => void;
  backLabel?: string;
};

export function FullScreenState({
  kind,
  title,
  text,
  retryLabel,
  onRetry,
  secondary,
  code,
  onDark = false,
  onBack,
  backLabel = 'Back',
}: FullScreenStateProps) {
  const insets = useSafeAreaInsets();
  const fg = onDark ? 'inverse' : 'default';
  return (
    <View
      testID={`state-${kind}`}
      style={{
        flex: 1,
        backgroundColor: onDark ? colors.backgroundDark : colors.background,
        paddingTop: insets.top + layout.headerGap,
        paddingHorizontal: layout.gutter,
        paddingBottom: 24,
      }}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: onDark ? alpha.darkButton : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="arrow-left" size={20} color={onDark ? colors.textInverse : colors.text} />
        </Pressable>
      ) : null}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          paddingHorizontal: 12,
        }}
      >
        <IconCircle
          icon={kind === 'offline' ? 'wifi-slash' : 'cloud-x'}
          size={84}
          iconSize={40}
          background={kind === 'offline' ? colors.surface : colors.accentSoft}
          color={kind === 'offline' ? colors.text : colors.link}
        />
        <Text variant="h2" tone={fg} align="center">
          {title}
        </Text>
        <Text
          variant="body"
          tone={onDark ? 'inverseMuted' : 'muted'}
          align="center"
          style={{ maxWidth: 300 }}
        >
          {text}
        </Text>
        <View style={{ marginTop: 8 }}>
          <Button
            testID="state-retry"
            label={retryLabel}
            icon="arrow-clockwise"
            size="md"
            onPress={onRetry}
          />
        </View>
        {secondary ? (
          <Button
            variant="ghost"
            label={secondary.label}
            color={onDark ? colors.textInverse : colors.text}
            onPress={secondary.onPress}
          />
        ) : null}
        {code ? (
          <Text variant="micro" tone={onDark ? 'inverseMuted' : 'muted'} style={{ marginTop: 6 }}>
            {code}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** 36pt bar above the tab bar while offline. */
export function OfflineBanner({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <View
      testID="offline-banner"
      accessibilityRole="alert"
      style={{
        height: layout.offlineBannerHeight,
        backgroundColor: palette.cinza800,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <Icon name="wifi-slash" size={16} color={colors.accentOnDark} />
      <Text
        variant="caption"
        weight={600}
        tone="inverse"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
        onPress={onRetry}
        hitSlop={8}
        style={{ padding: 6 }}
      >
        <Text variant="caption" weight={700} tone="accentOnDark">
          {retryLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/** Floating "Viajando · Dia N · label" pill shown on every tab in travel mode. */
export function LivePill({
  label,
  onPress,
  testID = 'live-pill',
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        height: 40,
        paddingLeft: 12,
        paddingRight: 16,
        borderRadius: radius.full,
        backgroundColor: colors.backgroundDark,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        boxShadow: shadow.pillLive,
        alignSelf: 'center',
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.primary,
          boxShadow: `0px 0px 0px 4px ${alpha.coralHalo}`,
        }}
      />
      <Text variant="caption" weight={700} tone="inverse" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ───────────────────────── Logo ───────────────────────── */

/** Provisional pin + wordmark (swap for the official file from the identity PDF). */
export function LogoPin({
  width = 22,
  color = palette.carvao,
  dot = palette.coral,
}: {
  width?: number;
  color?: string;
  dot?: string;
}) {
  return (
    <Svg width={width} height={width * 1.25} viewBox="0 0 24 30" accessibilityElementsHidden>
      <Path
        d="M12 0C5.4 0 0 5.3 0 11.9 0 20.3 12 30 12 30s12-9.7 12-18.1C24 5.3 18.6 0 12 0z"
        fill={color}
      />
      <Circle cx={12} cy={12} r={5} fill={dot} />
    </Svg>
  );
}

export function Logo({ size = 24, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Worlo"
      style={{ flexDirection: 'row', alignItems: 'center', gap: size / 3 }}
    >
      <LogoPin width={size * 0.85} color={onDark ? palette.branco : palette.carvao} />
      <Text
        variant="h2"
        tone={onDark ? 'inverse' : 'default'}
        style={{
          fontFamily: fontFamily.title800,
          fontSize: size,
          lineHeight: size * 1.2,
          letterSpacing: size * -0.02,
        }}
      >
        Worlo
      </Text>
    </View>
  );
}
