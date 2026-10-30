import { Pressable, View } from 'react-native';
import { makeStyles } from '../theme/ThemeProvider';
import { HStack } from './Stack';
import { Text } from './Text';

export type RadioOption<T extends string> = { value: T; label: string };

export type RadioGroupProps<T extends string> = {
  label: string;
  options: readonly RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

const useStyles = makeStyles((t) => ({
  option: { minHeight: t.size.controlMd },
  outer: {
    width: t.size.checkbox,
    height: t.size.checkbox,
    borderRadius: t.radius.full,
    borderWidth: t.borderWidth.thick,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerSelected: { borderColor: t.colors.primary },
  inner: {
    width: t.size.checkbox / 2,
    height: t.size.checkbox / 2,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.primary,
  },
}));

export function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  testID,
}: RadioGroupProps<T>) {
  const styles = useStyles();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            testID={testID ? `${testID}-${option.value}` : undefined}
            onPress={() => onChange(option.value)}
          >
            <HStack gap="sm" style={styles.option}>
              <View style={[styles.outer, selected && styles.outerSelected]}>
                {selected && <View style={styles.inner} />}
              </View>
              <Text>{option.label}</Text>
            </HStack>
          </Pressable>
        );
      })}
    </View>
  );
}
