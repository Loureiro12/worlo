import { Pressable, type PressableProps, View } from 'react-native';
import { makeStyles } from '../theme/ThemeProvider';
import { HStack } from './Stack';
import { Text } from './Text';

export type CheckboxProps = Omit<PressableProps, 'onPress' | 'children'> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible label. When omitted, pass `accessibilityLabel`. */
  label?: string;
};

const useStyles = makeStyles((t) => ({
  row: { minHeight: t.size.controlMd },
  box: {
    width: t.size.checkbox,
    height: t.size.checkbox,
    borderRadius: t.radius.sm,
    borderWidth: t.borderWidth.thick,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  mark: { color: t.colors.onPrimary, fontSize: t.text.label.fontSize, fontWeight: '700' },
}));

export function Checkbox({ checked, onChange, label, disabled, ...rest }: CheckboxProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!checked)}
      {...rest}
    >
      <HStack gap="sm" style={styles.row}>
        <View style={[styles.box, checked && styles.checked]}>
          {checked && <Text style={styles.mark}>✓</Text>}
        </View>
        {label ? <Text>{label}</Text> : null}
      </HStack>
    </Pressable>
  );
}
