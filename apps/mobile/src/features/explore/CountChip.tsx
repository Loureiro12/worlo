import { colors, makeStyles, Text } from '@worlo/ui';
import { Pressable } from 'react-native';

/**
 * Filter chip with a result count ("Destinos 3"), used by Busca.
 * Promotion candidate: a `count` prop on `@worlo/ui` Chip.
 */
export function CountChip({
  label,
  count,
  selected,
  onPress,
  testID,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const styles = useStyles();
  const fg = selected ? colors.onSelected : colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count ? `${label}, ${count}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.idle,
        pressed && styles.pressed,
      ]}
    >
      <Text variant="label" color={fg}>
        {label}
      </Text>
      {count ? (
        <Text variant="overline" color={fg} style={styles.count}>
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: t.radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selected: { backgroundColor: t.colors.selected, borderColor: t.colors.selected },
  idle: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
  pressed: { opacity: 0.8 },
  count: { letterSpacing: 0, opacity: 0.7 },
}));
