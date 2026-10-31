import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  type RefreshControlProps,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors } from '../tokens/colors';
import { layout } from '../tokens/layout';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';
import { Photo } from './Photo';
import { Text } from './Text';

/** True while the software keyboard is on screen. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

export type ScreenTone = 'light' | 'dark' | 'white';

const backgrounds: Record<ScreenTone, string> = {
  light: colors.background,
  dark: colors.backgroundDark,
  white: colors.surface,
};

export type ScreenProps = {
  children: ReactNode;
  tone?: ScreenTone;
  /** Rendered above the content and kept pinned while scrolling. */
  header?: ReactNode;
  /** Fixed bar at the bottom (CTA), outside the scroll. */
  bottomBar?: ReactNode;
  /**
   * Keep the bottom bar above the keyboard. Only for bars that contain the
   * input itself (comment composer); CTA bars hide while typing so they never
   * cover the next field.
   */
  bottomBarWithKeyboard?: boolean;
  /** Adds bottom padding so content clears the tab bar. */
  withTabBar?: boolean;
  scroll?: boolean;
  /** Horizontal 20pt gutter on the content. */
  padded?: boolean;
  gap?: number;
  /** Adds the top safe area to the content when there is no header. */
  safeTop?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  testID?: string;
  contentStyle?: ViewStyle;
};

/**
 * Base screen: areia (or carvão) background, optional pinned header, scrolling
 * content and a fixed bottom bar. Status bar color follows the tone.
 */
export function Screen({
  children,
  tone = 'light',
  header,
  bottomBar,
  bottomBarWithKeyboard = false,
  withTabBar = false,
  scroll = true,
  padded = true,
  gap = layout.sectionGap,
  safeTop = false,
  refreshControl,
  testID,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const bottomPadding = withTabBar
    ? layout.tabBarScrollPadding
    : bottomBar
      ? 24
      : 24 + insets.bottom;
  const content: ViewStyle = {
    paddingHorizontal: padded ? layout.gutter : 0,
    paddingTop: header ? 4 : safeTop ? insets.top + layout.headerGap : 0,
    paddingBottom: bottomPadding,
    gap,
    flexGrow: 1,
  };

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: backgrounds[tone] }}>
      <StatusBar style={tone === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[content, contentStyle]}
            stickyHeaderIndices={header ? [0] : undefined}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {header ? (
              <View
                style={{
                  marginHorizontal: padded ? -layout.gutter : 0,
                  backgroundColor: backgrounds[tone],
                }}
              >
                {header}
              </View>
            ) : null}
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, content, contentStyle]}>
            {header ? (
              <View style={{ marginHorizontal: padded ? -layout.gutter : 0 }}>{header}</View>
            ) : null}
            {children}
          </View>
        )}
        {keyboardVisible && !bottomBarWithKeyboard ? null : bottomBar}
      </KeyboardAvoidingView>
    </View>
  );
}

export type ScreenHeaderProps = {
  /** Centered overline, e.g. "NOVA VIAGEM". */
  overline?: string;
  onBack?: () => void;
  backLabel?: string;
  backIcon?: IconName;
  right?: ReactNode;
  onDark?: boolean;
  /** Draws on a white background (chat). */
  white?: boolean;
  children?: ReactNode;
};

