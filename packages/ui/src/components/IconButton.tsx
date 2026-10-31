import { Pressable, type PressableProps, View } from 'react-native';
import { alpha, colors } from '../tokens/colors';
import { shadow } from '../tokens/layout';
import { CountBadge } from './Badges';
import { Icon, type IconName } from './Icon';

export type IconButtonTone =
  | 'light'
  | 'dark'
  | 'photo'
  | 'map'
  | 'coral'
  | 'plain'
  | 'plainInverse';

const tones: Record<IconButtonTone, { bg: string; pressed: string; fg: string; shadow?: string }> =
  {
    light: { bg: colors.surface, pressed: colors.background, fg: colors.text },
    dark: { bg: alpha.darkButton, pressed: alpha.darkBorderStrong, fg: colors.textInverse },
    photo: {
      bg: colors.surface,
      pressed: colors.background,
      fg: colors.text,
      shadow: shadow.buttonFloat,
    },
    map: { bg: alpha.mapControl, pressed: colors.backgroundDark, fg: colors.textInverse },
    coral: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary },
    plain: { bg: 'transparent', pressed: alpha.hairline, fg: colors.text },
    plainInverse: { bg: 'transparent', pressed: alpha.darkButton, fg: colors.textInverse },
  };

export type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  icon: IconName;
  /** Required: icon-only controls must be named for screen readers. */
  label: string;
  tone?: IconButtonTone;
  size?: 40 | 44 | 52;
  iconSize?: number;
  iconWeight?: 'regular' | 'fill';
  iconColor?: string;
  badge?: number;
};

export function IconButton({
  icon,
  label,
  tone = 'light',
  size = 40,
  iconSize,
  iconWeight,
  iconColor,
  badge,
  ...rest
}: IconButtonProps) {
  const t = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge}` : label}
      hitSlop={size < 44 ? 4 : undefined}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: pressed ? t.pressed : t.bg,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: t.shadow,
      })}
      {...rest}
    >
      <Icon
        name={icon}
        size={iconSize ?? (size >= 52 ? 24 : 20)}
        color={iconColor ?? t.fg}
        weight={iconWeight}
      />
      {badge ? (
        <View style={{ position: 'absolute', top: 4, right: 4 }}>
          <CountBadge count={badge} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** Coral round "+" (Explorar → adicionar viagem). */
export function Fab({
  label,
  icon = 'plus',
  ...rest
}: Omit<IconButtonProps, 'tone' | 'size' | 'icon'> & { icon?: IconName }) {
  return <IconButton icon={icon} label={label} tone="coral" size={52} iconSize={24} {...rest} />;
}
