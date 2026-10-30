import { type Ref, useId, useState } from 'react';
import { TextInput, type TextInputInstance, type TextInputProps } from 'react-native';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { VStack } from './Stack';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Visually hide the label (it is still announced by screen readers). */
  hideLabel?: boolean;
  helperText?: string;
  error?: string | null;
  ref?: Ref<TextInputInstance>;
};

const useStyles = makeStyles((t) => ({
  input: {
    ...t.text.body,
    minHeight: t.size.controlMd,
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
    color: t.colors.text,
  },
  focused: { borderColor: t.colors.focus, borderWidth: t.borderWidth.thick },
  invalid: { borderColor: t.colors.danger, borderWidth: t.borderWidth.thick },
}));

export function TextField({
  label,
  hideLabel = false,
  helperText,
  error,
  style,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const messageId = useId();

  return (
    <VStack gap="xs" flex={1}>
      {!hideLabel && (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? helperText}
        aria-invalid={Boolean(error)}
        aria-describedby={error || helperText ? messageId : undefined}
        placeholderTextColor={theme.colors.textSubtle}
        style={[styles.input, focused && styles.focused, error && styles.invalid, style]}
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
      {error ? (
        <Text
          nativeID={messageId}
          testID={rest.testID ? `${rest.testID}-error` : undefined}
          variant="caption"
          tone="danger"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text nativeID={messageId} variant="caption" tone="subtle">
          {helperText}
        </Text>
      ) : null}
    </VStack>
  );
}
