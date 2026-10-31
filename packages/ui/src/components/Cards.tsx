import { type ReactNode, useState } from 'react';
import { Pressable, type PressableProps, View, type ViewProps, type ViewStyle } from 'react-native';
import { alpha, colors, palette } from '../tokens/colors';
import { radius, shadow } from '../tokens/layout';
import { Icon, type IconName } from './Icon';
import { Photo } from './Photo';
import { Text } from './Text';

type Surface = 'surface' | 'dark' | 'soft' | 'darkTranslucent';

const surfaces: Record<Surface, string> = {
  surface: colors.surface,
  dark: colors.backgroundDark,
  soft: colors.accentSoft,
  darkTranslucent: alpha.darkCard,
};

export type CardProps = ViewProps & {
  surface?: Surface;
  radius?: 16 | 20 | 24;
  padding?: number;
  gap?: number;
  /** Card overlapping a hero photo (-40 top margin, float shadow). */
  overlap?: boolean;
  onPress?: PressableProps['onPress'];
  accessibilityLabel?: string;
};

/** Base container: white r16/r24, dark (carvão) or soft (coral-100). */
export function Card({
  surface = 'surface',
  radius: r = 16,
  padding = 14,
  gap = 12,
  overlap = false,
  onPress,
  style,
  children,
  accessibilityLabel,
  ...rest
}: CardProps) {
  const base: ViewStyle = {
    backgroundColor: surfaces[surface],
    borderRadius: overlap ? 24 : r,
    padding: overlap ? 20 : padding,
    gap,
    ...(overlap ? { marginTop: -40, marginHorizontal: 12, boxShadow: shadow.float } : null),
  };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          base,
          pressed && surface === 'surface' ? { boxShadow: shadow.hover } : null,
          style as ViewStyle,
        ]}
        {...(rest as PressableProps)}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[base, style]} accessibilityLabel={accessibilityLabel} {...rest}>
      {children}
    </View>
  );
}

export type ListRowProps = {
  title: string;
  meta?: string;
  /** Square photo thumb (56–64) or round flag/avatar via `leading`. */
  thumbUri?: string;
  thumbTint?: string;
  thumbSize?: 44 | 56 | 64 | 72;
  thumbRound?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Card (white, r16) vs plain row inside an existing card. */
  variant?: 'card' | 'plain';
  testID?: string;
  accessibilityLabel?: string;
};

