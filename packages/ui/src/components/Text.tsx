import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { TextVariant, ThemeColors } from '../tokens/semantic';

export type TextTone = 'default' | 'muted' | 'subtle' | 'primary' | 'danger' | 'onPrimary';

const toneColor: Record<TextTone, keyof ThemeColors> = {
  default: 'text',
  muted: 'textMuted',
  subtle: 'textSubtle',
  primary: 'primary',
  danger: 'danger',
  onPrimary: 'onPrimary',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  align?: 'auto' | 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', tone = 'default', align, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[
        theme.text[variant],
        { color: theme.colors[toneColor[tone]] as string, textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
