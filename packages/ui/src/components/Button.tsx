import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { ThemeColors } from '../tokens/semantic';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

type VariantColors = {
  bg: keyof ThemeColors | null;
  pressed: keyof ThemeColors | null;
  fg: keyof ThemeColors;
};

const variants: Record<ButtonVariant, VariantColors> = {
  primary: { bg: 'primary', pressed: 'primaryPressed', fg: 'onPrimary' },
  secondary: { bg: 'secondary', pressed: 'secondaryPressed', fg: 'onSecondary' },
  ghost: { bg: null, pressed: 'surfaceSunken', fg: 'primary' },
  danger: { bg: 'danger', pressed: 'dangerPressed', fg: 'onDanger' },
};

const useStyles = makeStyles((t) => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: t.radius.md,
  },
  sm: { minHeight: t.size.controlSm, paddingHorizontal: t.space.md },
  md: { minHeight: t.size.controlMd, paddingHorizontal: t.space.lg },
  lg: { minHeight: t.size.controlLg, paddingHorizontal: t.space.xl },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  spinner: { position: 'absolute' },
  hidden: { opacity: 0 },
}));

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const colors = variants[variant];
  const fg = theme.colors[colors.fg] as string;
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 4 : undefined}
      style={({ pressed }) => {
        const bg = pressed ? colors.pressed : colors.bg;
        return [
          styles.base,
          styles[size],
          fullWidth && styles.fullWidth,
          { backgroundColor: bg ? (theme.colors[bg] as string) : 'transparent' },
          isDisabled && styles.disabled,
        ];
      }}
      {...rest}
    >
      <View style={loading && styles.hidden}>
        <Text variant={size === 'sm' ? 'label' : 'bodyStrong'} style={{ color: fg }}>
          {label}
        </Text>
      </View>
      {loading && <ActivityIndicator testID="button-spinner" color={fg} style={styles.spinner} />}
    </Pressable>
  );
}
