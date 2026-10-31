import { type Ref, useState } from 'react';
import {
  Pressable,
  TextInput,
  type TextInputInstance,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, palette } from '../tokens/colors';
import { radius, shadow } from '../tokens/layout';
import { fontFamily, textVariants } from '../tokens/typography';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const inputText = { fontFamily: fontFamily.ui400, fontSize: 16, color: colors.text } as const;

/** Inline form error: warning icon + 14/600 text (04_INTERACTIONS → Validações). */
export function FormError({ message, testID }: { message: string; testID?: string }) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      <Icon name="warning-circle" size={18} weight="fill" color={colors.error} />
      <Text variant="label" tone="error" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Hide the visible label but keep it for screen readers. */
  hideLabel?: boolean;
  icon?: IconName;
  /** Red border. Show the message with <FormError> below the form. */
  invalid?: boolean;
  /** Renders the eye toggle and masks the value. */
  password?: boolean;
  /** Accessible names for the eye toggle: [show, hide]. */
  passwordToggleLabels?: [string, string];
  /** 48 inside sheets, 52 elsewhere. */
  compact?: boolean;
  trailing?: React.ReactNode;
  containerStyle?: ViewStyle;
  ref?: Ref<TextInputInstance>;
};

export function TextField({
  label,
  hideLabel = false,
  icon,
  invalid = false,
  password = false,
  passwordToggleLabels = ['Show password', 'Hide password'],
  compact = false,
  trailing,
  containerStyle,
  onFocus,
  onBlur,
  ref,
  testID,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = invalid ? colors.error : focused ? colors.text : colors.border;
  const borderWidth = focused && !invalid ? 2 : 1;

  return (
    <View style={[{ gap: 8 }, containerStyle]}>
      {!hideLabel && <Text variant="label">{label}</Text>}
      <View
        style={{
          height: compact ? 48 : 52,
          borderRadius: radius.r12,
          backgroundColor: colors.surface,
          borderWidth,
          borderColor,
          // Keep the text from jumping when the border thickens on focus.
          paddingHorizontal: 16 - (borderWidth - 1),
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {icon && <Icon name={icon} size={20} color={colors.textMuted} />}
        <TextInput
          ref={ref}
          testID={testID}
          accessibilityLabel={label}
          aria-invalid={invalid}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={password && !revealed}
          autoCapitalize={password ? 'none' : rest.autoCapitalize}
          style={[inputText, { flex: 1, height: '100%' }]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {password && (
          <Pressable
            testID={testID ? `${testID}-reveal` : undefined}
            accessibilityRole="button"
            accessibilityLabel={revealed ? passwordToggleLabels[1] : passwordToggleLabels[0]}
            hitSlop={10}
            onPress={() => setRevealed((r) => !r)}
          >
            <Icon name={revealed ? 'eye-slash' : 'eye'} size={20} color={colors.textMuted} />
          </Pressable>
        )}
        {trailing}
      </View>
    </View>
  );
}

export type SearchPillProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Renders as a button that opens the search screen. */
  onPressAsButton?: () => void;
  /** 2px carvão border, used on the search screen itself. */
  active?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  height?: 48 | 52;
  ref?: Ref<TextInputInstance>;
};

export function SearchPill({
  label,
  onPressAsButton,
  active = false,
  onClear,
  clearLabel = 'Clear',
  height = 52,
  placeholder,
  value,
  ref,
  ...rest
}: SearchPillProps) {
  const box: ViewStyle = {
    flex: 1,
    height,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    paddingHorizontal: active ? 16 : 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: active ? 2 : 0,
    borderColor: colors.text,
    boxShadow: active ? undefined : shadow.search,
  };

  if (onPressAsButton) {
    return (
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={label}
        onPress={onPressAsButton}
        style={box}
        {...rest}
      >
        <Icon name="magnifying-glass" size={20} color={palette.cinza800} />
        <Text variant="bodyL" tone="muted" numberOfLines={1}>
          {placeholder ?? label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={box}>
      <Icon name="magnifying-glass" size={20} color={palette.cinza800} />
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        returnKeyType="search"
        style={[inputText, { flex: 1, height: '100%' }]}
        {...rest}
      />
      {onClear && value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          hitSlop={10}
          onPress={onClear}
        >
          <Icon name="x-circle" size={20} weight="fill" color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export type TextAreaProps = Omit<TextInputProps, 'style'> & {
  label: string;
  hideLabel?: boolean;
  maxLength: number;
  invalid?: boolean;
  minHeight?: number;
};

export function TextArea({
  label,
  hideLabel = false,
  maxLength,
  invalid = false,
  minHeight = 120,
  value = '',
  ...rest
}: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      {!hideLabel && <Text variant="label">{label}</Text>}
      <TextInput
        accessibilityLabel={label}
        multiline
        maxLength={maxLength}
        value={value}
        textAlignVertical="top"
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          inputText,
          {
            minHeight,
            lineHeight: 22,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: radius.r12,
            backgroundColor: colors.surface,
            borderWidth: focused && !invalid ? 2 : 1,
            borderColor: invalid ? colors.error : focused ? colors.text : colors.border,
          },
        ]}
        {...rest}
      />
      <Text variant="caption" tone="muted" align="right" style={{ fontSize: 12 }}>
        {`${value.length}/${maxLength}`}
      </Text>
    </View>
  );
}

/** Only digits, dot and comma; comma is the pt-BR decimal separator. */
export function sanitizeMoney(input: string): string {
  return input.replace(/[^0-9.,]/g, '');
}

export function parseMoney(input: string): number {
  const normalized = input.replace(/\./g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

export type MoneyInputProps = Omit<TextInputProps, 'style' | 'onChangeText'> & {
  label: string;
  currency: string;
  onChangeText: (value: string) => void;
  invalid?: boolean;
};

export function MoneyInput({ label, currency, onChangeText, invalid, ...rest }: MoneyInputProps) {
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: radius.r16,
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: invalid ? 1 : 0,
        borderColor: colors.error,
      }}
    >
      <Text variant="h2" tone="muted" style={{ fontSize: 26, lineHeight: 32 }}>
        {currency}
      </Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        placeholder="0,00"
        placeholderTextColor={colors.border}
        onChangeText={(text) => onChangeText(sanitizeMoney(text))}
        style={[textVariants.stat, { flex: 1, color: colors.text, fontSize: 36, lineHeight: 42 }]}
        {...rest}
      />
    </View>
  );
}

/** 0 empty, 1 <8, 2 ≥8, 3 ≥10 with letters and numbers (02_SCREENS → A3). */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  if (password.length < 8) return 1;
  if (password.length >= 10 && /[a-zA-Z]/.test(password) && /\d/.test(password)) return 3;
  return 2;
}

export function PasswordStrength({
  password,
  labels,
}: {
  password: string;
  labels: [string, string, string];
}) {
  const level = passwordStrength(password);
  if (level === 0) return null;
  const color = level === 1 ? colors.error : level === 2 ? colors.primary : colors.success;
  return (
    <View accessible accessibilityLabel={labels[level - 1]} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: bar <= level ? color : colors.border,
            }}
          />
        ))}
      </View>
      <Text variant="caption" weight={600} style={{ color }}>
        {labels[level - 1]}
      </Text>
    </View>
  );
}
