import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';
import { alpha, colors } from '../tokens/colors';
import { opacity, radius } from '../tokens/layout';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'outlineInverse'
  | 'ghost'
  | 'dark'
  | 'destructive'
  | 'destructiveSolid'
  | 'pill';

export type ButtonSize = 'lg' | 'md' | 'sm';

type VariantStyle = {
  bg: string;
  pressedBg: string;
  fg: string;
  border?: string;
  fontSize: number;
  /** Ghost/link buttons have no box. */
  bare?: boolean;
};

const variants: Record<ButtonVariant, VariantStyle> = {
  primary: {
    bg: colors.primary,
    pressedBg: colors.primaryPressed,
    fg: colors.onPrimary,
    fontSize: 16,
  },
  outline: {
    bg: 'transparent',
    pressedBg: colors.background,
    fg: colors.text,
    border: colors.text,
    fontSize: 15,
  },
  outlineInverse: {
    bg: 'transparent',
    pressedBg: alpha.darkButton,
    fg: colors.textInverse,
    border: alpha.darkBorderStrong,
    fontSize: 15,
  },
  ghost: { bg: 'transparent', pressedBg: 'transparent', fg: colors.link, fontSize: 14, bare: true },
  dark: { bg: colors.selected, pressedBg: colors.textSupport, fg: colors.onSelected, fontSize: 15 },
  destructive: {
    bg: 'transparent',
    pressedBg: colors.background,
    fg: colors.error,
    border: colors.error,
    fontSize: 15,
  },
  destructiveSolid: {
    bg: colors.error,
    pressedBg: colors.error,
    fg: colors.textInverse,
    fontSize: 15,
  },
  pill: {
    bg: 'transparent',
    pressedBg: colors.background,
    fg: colors.text,
    border: colors.text,
    fontSize: 14,
  },
};

const heights: Record<ButtonSize, number> = { lg: 52, md: 48, sm: 40 };

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  flex?: number;
  /** Text color override for ghost buttons on dark backgrounds. */
  color?: string;
};

export function Button({
  label,
  variant = 'primary',
  size,
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  flex,
  color,
  disabled,
  ...rest
}: ButtonProps) {
  const v = variants[variant];
  const height = heights[size ?? (variant === 'pill' ? 'sm' : 'lg')];
  const fg = color ?? v.fg;
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={v.bare ? 8 : undefined}
      style={({ pressed }) => [
        {
          height: v.bare ? 40 : height,
          paddingHorizontal: v.bare ? 0 : variant === 'pill' ? 16 : 24,
          borderRadius: radius.full,
          backgroundColor: pressed ? v.pressedBg : v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          alignSelf: fullWidth ? 'stretch' : v.bare ? 'flex-start' : undefined,
          flex,
          opacity: isDisabled && !loading ? opacity.disabled : pressed && v.bare ? 0.7 : 1,
        },
      ]}
      {...rest}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: loading ? 0 : 1 }}
      >
        {icon && <Icon name={icon} size={v.fontSize + 4} color={fg} />}
        <Text
          variant="body"
          weight={700}
          numberOfLines={1}
          style={{ color: fg, fontSize: v.fontSize, lineHeight: v.fontSize + 6 }}
        >
          {label}
        </Text>
        {iconRight && <Icon name={iconRight} size={v.fontSize + 2} color={fg} />}
      </View>
      {loading && (
        <ActivityIndicator testID="button-spinner" color={fg} style={{ position: 'absolute' }} />
      )}
    </Pressable>
  );
}