export function ListRow({
  title,
  meta,
  thumbUri,
  thumbTint,
  thumbSize = 64,
  thumbRound = false,
  leading,
  trailing,
  onPress,
  variant = 'card',
  testID,
  accessibilityLabel,
}: ListRowProps) {
  const content = (
    <>
      {leading ??
        (thumbUri !== undefined || thumbTint ? (
          <Photo
            uri={thumbUri}
            tint={thumbTint}
            width={thumbSize}
            height={thumbSize}
            radius={thumbRound ? thumbSize / 2 : 12}
          />
        ) : null)}
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text variant="body" weight={700} numberOfLines={2} style={{ lineHeight: 20 }}>
          {title}
        </Text>
        {meta ? (
          <Text variant="caption" tone="muted" numberOfLines={2} weight={400}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );
  const style: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...(variant === 'card'
      ? { padding: 10, borderRadius: radius.r16, backgroundColor: colors.surface }
      : { paddingVertical: 10 }),
  };
  if (!onPress) {
    return (
      <View testID={testID} style={style}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (meta ? `${title}, ${meta}` : title)}
      onPress={onPress}
      style={({ pressed }) => [
        style,
        pressed
          ? variant === 'card'
            ? { boxShadow: shadow.hover }
            : { backgroundColor: colors.background }
          : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

/** Rating with a filled coral star: "★ 4,8". */
export function Rating({ value, size = 13 }: { value: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon name="star" weight="fill" size={size + 1} color={colors.primary} />
      <Text variant="caption" weight={700} style={{ fontSize: size }}>
        {value}
      </Text>
    </View>
  );
}

export type StatTileProps = {
  value: string;
  label: string;
  onDark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  testID?: string;
};

export function StatTile({
  value,
  label,
  onDark = false,
  size = 'md',
  style,
  testID,
}: StatTileProps) {
  const variant = size === 'lg' ? 'stat' : size === 'md' ? 'statS' : 'statS';
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={[
        {
          flex: 1,
          padding: 14,
          gap: 2,
          borderRadius: radius.r16,
          backgroundColor: onDark ? alpha.darkCard : colors.surface,
        },
        style,
      ]}
    >
      <Text
        variant={variant}
        tone={onDark ? 'inverse' : 'default'}
        style={size === 'lg' ? { fontSize: 32 } : null}
      >
        {value}
      </Text>
      <Text variant="caption" weight={600} tone={onDark ? 'inverseMuted' : 'muted'}>
        {label}
      </Text>
    </View>
  );
}

export type FactTileProps = {
  icon?: IconName;
  label: string;
  value: string;
  sub?: string;
  /** Shows an info icon that opens a carvão tooltip above the tile. */
  tip?: string;
  tipLabel?: string;
  onDark?: boolean;
};

export function FactTile({
  icon,
  label,
  value,
  sub,
  tip,
  tipLabel = 'Info',
  onDark = false,
}: FactTileProps) {
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        flex: 1,
        minWidth: '45%',
        padding: 14,
        gap: 4,
        borderRadius: radius.r16,
        backgroundColor: onDark ? alpha.darkCard : colors.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon && <Icon name={icon} size={16} color={onDark ? colors.accentOnDark : colors.link} />}
        <Text
          variant="overline"
          tone={onDark ? 'inverseMuted' : 'muted'}
          style={{ fontSize: 11 }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {tip ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tipLabel}
            accessibilityState={{ expanded: open }}
            hitSlop={10}
            onPress={() => setOpen((o) => !o)}
            style={{ marginLeft: 'auto' }}
          >
            <Icon name="info" size={16} weight="fill" color={colors.info} />
          </Pressable>
        ) : null}
      </View>
      <Text variant="body" weight={700} tone={onDark ? 'inverse' : 'default'}>
        {value}
      </Text>
      {sub ? (
        <Text
          variant="caption"
          tone={onDark ? 'inverseMuted' : 'muted'}
          style={{ fontSize: 12, lineHeight: 16 }}
        >
          {sub}
        </Text>
      ) : null}
      {tip && open ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: 6,
            padding: 12,
            borderRadius: radius.r12,
            backgroundColor: palette.carvao,
            zIndex: 10,
          }}
        >
          <Text variant="caption" tone="inverse">
            {tip}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Two-column grid wrapper for FactTile / StatTile. */
export function TileGrid({ children, gap = 8 }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>{children}</View>;
}

export function ProgressBar({
  value,
  color = colors.primary,
  track = colors.border,
  height = 6,
  label,
}: {
  /** 0..1 */
  value: number;
  color?: string;
  track?: string;
  height?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** H3 section title + optional "Ver todos" link. */
export function SectionHeader({
  title,
  action,
  onAction,
  onDark = false,
  testID,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  onDark?: boolean;
  testID?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <Text variant="h3" tone={onDark ? 'inverse' : 'default'} style={{ flex: 1 }}>
        {title}
      </Text>
      {action && onAction ? (
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={8}
          onPress={onAction}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 }}
        >
          <Text variant="label" weight={700} tone={onDark ? 'accentOnDark' : 'link'}>
            {action}
          </Text>
          <Icon name="arrow-right" size={16} color={onDark ? colors.accentOnDark : colors.link} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Round icon "bubble" used in action rows and empty states. */
export function IconCircle({
  icon,
  size = 44,
  background = colors.accentSoft,
  color = colors.link,
  iconSize,
  weight,
}: {
  icon: IconName;
  size?: number;
  background?: string;
  color?: string;
  iconSize?: number;
  weight?: 'regular' | 'fill';
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.47)} color={color} weight={weight} />
    </View>
  );
}

export function Divider({ onDark = false, inset = 0 }: { onDark?: boolean; inset?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        height: 1,
        marginLeft: inset,
        backgroundColor: onDark ? alpha.darkBorder : alpha.hairline,
      }}
    />
  );
}
