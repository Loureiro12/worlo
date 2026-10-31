import { Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { alpha, colors } from '../tokens/colors';
import { opacity, radius } from '../tokens/layout';
import { fontFamily } from '../tokens/typography';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Chips on carvão screens (map year filter). */
  onDark?: boolean;
  /** Dashed "+ Dia" / "Nova coleção" style. */
  dashed?: boolean;
  testID?: string;
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  onDark = false,
  dashed = false,
  testID,
}: ChipProps) {
  const bg = selected
    ? onDark
      ? colors.surface
      : colors.selected
    : onDark
      ? alpha.darkChip
      : colors.surface;
  const fg = selected
    ? onDark
      ? colors.text
      : colors.onSelected
    : onDark
      ? colors.textInverse
      : colors.text;
  const border = selected ? bg : onDark ? alpha.darkBorder : colors.border;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 36,
        paddingHorizontal: 14,
        borderRadius: radius.full,
        backgroundColor: bg,
        borderWidth: 1,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {icon && <Icon name={icon} size={16} color={fg} weight={selected ? 'fill' : 'regular'} />}
      <Text variant="label" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling chip row that bleeds to the screen edges. */
export function ChipRow({ children, gutter = 20 }: { children: React.ReactNode; gutter?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -gutter, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: gutter, gap: 8 }}
    >
      {children}
    </ScrollView>
  );
}

export type SegmentedOption<T extends string> = { value: T; label: string };

export type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  onDark?: boolean;
  /** Accessible name of the group. */
  label: string;
  testID?: string;
  height?: 36 | 40;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  onDark = false,
  label,
  testID,
  height = 40,
}: SegmentedProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      testID={testID}
      style={{
        flexDirection: 'row',
        padding: 4,
        gap: 4,
        borderRadius: radius.full,
        backgroundColor: onDark ? alpha.darkChip : colors.surface,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        const activeBg = onDark ? colors.surface : colors.selected;
        const activeFg = onDark ? colors.text : colors.onSelected;
        const idleFg = onDark ? colors.textInverseMuted : colors.text;
        return (
          <Pressable
            key={option.value}
            testID={testID ? `${testID}-${option.value}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              height,
              borderRadius: radius.full,
              backgroundColor: active ? activeBg : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
            }}
          >
            <Text
              variant="label"
              weight={700}
              numberOfLines={1}
              style={{ color: active ? activeFg : idleFg }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type RowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onPress: () => void;
  testID?: string;
  style?: ViewStyle;
};

export function RadioRow({ label, description, checked, onPress, testID, style }: RowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
        style,
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" weight={600}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: checked ? colors.primary : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && (
          <View
            style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }}
          />
        )}
      </View>
    </Pressable>
  );
}

export function CheckboxRow({ label, description, checked, onPress, testID, style }: RowProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
        style,
      ]}
    >
      <Checkbox checked={checked} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" weight={600}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Visual-only box; wrap in a pressable that owns the accessibility role. */
export function Checkbox({ checked, size = 24 }: { checked: boolean; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: checked ? colors.primary : colors.border,
        backgroundColor: checked ? colors.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <Icon name="check" size={size - 8} color={colors.onPrimary} />}
    </View>
  );
}

export type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  testID?: string;
  disabled?: boolean;
};

export function Toggle({ value, onChange, label, testID, disabled }: ToggleProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!value)}
      style={{
        width: 48,
        height: 28,
        borderRadius: radius.full,
        padding: 3,
        backgroundColor: value ? colors.primary : colors.border,
        alignItems: value ? 'flex-end' : 'flex-start',
        opacity: disabled ? opacity.disabled : 1,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.surface,
          boxShadow: '0px 1px 3px rgba(19,19,17,0.25)',
        }}
      />
    </Pressable>
  );
}

/** Row with a label on the left and a switch on the right (Configurações). */
export function ToggleRow({
  label,
  description,
  ...toggle
}: ToggleProps & { description?: string }) {
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 8,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" weight={600}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Toggle label={label} {...toggle} />
    </View>
  );
}

export type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  /** Accessible name per star, e.g. (n) => `${n} estrelas`. */
  starLabel: (stars: number) => string;
  size?: 'input' | 'inline';
  testID?: string;
};

/** Input: 5 × 44 bordered buttons. Inline: read-only row of small stars. */
export function StarRating({
  value,
  onChange,
  starLabel,
  size = 'input',
  testID,
}: StarRatingProps) {
  if (size === 'inline' || !onChange) {
    return (
      <View
        accessible
        accessibilityLabel={starLabel(value)}
        style={{ flexDirection: 'row', gap: 2 }}
        testID={testID}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Icon
            key={n}
            name="star"
            size={14}
            weight={n <= value ? 'fill' : 'regular'}
            color={colors.primary}
          />
        ))}
      </View>
    );
  }
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }} testID={testID}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          testID={testID ? `${testID}-${n}` : undefined}
          accessibilityRole="radio"
          accessibilityState={{ checked: n === value }}
          accessibilityLabel={starLabel(n)}
          onPress={() => onChange(n)}
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.r12,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
          }}
        >
          <Icon
            name="star"
            size={22}
            weight={n <= value ? 'fill' : 'regular'}
            color={colors.primary}
          />
        </Pressable>
      ))}
    </View>
  );
}

export type StepperProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label: string;
  decrementLabel: string;
  incrementLabel: string;
  testID?: string;
};

export function Stepper({
  value,
  min = 1,
  max = 12,
  onChange,
  label,
  decrementLabel,
  incrementLabel,
  testID,
}: StepperProps) {
  const button = (icon: IconName, a11y: string, next: number, disabled: boolean, id: string) => (
    <Pressable
      testID={testID ? `${testID}-${id}` : undefined}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onChange(next)}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? opacity.disabled : 1,
      }}
    >
      <Icon name={icon} size={20} />
    </Pressable>
  );
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
    >
      {button('minus', decrementLabel, value - 1, value <= min, 'minus')}
      <Text
        variant="statS"
        testID={testID ? `${testID}-value` : undefined}
        style={{ fontFamily: fontFamily.title700, minWidth: 28 }}
        align="center"
      >
        {value}
      </Text>
      {button('plus', incrementLabel, value + 1, value >= max, 'plus')}
    </View>
  );
}

export type DateChipProps = {
  weekday: string;
  day: string;
  month: string;
  selected: boolean;
  soldOut?: boolean;
  soldOutLabel?: string;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
};

export function DateChip({
  weekday,
  day,
  month,
  selected,
  soldOut = false,
  soldOutLabel,
  onPress,
  accessibilityLabel,
  testID,
}: DateChipProps) {
  const fg = selected ? colors.onSelected : colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: soldOut }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        width: 64,
        height: 72,
        borderRadius: radius.r16,
        backgroundColor: selected ? colors.selected : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.selected : colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        opacity: soldOut ? opacity.soldOut : 1,
      }}
    >
      <Text variant="caption" weight={600} style={{ color: fg, fontSize: 12 }}>
        {weekday}
      </Text>
      <Text variant="statS" style={{ color: fg, fontFamily: fontFamily.title700 }}>
        {day}
      </Text>
      <Text variant="micro" weight={700} style={{ color: fg, fontSize: 10, lineHeight: 12 }}>
        {soldOut && soldOutLabel ? soldOutLabel : month}
      </Text>
    </Pressable>
  );
}
