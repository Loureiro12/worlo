import { View, type ViewProps } from 'react-native';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import type { StatusTone } from '../tokens/semantic';
import { Text } from './Text';

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    padding: t.space.lg,
  },
  divider: { height: t.borderWidth.hairline, backgroundColor: t.colors.border },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: t.radius.full,
    paddingHorizontal: t.space.sm,
    paddingVertical: t.space.xxs,
  },
}));

export function Card({ style, ...rest }: ViewProps) {
  const styles = useStyles();
  return <View style={[styles.card, style]} {...rest} />;
}

export function Divider() {
  const styles = useStyles();
  return <View accessibilityElementsHidden importantForAccessibility="no" style={styles.divider} />;
}

export type BadgeProps = ViewProps & { label: string; tone?: StatusTone };

export function Badge({ label, tone = 'neutral', style, ...rest }: BadgeProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { background, foreground } = colors.status[tone];
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.badge, { backgroundColor: background }, style]}
      {...rest}
    >
      <Text variant="caption" style={{ color: foreground }}>
        {label}
      </Text>
    </View>
  );
}