/** Sticky header for light/dark stack screens: back · overline · action. */
export function ScreenHeader({
  overline,
  onBack,
  backLabel = 'Back',
  backIcon = 'arrow-left',
  right,
  onDark = false,
  white = false,
  children,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + layout.headerGap,
        paddingHorizontal: layout.gutter,
        paddingBottom: 10,
        backgroundColor: white
          ? colors.surface
          : onDark
            ? colors.backgroundDark
            : colors.background,
        borderBottomWidth: white ? 1 : 0,
        borderBottomColor: alpha.hairline,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
        {onBack ? (
          <IconButton
            testID="header-back"
            icon={backIcon}
            label={backLabel}
            tone={onDark ? 'dark' : white ? 'plain' : 'light'}
            onPress={onBack}
          />
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={{ flex: 1, alignItems: children ? 'flex-start' : 'center' }}>
          {children ??
            (overline ? (
              <Text variant="overline" tone={onDark ? 'accentOnDark' : 'link'} numberOfLines={1}>
                {overline}
              </Text>
            ) : null)}
        </View>
        <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
      </View>
    </View>
  );
}

/** Tab root header: optional greeting, H1 title and actions on the right. */
export function TabHeader({
  title,
  greeting,
  subtitle,
  actions,
  onDark = false,
}: {
  title: string;
  greeting?: string;
  subtitle?: string;
  actions?: ReactNode;
  onDark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + layout.headerGap,
        paddingHorizontal: layout.gutter,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: onDark ? 'transparent' : colors.background,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        {greeting ? (
          <Text variant="label" tone={onDark ? 'inverseMuted' : 'muted'}>
            {greeting}
          </Text>
        ) : null}
        <Text variant="h1" tone={onDark ? 'inverse' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" weight={600} tone={onDark ? 'inverseMuted' : 'muted'}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={{ flexDirection: 'row', gap: 8 }}>{actions}</View> : null}
    </View>
  );
}

export type HeroScreenProps = {
  heroUri?: string | null;
  heroTint?: string;
  heroHeight?: number;
  onBack?: () => void;
  backLabel?: string;
  /** Buttons on the right of the floating bar (share, edit, save…). */
  actions?: ReactNode;
  /** Content over the photo, aligned to the bottom (e.g. retro title). */
  heroContent?: ReactNode;
  children: ReactNode;
  bottomBar?: ReactNode;
  bottomBarWithKeyboard?: boolean;
  withTabBar?: boolean;
  testID?: string;
};

/**
 * Detail page with a photo hero (240–320) and a floating button bar that stays
 * fixed while the content scrolls. Status bar is light over the photo.
 */
export function HeroScreen({
  heroUri,
  heroTint,
  heroHeight = 280,
  onBack,
  backLabel = 'Back',
  actions,
  heroContent,
  children,
  bottomBar,
  bottomBarWithKeyboard = false,
  withTabBar = false,
  testID,
}: HeroScreenProps) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: withTabBar ? layout.tabBarScrollPadding : 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Photo uri={heroUri} tint={heroTint} height={heroHeight + insets.top} radius={0} scrim>
          {heroContent ? (
            <View style={{ position: 'absolute', left: 20, right: 20, bottom: 56 }}>
              {heroContent}
            </View>
          ) : null}
        </Photo>
        <View style={{ gap: layout.sectionGap }}>{children}</View>
      </ScrollView>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + 4,
          left: layout.gutter,
          right: layout.gutter,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {onBack ? (
          <IconButton
            testID="header-back"
            icon="arrow-left"
            label={backLabel}
            tone="photo"
            onPress={onBack}
          />
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>{actions}</View>
      </View>
      {keyboardVisible && !bottomBarWithKeyboard ? null : bottomBar}
    </View>
  );
}

/** Fixed CTA bar: padding 12 20 + safe area, hairline on top. */
export function BottomBar({
  children,
  tone = 'light',
  testID,
}: {
  children: ReactNode;
  tone?: 'light' | 'white' | 'dark';
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      style={{
        paddingTop: 12,
        paddingHorizontal: layout.gutter,
        paddingBottom: Math.max(insets.bottom, 12) + 12,
        backgroundColor:
          tone === 'dark'
            ? colors.backgroundDark
            : tone === 'white'
              ? colors.surface
              : colors.background,
        borderTopWidth: 1,
        borderTopColor: tone === 'dark' ? alpha.darkBorder : alpha.hairline,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {children}
    </View>
  );
}

export type TabBarItem = {
  key: string;
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
  testID?: string;
};

/** 5-tab bar: active icon fill coral + 4pt coral dot; carvão on the Map tab. */
export function TabBar({ items, dark = false }: { items: TabBarItem[]; dark?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        height: layout.tabBarHeight + Math.max(insets.bottom, 8),
        paddingTop: 6,
        paddingHorizontal: 6,
        flexDirection: 'row',
        backgroundColor: dark ? colors.backgroundDark : colors.surface,
        borderTopWidth: 1,
        borderTopColor: dark ? alpha.darkBorder : alpha.hairline,
      }}
    >
      {items.map((item) => {
        const idle = dark ? colors.textInverseMuted : colors.textMuted;
        const activeLabel = dark ? colors.textInverse : colors.text;
        return (
          <Pressable
            key={item.key}
            testID={item.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: item.active }}
            accessibilityLabel={item.label}
            onPress={item.onPress}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 }}
          >
            <Icon
              name={item.icon}
              size={24}
              weight={item.active ? 'fill' : 'regular'}
              color={item.active ? colors.primary : idle}
            />
            <Text
              variant="micro"
              style={{ color: item.active ? activeLabel : idle }}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: item.active ? colors.primary : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
